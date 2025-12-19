import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Scissors, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { loginSchema, signupSchema, validateForm } from '@/lib/validations';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupRole, setSignupRole] = useState<'owner' | 'kasir'>('kasir');
  
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateForm(loginSchema, { email: loginEmail, password: loginPassword });
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    
    const validatedData = (validation as { success: true; data: { email: string; password: string } }).data;
    setIsLoading(true);
    
    const { error } = await signIn(validatedData.email, validatedData.password);
    
    if (error) {
      toast.error(error.message === 'Invalid login credentials' 
        ? 'Email atau password salah' 
        : error.message);
    } else {
      toast.success('Login berhasil!');
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateForm(signupSchema, { 
      name: signupName, 
      email: signupEmail, 
      password: signupPassword, 
      role: signupRole 
    });
    if (!validation.success) {
      toast.error((validation as { success: false; error: string }).error);
      return;
    }
    
    const validatedData = (validation as { success: true; data: { name: string; email: string; password: string; role: 'owner' | 'kasir' } }).data;
    setIsLoading(true);
    
    const { error } = await signUp(
      validatedData.email, 
      validatedData.password, 
      validatedData.name, 
      validatedData.role
    );
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Email sudah terdaftar');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Registrasi berhasil! Silakan login.');
      navigate('/dashboard');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary/10">
              <Scissors className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">BarberPOS</h1>
              <p className="text-sm text-muted-foreground">Sistem Manajemen Barbershop</p>
            </div>
          </div>
        </div>

        <Card className="border-0 shadow-lg">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Masuk</TabsTrigger>
                <TabsTrigger value="signup">Daftar</TabsTrigger>
              </TabsList>
            </CardHeader>
            
            <CardContent>
              <TabsContent value="login" className="mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="email@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Masuk'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-0">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nama Lengkap</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="email@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min. 6 karakter"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-role">Role</Label>
                    <Select value={signupRole} onValueChange={(v) => setSignupRole(v as 'owner' | 'kasir')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="kasir">Kasir</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Daftar'}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
