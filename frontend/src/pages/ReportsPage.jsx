import { useState } from 'react';
import { Layout } from '../components/Layout';
import { AppSelect } from '../components/AppSelect';
import { dashboardAPI, financialAPI } from '../services/api';

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultDateFilter = () => {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    startDate: formatDateInput(firstDayOfMonth),
    endDate: formatDateInput(today),
  };
};

const reportTypeOptions = [
  { value: 'monthly', label: 'Báo Cáo Hàng Tháng' },
  { value: 'members', label: 'Báo Cáo Thành Viên' },
  { value: 'financial', label: 'Báo Cáo Tài Chính' },
];

const getSelectedOption = (options, value) => options.find((option) => option.value === value) || null;
const formatCurrency = (value) => `${Number(value || 0).toLocaleString('en-US')} ₫`;

export const ReportsPage = () => {
  const [reportType, setReportType] = useState('monthly');
  const [dateFilter, setDateFilter] = useState(getDefaultDateFilter());
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [financialStats, setFinancialStats] = useState(null);
  const [monthlyData, setMonthlyData] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const isInvalidDateRange =
    dateFilter.startDate && dateFilter.endDate && dateFilter.endDate < dateFilter.startDate;

  const handleGenerate = async () => {
    if (isInvalidDateRange) {
      alert('Đến ngày không được nhỏ hơn Từ ngày');
      return;
    }

    setLoading(true);

    try {
      if (reportType === 'monthly') {
        const { data } = await financialAPI.getStats(dateFilter.startDate, dateFilter.endDate);
        setFinancialStats({
          income: data.income || 0,
          expenses: data.expenses || 0,
          profit: data.profit || 0,
        });
        setMonthlyData(data.monthlyData || []);
      }

      if (reportType === 'members') {
        const { data } = await dashboardAPI.getStats(dateFilter.startDate, dateFilter.endDate);
        setDashboardStats(data.stats || null);
      }

      if (reportType === 'financial') {
        const [statsRes, transactionsRes] = await Promise.all([
          financialAPI.getStats(dateFilter.startDate, dateFilter.endDate),
          financialAPI.getAll(dateFilter.startDate, dateFilter.endDate),
        ]);

        setFinancialStats({
          income: statsRes.data.income || 0,
          expenses: statsRes.data.expenses || 0,
          profit: statsRes.data.profit || 0,
        });
        setTransactions(transactionsRes.data.financials || []);
      }

      setGenerated(true);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Không thể tạo báo cáo. Vui lòng thử lại.');
    }

    setLoading(false);
  };

  const handleClearFilter = () => {
    const clearedFilter = getDefaultDateFilter();
    setDateFilter(clearedFilter);
    setGenerated(false);
    setDashboardStats(null);
    setFinancialStats(null);
    setMonthlyData([]);
    setTransactions([]);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-800">Báo Cáo</h1>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Loại báo cáo</label>
              <AppSelect
                options={reportTypeOptions}
                value={getSelectedOption(reportTypeOptions, reportType)}
                onChange={(selected) => setReportType(selected?.value || 'monthly')}
              />
            </div>
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
            <button onClick={handleGenerate} className="btn btn-primary" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo Báo Cáo'}
            </button>
            <button onClick={handleClearFilter} className="btn btn-secondary" disabled={loading}>
              Xóa lọc
            </button>
          </div>
        </div>

        {!generated && (
          <div className="card text-gray-600">Chọn loại báo cáo và nhấn "Tạo Báo Cáo" để xem dữ liệu.</div>
        )}

        {generated && reportType === 'members' && dashboardStats && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card bg-blue-50 border-blue-200">
                <p className="text-sm text-gray-600">Tổng Thành Viên</p>
                <p className="text-3xl font-bold text-blue-700 mt-2">{dashboardStats.totalMembers || 0}</p>
              </div>
              <div className="card bg-green-50 border-green-200">
                <p className="text-sm text-gray-600">Thành Viên Hoạt Động</p>
                <p className="text-3xl font-bold text-green-700 mt-2">{dashboardStats.activeMembers || 0}</p>
              </div>
              <div className="card bg-purple-50 border-purple-200">
                <p className="text-sm text-gray-600">Tổng Đặt Sân</p>
                <p className="text-3xl font-bold text-purple-700 mt-2">{dashboardStats.totalBookings || 0}</p>
              </div>
            </div>
          </div>
        )}

        {generated && reportType === 'monthly' && (
          <div className="space-y-4">
            {financialStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-green-50 border-green-200">
                  <p className="text-sm text-gray-600">Tổng Doanh Thu</p>
                  <p className="text-3xl font-bold text-green-700 mt-2">{formatCurrency(financialStats.income)}</p>
                </div>
                <div className="card bg-red-50 border-red-200">
                  <p className="text-sm text-gray-600">Tổng Chi Phí</p>
                  <p className="text-3xl font-bold text-red-700 mt-2">{formatCurrency(financialStats.expenses)}</p>
                </div>
                <div className="card bg-blue-50 border-blue-200">
                  <p className="text-sm text-gray-600">Lợi Nhuận</p>
                  <p className="text-3xl font-bold text-blue-700 mt-2">{formatCurrency(financialStats.profit)}</p>
                </div>
              </div>
            )}

            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">STT</th>
                    <th className="text-left py-3 px-4">Tháng</th>
                    <th className="text-left py-3 px-4">Doanh Thu</th>
                    <th className="text-left py-3 px-4">Chi Phí</th>
                    <th className="text-left py-3 px-4">Lợi Nhuận</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 px-4 text-center text-gray-500">
                        Không có dữ liệu trong khoảng thời gian đã chọn.
                      </td>
                    </tr>
                  ) : (
                    monthlyData.map((item, index) => (
                      <tr key={item._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{index + 1}</td>
                        <td className="py-3 px-4">{item._id}</td>
                        <td className="py-3 px-4 text-green-700">{formatCurrency(item.income)}</td>
                        <td className="py-3 px-4 text-red-700">{formatCurrency(item.expense)}</td>
                        <td className="py-3 px-4 font-semibold">{formatCurrency((item.income || 0) - (item.expense || 0))}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {generated && reportType === 'financial' && (
          <div className="space-y-4">
            {financialStats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-green-50 border-green-200">
                  <p className="text-sm text-gray-600">Tổng Thu</p>
                  <p className="text-3xl font-bold text-green-700 mt-2">{formatCurrency(financialStats.income)}</p>
                </div>
                <div className="card bg-red-50 border-red-200">
                  <p className="text-sm text-gray-600">Tổng Chi</p>
                  <p className="text-3xl font-bold text-red-700 mt-2">{formatCurrency(financialStats.expenses)}</p>
                </div>
                <div className="card bg-blue-50 border-blue-200">
                  <p className="text-sm text-gray-600">Lãi/Lỗ</p>
                  <p className="text-3xl font-bold text-blue-700 mt-2">{formatCurrency(financialStats.profit)}</p>
                </div>
              </div>
            )}

            <div className="card overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">STT</th>
                    <th className="text-left py-3 px-4">Ngày</th>
                    <th className="text-left py-3 px-4">Loại</th>
                    <th className="text-left py-3 px-4">Danh Mục</th>
                    <th className="text-left py-3 px-4">Mô Tả</th>
                    <th className="text-left py-3 px-4">Số Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 px-4 text-center text-gray-500">
                        Không có giao dịch trong khoảng thời gian đã chọn.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((transaction, index) => (
                      <tr key={transaction._id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{index + 1}</td>
                        <td className="py-3 px-4">{new Date(transaction.date).toLocaleDateString('vi-VN')}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {transaction.type === 'income' ? 'Thu' : 'Chi'}
                          </span>
                        </td>
                        <td className="py-3 px-4">{transaction.category || '-'}</td>
                        <td className="py-3 px-4">{transaction.description || '-'}</td>
                        <td className={`py-3 px-4 font-semibold ${transaction.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                          {formatCurrency(transaction.amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};
