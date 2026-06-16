'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart3, Download, Filter, Users, Shield, Clock, Calendar } from 'lucide-react';

type TipoReporte = 'empleados' | 'permisos' | 'asignaciones' | 'bloques';
type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado';

export default function ReportesPage() {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('empleados');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [datos, setDatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fechasPersonalizadas, setFechasPersonalizadas] = useState({ inicio: '', fin: '' });
  const [resumen, setResumen] = useState<any>({});

  const obtenerRangoFechas = () => {
    const hoy = new Date();
    let inicio = '';
    let fin = '';

    switch (periodo) {
      case 'hoy':
        inicio = hoy.toISOString().split('T')[0];
        fin = inicio;
        break;
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6);
        inicio = inicioSemana.toISOString().split('T')[0];
        fin = finSemana.toISOString().split('T')[0];
        break;
      case 'mes':
        inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
        break;
      case 'personalizado':
        inicio = fechasPersonalizadas.inicio;
        fin = fechasPersonalizadas.fin;
        break;
    }

    return { inicio, fin };
  };

  const generarReporte = async () => {
    setLoading(true);
    const { inicio, fin } = obtenerRangoFechas();

    try {
      let data: any[] = [];

      if (tipoReporte === 'empleados') {
        const { data: result, error } = await supabase
          .from('employees')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = result || [];
      } else if (tipoReporte === 'permisos') {
        const { data: result, error } = await supabase
          .from('permissions')
          .select('*, employees(nombres, apellidos)')
          .gte('fecha_inicio', inicio)
          .lte('fecha_inicio', fin)
          .order('fecha_solicitud', { ascending: false });
        if (error) throw error;
        data = result || [];
      } else if (tipoReporte === 'asignaciones') {
        const { data: result, error } = await supabase
          .from('assignments')
          .select('*, employees(nombres, apellidos), time_blocks(nombre), work_environments(nombre)')
          .gte('fecha_inicio', inicio)
          .lte('fecha_inicio', fin)
          .order('created_at', { ascending: false });
        if (error) throw error;
        data = result || [];
      } else if (tipoReporte === 'bloques') {
        const { data: result, error } = await supabase
          .from('time_blocks')
          .select('*')
          .order('nombre');
        if (error) throw error;
        data = result || [];
      }

      setDatos(data);
      calcularResumen(data);
    } catch (error: any) {
      console.error('Error generando reporte:', error);
      setDatos([]);
      setResumen({});
    } finally {
      setLoading(false);
    }
  };

  const calcularResumen = (data: any[]) => {
    if (tipoReporte === 'empleados') {
      setResumen({
        total: data.length,
        activos: data.filter((d: any) => d.estado === 'activo').length,
        inactivos: data.filter((d: any) => d.estado === 'inactivo').length,
      });
    } else if (tipoReporte === 'permisos') {
      setResumen({
        total: data.length,
        pendientes: data.filter((d: any) => d.estado === 'pendiente').length,
        aprobados: data.filter((d: any) => d.estado === 'aprobado').length,
        rechazados: data.filter((d: any) => d.estado === 'rechazado').length,
      });
    } else if (tipoReporte === 'asignaciones') {
      setResumen({
        total: data.length,
        activas: data.filter((d: any) => d.estado === 'activo').length,
        finalizadas: data.filter((d: any) => d.estado === 'finalizado').length,
      });
    } else {
      setResumen({ total: data.length });
    }
  };

  useEffect(() => { generarReporte(); }, [tipoReporte, periodo]);

  const exportarCSV = () => {
    if (datos.length === 0) return;
    
    let headers: string[];
    let rows: string[];

    if (tipoReporte === 'empleados') {
      headers = ['RUT', 'Nombres', 'Apellidos', 'Correo', 'Teléfono', 'Nivel Estudios', 'Estado'];
      rows = datos.map((d: any) => 
        [d.rut, d.nombres, d.apellidos, d.correo, d.telefono, d.nivel_estudios, d.estado].map(v => `"${v || ''}"`).join(',')
      );
    } else if (tipoReporte === 'permisos') {
      headers = ['Empleado', 'Fecha Inicio', 'Fecha Fin', 'Tipo', 'Motivo', 'Estado'];
      rows = datos.map((d: any) => 
        [`${d.employees?.nombres} ${d.employees?.apellidos}`, d.fecha_inicio, d.fecha_fin, d.tipo, d.motivo, d.estado].map(v => `"${v || ''}"`).join(',')
      );
    } else if (tipoReporte === 'asignaciones') {
      headers = ['Empleado', 'Bloque Horario', 'Ambiente', 'Fecha Inicio', 'Fecha Fin', 'Estado'];
      rows = datos.map((d: any) => 
        [`${d.employees?.nombres} ${d.employees?.apellidos}`, d.time_blocks?.nombre, d.work_environments?.nombre, d.fecha_inicio, d.fecha_fin, d.estado].map(v => `"${v || ''}"`).join(',')
      );
    } else {
      headers = ['Nombre', 'Hora Inicio', 'Hora Fin', 'Días'];
      rows = datos.map((d: any) => 
        [d.nombre, d.hora_inicio, d.hora_fin, d.dias_semana].map(v => `"${v || ''}"`).join(',')
      );
    }

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const tiposReporte = [
    { id: 'empleados', label: 'Empleados', icon: Users },
    { id: 'permisos', label: 'Permisos', icon: Shield },
    { id: 'asignaciones', label: 'Asignaciones', icon: Clock },
    { id: 'bloques', label: 'Bloques', icon: Calendar },
  ];

  const periodos = [
    { id: 'hoy', label: 'Hoy' },
    { id: 'semana', label: 'Semana' },
    { id: 'mes', label: 'Mes' },
    { id: 'personalizado', label: 'Personalizado' },
  ];

  // Columnas a mostrar según tipo de reporte
  const getColumnasVisibles = () => {
    if (tipoReporte === 'empleados') {
      return ['rut', 'nombres', 'apellidos', 'telefono', 'correo', 'nivel_estudios', 'estado', 'created_at'];
    }
    return null;
  };

  const columnasVisibles = getColumnasVisibles();

  const getLabelColumna = (key: string) => {
    const labels: Record<string, string> = {
      rut: 'RUT',
      nombres: 'Nombres',
      apellidos: 'Apellidos',
      telefono: 'Teléfono',
      correo: 'Correo',
      nivel_estudios: 'Nivel Estudios',
      estado: 'Estado',
      created_at: 'Creado',
    };
    return labels[key] || key.replace('_', ' ');
  };

  return (
    <div className="w-full px-2 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-700" /> Reportes Avanzados
          </h1>
          <p className="text-gray-500 text-sm">Genera reportes por período y exporta a CSV.</p>
        </div>
        <button 
          onClick={exportarCSV} 
          disabled={datos.length === 0} 
          className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm text-sm font-semibold whitespace-nowrap"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Selector de tipo de reporte */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tiposReporte.map((item) => {
          const Icon = item.icon;
          const activo = tipoReporte === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setTipoReporte(item.id as TipoReporte)} 
              className={`p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                activo 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${activo ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filtros de período */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-gray-700 text-sm">Filtrar por período</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {periodos.map((p) => (
            <button 
              key={p.id}
              onClick={() => setPeriodo(p.id as Periodo)}
              className={`px-3 py-2 rounded-lg font-semibold transition-colors text-sm ${
                periodo === p.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {periodo === 'personalizado' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <input 
              type="date" 
              value={fechasPersonalizadas.inicio} 
              onChange={(e) => setFechasPersonalizadas({...fechasPersonalizadas, inicio: e.target.value})} 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
            />
            <input 
              type="date" 
              value={fechasPersonalizadas.fin} 
              onChange={(e) => setFechasPersonalizadas({...fechasPersonalizadas, fin: e.target.value})} 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
            />
          </div>
        )}
      </div>

      {/* Tarjetas de Resumen */}
      {Object.keys(resumen).length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {Object.entries(resumen).map(([key, value]) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">{key}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value as number}</p>
            </div>
          ))}
        </div>
      )}

      {/* Versión Móvil - Cards */}
      <div className="lg:hidden space-y-3 mb-6">
        {loading ? (
          <div className="text-center p-8 text-gray-500">Generando reporte...</div>
        ) : datos.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No hay datos para mostrar.</div>
        ) : (
          datos.map((row: any, i: number) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              {Object.entries(row)
                .filter(([key, _]) => columnasVisibles?.includes(key))
                .map(([key, value]) => (
                  <div key={key} className="flex justify-between py-1 text-sm border-b border-gray-100 last:border-0">
                    <span className="text-gray-500 font-semibold capitalize">{getLabelColumna(key)}:</span>
                    <span className="text-gray-800 text-right ml-2">{String(value)}</span>
                  </div>
                ))}
            </div>
          ))
        )}
      </div>

      {/* Versión Desktop - Tabla optimizada */}
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Generando reporte...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {columnasVisibles?.map(key => (
                    <th key={key} className={`px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap ${
                      key === 'nombres' || key === 'apellidos' ? 'w-32' : 
                      key === 'created_at' ? 'w-24' : ''
                    }`}>
                      {getLabelColumna(key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {datos.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {columnasVisibles?.map(key => (
                      <td key={key} className={`px-3 py-2 text-sm text-gray-700 whitespace-nowrap ${
                        key === 'nombres' || key === 'apellidos' ? 'max-w-[120px] truncate' : 
                        key === 'created_at' ? 'text-xs' : ''
                      }`}>
                        {key === 'created_at' 
                          ? new Date(String(row[key])).toLocaleDateString('es-CL', { 
                              day: '2-digit', 
                              month: '2-digit', 
                              year: '2-digit' 
                            })
                          : String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">Total de registros: {datos.length}</div>
    </div>
  );
}
