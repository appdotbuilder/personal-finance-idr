
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { LoginInput, RegisterInput, AuthResponse } from '../../../server/src/schema';

interface AuthFormProps {
  onLogin: (user: AuthResponse['user']) => void;
}

export function AuthForm({ onLogin }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<RegisterInput>({
    email: '',
    password: '',
    full_name: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await trpc.login.mutate(loginData);
      localStorage.setItem('finance_token', response.token);
      onLogin(response.user);
    } catch (error) {
      setError('Email atau password salah. Silakan coba lagi.');
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await trpc.register.mutate(registerData);
      localStorage.setItem('finance_token', response.token);
      onLogin(response.user);
    } catch (error) {
      setError('Gagal membuat akun. Email mungkin sudah terdaftar.');
      console.error('Registration failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Selamat Datang!</CardTitle>
        <CardDescription>
          Masuk ke akun Anda atau buat akun baru untuk mulai mengelola keuangan
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Masuk</TabsTrigger>
            <TabsTrigger value="register">Daftar</TabsTrigger>
          </TabsList>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="nama@email.com"
                  value={loginData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Password Anda"
                  value={loginData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Memproses...' : 'Masuk'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="register-name">Nama Lengkap</Label>
                <Input
                  id="register-name"
                  type="text"
                  placeholder="Nama lengkap Anda"
                  value={registerData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: RegisterInput) => ({ ...prev, full_name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="nama@email.com"
                  value={registerData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: RegisterInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={registerData.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setRegisterData((prev: RegisterInput) => ({ ...prev, password: e.target.value }))
                  }
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Membuat Akun...' : 'Daftar'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
