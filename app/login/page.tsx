// app/login/page.tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Lock, Mail, AlertCircle, Building2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom') || '/configuracion';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError('Credenciales incorrectas. Verifica tu correo y contraseña.');
      setLoading(false);
    } else {
      router.refresh();
      
      setTimeout(() => {
        router.push(redirectedFrom);
      }, 100);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-blue-700">
        
        <div className="bg-blue-700 p-6 text-center">
          <Building2 className="w-12 h-12 text-white mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">Acceso al Sistema</h1>
          <p className="text-blue-200 text-sm mt-1">Gestión de Personal y Turnos</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg flex items-center gap-2 text-sm border border-red-200">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                placeholder="admin@empresa.com" 
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 px-4 rounded-lg transition duration-200 shadow-md"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>

          <div className="text-center text-xs text-gray-500 mt-4">
            <span className="text-yellow-600 font-semibold">Nota:</span> Sistema protegido. 
            <span className="text-red-600 font-semibold ml-1">Acceso no autorizado será reportado.</span>
          </div>
        </form>

        {/* MODIFICADO SEGÚN LA GUÍA: Crédito en el Login fuera del formulario pero dentro de la tarjeta */}
        <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
          <p className="text-[10px] text-gray-400">
            Desarrollado por: <span className="font-bold text-blue-600">RafaG</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500 font-medium">Cargando...</div>}>
      <LoginForm />
    </Suspense>
  );
}
