// app/dashboard/permisos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Shield, Plus, CheckCircle, XCircle, Clock, AlertCircle, Check, X, FileText } from 'lucide-react';

export default function PermisosPage() {
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [permisos, setPermisos] = useState<any[]>([]);
  const [vista, setVista] = useState<'lista' | 'nuevo'>('lista');
  const [loading, setLoading] = useState(true);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  const [formData, setFormData] = useState({
    employee_id: '', fecha_inicio: '', fecha_fin: '', tipo: 'personal', motivo: ''
  });
  
  const [modalComentario, setModalComentario] = useState<{ open: boolean; permiso: any; estado: string }>({ open: false, permiso: null, estado: '' });
  const [comentario, setComentario] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const [empRes, permRes] = await Promise.all([
      supabase.from('employees').select('id, nombres, apellidos, correo').eq('estado', 'activo'),
      supabase.from('permissions').select('*, employees(nombres, apellidos, correo)').order('created_at', { ascending: false })
    ]);
    if (empRes.data) setEmpleados(empRes.data);
    if (permRes.data) setPermisos(permRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const empleado = empleados.find(emp => emp.id === formData.employee_id);
    
    const res = await fetch('/api/permisos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formData, employee_email: empleado?.correo, employee_name: `${empleado?.nombres} ${empleado?.apellidos}` })
    });

    if (res.ok) {
      setMensaje({ tipo: 'exito', texto: 'Permiso solicitado correctamente.' });
      setFormData({ employee_id: '', fecha_inicio: '', fecha_fin: '', tipo: 'personal', motivo: '' });
      setVista('lista');
      fetchData();
    } else {
      setMensaje({ tipo: 'error', texto: 'Error al solicitar permiso.' });
    }
    setLoading(false);
  };

  const handleAprobarRechazar = async () => {
    const { permiso, estado } = modalComentario;
    const empleado = permiso.employees;
    
    const res = await fetch('/api/permisos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        permission_id: permiso.id,
        estado,
        comentario,
        employee_email: empleado?.correo,
        employee_name: `${empleado?.nombres} ${empleado?.apellidos}`,
        fecha_inicio: permiso.fecha_inicio,
        fecha_fin: permiso.fecha_fin
      })
    });

    if (res.ok) {
      setMensaje({ tipo: 'exito', texto: `Permiso ${estado} y notificación enviada.` });
      fetchData();
    }
    setModalComentario({ open: false, permiso: null, estado: '' });
    setComentario('');
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'aprobado': return 'bg-green-100 text-green-800 border-green-200';
      case 'rechazado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <Clock className="w-4 h-4" />;
      case 'aprobado': return <CheckCircle className="w-4 h-4" />;
      case 'rechazado': return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-700" /> Gestión de Permisos
          </h1>
          <p className="text-gray-500 text-sm">Solicita, aprueba o rechaza permisos de los empleados.</p>
        </div>
        <button 
          onClick={() => setVista(vista === 'lista' ? 'nuevo' : 'lista')}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> {vista === 'lista' ? 'Solicitar Permiso' : 'Ver Listado'}
        </button>
      </div>

      {mensaje.texto && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <AlertCircle className="w-5 h-5" /> {mensaje.texto}
        </div>
      )}

      {vista === 'nuevo' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
          <div className="bg-blue-700 p-6">
            <h2 className="text-white font-bold text-lg">Nueva Solicitud de Permiso</h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Empleado *</label>
              <select required value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="">Seleccionar empleado...</option>
                {empleados.map(emp => <option key={emp.id} value={emp.id}>{emp.nombres} {emp.apellidos}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Inicio *</label>
                <input type="date" required value={formData.fecha_inicio} onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Fin *</label>
                <input type="date" required value={formData.fecha_fin} onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Tipo de Permiso *</label>
              <select required value={formData.tipo} onChange={(e) => setFormData({...formData, tipo: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                <option value="personal">Personal</option>
                <option value="medico">Médico</option>
                <option value="familiar">Familiar</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Motivo *</label>
              <textarea required rows={3} value={formData.motivo} onChange={(e) => setFormData({...formData, motivo: e.target.value})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Describe el motivo del permiso..."></textarea>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
              {loading ? 'Enviando...' : <><FileText className="w-5 h-5" /> Enviar Solicitud</>}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? <div className="p-8 text-center text-gray-500">Cargando...</div> :
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Empleado</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fechas</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Motivo</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {permisos.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.employees?.nombres} {p.employees?.apellidos}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{p.fecha_inicio} → {p.fecha_fin}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 capitalize">{p.tipo}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{p.motivo}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full border ${getEstadoBadge(p.estado)}`}>
                          {getEstadoIcon(p.estado)} {p.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.estado === 'pendiente' && (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setModalComentario({ open: true, permiso: p, estado: 'aprobado' })} className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg" title="Aprobar">
                              <Check className="w-4 h-4" />
                            </button>
                            <button onClick={() => setModalComentario({ open: true, permiso: p, estado: 'rechazado' })} className="p-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg" title="Rechazar">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
        </div>
      )}

      {/* Modal de Comentario */}
      {modalComentario.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className={`p-4 ${modalComentario.estado === 'aprobado' ? 'bg-green-600' : 'bg-red-600'}`}>
              <h2 className="text-white font-bold text-lg">
                {modalComentario.estado === 'aprobado' ? 'Aprobar' : 'Rechazar'} Permiso
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-700">
                <strong>Empleado:</strong> {modalComentario.permiso?.employees?.nombres} {modalComentario.permiso?.employees?.apellidos}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Fechas:</strong> {modalComentario.permiso?.fecha_inicio} al {modalComentario.permiso?.fecha_fin}
              </p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Comentario (opcional)</label>
                <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Agrega un comentario para el empleado..."></textarea>
              </div>
              <div className="flex gap-3">
                <button onClick={handleAprobarRechazar} className={`flex-1 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 ${modalComentario.estado === 'aprobado' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {modalComentario.estado === 'aprobado' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  Confirmar
                </button>
                <button onClick={() => setModalComentario({ open: false, permiso: null, estado: '' })} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}