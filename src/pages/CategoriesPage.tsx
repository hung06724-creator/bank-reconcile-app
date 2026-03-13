import { CategoriesManagerView } from '@/components/features/categories/CategoriesManagerView';

export default function CategoriesPage() {
  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Danh mục Doanh thu</h1>
        <p className="text-sm text-gray-500">
          Quản lý các loại danh mục kế toán (Học phí, BHYT, Phí dịch vụ, etc.).
        </p>
      </div>
      <CategoriesManagerView />
    </div>
  );
}
