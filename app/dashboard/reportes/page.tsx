'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { BarChart3, Download, FileText, Filter, Users, Shield, Clock, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TipoReporte = 'empleados' | 'permisos' | 'asignaciones' | 'bloques';
type Periodo = 'hoy' | 'semana' | 'mes' | 'personalizado';

export default function ReportesPage() {
  const [tipoReporte, setTipoReporte] = useState<TipoReporte>('empleados');
  const [periodo, setPeriodo] = useState<Periodo>('mes');
  const [datos, setDatos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fechasPersonalizadas, setFechasPersonalizadas] = useState({ inicio: '', fin: '' });
  const [resumen, setResumen] = useState<any>({});
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    cargarEmpresa();
  }, []);

  const cargarEmpresa = async () => {
    try {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) setEmpresa(data);
    } catch (error) {
      console.error('Error cargando empresa:', error);
    }
  };

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

  const exportarPDF = async () => {
    if (datos.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // ENCABEZADO: Logo y nombre de empresa
    let yPos = 15;

    // Cargar logo si existe
    if (empresa?.logo_url) {
      try {
        const response = await fetch(empresa.logo_url);
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onload = function() {
          const imgData = reader.result as string;
          doc.addImage(imgData, 'PNG', 14, 10, 20, 20);
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error cargando logo:', error);
      }
    }

    // Nombre de empresa
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(empresa?.nombre_fantasia || 'Mi Empresa', 40, 18);
    
    // Razón social
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(empresa?.razon_social || '', 40, 25);

    // Título del reporte
    yPos = 40;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const titulos: Record<string, string> = {
      empleados: 'Reporte de Empleados',
      permisos: 'Reporte de Permisos',
      asignaciones: 'Reporte de Asignaciones',
      bloques: 'Reporte de Bloques Horarios'
    };
    doc.text(titulos[tipoReporte], pageWidth / 2, yPos, { align: 'center' });

    // Período
    yPos += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const { inicio, fin } = obtenerRangoFechas();
    doc.text(`Período: ${inicio} al ${fin}`, pageWidth / 2, yPos, { align: 'center' });

    // Fecha de generación
    yPos += 6;
    doc.text(`Generado: ${new Date().toLocaleString('es-CL')}`, pageWidth / 2, yPos, { align: 'center' });

    // TABLA DE DATOS
    yPos += 10;
    
    let headers: string[][];
    let body: string[][];

    if (tipoReporte === 'empleados') {
      headers = [['RUT', 'Nombres', 'Apellidos', 'Teléfono', 'Correo', 'Estado']];
      body = datos.map((d: any) => [
        d.rut || '',
        d.nombres || '',
        d.apellidos || '',
        d.telefono || '',
        d.correo || '',
        d.estado || ''
      ]);
    } else if (tipoReporte === 'permisos') {
      headers = [['Empleado', 'Fecha Inicio', 'Fecha Fin', 'Tipo', 'Motivo', 'Estado']];
      body = datos.map((d: any) => [
        `${d.employees?.nombres || ''} ${d.employees?.apellidos || ''}`,
        d.fecha_inicio || '',
        d.fecha_fin || '',
        d.tipo || '',
        d.motivo || '',
        d.estado || ''
      ]);
    } else if (tipoReporte === 'asignaciones') {
      headers = [['Empleado', 'Bloque', 'Ambiente', 'Inicio', 'Fin', 'Estado']];
      body = datos.map((d: any) => [
        `${d.employees?.nombres || ''} ${d.employees?.apellidos || ''}`,
        d.time_blocks?.nombre || '',
        d.work_environments?.nombre || '',
        d.fecha_inicio || '',
        d.fecha_fin || '',
        d.estado || ''
      ]);
    } else {
      headers = [['Nombre', 'Hora Inicio', 'Hora Fin', 'Días']];
      body = datos.map((d: any) => [
        d.nombre || '',
        d.hora_inicio || '',
        d.hora_fin || '',
        d.dias_semana || ''
      ]);
    }

    autoTable(doc, {
      head: headers,
      body: body,
      startY: yPos,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 64, 175],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [50, 50, 50]
      },
      alternateRowStyles: {
        fillColor: [240, 240, 240]
      },
      margin: { left: 14, right: 14 },
      styles: {
        cellPadding: 3,
        overflow: 'linebreak'
      }
    });

    // PIE DE PÁGINA: Datos de la empresa
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 100;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Línea separadora
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);

    // Datos de la empresa en texto pequeño
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);

    const pieY = finalY + 15;
    const pieText = [
      empresa?.razon_social || '',
      `RUT: ${empresa?.rut || ''}`,
      `Dirección: ${empresa?.direccion || ''}`,
      `Generado por Sistema de Gestión RRHH - ${new Date().getFullYear()}`
    ];

    pieText.forEach((line, index) => {
      doc.text(line, pageWidth / 2, pieY + (index * 4), { align: 'center' });
    });

    // Número de página
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Guardar PDF
    doc.save(`reporte_${tipoReporte}_${new Date().toISOString().split('T')[0]}.pdf`);
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
          <p className="text-gray-500 text-sm">Genera reportes por período y exporta a CSV o PDF.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportarCSV} 
            disabled={datos.length === 0} 
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm text-sm font-semibold whitespace-nowrap"
          >
            <Download className="w-4 h-4" /> CSV
          </button>
          <button 
            onClick={exportarPDF} 
            disabled={datos.length === 0} 
            className="bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm text-sm font-semibold whitespace-nowrap"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
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

      {/* Versión Desktop - Tabla */}
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
