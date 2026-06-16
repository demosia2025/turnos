// app/dashboard/reportes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart3, Download, Filter, Users, Shield, Clock, Calendar, TrendingUp } from 'lucide-react';

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
      setResumen({
        total: data.length,
      });
    }
  };

  useEffect(() => { 
    generarReporte(); 
  }, [tipoReporte, periodo]);

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

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-700" /> Reportes Avanzados
          </h1>
          <p className="text-gray-500 text-sm">Genera reportes por período y exporta a CSV.</p>
        </div>
        <button onClick={exportarCSV} disabled={datos.length === 0} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Selector de tipo de reporte */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { id: 'empleados', label: 'Empleados', icon: Users, color: 'blue' },
          { id: 'permisos', label: 'Permisos', icon: Shield, color: 'yellow' },
          { id: 'asignaciones', label: 'Asignaciones', icon: Clock, color: 'green' },
          { id: 'bloques', label: 'Bloques Horarios', icon: Calendar, color: 'blue' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button 
              key={item.id} 
              onClick={() => setTipoReporte(item.id as TipoReporte)} 
              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${tipoReporte === item.id ? `border-${item.color}-500 bg-${item.color}-50` : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <Icon className={`w-6 h-6 ${tipoReporte === item.id ? `text-${item.color}-600` : 'text-gray-400'}`} />
              <span className="font-semibold text-gray-700">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filtros de período */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-semibold text-gray-700">Filtrar por período</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <button 
            onClick={() => setPeriodo('hoy')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${periodo === 'hoy' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Hoy
          </button>
          <button 
            onClick={() => setPeriodo('semana')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${periodo === 'semana' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Esta Semana
          </button>
          <button 
            onClick={() => setPeriodo('mes')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${periodo === 'mes' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Este Mes
          </button>
          <button 
            onClick={() => setPeriodo('personalizado')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${periodo === 'personalizado' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            Personalizado
          </button>
          <button 
            onClick={generarReporte}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg"
          >
            Aplicar
          </button>
        </div>

        {periodo === 'personalizado' && (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <input 
              type="date" 
              value={fechasPersonalizadas.inicio} 
              onChange={(e) => setFechasPersonalizadas({...fechasPersonalizadas, inicio: e.target.value})} 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
            <input 
              type="date" 
              value={fechasPersonalizadas.fin} 
              onChange={(e) => setFechasPersonalizadas({...fechasPersonalizadas, fin: e.target.value})} 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
        )}
      </div>

      {/* Tarjetas de Resumen */}
      {Object.keys(resumen).length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Object.entries(resumen).map(([key, value]) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold">{key}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{value as number}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center text-gray-500">Generando reporte...</div> :
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {datos.length > 0 && Object.keys(datos[0]).filter(k => typeof datos[0][k] !== 'object').map(key => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{key.replace('_', ' ')}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {datos.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    {Object.entries(row).filter(([_, v]) => typeof v !== 'object').map(([key, value]) => (
                      <td key={key} className="px-6 py-4 text-sm text-gray-700">{String(value)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>

      <div className="mt-4 text-sm text-gray-500">Total de registros: {datos.length}</div>
    </div>
  );
}