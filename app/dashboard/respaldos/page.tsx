// app/dashboard/respaldos/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Database, Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function RespaldosPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [progreso, setProgreso] = useState(0);

  const tablas = [
    'companies',
    'employees',
    'work_environments',
    'time_blocks',
    'assignments',
    'permissions',
    'user_profiles'
  ];

  const generarRespaldo = async () => {
    setLoading(true);
    setProgreso(0);
    setMensaje({ tipo: '', texto: '' });

    try {
      const respaldo: any = {
        fecha: new Date().toISOString(),
        version: '1.0',
        datos: {}
      };

      // Exportar cada tabla
      for (let i = 0; i < tablas.length; i++) {
        const tabla = tablas[i];
        const { data, error } = await supabase.from(tabla).select('*');
        
        if (error) {
          throw new Error(`Error al exportar ${tabla}: ${error.message}`);
        }

        respaldo.datos[tabla] = data;
        setProgreso(((i + 1) / tablas.length) * 100);
      }

      // Crear archivo JSON
      const jsonStr = JSON.stringify(respaldo, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMensaje({ tipo: 'exito', texto: `¡Respaldo generado exitosamente! (${tablas.length} tablas exportadas)` });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setLoading(false);
    }
  };

    const restaurarRespaldo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const text = await file.text();
      const respaldo = JSON.parse(text);

      if (!respaldo.datos) {
        throw new Error('El archivo de respaldo no es válido o está corrupto.');
      }

      // Restaurar cada tabla disponible en el archivo usando upsert
      const tablasGuardadas = Object.keys(respaldo.datos);
      for (const tabla of tablasGuardadas) {
        if (respaldo.datos[tabla] && respaldo.datos[tabla].length > 0) {
          const { error } = await supabase
            .from(tabla)
            .upsert(respaldo.datos[tabla]);
          
          if (error) {
            throw new Error(`Error al restaurar la tabla ${tabla}: ${error.message}`);
          }
        }
      }

      setMensaje({ tipo: 'exito', texto: '¡Respaldo restaurado e importado con éxito en la base de datos!' });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setLoading(false);
      // Limpiar el input file
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <Database className="w-8 h-8 text-blue-700" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Copia de Seguridad y Respaldos</h1>
          <p className="text-sm text-gray-500">Exporta e importa la información completa de tu sistema.</p>
        </div>
      </div>

      {mensaje.texto && (
        <div className={`p-4 rounded-lg flex items-center gap-2 text-sm border ${
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {mensaje.tipo === 'error' ? <AlertCircle className="w-5 h-5 flex-shrink-0" /> : <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          <p>{mensaje.texto}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel de Exportación */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Download className="w-5 h-5 text-green-600" /> Generar Copia de Seguridad
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Descarga un archivo JSON comprimido con todos los registros actuales de las {tablas.length} tablas del sistema.
            </p>
          </div>
          
          <button
            onClick={generarRespaldo}
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
            {loading ? `Exportando... (${Math.round(progreso)}%)` : 'Descargar Copia JSON'}
          </button>
        </div>

        {/* Panel de Importación */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Upload className="w-5 h-5 text-blue-600" /> Restaurar Copia de Seguridad
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Sube un archivo de respaldo generado anteriormente para reescribir y actualizar los datos de la plataforma.
            </p>
          </div>

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={restaurarRespaldo}
              disabled={loading}
              id="file-upload"
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className={`w-full text-center border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                loading ? 'bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed' : 'border-blue-300 hover:bg-blue-50 text-blue-700'
              }`}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin mb-1" /> : <Upload className="w-6 h-6 mb-1 text-blue-500" />}
              <span className="text-sm font-semibold">{loading ? 'Procesando datos...' : 'Seleccionar Archivo JSON'}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
