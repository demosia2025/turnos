// app/dashboard/empleados/nuevo/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function NuevoEmpleadoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    const formData = new FormData(e.currentTarget);
    const data = {
      rut: formData.get('rut'),
      nombres: formData.get('nombres'),
      apellidos: formData.get('apellidos'),
      telefono: formData.get('telefono'),
      correo: formData.get('correo'),
      nivel_estudios: formData.get('nivel_estudios'),
      fecha_nacimiento: formData.get('fecha_nacimiento') || null,
      observaciones: formData.get('observaciones'),
      estado: 'activo',
    };

    const { error } = await supabase.from('employees').insert([data]);

    if (error) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + error.message });
    } else {
      setMensaje({ tipo: 'exito', texto: '¡Empleado agregado exitosamente!' });
      setTimeout(() => router.push('/dashboard/empleados'), 1500);
    }
    setLoading(false);
  };

  return (
    <div>
      <Link href="/dashboard/empleados" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Volver al listado
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-700 p-6">
          <h1 className="text-2xl font-bold text-white">Agregar Nuevo Empleado</h1>
          <p className="text-blue-200 text-sm mt-1">Complete los datos del trabajador</p>
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">RUT *</label>
              <input name="rut" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="12.345.678-9" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico</label>
              <input name="correo" type="email" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="empleado@empresa.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombres *</label>
              <input name="nombres" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Apellidos *</label>
              <input name="apellidos" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
              <input name="telefono" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="+56 9 1234 5678" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nivel de Estudios</label>
              <select name="nivel_estudios" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Seleccionar...</option>
                <option value="basica">Educación Básica</option>
                <option value="media">Educación Media</option>
                <option value="tecnica">Educación Técnica</option>
                <option value="universitaria">Educación Universitaria</option>
                <option value="postgrado">Postgrado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Nacimiento</label>
              <input name="fecha_nacimiento" type="date" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Observaciones / Otro</label>
            <textarea name="observaciones" rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Información adicional..."></textarea>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-all shadow-sm"
            >
              {loading ? 'Guardando...' : (
                <>
                  <Save className="w-5 h-5" />
                  Guardar Empleado
                </>
              )}
            </button>
            <Link 
              href="/dashboard/empleados"
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}