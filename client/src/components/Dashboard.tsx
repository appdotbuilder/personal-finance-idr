
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { DashboardData } from '../../../server/src/schema';

export function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await trpc.getDashboardData.query();
      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getMonthName = (month: number) => {
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return monthNames[month - 1];
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Gagal memuat data dashboard</p>
      </div>
    );
  }

  const { current_month_summary, recent_transactions, categories_summary } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Monthly Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-800">
              💰 Pemasukan Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {formatCurrency(current_month_summary.total_income)}
            </div>
            <p className="text-xs text-green-700 mt-1">
              {getMonthName(current_month_summary.month)} {current_month_summary.year}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-800">
              💸 Pengeluaran Bulan Ini
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(current_month_summary.total_expenses)}
            </div>
            <p className="text-xs text-red-700 mt-1">
              {getMonthName(current_month_summary.month)} {current_month_summary.year}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800">
              📊 Saldo Tersisa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              current_month_summary.remaining_balance >= 0 ? 'text-blue-900' : 'text-red-900'
            }`}>
              {formatCurrency(current_month_summary.remaining_balance)}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Pemasukan - Pengeluaran
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800">
              📝 Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {current_month_summary.transaction_count}
            </div>
            <p className="text-xs text-purple-700 mt-1">
              Transaksi bulan ini
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🕒 Transaksi Terbaru
            </CardTitle>
            <CardDescription>
              {recent_transactions.length === 0 
                ? 'Belum ada transaksi' 
                : `${recent_transactions.length} transaksi terbaru`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recent_transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">💭</p>
                <p>Belum ada transaksi</p>
                <p className="text-sm">Mulai tambahkan transaksi pertama Anda!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent_transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-gray-600">
                        {transaction.transaction_date.toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={transaction.type === 'income' ? 'default' : 'destructive'}
                        className="mb-1"
                      >
                        {transaction.type === 'income' ? '💰' : '💸'}
                      </Badge>
                      <p className={`font-bold text-sm ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Categories Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🏷️ Ringkasan Kategori
            </CardTitle>
            <CardDescription>
              {categories_summary.length === 0 
                ? 'Belum ada kategori' 
                : 'Pengeluaran per kategori bulan ini'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories_summary.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">📊</p>
                <p>Belum ada data kategori</p>
                <p className="text-sm">Buat kategori dan mulai bertransaksi!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {categories_summary.slice(0, 5).map((item) => (
                  <div key={item.category.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: item.category.color || '#6b7280' }}
                      ></div>
                      <div>
                        <p className="font-medium text-sm">{item.category.name}</p>
                        <p className="text-xs text-gray-600">
                          {item.transaction_count} transaksi
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm">
                        {formatCurrency(item.total_amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
