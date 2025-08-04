
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dashboard } from '@/components/Dashboard';
import { TransactionManager } from '@/components/TransactionManager';
import { CategoryManager } from '@/components/CategoryManager';
import { Reports } from '@/components/Reports';
import { AuthForm } from '@/components/AuthForm';
import type { AuthResponse } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);

  const handleLogin = useCallback((userData: AuthResponse['user']) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('finance_token');
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('finance_token');
    if (token) {
      // TODO: Validate token with server in production
      setUser({
        id: 1,
        email: 'user@example.com',
        full_name: 'Finance User',
        created_at: new Date(),
        updated_at: new Date()
      });
    }
  }, []);

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">💰 FinanceTracker</h1>
            <p className="text-gray-600">Kelola keuangan Anda dengan mudah</p>
          </div>
          <AuthForm onLogin={handleLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">💰 FinanceTracker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">Halo, {user.full_name}! 👋</span>
              <Button 
                variant="outline" 
                onClick={handleLogout}
                className="text-sm"
              >
                Keluar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-1/2">
            <TabsTrigger value="dashboard">📊 Dashboard</TabsTrigger>
            <TabsTrigger value="transactions">💳 Transaksi</TabsTrigger>
            <TabsTrigger value="categories">🏷️ Kategori</TabsTrigger>
            <TabsTrigger value="reports">📈 Laporan</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="transactions">
            <TransactionManager />
          </TabsContent>

          <TabsContent value="categories">
            <CategoryManager />
          </TabsContent>

          <TabsContent value="reports">
            <Reports />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;
