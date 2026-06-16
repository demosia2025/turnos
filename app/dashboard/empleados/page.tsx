// app/dashboard/empleados/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserPlus, Search, Filter, Edit, Trash2, UserCheck, X, CheckCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Employee {
  id: string;
  rut: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  estado: string;
}

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [bloques, setBloques] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<any>(null);
  const [asignacionForm, setAsignacionForm] = useState({
    time_block_id: '',
    environment_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [asignando, setAsignando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const fetchEmployees = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setEmployees(data);
    setLoading(false);
  };

  const fetchBloquesYAmbientes = async () => {
    const [bloqRes, ambRes] = await Promise.all([
      supabase.from('time_blocks').select('id, nombre').order('nombre'),
      supabase.from('work_environments').select('id, nombre').order('nombre')
    ]);
    if (bloqRes.data) setBloques(bloqRes.data);
    if (ambRes.data) setAmbientes(ambRes.data);
  };

  useEffect(() => {
    fetchEmployees();
    fetchBloquesYAmbientes();
  }, []);

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.rut.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'todos' || emp.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  const abrirModalAsignar = (empleado: any) => {
    setEmpleadoSeleccionado(empleado);
    setAsignacionForm({
      time_block_id: '',
      environment_id: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: ''
    });
    setMensaje({ tipo: '', texto: '' });
    setShowAsignarModal(true);
  };

  const handleAsignar = async (e: React.FormEvent) => {
    e.preventDefault();
    setAsignando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { data: existente } = await supabase
        .from('assignments')
        .select('id')
        .eq('employee_id', empleadoSeleccionado.id)
        .eq('estado', 'activo')
        .single();

      if (existente) {
        const { error } = await supabase
          .from('assignments')
          .update({
            time_block_id: asignacionForm.time_block_id,
            environment_id: asignacionForm.environment_id,
            fecha_inicio: asignacionForm.fecha_inicio,
            fecha_fin: asignacionForm.fecha_fin || null
          })
          .eq('id', existente.id);

        if (error) throw error;
        setMensaje({ tipo: 'exito', texto: 'Asignación actualizada correctamente.' });
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert([{
            employee_id: empleadoSeleccionado.id,
            time_block_id: asignacionForm.time_block_id,
            environment_id: asignacionForm.environment_id,
            fecha_inicio: asignacionForm.fecha_inicio,
            fecha_fin: asignacionForm.fecha_fin || null,
            estado: 'activo'
          }]);

        if (error) throw error;
        setMensaje({ tipo: 'exito', texto: '¡Empleado asignado exitosamente!' });
      }

      setTimeout(() => {
        setShowAsignarModal(false);
        setEmpleadoSeleccionado(null);
      }, 2000);
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setAsignando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Gestión de Empleados</h1>
          <p className="text-gray-500 text-sm">Administra el personal de tu empresa</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/dashboard/empleados/nuevo"
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Empleado</span>
            <span className="sm:hidden">Nuevo</span>
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, apellido o RUT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="activo">Activos</option>
              <option value="inactivo">Inactivos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Versión Desktop - Tabla */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando empleados...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No se encontraron empleados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">RUT</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Correo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Teléfono</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{emp.rut}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{emp.nombres} {emp.apellidos}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{emp.correo || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{emp.telefono || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        emp.estado === 'activo' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {emp.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => abrirModalAsignar(emp)}
                          className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                          title="Asignar turno y ambiente"
                        >
                          <UserCheck className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Versión Móvil - Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No se encontraron empleados.</div>
        ) : (
          filteredEmployees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-gray-800">{emp.nombres} {emp.apellidos}</h3>
                  <p className="text-xs text-gray-500">{emp.rut}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  emp.estado === 'activo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {emp.estado}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600 mb-3">
                <p>📧 {emp.correo || 'Sin correo'}</p>
                <p>📱 {emp.telefono || 'Sin teléfono'}</p>
              </div>
              <div className="flex gap-2 pt-3 border-t">
                <button 
                  onClick={() => abrirModalAsignar(emp)}
                  className="flex-1 bg-green-50 text-green-700 py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                >
                  <UserCheck className="w-4 h-4" /> Asignar
                </button>
                <button className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-semibold">
                  Editar
                </button>
                <button className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg text-sm font-semibold">
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Mostrando {filteredEmployees.length} de {employees.length} empleados
      </div>

      {/* Modal de Asignación */}
      {showAsignarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-green-600 p-4 flex justify-between items-center sticky top-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-yellow-400" />
                Asignar Turno y Ambiente
              </h2>
              <button 
                onClick={() => setShowAsignarModal(false)} 
                className="text-white hover:bg-green-700 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAsignar} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-semibold mb-1">Empleado seleccionado:</p>
                <p className="font-bold text-gray-800">
                  {empleadoSeleccionado?.nombres} {empleadoSeleccionado?.apellidos}
                </p>
                <p className="text-sm text-gray-600">{empleadoSeleccionado?.correo}</p>
              </div>

              {mensaje.texto && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {mensaje.tipo === 'exito' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {mensaje.texto}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bloque Horario *</label>
                <select 
                  required 
                  value={asignacionForm.time_block_id} 
                  onChange={(e) => setAsignacionForm({...asignacionForm, time_block_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Seleccionar bloque horario...</option>
                  {bloques.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Ambiente de Trabajo *</label>
                <select 
                  required 
                  value={asignacionForm.environment_id} 
                  onChange={(e) => setAsignacionForm({...asignacionForm, environment_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Seleccionar ambiente...</option>
                  {ambientes.map(a => (
                    <option key={a.id} value={a.id}>{a.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Inicio *</label>
                  <input 
                    type="date" 
                    required 
                    value={asignacionForm.fecha_inicio} 
                    onChange={(e) => setAsignacionForm({...asignacionForm, fecha_inicio: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Fin (opcional)</label>
                  <input 
                    type="date" 
                    value={asignacionForm.fecha_fin} 
                    onChange={(e) => setAsignacionForm({...asignacionForm, fecha_fin: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={asignando}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-all"
              >
                {asignando ? 'Asignando...' : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Asignar Turno y Ambiente
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
