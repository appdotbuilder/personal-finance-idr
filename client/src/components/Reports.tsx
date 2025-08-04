
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { MonthlySummary, Transaction, ExportReportInput, GetTransactionsInput } from '../../../server/src/schema';

export function Reports() {
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [exportData, setExportData] = useState<ExportReportInput>({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end_date: new Date(),
    format: 'csv'
  });

  const loadMonthlySummary = useCallback(async () => {
    try {
      setIsLoading(true);
      const summary = await trpc.getMonthlySummary.query({
        month: selectedMonth,
        year: selectedYear
      });
      setMonthlySummary(summary);
    } catch (error) {
      console.error('Failed to load monthly summary:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  const loadTransactionsForReport = useCallback(async () => {
    try {
      const filters: GetTransactionsInput = {
        start_date: exportData.start_date,
        end_date: exportData.end_date,
        limit: 1000 // Get more for reports
      };
      const result = await trpc.getTransactions.query(filters);
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions for report:', error);
    }
  }, [exportData.start_date, exportData.end_date]);

  useEffect(() => {
    loadMonthlySummary();
  }, [loadMonthlySummary]);

  useEffect(() => {
    loadTransactionsForReport();
  }, [loadTransactionsForReport]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const exportResult = await trpc.exportTransactions.query(exportData);
      
      // Create and download file
      const blob = new Blob([exportResult as string], { 
        type: exportData.format === 'csv' ? 'text/csv' : 'application/json' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan-keuangan-${exportData.start_date.toISOString().split('T')[0]}-to-${exportData.end_date.toISOString().split('T')[0]}.${exportData.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setIsExporting(false);
    }
  };

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

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i);
    }
    return years;
  };

  const calculatePeriodSummary = () => {
    const income = transactions.filter((t: Transaction) => t.type === 'income').reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    const expenses = transactions.filter((t: Transaction) => t.type === 'expense').reduce((sum: number, t: Transaction) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  };

  const periodSummary = calculatePeriodSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">📈 Laporan Keuangan</h2>
        <p className="text-gray-600">Lihat ringkasan keuangan dan ekspor laporan</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📊 Ringkasan Bulanan
            </CardTitle>
            <CardDescription>
              Pilih bulan untuk melihat ringkasan keuangan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Bulan</Label>
                <Select 
                  value={selectedMonth.toString() || '1'} 
                  onValueChange={(value: string) => setSelectedMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month: number) => (
                      <SelectItem key={month} value={month.toString()}>
                        {getMonthName(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tahun</Label>
                <Select 
                  value={selectedYear.toString() || new Date().getFullYear().toString()} 
                  onValueChange={(value: string) => setSelectedYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateYearOptions().map((year: number) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : monthlySummary ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    {getMonthName(monthlySummary.month)} {monthlySummary.year}
                  </h3>
                </div>

                <div className="grid gap-4">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800 mb-1">💰 Total Pemasukan</p>
                    <p className="text-2xl font-bold text-green-900">
                
                      {formatCurrency(monthlySummary.total_income)}
                    </p>
                  </div>

                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-800 mb-1">💸 Total Pengeluaran</p>
                    <p className="text-2xl font-bold text-red-900">
                      {formatCurrency(monthlySummary.total_expenses)}
                    </p>
                  </div>

                  <div className={`p-4 rounded-lg ${
                    monthlySummary.remaining_balance >= 0 ? 'bg-blue-50' : 'bg-orange-50'
                  }`}>
                    <p className={`text-sm mb-1 ${
                      monthlySummary.remaining_balance >= 0 ? 'text-blue-800' : 'text-orange-800'
                    }`}>
                      📊 Saldo Tersisa
                    </p>
                    <p className={`text-2xl font-bold ${
                      monthlySummary.remaining_balance >= 0 ? 'text-blue-900' : 'text-orange-900'
                    }`}>
                      {formatCurrency(monthlySummary.remaining_balance)}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-800 mb-1">📝 Jumlah Transaksi</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {monthlySummary.transaction_count}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">📭</p>
                <p>Tidak ada data untuk periode ini</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Export Report */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📤 Ekspor Laporan
            </CardTitle>
            <CardDescription>
              Unduh laporan keuangan dalam format CSV atau JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input
                type="date"
                value={exportData.start_date.toISOString().split('T')[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExportData((prev: ExportReportInput) => ({ 
                    ...prev, 
                    start_date: new Date(e.target.value) 
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal Akhir</Label>
              <Input
                type="date"
                value={exportData.end_date.toISOString().split('T')[0]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setExportData((prev: ExportReportInput) => ({ 
                    ...prev, 
                    end_date: new Date(e.target.value) 
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Format File</Label>
              <Select 
                value={exportData.format || 'csv'} 
                onValueChange={(value: 'csv' | 'json') => 
                  setExportData((prev: ExportReportInput) => ({ 
                    ...prev, 
                    format: value 
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">📊 CSV (Excel)</SelectItem>
                  <SelectItem value="json">🔧 JSON (Data)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-medium">Preview Data:</h4>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between p-2 bg-green-50 rounded">
                  <span>💰 Total Pemasukan:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(periodSummary.income)}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-red-50 rounded">
                  <span>💸 Total Pengeluaran:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(periodSummary.expenses)}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-blue-50 rounded">
                  <span>📊 Saldo:</span>
                  <span className={`font-medium ${
                    periodSummary.balance >= 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {formatCurrency(periodSummary.balance)}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>📝 Jumlah Transaksi:</span>
                  <span className="font-medium">{transactions.length}</span>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleExport} 
              disabled={isExporting || transactions.length === 0}
              className="w-full"
            >
              {isExporting 
                ? 'Mengekspor...' 
                : `📤 Ekspor ${transactions.length} Transaksi`
              }
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
