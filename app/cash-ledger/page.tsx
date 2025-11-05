'use client';

import { useEffect, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  DollarSign,
  Filter,
  TrendingUp,
  TrendingDown,
  Receipt,
} from 'lucide-react';
import Link from 'next/link';
import { useSortable } from '@/lib/useSortable';
import { SortableHeader } from '@/app/components/SortableHeader';

interface LedgerTransaction {
  id: string;
  transaction_id: string;
  date: string;
  type: 'DEBIT' | 'CREDIT';
  category: string;
  description: string;
  amount: number;
  payment_method: string | null;
  reference: string;
  linked_id: string;
  linked_type: 'payment' | 'sale';
  balance: number;
  created_at: string;
}

interface LedgerSummary {
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  debitCount: number;
  creditCount: number;
}

export default function CashLedgerPage() {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Get first and last day of current month for default date range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: firstDay.toISOString().split('T')[0],
      endDate: lastDay.toISOString().split('T')[0],
    };
  };

  useEffect(() => {
    const range = getCurrentMonthRange();
    setDateFrom(range.startDate);
    setDateTo(range.endDate);
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchLedger();
    }
  }, [dateFrom, dateTo]);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const response = await fetch(`/api/cash-ledger?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cash ledger');
      }

      const data = await response.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error('Error fetching cash ledger:', error);
      alert('Failed to load cash ledger');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const { sortedData: sortedTransactions, handleSort, sortConfig } = useSortable<LedgerTransaction>(
    transactions,
    { key: 'date', direction: 'desc' }
  );

  return (
    <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cash Ledger</h1>
          <p className="text-gray-600">Track all revenue and expenditure transactions</p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(summary.totalCredits)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{summary.creditCount} transactions</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Expenditure</span>
                <ArrowDownCircle className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.totalDebits)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{summary.debitCount} transactions</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Net Balance</span>
                {summary.netBalance >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
              </div>
              <div
                className={`text-2xl font-bold ${summary.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {formatCurrency(summary.netBalance)}
              </div>
              <div className="text-xs text-gray-500 mt-1">Current period</div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600">Total Transactions</span>
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {summary.debitCount + summary.creditCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">All transactions</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date From
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date To
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchLedger}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Apply Filter
            </button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          ) : sortedTransactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Receipt className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p>No transactions found for the selected period</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <SortableHeader
                      label="Date"
                      sortKey="date"
                      currentSortKey={sortConfig?.key as string || null}
                      sortDirection={sortConfig?.direction || null}
                      onSort={handleSort}
                      align="left"
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    />
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit (₹)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit (₹)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance (₹)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === 'CREDIT'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {transaction.type === 'CREDIT' ? (
                            <>
                              <ArrowUpCircle className="h-3 w-3" />
                              CR
                            </>
                          ) : (
                            <>
                              <ArrowDownCircle className="h-3 w-3" />
                              DR
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {transaction.reference}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {transaction.description}
                        {transaction.payment_method && (
                          <span className="text-xs text-gray-500 ml-2">
                            ({transaction.payment_method})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                        {transaction.type === 'DEBIT' ? (
                          transaction.linked_type === 'payment' ? (
                            <Link
                              href={`/payments/${transaction.linked_id}`}
                              className="text-red-600 hover:text-red-800 hover:underline"
                            >
                              {formatCurrency(transaction.amount)}
                            </Link>
                          ) : (
                            <span className="text-red-600">
                              {formatCurrency(transaction.amount)}
                            </span>
                          )
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                        {transaction.type === 'CREDIT' ? (
                          <span className="text-green-600">
                            {formatCurrency(transaction.amount)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold">
                        <span
                          className={transaction.balance >= 0 ? 'text-green-600' : 'text-red-600'}
                        >
                          {formatCurrency(transaction.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
    </div>
  );
}
