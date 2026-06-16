'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { Building2, Save, Upload, ArrowLeft, AlertCircle, CheckCircle, Loader2, Plus, Edit } from 'lucide-react';
import Link from 'next/link';

export default function ConfiguracionEmpresa() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [empresaExiste, setEmpresaExiste] = useState(false);
  const [formData, setFormData] = useState({
    rut: '',
    razon_social: '',
    nombre_fantasia: '',
    direccion: '',
    logo_url: ''
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    verificarEmpresa();
  }, [isAdmin]);

  const verificarEmpresa = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (data && !error) {
        setEmpresaExiste(true);
        setFormData({
          rut: data.rut || '',
          razon_social: data.razon_social || '',
          nombre_fantasia: data.nombre_fantasia || '',
          direccion: data.direccion || '',
          logo_url: data.logo_url || ''
        });
      } else {
        setEmpresaExiste(false);
      }
    } catch (error) {
      console.error('Error verificando empresa:', error);
      setEmpresaExiste(false);
    }
  };

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const insertData = {
        rut: formData.rut,
        razon_social: formData.razon_social,
        nombre_fantasia: formData.nombre_fantasia,
        direccion: formData.direccion,
        logo_url: formData.logo_url
      };

      const { error } = await supabase
        .from('companies')
        .insert([insertData]);

      if (error) {
        if (error.code === '23505' || error.message.includes('duplicate')) {
          setMensaje({ 
            tipo: 'error', 
            texto: 'Ya existe una empresa con este RUT. Recarga la página.' 
          });
        } else {
          throw error;
        }
      } else {
        setMensaje({ tipo: 'exito', texto: 'Empresa registrada correctamente.' });
        setEmpresaExiste(true);
      }
    } catch (error: any) {
      console.error('Error creando empresa:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: error.message || 'Error al registrar la empresa.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActualizar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { data: empresaData } = await supabase
        .from('companies')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!empresaData) {
        throw new Error('No se encontró la empresa');
      }

      const updateData = {
        rut: formData.rut,
        razon_social: formData.razon_social,
        nombre_fantasia: formData.nombre_fantasia,
        direccion: formData.direccion,
        logo_url: formData.logo_url
      };

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', empresaData.id);

      if (error) throw error;
      
      setMensaje({ tipo: 'exito', texto: 'Datos actualizados correctamente.' });
      
      const { data: datosActualizados } = await supabase
        .from('companies')
        .select('*')
        .eq('id', empresaData.id)
        .single();

      if (datosActualizados) {
        setFormData({
          rut: datosActualizados.rut || '',
          razon_social: datosActualizados.razon_social || '',
          nombre_fantasia: datosActualizados.nombre_fantasia || '',
          direccion: datosActualizados.direccion || '',
          logo_url: datosActualizados.logo_url || ''
        });
      }
    } catch (error: any) {
      console.error('Error actualizando empresa:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: error.message || 'Error al actualizar los datos.' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMensaje({ tipo: 'error', texto: 'El archivo debe ser una imagen.' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMensaje({ tipo: 'error', texto: 'La imagen no debe superar 5MB.' });
      return;
    }

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          setMensaje({ 
            tipo: 'error', 
            texto: 'Error: El archivo ya existe. Intenta con otro nombre.' 
          });
        } else {
          throw uploadError;
        }
      } else {
        const { data: urlData } = supabase.storage
          .from('company-assets')
          .getPublicUrl(filePath);

        setFormData({ ...formData, logo_url: urlData.publicUrl });
        setMensaje({ tipo: 'exito', texto: 'Logo subido correctamente.' });
      }
    } catch (error: any) {
      console.error('Error subiendo logo:', error);
      setMensaje({ 
        tipo: 'error', 
        texto: error.message || 'Error al subir el logo. Verifica que el bucket "company-assets" exista.' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="p-8 text-center">Cargando...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link 
            href="/dashboard"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-2 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-700" /> Configuración de Empresa
          </h1>
          <p className="text-gray-500 text-sm">
            {empresaExiste 
              ? 'Actualiza los datos de tu empresa' 
              : 'Registra los datos de tu empresa por primera vez'}
          </p>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
        <div className={`p-6 ${empresaExiste ? 'bg-green-700' : 'bg-blue-700'}`}>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-yellow-400" />
            {empresaExiste ? 'Actualizar Datos de la Empresa' : 'Registrar Datos de la Empresa'}
          </h2>
          <p className="text-blue-200 text-sm mt-1">
            {empresaExiste 
              ? 'Modifica la información de tu empresa' 
              : 'Esta información aparecerá en todo el sistema'}
          </p>
        </div>

        <form onSubmit={empresaExiste ? handleActualizar : handleCrear} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">RUT de la Empresa *</label>
            <input
              type="text"
              required
              value={formData.rut}
              onChange={(e) => setFormData({...formData, rut: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="12.345.678-9"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social *</label>
            <input
              type="text"
              required
              value={formData.razon_social}
              onChange={(e) => setFormData({...formData, razon_social: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nombre legal de la empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de Fantasía *</label>
            <input
              type="text"
              required
              value={formData.nombre_fantasia}
              onChange={(e) => setFormData({...formData, nombre_fantasia: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Nombre comercial visible"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección</label>
            <input
              type="text"
              value={formData.direccion}
              onChange={(e) => setFormData({...formData, direccion: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Dirección de la empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Logo de la Empresa</label>
            <div className="flex items-center gap-4">
              {formData.logo_url && (
                <img 
                  src={formData.logo_url} 
                  alt="Logo" 
                  className="w-20 h-20 object-contain border border-gray-300 rounded-lg p-2"
                />
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSubirLogo}
                  className="hidden"
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
                  className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  {formData.logo_url ? 'Cambiar Logo' : 'Subir Logo'}
                </label>
                {formData.logo_url && (
                  <p className="text-xs text-gray-500 mt-1">Logo actual cargado</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {empresaExiste ? (
              <>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Edit className="w-5 h-5" />
                      Actualizar Datos
                    </>
                  )}
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Cancelar
                </Link>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Cargar Datos de Empresa
                    </>
                  )}
                </button>
                <Link
                  href="/dashboard"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Cancelar
                </Link>
              </>
            )}
          </div>
        </form>
      </div>

      {empresaExiste && (
        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Información:</strong> Los datos de empresa ya están registrados. 
            Usa el botón "Actualizar Datos" para modificarlos.
          </p>
        </div>
      )}
    </div>
  );
}
