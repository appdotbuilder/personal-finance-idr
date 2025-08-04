
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { Transaction, CreateTransactionInput, Category, GetTransactionsInput, UpdateTransactionInput } from '../../../server/src/schema';

export function TransactionManager() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [formData, setFormData] = useState<CreateTransactionInput>({
    category_id: 0,
    amount: 0,
    description: '',
    transaction_date: new Date(),
    type: 'expense'
  });

  const [filters, setFilters] = useState<GetTransactionsInput>({
    type: undefined,
    category_id: undefined,
    limit: 50
  });

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getTransactions.query(filters);
      setTransactions(result);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  const loadCategories = useCallback(async () => {
    try {
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadCategories();
  }, [loadTransactions, loadCategories]);

  const resetForm = () => {
    setFormData({
      category_id: 0,
      amount: 0,
      description: '',
      transaction_date: new Date(),
      type: 'expense'
    });
    setEditingTransaction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingTransaction) {
        const updateData: UpdateTransactionInput = {
          id: editingTransaction.id,
          ...formData
        };
        const updatedTransaction = await trpc.updateTransaction.mutate(updateData);
        setTransactions((prev: Transaction[]) => 
          prev.map((t: Transaction) => t.id === editingTransaction.id ? updatedTransaction : t)
        );
      } else {
        const newTransaction = await trpc.createTransaction.mutate(formData);
        setTransactions((prev: Transaction[]) => [newTransaction, ...prev]);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      category_id: transaction.category_id,
      amount: transaction.amount,
      description: transaction.description,
      transaction_date: transaction.transaction_date,
      type: transaction.type
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (transactionId: number) => {
    try {
      await trpc.deleteTransaction.mutate({ id: transactionId });
      setTransactions((prev: Transaction[]) => 
        prev.filter((t: Transaction) => t.id !== transactionId)
      );
    } catch (error) {
      console.error('Failed to delete transaction:', error);
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

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.name || 'Unknown';
  };

  const getCategoryColor = (categoryId: number) => {
    const category = categories.find((c: Category) => c.id === categoryId);
    return category?.color || '#6b7280';
  };

  const incomeCategories = categories.filter((c: Category) => c.type === 'income');
  const expenseCategories = categories.filter((c: Category) => c.type === 'expense');
  const availableCategories = formData.type === 'income' ? incomeCategories : expenseCategories;

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">💳 Kelola Transaksi</h2>
          <p className="text-gray-600">Tambah, edit, dan kelola semua transaksi Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              ➕ Tambah Transaksi
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTransaction ? '✏️ Edit Transaksi' : '➕ Tambah Transaksi Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingTransaction 
                  ? 'Ubah detail transaksi yang sudah ada'
                  : 'Isi form di bawah untuk menambahkan transaksi baru'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="type">Jenis Transaksi</Label>
                <Select 
                  value={formData.type || 'expense'} 
                  onValueChange={(value: 'income' | 'expense') => 
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      type: value,
                      category_id: 0 // Reset category when type changes
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih jenis transaksi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">💰 Pemasukan</SelectItem>
                    <SelectItem value="expense">💸 Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Kategori</Label>
                <Select 
                  value={formData.category_id > 0 ? formData.category_id.toString() : ''} 
                  onValueChange={(value: string) => 
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      category_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCategories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: category.color || '#6b7280' }}
                          ></div>
                          {category.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Jumlah (IDR)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      amount: parseFloat(e.target.value) || 0 
                    }))
                  }
                  min="0"
                  step="1000"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Deskripsi</Label>
                <Textarea
                  id="description"
                  placeholder="Masukkan deskripsi transaksi..."
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      description: e.target.value 
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Tanggal Transaksi</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.transaction_date.toISOString().split('T')[0]}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateTransactionInput) => ({ 
                      ...prev, 
                      transaction_date: new Date(e.target.value) 
                    }))
                  }
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || formData.category_id === 0}
                >
                  {isLoading 
                    ? 'Menyimpan...' 
                    : editingTransaction 
                      ? 'Update Transaksi' 
                      : 'Tambah Transaksi'
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">🔍 Filter Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Jenis Transaksi</Label>
              <Select 
                value={filters.type || 'all'} 
                onValueChange={(value: string) => 
                  setFilters((prev: GetTransactionsInput) => ({ 
                    ...prev, 
                    type: value === 'all' ? undefined : value as 'income' | 'expense'
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Transaksi</SelectItem>
                  <SelectItem value="income">💰 Pemasukan</SelectItem>
                  <SelectItem value="expense">💸 Pengeluaran</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select 
                value={filters.category_id?.toString() || 'all'} 
                onValueChange={(value: string) => 
                  setFilters((prev: GetTransactionsInput) => ({ 
                    ...prev, 
                    category_id: value === 'all' ? undefined : parseInt(value)
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {categories.map((category: Category) => (
                    <SelectItem key={category.id} value={category.id.toString()}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color || '#6b7280' }}
                        ></div>
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Limit</Label>
              <Select 
                value={filters.limit?.toString() || '50'} 
                onValueChange={(value: string) => 
                  setFilters((prev: GetTransactionsInput) => ({ 
                    ...prev, 
                    limit: parseInt(value)
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25 transaksi</SelectItem>
                  <SelectItem value="50">50 transaksi</SelectItem>
                  <SelectItem value="100">100 transaksi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            📋 Daftar Transaksi
            <Badge variant="secondary">
              {transactions.length} transaksi
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-6xl mb-4">💭</p>
              <p className="text-xl font-medium text-gray-600 mb-2">Belum ada transaksi</p>
              <p className="text-gray-500 mb-6">
                Mulai tambahkan transaksi pertama Anda untuk melacak keuangan
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                ➕ Tambah Transaksi Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction: Transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getCategoryColor(transaction.category_id) }}
                    ></div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge 
                          variant={transaction.type === 'income' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {transaction.type === 'income' ? '💰' : '💸'} {getCategoryName(transaction.category_id)}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {transaction.transaction_date.toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                      </p>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(transaction)}
                        className="h-8 w-8 p-0"
                      >
                        ✏️
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            🗑️
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Transaksi</AlertDialogTitle>
                            <AlertDialogDescription>
                              Apakah Anda yakin ingin menghapus transaksi "{transaction.description}"?
                              Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(transaction.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
