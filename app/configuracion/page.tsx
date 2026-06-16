// app/configuracion/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { Building2, Save, Upload, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ConfiguracionEmpresa() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formData, setFormData] = useState({
    rut: '',
    razon_social: '',
    nombre_fantasia: '',
    direccion: '',
    logo_url: ''
  });

  // Redirigir si no es admin
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  // Cargar datos existentes
  useEffect(() => {
    const cargarEmpresa = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .limit(1)
          .single();

        if (data) {
          setFormData({
            rut: data.rut || '',
            razon_social: data.razon_social || '',
            nombre_fantasia: data.nombre_fantasia || '',
            direccion: data.direccion || '',
            logo_url: data.logo_url || ''
          });
        }
      } catch (error) {
        console.error('Error cargando empresa:', error);
      }
    };

    if (isAdmin) {
      cargarEmpresa();
    }
  }, [isAdmin]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // Verificar si ya existe un registro
      const { data: existente } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (existente) {
        // Actualizar registro existente
        const { error } = await supabase
          .from('companies')
          .update(formData)
          .eq('id', existente.id);

        if (error) throw error;
        setMensaje({ tipo: 'exito', texto: 'Configuración actualizada correctamente.' });
      } else {
        // Crear nuevo registro
        const { error } = await supabase
          .from('companies')
          .insert([formData]);

        if (error) throw error;
        setMensaje({ tipo: 'exito', texto: 'Configuración guardada correctamente.' });
      }

      // Recargar datos
      const { data: datosActualizados } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
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
      console.error('Error guardando configuración:', error);
      
      // Manejar error de duplicado
      if (error.code === '23505' || error.message.includes('duplicate')) {
        setMensaje({ 
          tipo: 'error', 
          texto: 'Ya existe una empresa con este RUT registrado. Si deseas actualizar los datos, usa la opción de editar.' 
        });
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: error.message || 'Error al guardar la configuración. Verifica los datos e intenta nuevamente.' 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubirLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      // Subir imagen a Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from('company-assets')
        .getPublicUrl(filePath);

      setFormData({ ...formData, logo_url: urlData.publicUrl });
      setMensaje({ tipo: 'exito', texto: 'Logo subido correctamente.' });
    } catch (error: any) {
      console.error('Error subiendo logo:', error);
      setMensaje({ tipo: 'error', texto: 'Error al subir el logo.' });
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
      {/* Header con botón de volver */}
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
          <p className="text-gray-500 text-sm">Configura los datos de tu empresa</p>
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
        <div className="bg-blue-700 p-6">
          <h2 className="text-white font-bold text-lg">Datos de la Empresa</h2>
          <p className="text-blue-200 text-sm mt-1">Esta información aparecerá en todo el sistema</p>
        </div>

        <form onSubmit={handleGuardar} className="p-6 space-y-5">
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
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Configuración
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
          </div>
        </form>
      </div>
    </div>
  );
}
