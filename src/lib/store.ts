import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TransactionListItem, CategoryOption, BatchOption } from '@/components/features/transactions/types';
import type { RuleListItem } from '@/components/features/rules/types';
import { MOCK_CATEGORIES, MOCK_RULES } from '@/components/features/rules/mock-data';

export type BankTab = 'BIDV' | 'AGRIBANK';

interface AppState {
  bidvTransactions: TransactionListItem[];
  agribankTransactions: TransactionListItem[];
  rules: RuleListItem[];
  batches: BatchOption[];
  categories: CategoryOption[];
  activeBank: BankTab;

  setActiveBank: (bank: BankTab) => void;
  addTransactions: (items: TransactionListItem[], batch: BatchOption, bankCode: string) => number;
  updateTransactions: (bankCode: BankTab, mapper: (t: TransactionListItem) => TransactionListItem) => void;
  setCategories: (categories: CategoryOption[]) => void;
  addCategory: (category: CategoryOption) => void;
  updateCategory: (category: CategoryOption) => void;
  deleteCategory: (id: string) => void;
  setRules: (rules: RuleListItem[]) => void;
  addRule: (rule: RuleListItem) => void;
  updateRule: (rule: RuleListItem) => void;
  deleteRule: (id: string) => void;
  clearAll: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      bidvTransactions: [],
      agribankTransactions: [],
      rules: MOCK_RULES,
      batches: [],
      categories: MOCK_CATEGORIES,
      activeBank: 'BIDV',

      setActiveBank: (bank) => set({ activeBank: bank }),

      addTransactions: (items, batch, bankCode) => {
        const state = get();
        const isBidv = bankCode === 'BIDV';
        const existing = isBidv ? state.bidvTransactions : state.agribankTransactions;

        const existingKeys = new Set(
          existing
            .filter((t) => t.raw_reference && t.raw_reference.trim() !== '')
            .map((t) => isBidv ? `${t.raw_reference}|${t.normalized_amount}` : t.raw_reference!)
        );

        const newItems = items.filter((item) => {
          const ref = item.raw_reference;
          if (!ref || ref.trim() === '') return true;
          const key = isBidv ? `${ref}|${item.normalized_amount}` : ref;
          if (existingKeys.has(key)) return false;
          existingKeys.add(key);
          return true;
        });

        const duplicateCount = items.length - newItems.length;

        if (isBidv) {
          set({
            bidvTransactions: [...newItems, ...existing],
            batches: state.batches.some((b) => b.id === batch.id)
              ? state.batches
              : [batch, ...state.batches],
            activeBank: 'BIDV',
          });
        } else {
          set({
            agribankTransactions: [...newItems, ...existing],
            batches: state.batches.some((b) => b.id === batch.id)
              ? state.batches
              : [batch, ...state.batches],
            activeBank: 'AGRIBANK',
          });
        }

        return duplicateCount;
      },

      updateTransactions: (bankCode, mapper) => {
        const key = bankCode === 'BIDV' ? 'bidvTransactions' : 'agribankTransactions';
        set((state) => ({ [key]: state[key].map(mapper) }));
      },

      setCategories: (categories) => set({ categories }),
      addCategory: (category) => set((state) => ({ categories: [...state.categories, category] })),
      updateCategory: (category) => set((state) => ({
        categories: state.categories.map((c) => c.id === category.id ? category : c)
      })),
      deleteCategory: (id) => set((state) => ({
        categories: state.categories.filter((c) => c.id !== id)
      })),

      setRules: (rules) => set({ rules }),
      addRule: (rule) => set((state) => ({ rules: [rule, ...state.rules] })),
      updateRule: (rule) => set((state) => ({
        rules: state.rules.map((r) => r.id === rule.id ? rule : r)
      })),
      deleteRule: (id) => set((state) => ({
        rules: state.rules.filter((r) => r.id !== id)
      })),

      clearAll: () => set({ bidvTransactions: [], agribankTransactions: [], batches: [] }),
    }),
    {
      name: 'bank-reconcile-storage',
      version: 4,
      migrate: () => ({
        bidvTransactions: [],
        agribankTransactions: [],
        rules: MOCK_RULES,
        batches: [],
        categories: MOCK_CATEGORIES,
        activeBank: 'BIDV' as BankTab,
      }),
    }
  )
);
