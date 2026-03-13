import { useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Save, Search, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/lib/store';
import { CATEGORY_GROUPS } from '@/components/features/rules/mock-data';
import type { CategoryOption } from '@/components/features/transactions/types';

interface CategoryFormData {
  code: string;
  name: string;
  group: string;
  ledger_account: string;
}

const EMPTY_FORM: CategoryFormData = { code: '', name: '', group: '', ledger_account: '' };

const GROUP_OPTIONS = [
  CATEGORY_GROUPS.DOANH_THU_DAO_TAO,
  CATEGORY_GROUPS.THU_NHAP_TAI_CHINH,
  CATEGORY_GROUPS.THU_HO_CHI_HO,
  CATEGORY_GROUPS.CHI_PHI_NOI_BO,
  'Khác',
];

const GROUP_COLORS: Record<string, { header: string; badge: string }> = {
  [CATEGORY_GROUPS.DOANH_THU_DAO_TAO]: { header: 'bg-emerald-50 border-emerald-200 text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' },
  [CATEGORY_GROUPS.THU_NHAP_TAI_CHINH]: { header: 'bg-blue-50 border-blue-200 text-blue-800', badge: 'bg-blue-100 text-blue-700' },
  [CATEGORY_GROUPS.THU_HO_CHI_HO]: { header: 'bg-amber-50 border-amber-200 text-amber-800', badge: 'bg-amber-100 text-amber-700' },
  [CATEGORY_GROUPS.CHI_PHI_NOI_BO]: { header: 'bg-gray-100 border-gray-300 text-gray-700', badge: 'bg-gray-200 text-gray-600' },
  'Khác': { header: 'bg-purple-50 border-purple-200 text-purple-800', badge: 'bg-purple-100 text-purple-700' },
};

export function CategoriesManagerView() {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);

  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    if (!searchQuery) return categories;
    const q = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.ledger_account || '').toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<string, CategoryOption[]>();
    for (const g of GROUP_OPTIONS) map.set(g, []);
    for (const cat of filtered) {
      const g = cat.group || 'Khác';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(cat);
    }
    return Array.from(map.entries()).filter(([, items]) => items.length > 0);
  }, [filtered]);

  const toggleGroup = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(true);
  }, []);

  const openEdit = useCallback((cat: CategoryOption) => {
    setEditingId(cat.id);
    setFormData({
      code: cat.code,
      name: cat.name,
      group: cat.group || '',
      ledger_account: cat.ledger_account || '',
    });
    setShowForm(true);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
  }, []);

  const handleSave = useCallback(() => {
    if (!formData.code.trim() || !formData.name.trim()) return;

    const data: CategoryOption = {
      id: editingId || `cat-${Date.now()}`,
      code: formData.code.trim(),
      name: formData.name.trim(),
      group: formData.group || 'Khác',
      ledger_account: formData.ledger_account.trim() || undefined,
    };

    if (editingId) {
      updateCategory(data);
    } else {
      addCategory(data);
    }
    closeForm();
  }, [editingId, formData, addCategory, updateCategory, closeForm]);

  const handleDelete = useCallback(
    (id: string) => {
      deleteCategory(id);
      setDeleteConfirmId(null);
    },
    [deleteCategory]
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm">
          <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium">
            Tổng: <span className="font-bold">{categories.length}</span> danh mục
          </span>
          <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-xs font-medium">
            {grouped.length} nhóm
          </span>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm danh mục
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">
              {editingId ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tài khoản kế toán</label>
              <input
                type="text"
                value={formData.ledger_account}
                onChange={(e) => setFormData((f) => ({ ...f, ledger_account: e.target.value }))}
                placeholder="VD: 5311.01"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mã danh mục</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData((f) => ({ ...f, code: e.target.value }))}
                placeholder="VD: HOC_PHI"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tên danh mục</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Học phí"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nhóm</label>
              <select
                value={formData.group}
                onChange={(e) => setFormData((f) => ({ ...f, group: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
              >
                <option value="">-- Chọn nhóm --</option>
                {GROUP_OPTIONS.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.code.trim() || !formData.name.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {editingId ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo TK, mã hoặc tên danh mục..."
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
        />
      </div>

      {/* Grouped Tables */}
      {grouped.map(([groupName, items]) => {
        const colors = GROUP_COLORS[groupName] || GROUP_COLORS['Khác'];
        const isCollapsed = collapsedGroups.has(groupName);

        return (
          <div key={groupName} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Group header */}
            <button
              onClick={() => toggleGroup(groupName)}
              className={clsx(
                'w-full flex items-center gap-2 px-5 py-3 border-b text-left transition-colors',
                colors.header
              )}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4 flex-shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm font-semibold flex-1">{groupName}</span>
              <span className={clsx('px-2 py-0.5 rounded-full text-xs font-bold', colors.badge)}>
                {items.length}
              </span>
            </button>

            {/* Group items */}
            {!isCollapsed && (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      TK
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                      Mã
                    </th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tên danh mục
                    </th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((cat) => (
                    <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="text-xs font-mono text-gray-500">
                          {cat.ledger_account || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-mono font-medium">
                          {cat.code}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-800">{cat.name}</td>
                      <td className="px-4 py-2.5 text-right">
                        {deleteConfirmId === cat.id ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-red-600 mr-1">Xóa?</span>
                            <button
                              onClick={() => handleDelete(cat.id)}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                            >
                              Xác nhận
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(cat)}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(cat.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-sm text-gray-400">
          Không tìm thấy danh mục nào.
        </div>
      )}
    </div>
  );
}
