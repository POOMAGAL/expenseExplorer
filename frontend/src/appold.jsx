import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardAPI, transactionAPI, categoryAPI } from './services/api';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const ExpenseExplorer = () => {
  const [summary, setSummary] = useState(null);
  const [topCategories, setTopCategories] = useState(null);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [weekdaySpending, setWeekdaySpending] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summaryRes, topCatRes, trendRes, weekdayRes, breakdownRes, recsRes] = await Promise.all([
        dashboardAPI.getSummary(),
        dashboardAPI.getTopCategories(),
        dashboardAPI.getSpendingTrend(),
        dashboardAPI.getSpendingByWeekday(),
        dashboardAPI.getCategoryBreakdown(),
        dashboardAPI.getRecommendations(),
      ]);

      setSummary(summaryRes.data);
      setTopCategories(topCatRes.data);
      setSpendingTrend(trendRes.data);
      setWeekdaySpending(weekdayRes.data);
      setCategoryBreakdown(breakdownRes.data);
      setRecommendations(recsRes.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    
    if (categoryId) {
      try {
        const response = await transactionAPI.list({ category_id: categoryId });
        setCategoryTransactions(response.data);
      } catch (error) {
        console.error('Error loading transactions:', error);
      }
    } else {
      setCategoryTransactions([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Expense Explorer</h2>
          <p className="text-gray-600 mb-6">Upload your first statement to get started!</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
            Upload Statement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Explorer</h1>
            <p className="text-sm text-gray-600 mt-1">Your Personal Financial Dashboard</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all">
            Upload New Statement
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Spending</p>
            <p className="text-3xl font-bold text-gray-900">${summary.total_spending.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-2">{summary.currency}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <p className="text-sm font-medium text-gray-600 mb-2">Categories</p>
            <p className="text-3xl font-bold text-gray-900">{summary.category_count}</p>
            <p className="text-xs text-gray-500 mt-2">Active categories</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <p className="text-sm font-medium text-gray-600 mb-2">Transactions</p>
            <p className="text-3xl font-bold text-gray-900">{summary.transaction_count}</p>
            <p className="text-xs text-gray-500 mt-2">Total transactions</p>
          </div>
        </div>

        {/* Top & Lowest Categories */}
        {topCategories && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 Expenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topCategories.top_5} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Lowest 5 Expenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topCategories.lowest_5} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Spending Trend */}
        {spendingTrend.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Spending Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} name="Total Spending" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spending by Day & Category Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {weekdaySpending.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Spending by Day of Week</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weekdaySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {categoryBreakdown.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Category Distribution</h3>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="total"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Category Explorer */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Category Explorer</h3>
            <select
              value={selectedCategory}
              onChange={handleCategorySelect}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            >
              <option value="">Select a category to explore</option>
              {categoryBreakdown.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.display_name}
                </option>
              ))}
            </select>

            {categoryTransactions.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryTransactions.map((trans) => (
                      <tr key={trans.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trans.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{trans.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          ${parseFloat(trans.amount).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Smart Recommendations */}
        {recommendations && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Smart Recommendations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendations.potential_savings && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2">Potential Savings</h4>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    ${recommendations.potential_savings.toFixed(2)}/mo
                  </p>
                  <p className="text-xs text-gray-600">By optimizing your spending habits</p>
                </div>
              )}

              {recommendations.budget_optimization.length > 0 && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-green-600 mb-2">Budget Optimization</h4>
                  <ul className="space-y-2">
                    {recommendations.budget_optimization.map((rec, idx) => (
                      <li key={idx} className="text-xs text-gray-700">
                        <span className="font-semibold">{rec.category}:</span> {rec.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recommendations.spending_pattern && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-purple-600 mb-2">Spending Pattern</h4>
                  <p className="text-xs text-gray-700 leading-relaxed">{recommendations.spending_pattern}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseExplorer;