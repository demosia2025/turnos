// app/dashboard/perfil/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { User, Lock, Save, AlertCircle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PerfilPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [perfil, setPerfil] = useState({
    nombres: '',
    apellidos: '',
    email: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    passwordNuevo: '',
    passwordConfirmar: ''
  });

  useEffect(() => {
    if (user) {
      setPerfil({
        nombres: user.nombres || '',
        apellidos: user.apellidos || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    if (passwordForm.passwordNuevo.length < 6) {
      setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 6 caracteres.' });
      setLoading(false);
      return;
    }

    if (passwordForm.passwordNuevo !== passwordForm.passwordConfirmar) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.passwordNuevo
      });

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: 'Contraseña actualizada correctamente.' });
      setPasswordForm({ passwordNuevo: '', passwordConfirmar: '' });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message || 'Error al cambiar contraseña' });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link 
          href="/dashboard"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-2 text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <User className="w-6 h-6 text-blue-700" /> Mi Perfil
        </h1>
        <p className="text-gray-500 text-sm">Gestiona tu información personal y contraseña</p>
      </div>

      {mensaje.texto && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensaje.texto}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información del Usuario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-blue-700 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-yellow-400" />
              Información Personal
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombres</label>
              <input
                type="text"
                value={perfil.nombres}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Para cambiar tus datos, contacta al administrador</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Apellidos</label>
              <input
                type="text"
                value={perfil.apellidos}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                value={perfil.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Cambiar Contraseña */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-purple-600 p-4">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Lock className="w-5 h-5 text-yellow-400" />
              Cambiar Contraseña
            </h2>
          </div>
          <form onSubmit={handleCambiarPassword} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva Contraseña *</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.passwordNuevo}
                onChange={(e) => setPasswordForm({...passwordForm, passwordNuevo: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar Nueva Contraseña *</label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.passwordConfirmar}
                onChange={(e) => setPasswordForm({...passwordForm, passwordConfirmar: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="Repite la contraseña"
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <strong>💡 Consejo:</strong> Usa una contraseña segura con mayúsculas, números y símbolos.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Actualizar Contraseña
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}