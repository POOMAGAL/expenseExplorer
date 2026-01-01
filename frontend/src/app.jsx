import React, { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { dashboardAPI, transactionAPI, authAPI, statementAPI, isAuthenticated } from './services/api';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// 🔥 NEW: Currency Symbol Mapper
const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'JPY': '¥',
    'CNY': '¥',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'Fr',
    'AED': 'د.إ',
    'QAR': 'ر.ق',
    'SAR': 'ر.س'
  };
  return symbols[currencyCode] || currencyCode + ' ';
};

// 🔥 NEW: Format currency helper
const formatCurrency = (amount, currencyCode = 'USD') => {
  const symbol = getCurrencySymbol(currencyCode);
  return `${symbol}${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Login Component
const Login = ({ onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authAPI.login(email, password);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Expense Explorer</h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Register Component
const Register = ({ onRegister, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password2: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.password2) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authAPI.register(formData);
      await authAPI.login(formData.email, formData.password);
      onRegister();
    } catch (err) {
      const errors = err.response?.data;
      if (errors) {
        const errorMessages = Object.entries(errors)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        setError(errorMessages);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join Expense Explorer today</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 whitespace-pre-line text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-semibold mb-2">Confirm Password</label>
            <input
              type="password"
              name="password2"
              value={formData.password2}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// Upload Component
const UploadStatement = ({ onClose, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop().toLowerCase();
      if (ext !== 'csv' && ext !== 'pdf') {
        setError('Only CSV and PDF files are supported');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('currency', currency);

    try {
      const response = await statementAPI.upload(formData);
      alert(response.data.message);
      onUploadSuccess(response.data.statement_id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Statement</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-semibold mb-2">Select File (CSV or PDF)</label>
          <input
            type="file"
            accept=".csv,.pdf"
            onChange={handleFileChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          {file && <p className="text-sm text-gray-600 mt-2">Selected: {file.name}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-semibold mb-2">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="USD">USD - US Dollar ($)</option>
            <option value="EUR">EUR - Euro (€)</option>
            <option value="GBP">GBP - British Pound (£)</option>
            <option value="INR">INR - Indian Rupee (₹)</option>
            <option value="AED">AED - UAE Dirham (د.إ)</option>
            <option value="QAR">QAR - Qatari Riyal (ر.ق)</option>
            <option value="SAR">SAR - Saudi Riyal (ر.س)</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Statement Manager Component
const StatementManager = ({ statements, selectedStatementId, onSelectStatement, onDeleteStatement, onClose }) => {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (statementId) => {
    if (!window.confirm('Are you sure you want to delete this statement? All associated transactions will be deleted.')) {
      return;
    }

    setDeleting(statementId);
    try {
      await statementAPI.delete(statementId);
      onDeleteStatement(statementId);
    } catch (error) {
      alert('Failed to delete statement');
      console.error(error);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Manage Statements</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {statements.length === 0 ? (
          <p className="text-gray-600 text-center py-8">No statements uploaded yet.</p>
        ) : (
          <div className="space-y-3">
            {statements.map((stmt) => (
              <div
                key={stmt.id}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                  selectedStatementId === stmt.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{stmt.file_name}</h3>
                  <p className="text-sm text-gray-600">
                    {stmt.transaction_count} transactions • {stmt.currency} • Uploaded: {new Date(stmt.uploaded_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      onSelectStatement(stmt.id);
                      onClose();
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                  >
                    View
                  </button>
                  <button
                    onClick={() => handleDelete(stmt.id)}
                    disabled={deleting === stmt.id}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50"
                  >
                    {deleting === stmt.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ onLogout }) => {
  const [statements, setStatements] = useState([]);
  const [selectedStatementId, setSelectedStatementId] = useState('');
  const [showStatementManager, setShowStatementManager] = useState(false);
  
  const [summary, setSummary] = useState(null);
  const [topCategories, setTopCategories] = useState(null);
  const [spendingTrend, setSpendingTrend] = useState([]);
  const [weekdaySpending, setWeekdaySpending] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const statementsRes = await statementAPI.list();
      setStatements(statementsRes.data);
      
      if (statementsRes.data.length > 0) {
        const firstId = statementsRes.data[0].id;
        setSelectedStatementId(firstId);
        await loadDashboardData(firstId);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      setLoading(false);
    }
  };

  const loadDashboardData = async (statementId = selectedStatementId) => {
    try {
      setLoading(true);
      
      const params = statementId ? { statement_id: statementId } : {};
      
      const [summaryRes, topCatRes, trendRes, weekdayRes, breakdownRes, recsRes] = await Promise.all([
        dashboardAPI.getSummary(params),
        dashboardAPI.getTopCategories(params),
        dashboardAPI.getSpendingTrend(params),
        dashboardAPI.getSpendingByWeekday(params),
        dashboardAPI.getCategoryBreakdown(params),
        dashboardAPI.getRecommendations(params),
      ]);

      setSummary(summaryRes.data);
      setTopCategories(topCatRes.data);
      setSpendingTrend(trendRes.data);
      setWeekdaySpending(weekdayRes.data);
      setCategoryBreakdown(breakdownRes.data);
      setRecommendations(recsRes.data);
      
      setSelectedCategory('');
      setCategoryTransactions([]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (e) => {
    const categoryId = e.target.value;
    setSelectedCategory(categoryId);
    
    if (categoryId) {
      try {
        const params = { category_id: categoryId };
        
        if (selectedStatementId) {
          params.statement_id = selectedStatementId;
        }
        
        const response = await transactionAPI.list(params);
        setCategoryTransactions(response.data);
      } catch (error) {
        console.error('Error loading transactions:', error);
        setCategoryTransactions([]);
      }
    } else {
      setCategoryTransactions([]);
    }
  };

  const handleDeleteStatement = async (deletedId) => {
    const updatedStatements = statements.filter(s => s.id !== deletedId);
    setStatements(updatedStatements);
    
    if (selectedStatementId === deletedId) {
      if (updatedStatements.length > 0) {
        const newId = updatedStatements[0].id;
        setSelectedStatementId(newId);
        await loadDashboardData(newId);
      } else {
        setSelectedStatementId('');
        setSummary(null);
      }
    }
  };

  const handleLogout = () => {
    authAPI.logout();
    onLogout();
  };

  // 🔥 Get current currency
  const currency = summary?.currency || 'USD';
  const currencySymbol = getCurrencySymbol(currency);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!summary || summary.transaction_count === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <header className="bg-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Expense Explorer</h1>
            <button
              onClick={handleLogout}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </header>
        
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center bg-white p-12 rounded-xl shadow-lg max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to Expense Explorer!</h2>
            <p className="text-gray-600 mb-8">Upload your first credit card statement to start analyzing your expenses.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg"
            >
              Upload Statement
            </button>
          </div>
        </div>

        {showUpload && (
          <UploadStatement
            onClose={() => setShowUpload(false)}
            onUploadSuccess={async (newStatementId) => {
              const statementsRes = await statementAPI.list();
              setStatements(statementsRes.data);
              setSelectedStatementId(newStatementId);
              await loadDashboardData(newStatementId);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expense Explorer</h1>
            <p className="text-sm text-gray-600 mt-1">Your Personal Financial Dashboard</p>
          </div>
          <div className="flex gap-4 items-center">
            {statements.length > 0 && (
              <select
                value={selectedStatementId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedStatementId(id);
                  await loadDashboardData(id);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white shadow-sm"
              >
                <option value="">All Statements</option>
                {statements.map((stmt) => (
                  <option key={stmt.id} value={stmt.id}>
                    {stmt.file_name} ({stmt.transaction_count} tx)
                  </option>
                ))}
              </select>
            )}
            
            <button
              onClick={() => setShowStatementManager(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md"
            >
              Manage Statements
            </button>
            
            <button
              onClick={() => setShowUpload(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-md"
            >
              Upload New
            </button>
            <button
              onClick={handleLogout}
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-3 rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 🔥 UPDATED: Summary Cards with dynamic currency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-gray-600 mb-2">Total Spending</p>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(summary.total_spending, currency)}
            </p>
            <p className="text-xs text-gray-500 mt-2">{currency}</p>
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

        {/* 🔥 UPDATED: Charts with dynamic currency */}
        {topCategories && topCategories.top_5.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top 5 Expenses</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topCategories.top_5} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                  <Bar dataKey="total" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {topCategories.lowest_5.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Lowest 5 Expenses</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={topCategories.lowest_5} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                    <Bar dataKey="total" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {spendingTrend.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Spending Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={spendingTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} name="Total Spending" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {weekdaySpending.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Spending by Day</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={weekdaySpending}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value, currency)} />
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
                    label={({ display_name, percent }) => `${display_name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    dataKey="total"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value, currency)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* 🔥 UPDATED: Category Explorer with dynamic currency */}
        {categoryBreakdown.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Category Explorer
              {selectedStatementId && (
                <span className="text-sm font-normal text-gray-600 ml-2">
                  (Current Statement Only)
                </span>
              )}
            </h3>
            <select
              value={selectedCategory}
              onChange={handleCategorySelect}
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg mb-4"
            >
              <option value="">Select a category</option>
              {categoryBreakdown.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.display_name} ({formatCurrency(cat.total, currency)})
                </option>
              ))}
            </select>

            {categoryTransactions.length > 0 && (
              <div className="overflow-x-auto">
                <p className="text-sm text-gray-600 mb-3">
                  Showing {categoryTransactions.length} transaction(s)
                </p>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryTransactions.map((trans) => (
                      <tr key={trans.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{trans.date}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{trans.description}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                          {formatCurrency(trans.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {selectedCategory && categoryTransactions.length === 0 && (
              <p className="text-gray-600 text-center py-4">No transactions found in this category.</p>
            )}
          </div>
        )}

        {/* 🔥 UPDATED: Recommendations with dynamic currency */}
        {recommendations && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Smart Recommendations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {recommendations.potential_savings && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-blue-600 mb-2">Potential Savings</h4>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(recommendations.potential_savings, currency)}/mo
                  </p>
                  <p className="text-xs text-gray-600">By optimizing spending</p>
                </div>
              )}

              {recommendations.total_transactions && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-green-600 mb-2">Total Transactions</h4>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {recommendations.total_transactions}
                  </p>
                  <p className="text-xs text-gray-600">In this period</p>
                </div>
              )}

              {recommendations.average_transaction && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-orange-600 mb-2">Avg Transaction</h4>
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {formatCurrency(recommendations.average_transaction, currency)}
                  </p>
                  <p className="text-xs text-gray-600">Per transaction</p>
                </div>
              )}

              <div className="bg-white rounded-lg p-5 shadow-md">
                <h4 className="text-sm font-semibold text-purple-600 mb-2">Active Categories</h4>
                <p className="text-2xl font-bold text-gray-900 mb-2">
                  {categoryBreakdown.length}
                </p>
                <p className="text-xs text-gray-600">Categories used</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.budget_optimization && recommendations.budget_optimization.length > 0 && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-green-600 mb-3">💡 Budget Optimization Tips</h4>
                  <ul className="space-y-2">
                    {recommendations.budget_optimization.map((rec, idx) => (
                      <li key={idx} className="text-xs text-gray-700 border-l-2 border-green-500 pl-3 py-1">
                        <span className="font-semibold text-green-700">{rec.category}:</span> {rec.suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recommendations.spending_pattern && (
                <div className="bg-white rounded-lg p-5 shadow-md">
                  <h4 className="text-sm font-semibold text-purple-600 mb-3">📊 Spending Pattern Analysis</h4>
                  <p className="text-xs text-gray-700 leading-relaxed">{recommendations.spending_pattern}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showUpload && (
        <UploadStatement
          onClose={() => setShowUpload(false)}
          onUploadSuccess={async (newStatementId) => {
            const statementsRes = await statementAPI.list();
            setStatements(statementsRes.data);
            setSelectedStatementId(newStatementId);
            await loadDashboardData(newStatementId);
          }}
        />
      )}

      {showStatementManager && (
        <StatementManager
          statements={statements}
          selectedStatementId={selectedStatementId}
          onSelectStatement={async (id) => {
            setSelectedStatementId(id);
            await loadDashboardData(id);
          }}
          onDeleteStatement={handleDeleteStatement}
          onClose={() => setShowStatementManager(false)}
        />
      )}
    </div>
  );
};

// Main App Component
const App = () => {
  const [authState, setAuthState] = useState('checking');

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthState('authenticated');
    } else {
      setAuthState('login');
    }
  }, []);

  if (authState === 'checking') {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (authState === 'login') {
    return (
      <Login
        onLogin={() => setAuthState('authenticated')}
        onSwitchToRegister={() => setAuthState('register')}
      />
    );
  }

  if (authState === 'register') {
    return (
      <Register
        onRegister={() => setAuthState('authenticated')}
        onSwitchToLogin={() => setAuthState('login')}
      />
    );
  }

  return (
    <Dashboard
      onLogout={() => setAuthState('login')}
    />
  );
};

export default App;
