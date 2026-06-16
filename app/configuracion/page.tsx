// app/configuracion/page.tsx
'use client';

// 1. MODIFICADO: Añadido 'useEffect' desde react e 'useRouter' desde next/navigation
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Building2, Save, AlertCircle, Upload, Image as ImageIcon } from 'lucide-react';
// 2. AÑADIDO: Importar el hook useAuth según la guía
import { useAuth } from '@/lib/useAuth';

export default function ConfiguracionEmpresa() {
  const router = useRouter();
  // 3. AÑADIDO: Obtener propiedades de autenticación
  const { isAdmin, loading: authLoading } = useAuth();

  // 4. MODIFICADO: Se renombró a 'formLoading' para que no choque con la variable de arriba
  const [formLoading, setFormLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [archivoLogo, setArchivoLogo] = useState<File | null>(null);
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);

  // 5. AÑADIDO: Redirigir al dashboard si no es administrador y terminó de cargar
  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  // Pantalla de carga mientras se verifica el rol del usuario
  if (authLoading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Cargando...</div>;
  }

  // Si no es administrador, no renderizar nada en pantalla mientras se ejecuta el redireccionamiento
  if (!isAdmin) {
    return null;
  }

  const manejarCambioArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // Máximo 2MB
        setMensaje({ tipo: 'error', texto: 'El archivo es demasiado grande. Máximo 2MB.' });
        return;
      }
      setArchivoLogo(file);
      setVistaPrevia(URL.createObjectURL(file));
      setMensaje({ tipo: '', texto: '' });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setMensaje({ tipo: '', texto: '' });

    const formData = new FormData(e.currentTarget);
    let logoUrl = formData.get('logo_url_temp') as string; // URL existente si la hubiera

    try {
      // 1. Subir el logo si se seleccionó uno nuevo
      if (archivoLogo) {
        const fileExt = archivoLogo.name.split('.').pop();
        const fileName = `logo-empresa-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, archivoLogo);

        if (uploadError) throw uploadError;

        // Obtener la URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName);
        
        logoUrl = publicUrl;
      }

      // 2. Guardar datos en la tabla 'companies'
      const data = {
        rut: formData.get('rut'),
        razon_social: formData.get('razon_social'),
        direccion: formData.get('direccion'),
        nombre_fantasia: formData.get('nombre_fantasia'),
        logo_url: logoUrl,
      };

      // Usamos upsert para actualizar si ya existe, o insertar si es nuevo
      const { error: dbError } = await supabase
        .from('companies')
        .upsert(data, { onConflict: 'rut' });

      if (dbError) throw dbError;

      setMensaje({ tipo: 'exito', texto: '¡Empresa configurada y logo guardado exitosamente!' });
      setArchivoLogo(null);
      setVistaPrevia(null);
      (e.target as HTMLFormElement).reset();

    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + error.message });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border-t-4 border-blue-700">
        
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-blue-700" />
            <h1 className="text-2xl font-bold text-gray-800">Configurar Empresa</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {mensaje.texto && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              <AlertCircle className="w-5 h-5" />
              {mensaje.texto}
            </div>
          )}

          {/* Sección de Logo */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
            <label className="block text-sm font-semibold text-blue-800 mb-2">Logo de la Empresa</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-white border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center overflow-hidden">
                {vistaPrevia ? (
                  <img src={vistaPrevia} alt="Vista previa" className="w-full h-full object-contain" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-blue-300" />
                )}
              </div>
              <div className="flex-1">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={manejarCambioArchivo}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
                />
                <p className="text-xs text-gray-500 mt-1">PNG, JPG o SVG. Máximo 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">RUT Empresa *</label>
              <input name="rut" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="76.123.456-7" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre de Fantasía *</label>
              <input name="nombre_fantasia" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: TechSolutions" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Razón Social *</label>
            <input name="razon_social" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: TechSolutions SpA" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección</label>
            <input name="direccion" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Av. Principal 123, Ciudad" />
          </div>

          {/* Campo oculto para mantener la URL si no se cambia el logo */}
          <input type="hidden" name="logo_url_temp" value="" />

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={formLoading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md"
            >
              {formLoading ? (
                <span className="animate-pulse">Guardando y subiendo...</span>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Configuración
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
