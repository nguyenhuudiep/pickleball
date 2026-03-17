import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { AppSelect } from '../components/AppSelect';
import { financialAPI } from '../services/api';
import { Edit2, Plus, Trash2 } from 'lucide-react';

const DEFAULT_CATEGORY = 'Sân + nước';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultFormData = () => ({
  type: 'income',
  category: '',
  description: '',
  amount: '',
  paymentMethod: 'cash',
  date: formatDateInput(new Date()),
});

const getDefaultDateFilter = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    startDate: formatDateInput(firstDayOfMonth),
    endDate: formatDateInput(today),
    type: 'all',
  };
};

const formatCurrency = (value) => `${Number(value || 0).toLocaleString('en-US')} ₫`;

const paymentMethodMap = {
  cash: 'Tiền Mặt',
  card: 'Thẻ',
  transfer: 'Chuyển Khoản',
  other: 'Khác',
};

const transactionTypeOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'income', label: 'Thu' },
  { value: 'expense', label: 'Chi' },
];

const paymentMethodOptions = [
  { value: 'cash', label: 'Tiền Mặt' },
  { value: 'card', label: 'Thẻ' },
  { value: 'transfer', label: 'Chuyển Khoản' },
  { value: 'other', label: 'Khác' },
];

const itemsPerPageOptions = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 50, label: '50' },
];

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;

export const FinancialPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [stats, setStats] = useState({ income: 0, expenses: 0, profit: 0 });
  const [dateFilter, setDateFilter] = useState(getDefaultDateFilter());
  const [formData, setFormData] = useState(getDefaultFormData());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (
    startDate = dateFilter.startDate,
    endDate = dateFilter.endDate,
    type = dateFilter.type
  ) => {
    try {
      const apiType = type === 'all' ? undefined : type;
      const [transRes, statsRes] = await Promise.all([
        financialAPI.getAll(startDate, endDate, apiType),
        financialAPI.getStats(startDate, endDate, apiType),
      ]);
      setTransactions(transRes.data.financials);
      setCurrentPage(1);
      setStats({
        income: statsRes.data.income,
        expenses: statsRes.data.expenses,
        profit: statsRes.data.profit,
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const category = (formData.category || '').trim() || DEFAULT_CATEGORY;

    const payload = {
      ...formData,
      category,
      amount: Number(formData.amount || 0),
    };

    try {
      if (editingId) {
        await financialAPI.update(editingId, payload);
      } else {
        await financialAPI.create(payload);
      }

      setFormData(getDefaultFormData());
      setEditingId(null);
      setShowForm(false);
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  const isInvalidDateRange =
    dateFilter.startDate && dateFilter.endDate && dateFilter.endDate < dateFilter.startDate;

  const handleApplyFilter = () => {
    if (isInvalidDateRange) {
      alert('Đến ngày không được nhỏ hơn Từ ngày');
      return;
    }
    fetchData();
  };

  const handleClearFilter = () => {
    const clearedFilter = getDefaultDateFilter();
    setDateFilter(clearedFilter);
    fetchData(clearedFilter.startDate, clearedFilter.endDate, clearedFilter.type);
  };

  const handleTypeFilterChange = (type) => {
    const nextFilter = { ...dateFilter, type };
    setDateFilter(nextFilter);

    if (nextFilter.startDate && nextFilter.endDate && nextFilter.endDate < nextFilter.startDate) {
      alert('Đến ngày không được nhỏ hơn Từ ngày');
      return;
    }

    fetchData(nextFilter.startDate, nextFilter.endDate, nextFilter.type);
  };

  const handleAmountChange = (value) => {
    const numeric = value.replace(/\D/g, '');
    setFormData({ ...formData, amount: numeric });
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction._id);
    setShowForm(true);
    setFormData({
      type: transaction.type,
      category: transaction.category || '',
      description: transaction.description || '',
      amount: String(transaction.amount || ''),
      paymentMethod: transaction.paymentMethod || 'cash',
      date: transaction.date ? formatDateInput(new Date(transaction.date)) : getDefaultFormData().date,
    });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData(getDefaultFormData());
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi này?')) {
      return;
    }

    try {
      await financialAPI.delete(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Không thể xóa bản ghi tài chính');
    }
  };

  const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Quản Lý Tài Chính</h1>
          <button
            onClick={() => {
              if (showForm) {
                handleCancelForm();
                return;
              }
              setEditingId(null);
              setFormData(getDefaultFormData());
              setShowForm(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={20} />
            {showForm ? 'Đóng Form' : 'Thêm Giao Dịch'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card bg-green-50 border-green-200">
            <p className="text-gray-600 text-sm">Tổng Doanh Thu</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{formatCurrency(stats.income)}</p>
          </div>
          <div className="card bg-red-50 border-red-200">
            <p className="text-gray-600 text-sm">Tổng Chi Phí</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(stats.expenses)}</p>
          </div>
          <div className="card bg-blue-50 border-blue-200">
            <p className="text-gray-600 text-sm">Lợi Nhuận Ròng</p>
            <p className="text-3xl font-bold text-teal-600 mt-2">{formatCurrency(stats.profit)}</p>
          </div>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Từ ngày</label>
              <input
                type="date"
                value={dateFilter.startDate}
                max={dateFilter.endDate || undefined}
                onChange={(e) => {
                  const startDate = e.target.value;
                  setDateFilter((prev) => ({
                    ...prev,
                    startDate,
                    endDate: prev.endDate && prev.endDate < startDate ? '' : prev.endDate,
                  }));
                }}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Đến ngày</label>
              <input
                type="date"
                value={dateFilter.endDate}
                min={dateFilter.startDate || undefined}
                onChange={(e) => {
                  const endDate = e.target.value;
                  if (dateFilter.startDate && endDate && endDate < dateFilter.startDate) {
                    return;
                  }
                  setDateFilter({ ...dateFilter, endDate });
                }}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loại giao dịch</label>
              <AppSelect
                options={transactionTypeOptions}
                value={getSelectedOption(transactionTypeOptions, dateFilter.type)}
                onChange={(selected) => handleTypeFilterChange(selected?.value || 'all')}
              />
            </div>
            <button onClick={handleApplyFilter} className="btn btn-primary">
              Lọc
            </button>
            <button onClick={handleClearFilter} className="btn btn-secondary">
              Xóa lọc
            </button>
          </div>
        </div>

        {showForm && (
          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loại</label>
                  <div className="flex items-center gap-4 h-[42px] px-3 border border-gray-300 rounded-md">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.type === 'income'}
                        onChange={() => setFormData({ ...formData, type: 'income' })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700">Thu</span>
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.type === 'expense'}
                        onChange={() => setFormData({ ...formData, type: 'expense' })}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-gray-700">Chi</span>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Danh Mục</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    onBlur={() => {
                      if (!(formData.category || '').trim()) {
                        setFormData({ ...formData, category: DEFAULT_CATEGORY });
                      }
                    }}
                    className="input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số Tiền</label>
                  <input
                    type="text"
                    value={formData.amount ? Number(formData.amount).toLocaleString('en-US') : ''}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="input text-red-600 font-semibold"
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phương Thức Thanh Toán</label>
                  <AppSelect
                    options={paymentMethodOptions}
                    value={getSelectedOption(paymentMethodOptions, formData.paymentMethod)}
                    onChange={(selected) => setFormData({ ...formData, paymentMethod: selected?.value || 'cash' })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày Lập Phiếu</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="input"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mô Tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input"
                  rows="2"
                />
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Cập Nhật Giao Dịch' : 'Lưu Giao Dịch'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="btn btn-secondary"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <p className="text-gray-600">Đang tải giao dịch...</p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">STT</th>
                  <th className="text-left py-3 px-4">Ngày</th>
                  <th className="text-left py-3 px-4">Loại</th>
                  <th className="text-left py-3 px-4">Danh Mục</th>
                  <th className="text-left py-3 px-4">Số Tiền</th>
                  <th className="text-left py-3 px-4">Phương Thức</th>
                  <th className="text-left py-3 px-4">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTransactions.map((trans, index) => (
                  <tr key={trans._id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{startIndex + index + 1}</td>
                    <td className="py-3 px-4">{new Date(trans.date).toLocaleDateString('vi-VN')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        trans.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {trans.type === 'income' ? 'Thu' : 'Chi'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{trans.category}</td>
                    <td className="py-3 px-4 font-semibold text-red-600">{formatCurrency(trans.amount)}</td>
                    <td className="py-3 px-4">{paymentMethodMap[trans.paymentMethod] || trans.paymentMethod}</td>
                    <td className="py-3 px-4 flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(trans)}
                        className="text-teal-600 hover:text-teal-800"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(trans._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {transactions.length > 0 && (
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-gray-600">
                    Hiển thị {startIndex + 1}-{Math.min(startIndex + itemsPerPage, transactions.length)} / {transactions.length} bản ghi
                  </p>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Số dòng/trang:</label>
                    <div className="w-24">
                      <AppSelect
                        options={itemsPerPageOptions}
                        value={getSelectedOption(itemsPerPageOptions, itemsPerPage)}
                        onChange={(selected) => {
                          setItemsPerPage(Number(selected?.value || 10));
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <span className="text-sm text-gray-700">
                    Trang {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="btn btn-secondary disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};
