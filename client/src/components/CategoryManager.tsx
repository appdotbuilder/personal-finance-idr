
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import type { Category, CreateCategoryInput } from '../../../server/src/schema';

const PREDEFINED_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
  '#ec4899', '#f43f5e', '#64748b', '#6b7280', '#374151'
];

export function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [formData, setFormData] = useState<CreateCategoryInput>({
    name: '',
    type: 'expense',
    color: PREDEFINED_COLORS[0]
  });

  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getCategories.query();
      setCategories(result);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      color: PREDEFINED_COLORS[0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const newCategory = await trpc.createCategory.mutate(formData);
      setCategories((prev: Category[]) => [newCategory, ...prev]);
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const incomeCategories = categories.filter((c: Category) => c.type === 'income');
  const expenseCategories = categories.filter((c: Category) => c.type === 'expense');

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">🏷️ Kelola Kategori</h2>
          <p className="text-gray-600">Buat dan kelola kategori untuk mengorganisir transaksi Anda</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              ➕ Tambah Kategori
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>➕ Tambah Kategori Baru</DialogTitle>
              <DialogDescription>
                Buat kategori baru untuk mengorganisir transaksi Anda
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Kategori</Label>
                <Input
                  id="name"
                  placeholder="Contoh: Makanan, Transport, Gaji"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCategoryInput) => ({ 
                      ...prev, 
                      name: e.target.value 
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Jenis Kategori</Label>
                <Select 
                  value={formData.type || 'expense'} 
                  onValueChange={(value: 'income' | 'expense') => 
                    setFormData((prev: CreateCategoryInput) => ({ 
                      ...prev, 
                      type: value 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">💰 Pemasukan</SelectItem>
                    <SelectItem value="expense">💸 Pengeluaran</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Warna Kategori</Label>
                <div className="grid grid-cols-10 gap-2">
                  {PREDEFINED_COLORS.map((color: string) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        formData.color === color 
                          ? 'border-gray-900 scale-110' 
                          : 'border-gray-300 hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => 
                        setFormData((prev: CreateCategoryInput) => ({ 
                          ...prev, 
                          color: color 
                        }))
                      }
                    />
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isLoading || !formData.name.trim()}>
                  {isLoading ? 'Membuat...' : 'Buat Kategori'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Income Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💰 Kategori Pemasukan
            </CardTitle>
            <CardDescription>
              {incomeCategories.length === 0 
                ? 'Belum ada kategori pemasukan' 
                : `${incomeCategories.length} kategori pemasukan`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {incomeCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">💭</p>
                <p>Belum ada kategori pemasukan</p>
                <p className="text-sm">Buat kategori seperti "Gaji", "Bonus", dll.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incomeCategories.map((category: Category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color || '#22c55e' }}
                      ></div>
                      <div>
                        <p className="font-medium text-sm">{category.name}</p>
                        <p className="text-xs text-gray-600">
                          Dibuat {category.created_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="default" className="bg-green-600">
                      💰 Pemasukan
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💸 Kategori Pengeluaran
            </CardTitle>
            <CardDescription>
              {expenseCategories.length === 0 
                ? 'Belum ada kategori pengeluaran' 
                : `${expenseCategories.length} kategori pengeluaran`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {expenseCategories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-2">💭</p>
                <p>Belum ada kategori pengeluaran</p>
                <p className="text-sm">Buat kategori seperti "Makanan", "Transport", dll.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenseCategories.map((category: Category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: category.color || '#ef4444' }}
                      ></div>
                      <div>
                        <p className="font-medium text-sm">{category.name}</p>
                        <p className="text-xs text-gray-600">
                          Dibuat {category.created_at.toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <Badge variant="destructive">
                      💸 Pengeluaran
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Ringkasan Kategori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{categories.length}</p>
              <p className="text-sm text-blue-800">Total Kategori</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{incomeCategories.length}</p>
              <p className="text-sm text-green-800">Kategori Pemasukan</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{expenseCategories.length}</p>
              <p className="text-sm text-red-800">Kategori Pengeluaran</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
