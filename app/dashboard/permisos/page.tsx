// app/dashboard/permisos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Plus, Check, X, Calendar, Filter, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterEstado, setFilterEstado] = useState('todos');
  const [formData, setFormData] = useState({
    employee_id: '',
    fecha_inicio: '',
    fecha_fin: '',
    tipo: 'personal',
    motivo: ''
  });
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  const fetchPermisos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('permissions')
      .select('*, employees(nombres, apellidos, correo)')
      .order('fecha_solicitud', { ascending: false });

    if (data) setPermisos(data);
    setLoading(false);
  };

  const fetchEmpleados = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, nombres, apellidos')
      .eq('estado', 'activo')
      .order('nombres');

    if (data) setEmpleados(data);
  };

  useEffect(() => {
    fetchPermisos();
    fetchEmpleados();
  }, []);

  const permisosFiltrados = permisos.filter(p => 
    filterEstado === 'todos' || p.estado === filterEstado
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { error } = await supabase
        .from('permissions')
        .insert([{
          ...formData,
          estado: 'pendiente',
          fecha_solicitud: new Date().toISOString()
        }]);

      if (error) throw error;

      setMensaje({ tipo: 'exito', texto: 'Permiso solicitado exitosamente.' });
      setFormData({
        employee_id: '',
        fecha_inicio: '',
        fecha_fin: '',
        tipo: 'personal',
        motivo: ''
      });
      setShowModal(false);
      fetchPermisos();
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setEnviando(false);
    }
  };

  const aprobarPermiso = async (id: string) => {
    if (!confirm('¿Aprobar este permiso?')) return;
    
    const { error } = await supabase
      .from('permissions')
      .update({ estado: 'aprobado' })
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      fetchPermisos();
    }
  };

  const rechazarPermiso = async (id: string) => {
    if (!confirm('¿Rechazar este permiso?')) return;
    
    const { error } = await supabase
      .from('permissions')
      .update({ estado: 'rechazado' })
      .eq('id', id);

    if (error) {
      alert('Error: ' + error.message);
    } else {
      fetchPermisos();
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-700" /> Gestión de Permisos
          </h1>
          <p className="text-gray-500 text-sm">Solicita y aprueba permisos de empleados</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Solicitar Permiso</span>
          <span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="aprobado">Aprobados</option>
            <option value="rechazado">Rechazados</option>
          </select>
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

      {/* Versión Móvil - Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center p-8 text-gray-500">Cargando...</div>
        ) : permisosFiltrados.length === 0 ? (
          <div className="text-center p-8 text-gray-500">No hay permisos registrados.</div>
        ) : (
          permisosFiltrados.map((permiso: any) => (
            <div key={permiso.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-gray-800 text-sm">
                    {permiso.employees?.nombres} {permiso.employees?.apellidos}
                  </h3>
                  <p className="text-xs text-gray-500 capitalize">{permiso.tipo}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  permiso.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                  permiso.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {permiso.estado}
                </span>
              </div>
              <div className="text-xs text-gray-600 space-y-1 mb-3">
                <p>📅 {permiso.fecha_inicio} → {permiso.fecha_fin}</p>
                <p> {permiso.motivo}</p>
              </div>
              {permiso.estado === 'pendiente' && (
                <div className="flex gap-2 pt-3 border-t">
                  <button 
                    onClick={() => aprobarPermiso(permiso.id)}
                    className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                  >
                    <Check className="w-4 h-4" /> Aprobar
                  </button>
                  <button 
                    onClick={() => rechazarPermiso(permiso.id)}
                    className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                  >
                    <X className="w-4 h-4" /> Rechazar
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Versión Desktop - Tabla */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Cargando...</div>
        ) : permisosFiltrados.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay permisos registrados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empleado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Inicio</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha Fin</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {permisosFiltrados.map((permiso: any) => (
                  <tr key={permiso.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {permiso.employees?.nombres} {permiso.employees?.apellidos}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 capitalize">{permiso.tipo}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{permiso.fecha_inicio}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{permiso.fecha_fin}</td>
                    <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{permiso.motivo}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        permiso.estado === 'aprobado' ? 'bg-green-100 text-green-700' :
                        permiso.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {permiso.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {permiso.estado === 'pendiente' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => aprobarPermiso(permiso.id)}
                            className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg"
                            title="Aprobar"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => rechazarPermiso(permiso.id)}
                            className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg"
                            title="Rechazar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Total: {permisosFiltrados.length} permisos
      </div>

      {/* Modal Solicitar Permiso */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-yellow-500 p-4 flex justify-between items-center sticky top-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Solicitar Permiso
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white hover:bg-yellow-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Empleado *</label>
                <select 
                  required 
                  value={formData.employee_id} 
                  onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                >
                  <option value="">Seleccionar empleado...</option>
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombres} {emp.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Inicio *</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.fecha_inicio} 
                    onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Fin *</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.fecha_fin} 
                    onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Permiso *</label>
                <select 
                  required 
                  value={formData.tipo} 
                  onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                >
                  <option value="personal">Personal</option>
                  <option value="medico">Médico</option>
                  <option value="familiar">Familiar</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo *</label>
                <textarea 
                  required 
                  value={formData.motivo} 
                  onChange={(e) => setFormData({...formData, motivo: e.target.value})}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none"
                  placeholder="Describe el motivo del permiso..."
                ></textarea>
              </div>

              <button 
                type="submit" 
                disabled={enviando}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-400 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Enviar Solicitud
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
