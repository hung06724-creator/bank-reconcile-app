import { useState, useCallback, useRef } from 'react';
import type {
  ImportStep,
  BankCode,
  UploadResult,
  ParseResult,
  ClassifyResult,
  ColumnMapping,
} from './types';
import type { TransactionListItem } from '@/components/features/transactions/types';
import { ParserService } from '@/services/parser.service';
import { ClassificationService } from '@/services/classification.service';
import { useAppStore } from '@/lib/store';
import { BankTransaction } from '@/domain/types';

const parser = new ParserService();
const classifier = new ClassificationService();

export function useImportFlow() {
  const addTransactions = useAppStore((s) => s.addTransactions);
  const rules = useAppStore((s) => s.rules);
  const updateTransactions = useAppStore((s) => s.updateTransactions);
  const categories = useAppStore((s) => s.categories);

  const [step, setStep] = useState<ImportStep>('upload');
  const [bankCode, setBankCode] = useState<BankCode>('BIDV');
  const [file, setFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileBufferRef = useRef<ArrayBuffer | null>(null);

  const upload = useCallback(
    async (selectedFile: File) => {
      setLoading(true);
      setError(null);
      try {
        const arrayBuffer = await selectedFile.arrayBuffer();
        fileBufferRef.current = arrayBuffer;

        const preview = await parser.previewFileBuffer(arrayBuffer, bankCode);

        const result: UploadResult = {
          batch_id: `batch-${Date.now()}`,
          filename: selectedFile.name,
          file_hash: '',
          bank_code: bankCode,
          status: 'processing',
          detected_columns: preview.detectedColumns,
          preview_rows: preview.previewRows,
          total_rows: preview.totalRows,
          created_at: new Date().toISOString(),
        };

        setFile(selectedFile);
        setUploadResult(result);
        setStep('preview');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [bankCode]
  );

  const parse = useCallback(
    async (_columnMapping?: Partial<ColumnMapping>) => {
      if (!uploadResult || !fileBufferRef.current) return;
      setLoading(true);
      setError(null);
      try {
        const parsed = await parser.parseFileBuffer(
          fileBufferRef.current,
          uploadResult.bank_code
        );

        // Save to global store
        const listItems: TransactionListItem[] = parsed.map((t, idx) => {
          const isCredit = t.type === 'credit';
          const amount = t.normalized_amount || 0;
          return {
            id: `${uploadResult.batch_id}-${idx}`,
            batch_id: uploadResult.batch_id,
            raw_date: t.raw_date || '',
            raw_desc: t.raw_desc || '',
            raw_reference: t.raw_reference || null,
            normalized_date: t.normalized_date || '',
            normalized_amount: amount,
            debit_amount: isCredit ? 0 : amount,
            credit_amount: isCredit ? amount : 0,
            balance_after: null,
            type: t.type || 'credit',
            status: 'pending_classification',
            sender_name: null,
            match: null,
          };
        });

        const duplicateCount = addTransactions(
          listItems,
          { id: uploadResult.batch_id, filename: uploadResult.filename },
          uploadResult.bank_code
        );

        const newCount = parsed.length - duplicateCount;

        const result: ParseResult = {
          batch_id: uploadResult.batch_id,
          status: 'reviewing',
          total_parsed: newCount,
          total_skipped: uploadResult.total_rows - newCount,
          skipped_reasons: duplicateCount > 0
            ? [{ row_index: 0, reason: `${duplicateCount} giao dịch trùng đã bị loại bỏ.` }]
            : [],
          sample_transactions: parsed.slice(0, 10).map((t) => ({
            raw_date: t.raw_date || '',
            raw_desc: t.raw_desc || '',
            normalized_date: t.normalized_date || '',
            normalized_amount: t.normalized_amount || 0,
            type: t.type || 'credit',
          })),
        };

        setParseResult(result);
        setStep('parsing');

        // Auto-classify inline using locally built result
        let classifiedCount = 0;
        let highConfidenceCount = 0;
        let lowConfidenceCount = 0;
        const categoryCounts: Record<string, number> = {};

        const currentRules = rules.map(r => ({
          ...r,
          amount_min: r.amount_min ?? undefined,
          amount_max: r.amount_max ?? undefined,
        }));

        updateTransactions(uploadResult.bank_code as any, (t) => {
          if (t.batch_id !== result.batch_id) return t;
          if (t.type === 'debit') return t; // Chỉ phân loại ghi có

          const matchResult = classifier.evaluateRules(t as any as BankTransaction, currentRules as any);

          if (matchResult.suggested_category_id) {
            classifiedCount++;
            if (matchResult.confidence_score >= 0.8) highConfidenceCount++;
            else lowConfidenceCount++;

            const catName = categories.find(c => c.id === matchResult.suggested_category_id)?.name || 'Unknown';
            categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;

            return {
              ...t,
              status: 'classified' as const,
              match: {
                suggested_category_id: matchResult.suggested_category_id,
                suggested_category_code: matchResult.suggested_category_code || null,
                suggested_category_name: categories.find(c => c.id === matchResult.suggested_category_id)?.name || null,
                confidence_score: matchResult.confidence_score,
                is_manually_overridden: false,
                confirmed_category_id: null,
                confirmed_category_code: null,
                confirmed_category_name: null,
              }
            };
          }

          return t;
        });

        const topCategories = Object.entries(categoryCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => {
            const cat = categories.find((c) => c.name === name);
            return {
              category_id: cat?.id || '',
              category_code: cat?.code || '',
              category_name: name,
              count,
            };
          });

        const classifyRes: ClassifyResult = {
          batch_id: result.batch_id,
          total_transactions: result.total_parsed,
          classification_summary: {
            classified: classifiedCount,
            unclassified: result.total_parsed - classifiedCount,
            high_confidence: highConfidenceCount,
            low_confidence: lowConfidenceCount,
            already_confirmed: 0,
          },
          top_categories: topCategories,
        };

        setClassifyResult(classifyRes);
        setStep('classifying');
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [uploadResult, addTransactions, rules, updateTransactions, categories]
  );

  const classify = useCallback(async () => {
    if (!parseResult || !uploadResult) return;
    setLoading(true);
    setError(null);
    try {
      let classifiedCount = 0;
      let highConfidenceCount = 0;
      let lowConfidenceCount = 0;
      const categoryCounts: Record<string, number> = {};

      const currentRules = rules.map(r => ({
        ...r,
        id: r.id,
        category_id: r.category_id,
        keyword: r.keyword,
        type: r.type,
        priority: r.priority,
        amount_min: r.amount_min ?? undefined,
        amount_max: r.amount_max ?? undefined,
        stop_on_match: r.stop_on_match,
        is_active: r.is_active,
        created_at: r.created_at,
        updated_at: r.updated_at
      }));

      updateTransactions(uploadResult.bank_code as any, (t) => {
        if (t.batch_id !== parseResult.batch_id) return t;

        const matchResult = classifier.evaluateRules(t as any as BankTransaction, currentRules as any);
        
        if (matchResult.suggested_category_id) {
          classifiedCount++;
          if (matchResult.confidence_score >= 0.8) highConfidenceCount++;
          else lowConfidenceCount++;

          const catName = categories.find(c => c.id === matchResult.suggested_category_id)?.name || 'Unknown';
          categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;

          return {
            ...t,
            status: 'classified' as const,
            match: {
              suggested_category_id: matchResult.suggested_category_id,
              suggested_category_code: matchResult.suggested_category_code || null,
              suggested_category_name: categories.find(c => c.id === matchResult.suggested_category_id)?.name || null,
              confidence_score: matchResult.confidence_score,
              is_manually_overridden: false,
              confirmed_category_id: null,
              confirmed_category_code: null,
              confirmed_category_name: null,
            }
          };
        }

        return t;
      });

      const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => {
          const cat = categories.find((c) => c.name === name);
          return {
            category_id: cat?.id || '',
            category_code: cat?.code || '',
            category_name: name,
            count,
          };
        });

      const result: ClassifyResult = {
        batch_id: parseResult.batch_id,
        total_transactions: parseResult.total_parsed,
        classification_summary: {
          classified: classifiedCount,
          unclassified: parseResult.total_parsed - classifiedCount,
          high_confidence: highConfidenceCount,
          low_confidence: lowConfidenceCount,
          already_confirmed: 0,
        },
        top_categories: topCategories,
      };

      setClassifyResult(result);
      setStep('classifying');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [parseResult, uploadResult, rules, updateTransactions, categories]);

  const finish = useCallback(() => {
    setStep('done');
  }, []);

  const reset = useCallback(() => {
    setStep('upload');
    setFile(null);
    setUploadResult(null);
    setParseResult(null);
    setClassifyResult(null);
    setError(null);
    setLoading(false);
    fileBufferRef.current = null;
  }, []);

  return {
    step,
    bankCode,
    setBankCode,
    file,
    uploadResult,
    parseResult,
    classifyResult,
    loading,
    error,
    setError,
    upload,
    parse,
    classify,
    finish,
    reset,
  };
}
