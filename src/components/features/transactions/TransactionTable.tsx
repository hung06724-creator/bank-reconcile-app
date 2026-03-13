import { useState, useRef, useEffect } from 'react';
import { Check, AlertTriangle, FileOutput, Clock, HelpCircle, Search } from 'lucide-react';
import clsx from 'clsx';
import type { TransactionListItem, Pagination, CategoryOption } from './types';

interface TransactionTableProps {
  transactions: TransactionListItem[];
  pagination: Pagination;
  categories: CategoryOption[];
  onUpdateCategory: (transactionId: string, categoryId: string) => void;
  onGoToPage: (page: number) => void;
}

const VN_NUMBER = new Intl.NumberFormat('vi-VN');

function formatAmount(amount: number): string {
  return VN_NUMBER.format(amount);
}

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span
      className={clsx(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
        pct >= 85
          ? 'bg-green-100 text-green-700'
          : pct >= 50
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
      )}
    >
      {pct}%
    </span>
  );
}

function StatusBadge({ status }: { status: TransactionListItem['status'] }) {
  const config = {
    pending_classification: { label: 'Chờ phân loại', icon: Clock, cls: 'bg-gray-100 text-gray-600' },
    classified: { label: 'Đã phân loại', icon: HelpCircle, cls: 'bg-blue-100 text-blue-700' },
    confirmed: { label: 'Đã xác nhận', icon: Check, cls: 'bg-green-100 text-green-700' },
    exported: { label: 'Đã xuất', icon: FileOutput, cls: 'bg-purple-100 text-purple-700' },
  }[status];

  const Icon = config.icon;

  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.cls)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function InlineCategorySearch({
  currentName,
  currentCode,
  categories,
  onSelect,
}: {
  currentName: string | null;
  currentCode: string | null;
  categories: CategoryOption[];
  onSelect: (categoryId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = categories.filter((c) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const displayValue = open ? query : (currentName || '');

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          placeholder="Chọn hoặc tìm..."
          onFocus={() => {
            setOpen(true);
            setQuery('');
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          className={clsx(
            'w-full pl-6 pr-2 py-1 text-xs border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500',
            currentName ? 'border-indigo-200 bg-indigo-50/50 text-indigo-700' : 'border-gray-200 text-gray-600'
          )}
          title={currentName || ''}
        />
      </div>
      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">Không tìm thấy</div>
          ) : (
            filtered.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  onSelect(cat.id);
                  setOpen(false);
                  setQuery('');
                }}
                className={clsx(
                  'w-full text-left px-3 py-1.5 text-xs hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-gray-50 last:border-0',
                  currentCode === cat.code && 'bg-indigo-50 text-indigo-700 font-medium'
                )}
              >
                {cat.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export function TransactionTable({
  transactions,
  pagination,
  categories,
  onUpdateCategory,
  onGoToPage,
}: TransactionTableProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ngày</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ghi nợ</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Ghi có</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mô tả</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Người chuyển</th>
              <th className="px-3 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Số tiền</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-[180px]">Miêu tả</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Conf.</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  Không có giao dịch nào khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              transactions.map((t) => {
                return (
                  <tr
                    key={t.id}
                    className={clsx(
                      'hover:bg-gray-50 transition-colors'
                    )}
                  >
                    {/* Ngày */}
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap text-xs font-medium">
                      {t.raw_date.split(' ')[0]}
                    </td>

                    {/* Ghi nợ */}
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {t.debit_amount > 0 ? (
                        <span className="text-red-600">{formatAmount(t.debit_amount)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Ghi có */}
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {t.credit_amount > 0 ? (
                        <span className="text-green-600">{formatAmount(t.credit_amount)}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>

                    {/* Mô tả - full text */}
                    <td className="px-3 py-2.5">
                      <p className="text-xs text-gray-800" title={t.raw_desc || ''}>
                        {t.raw_desc}
                      </p>
                    </td>

                    {/* Người chuyển */}
                    <td className="px-3 py-2.5 text-xs text-gray-700 whitespace-nowrap">
                      {t.sender_name || <span className="text-gray-300">—</span>}
                    </td>

                    {/* Số tiền */}
                    <td className={clsx('px-3 py-2.5 text-right font-semibold text-xs font-mono', t.type === 'credit' ? 'text-green-600' : 'text-red-600')}>
                      {t.type === 'debit' ? '-' : '+'}{formatAmount(t.normalized_amount)}
                    </td>

                    {/* Miêu tả (was Gợi ý ĐM) - inline searchable combobox */}
                    <td className="px-3 py-2.5">
                      <InlineCategorySearch
                        currentName={t.match?.suggested_category_name || null}
                        currentCode={t.match?.suggested_category_code || null}
                        categories={categories}
                        onSelect={(catId) => onUpdateCategory(t.id, catId)}
                      />
                    </td>

                    {/* Confidence */}
                    <td className="px-3 py-2.5 text-center">
                      {t.match ? <ConfidenceBadge score={t.match.confidence_score} /> : <span className="text-gray-300">—</span>}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge status={t.status} />
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <p className="text-xs text-gray-500">
            Hiển thị {(pagination.page - 1) * pagination.page_size + 1}–
            {Math.min(pagination.page * pagination.page_size, pagination.total_items)} / {pagination.total_items} giao dịch
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onGoToPage(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Trước
            </button>
            {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
              .filter((p) => {
                if (pagination.total_pages <= 7) return true;
                if (p === 1 || p === pagination.total_pages) return true;
                return Math.abs(p - pagination.page) <= 1;
              })
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <span key={p}>
                    {showEllipsis && <span className="px-1 text-gray-400 text-xs">…</span>}
                    <button
                      onClick={() => onGoToPage(p)}
                      className={clsx(
                        'px-2.5 py-1 text-xs font-medium rounded border',
                        p === pagination.page
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      )}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
            <button
              onClick={() => onGoToPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
              className="px-2.5 py-1 text-xs font-medium rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Sau →
            </button>
          </div>
        </div>
      )}

      {/* Footer summary for single page */}
      {pagination.total_pages <= 1 && pagination.total_items > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500">
            Tổng cộng {pagination.total_items} giao dịch
          </p>
        </div>
      )}
    </div>
  );
}
