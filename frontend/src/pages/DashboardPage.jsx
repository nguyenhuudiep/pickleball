import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { CardStat } from '../components/CardStat';
import { dashboardAPI, financialAPI } from '../services/api';
import { Users, DollarSign, TrendingUp } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });

  const fetchData = async (startDate = dateFilter.startDate, endDate = dateFilter.endDate) => {
    try {
      setLoading(true);
      const [statsRes, financialRes] = await Promise.all([
        dashboardAPI.getStats(startDate, endDate),
        financialAPI.getStats(startDate, endDate),
      ]);

      setStats(statsRes.data.stats);
      if (financialRes.data.monthlyData) {
        setChartData(financialRes.data.monthlyData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    const clearedFilter = { startDate: '', endDate: '' };
    setDateFilter(clearedFilter);
    fetchData('', '');
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-xl text-gray-600">Đang tải bảng điều khiển...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">Bảng Điều Khiển</h1>
          <p className="text-gray-600 mt-2">Chào mừng đến hệ thống quản lý sân pickleball của bạn</p>
        </div>

        <div className="card">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
            <button onClick={handleApplyFilter} className="btn btn-primary">
              Lọc
            </button>
            <button onClick={handleClearFilter} className="btn btn-secondary">
              Xóa lọc
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardStat
            icon={Users}
            title="Thành Viên Hoạt Động"
            value={stats?.activeMembers || 0}
            color="bg-blue-500"
          />
          <CardStat
            icon={DollarSign}
            title="Tổng Doanh Thu"
            value={`$${(stats?.totalIncome || 0).toLocaleString()}`}
            color="bg-emerald-500"
          />
          <CardStat
            icon={TrendingUp}
            title="Lợi Nhuận"
            value={`$${(stats?.profit || 0).toLocaleString()}`}
            color="bg-orange-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Doanh Thu Hàng Tháng</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Doanh Thu vs Chi Phí</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="#10b981" />
                <Bar dataKey="expense" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
};
