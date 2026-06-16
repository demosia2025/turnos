// app/dashboard/empleados/carga-masiva/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { ArrowLeft, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Download } from 'lucide-react';
import Link from 'next/link';

export default function CargaMasivaPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [resultados, setResultados] = useState<{ exitosos: number; errores: number; detalles: string[] } | null>(null);

  const procesarArchivo = (file: File) => {
    setFileName(file.name);
    setResultados(null);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreviewData(results.data as any[]);
        },
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        setPreviewData(jsonData as any[]);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert('Formato no soportado. Use CSV o Excel.');
    }
  };

  const guardarEmpleados = async () => {
    setLoading(true);
    const detallesErrores: string[] = [];
    let exitosos = 0;
    const empleadosValidos: any[] = [];

    // Validación de datos
    previewData.forEach((row, index) => {
      const rut = String(row['RUT'] || row['rut'] || '').trim();
      const nombres = String(row['Nombres'] || row['nombres'] || '').trim();
      const apellidos = String(row['Apellidos'] || row['apellidos'] || '').trim();

      if (!rut || !nombres || !apellidos) {
        detallesErrores.push(`Fila ${index + 2}: Faltan datos obligatorios (RUT, Nombres o Apellidos).`);
      } else {
        empleadosValidos.push({
          rut,
          nombres,
          apellidos,
          correo: String(row['Correo'] || row['correo'] || '').trim() || null,
          telefono: String(row['Telefono'] || row['telefono'] || '').trim() || null,
          nivel_estudios: String(row['Nivel_Estudios'] || row['nivel_estudios'] || '').trim() || null,
          fecha_nacimiento: row['Fecha_Nacimiento'] || row['fecha_nacimiento'] || null,
          estado: 'activo',
        });
      }
    });

    if (empleadosValidos.length > 0) {
      const { error } = await supabase.from('employees').insert(empleadosValidos);
      if (error) {
        detallesErrores.push(`Error de base de datos: ${error.message}`);
      } else {
        exitosos = empleadosValidos.length;
      }
    }

    setResultados({
      exitosos,
      errores: detallesErrores.length,
      detalles: detallesErrores,
    });
    setLoading(false);
  };

  return (
    <div>
      <Link href="/dashboard/empleados" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-700 p-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-yellow-400" />
            Carga Masiva de Empleados
          </h1>
          <p className="text-blue-200 text-sm mt-1">Sube un archivo CSV o Excel para registrar múltiples empleados.</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Zona de carga */}
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50 hover:bg-blue-100 transition-colors">
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={(e) => e.target.files?.[0] && procesarArchivo(e.target.files[0])}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-blue-500" />
              <span className="text-lg font-semibold text-blue-800">
                {fileName ? `Archivo seleccionado: ${fileName}` : 'Haz clic para seleccionar tu archivo'}
              </span>
              <span className="text-sm text-gray-500">Formatos soportados: .CSV, .XLSX, .XLS</span>
            </label>
          </div>

          {/* Botón de plantilla */}
          <div className="text-right">
            <button className="text-sm text-blue-600 hover:underline flex items-center gap-1 ml-auto">
              <Download className="w-4 h-4" /> Descargar plantilla de ejemplo
            </button>
          </div>

          {/* Vista Previa */}
          {previewData.length > 0 && !resultados && (
            <div>
              <h3 className="font-bold text-gray-700 mb-2">Vista Previa ({previewData.length} registros encontrados)</h3>
              <div className="overflow-x-auto border rounded-lg max-h-64">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="px-4 py-2 font-semibold text-gray-600">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {previewData.slice(0, 5).map((row, i) => (
                      <tr key={i} className="bg-white">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-4 py-2 text-gray-700">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-1">* Mostrando solo los primeros 5 registros.</p>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={guardarEmpleados}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 transition-all"
                >
                  {loading ? 'Procesando...' : <><CheckCircle className="w-5 h-5" /> Confirmar e Importar</>}
                </button>
              </div>
            </div>
          )}

          {/* Resultados */}
          {resultados && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${resultados.errores === 0 ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                <h3 className="font-bold flex items-center gap-2">
                  {resultados.errores === 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  Proceso Finalizado
                </h3>
                <p className="mt-1">
                  ✅ <strong>{resultados.exitosos}</strong> empleados importados correctamente.
                  {resultados.errores > 0 && <> ❌ <strong>{resultados.errores}</strong> registros con errores.</>}
                </p>
              </div>

              {resultados.detalles.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto">
                  <h4 className="font-bold text-red-700 mb-2">Detalles de errores:</h4>
                  <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                    {resultados.detalles.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <button
                onClick={() => { setPreviewData([]); setResultados(null); setFileName(''); }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
              >
                Cargar otro archivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}