import React, { useState } from 'react';
import { useShop } from '@/context/ShopContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export const LoginPage: React.FC = () => {
  const { login, settings } = useShop();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      navigate('/dashboard');
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
           <div className="w-16 h-16 bg-black rounded-3xl flex items-center justify-center text-white mx-auto mb-4 shadow-2xl">
              <Store className="h-8 w-8" />
           </div>
           <h1 className="text-2xl font-black uppercase tracking-tight">OmniAdmin</h1>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage Your Empire</p>
        </div>

        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden">
           <CardContent className="p-8 md:p-12">
              <form onSubmit={handleSubmit} className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Admin Email</label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@yourstore.com"
                      className="h-14 rounded-2xl border-2 px-6 font-bold border-gray-100 focus:border-black mb-4"
                    />
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Admin Password</label>
                    <div className="relative">
                       <Input 
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`h-14 rounded-2xl border-2 px-6 font-bold transition-all ${error ? 'border-red-500 animate-shake' : 'border-gray-100 focus:border-black'}`}
                       />
                       <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-black transition-colors"
                       >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                       </button>
                    </div>
                    {error && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-2 text-center">Incorrect Password</p>}
                    <p className="text-[9px] text-gray-400 mt-4 text-center">Sign in with your secure Supabase admin account.</p>
                 </div>

                 <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 transition-transform active:scale-95"
                    style={{ backgroundColor: settings.primaryColor }}
                  >
                    <Lock className="h-4 w-4" />
                    {isSubmitting ? 'Signing In...' : 'Enter Dashboard'}
                 </Button>
              </form>
           </CardContent>
        </Card>
        
        <div className="text-center mt-8">
           <button 
              onClick={() => navigate('/')}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
           >
              Back to Storefront
           </button>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
};
