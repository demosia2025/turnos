// app/dashboard/rotacion/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shuffle, Play, CheckCircle, AlertCircle, Users, Clock, ArrowRightLeft, Loader2 } from 'lucide-react';

export default function RotacionPage() {
  const [bloques, setBloques] = useState<any[]>([]);
  const [asignacionesActivas, setAsignacionesActivas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [resultado, setResultado] = useState<any>(null);
  const [vista, setVista] = useState<'config' | 'preview' | 'resultado'>('config');
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // Cargar bloques horarios ordenados por hora de inicio
      const { data: bloquesData } = await supabase
        .from('time_blocks')
        .select('*')
        .order('hora_inicio');
      
      if (bloquesData) setBloques(bloquesData);

      // Cargar asignaciones activas con sus relaciones
      const { data: asignacionesData } = await supabase
        .from('assignments')
        .select(`
          id,
          employee_id,
          time_block_id,
          environment_id,
          fecha_inicio,
          employees (nombres, apellidos, correo),
          time_blocks (nombre, hora_inicio, hora_fin),
          work_environments (nombre)
        `)
        .eq('estado', 'activo');

      if (asignacionesData) setAsignacionesActivas(asignacionesData);
      setLoading(false);
    };

    fetchData();
  }, []);

  // Calcular la próxima fecha de inicio automáticamente (próximo lunes)
  useEffect(() => {
    if (!fechaInicio) {
      const hoy = new Date();
      const diasHastaLunes = (1 - hoy.getDay() + 7) % 7 || 7;
      const proximoLunes = new Date(hoy);
      proximoLunes.setDate(hoy.getDate() + diasHastaLunes);
      setFechaInicio(proximoLunes.toISOString().split('T')[0]);
    }
  }, []);

  const generarRotacion = () => {
    if (bloques.length < 2) {
      setResultado({ tipo: 'error', texto: 'Se necesitan al menos 2 bloques horarios para rotar.' });
      return;
    }

    // Dividir bloques en tempranos y tardíos
    const mitad = Math.ceil(bloques.length / 2);
    const bloquesTempranos = bloques.slice(0, mitad);
    const bloquesTardios = bloques.slice(mitad);

    const rotaciones: any[] = [];

    asignacionesActivas.forEach((asig) => {
      const horaInicioActual = asig.time_blocks?.hora_inicio;
      const esTemprano = bloquesTempranos.some(b => b.hora_inicio === horaInicioActual);
      
      // Seleccionar bloque opuesto
      let nuevoBloque;
      if (esTemprano && bloquesTardios.length > 0) {
        // Asignar un bloque tardío (rotación inversa)
        nuevoBloque = bloquesTardios[Math.floor(Math.random() * bloquesTardios.length)];
      } else if (!esTemprano && bloquesTempranos.length > 0) {
        // Asignar un bloque temprano
        nuevoBloque = bloquesTempranos[Math.floor(Math.random() * bloquesTempranos.length)];
      } else {
        // Si no hay opuesto, mantener el mismo
        nuevoBloque = bloques.find(b => b.id === asig.time_block_id);
      }

      rotaciones.push({
        asignacionId: asig.id,
        empleadoId: asig.employee_id,
        empleadoNombre: `${asig.employees?.nombres} ${asig.employees?.apellidos}`,
        bloqueActual: asig.time_blocks?.nombre,
        horaActual: asig.time_blocks?.hora_inicio,
        nuevoBloqueId: nuevoBloque.id,
        nuevoBloqueNombre: nuevoBloque.nombre,
        nuevaHora: nuevoBloque.hora_inicio,
        ambienteId: asig.environment_id,
        ambienteNombre: asig.work_environments?.nombre,
        tipo: esTemprano ? 'Temprano → Tardío' : 'Tardío → Temprano'
      });
    });

    setPreview(rotaciones);
    setVista('preview');
  };

  const aplicarRotacion = async () => {
    setGenerando(true);
    setResultado(null);

    try {
      let exitosas = 0;
      let errores = 0;

      for (const rot of preview) {
        // 1. Finalizar la asignación anterior
        const { error: errorUpdate } = await supabase
          .from('assignments')
          .update({ 
            estado: 'finalizado',
            fecha_fin: fechaInicio
          })
          .eq('id', rot.asignacionId);

        if (errorUpdate) {
          errores++;
          continue;
        }

        // 2. Crear nueva asignación con el bloque rotado
        const { error: errorInsert } = await supabase
          .from('assignments')
          .insert([{
            employee_id: rot.empleadoId,
            time_block_id: rot.nuevoBloqueId,
            environment_id: rot.ambienteId,
            fecha_inicio: fechaInicio,
            fecha_fin: null,
            estado: 'activo'
          }]);

        if (errorInsert) {
          errores++;
        } else {
          exitosas++;
        }
      }

      setResultado({
        tipo: 'exito',
        texto: `Rotación completada: ${exitosas} asignaciones actualizadas, ${errores} errores.`,
        exitosas,
        errores
      });
      setVista('resultado');
      
      // Recargar datos
      const { data } = await supabase
        .from('assignments')
        .select(`id, employee_id, time_block_id, environment_id, fecha_inicio, employees (nombres, apellidos), time_blocks (nombre, hora_inicio), work_environments (nombre)`)
        .eq('estado', 'activo');
      
      if (data) setAsignacionesActivas(data);
    } catch (error: any) {
      setResultado({ tipo: 'error', texto: error.message });
    } finally {
      setGenerando(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <ArrowRightLeft className="w-6 h-6 text-blue-700" /> Rotación Inteligente de Horarios
        </h1>
        <p className="text-gray-500 text-sm">
          Rota automáticamente los turnos: los empleados con turno temprano pasarán a tarde y viceversa.
        </p>
      </div>

      {resultado && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
          resultado.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {resultado.tipo === 'exito' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {resultado.texto}
        </div>
      )}

      {vista === 'config' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
          <div className="bg-blue-700 p-6">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-yellow-400" />
              Configurar Rotación
            </h2>
            <p className="text-blue-200 text-sm mt-1">
              El sistema rotará los turnos de {asignacionesActivas.length} empleados con asignación activa.
            </p>
          </div>

          <div className="p-6 space-y-5">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-bold text-yellow-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> ¿Cómo funciona?
              </h3>
              <ul className="text-sm text-yellow-900 space-y-1">
                <li>• Los bloques horarios se dividen en <strong>tempranos</strong> y <strong>tardíos</strong>.</li>
                <li>• Los empleados con turno temprano recibirán un turno tardío la próxima semana.</li>
                <li>• Los empleados con turno tardío recibirán un turno temprano.</li>
                <li>• Las asignaciones actuales se marcarán como <strong>finalizadas</strong>.</li>
                <li>• Se crearán nuevas asignaciones con la fecha de inicio que elijas.</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Fecha de inicio de la nueva rotación *
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Por defecto es el próximo lunes.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-semibold">Bloques Tempranos</p>
                <p className="text-2xl font-bold text-blue-800">{Math.ceil(bloques.length / 2)}</p>
                <p className="text-xs text-blue-600">
                  {bloques.slice(0, Math.ceil(bloques.length / 2)).map(b => b.nombre).join(', ')}
                </p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-xs text-purple-600 font-semibold">Bloques Tardíos</p>
                <p className="text-2xl font-bold text-purple-800">{Math.floor(bloques.length / 2)}</p>
                <p className="text-xs text-purple-600">
                  {bloques.slice(Math.ceil(bloques.length / 2)).map(b => b.nombre).join(', ')}
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-700">
                <strong>{asignacionesActivas.length}</strong> empleados serán rotados.
              </p>
            </div>

            <button
              onClick={generarRotacion}
              disabled={asignacionesActivas.length === 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-5 h-5" />
              Generar Vista Previa de Rotación
            </button>
          </div>
        </div>
      )}

      {vista === 'preview' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-yellow-500 p-6">
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Vista Previa de la Rotación
            </h2>
            <p className="text-yellow-100 text-sm mt-1">
              Revisa los cambios antes de aplicarlos.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empleado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ambiente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Turno Actual</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nuevo Turno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.map((p, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.empleadoNombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{p.ambienteNombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-semibold">{p.bloqueActual}</div>
                      <div className="text-xs text-gray-500">{p.horaActual}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowRightLeft className="w-4 h-4 text-blue-600 mx-auto" />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-semibold text-green-700">{p.nuevoBloqueNombre}</div>
                      <div className="text-xs text-gray-500">{p.nuevaHora}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        p.tipo.includes('Temprano → Tardío') 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {p.tipo}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 border-t bg-gray-50 flex gap-3">
            <button
              onClick={() => setVista('config')}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-lg"
            >
              Volver
            </button>
            <button
              onClick={aplicarRotacion}
              disabled={generando}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2"
            >
              {generando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Confirmar y Aplicar Rotación
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {vista === 'resultado' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center max-w-2xl mx-auto">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Rotación Completada!</h2>
          <p className="text-gray-600 mb-6">{resultado.texto}</p>
          <button
            onClick={() => { setVista('config'); setResultado(null); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg"
          >
            Realizar otra rotación
          </button>
        </div>
      )}
    </div>
  );
}