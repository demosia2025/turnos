// app/dashboard/ambientes/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, Plus, Edit2, Trash2, X, Save, Users, UserCheck, UserPlus, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function AmbientesPage() {
  const [ambientes, setAmbientes] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [bloques, setBloques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showModalAmbiente, setShowModalAmbiente] = useState(false);
  const [showEmpleadosModal, setShowEmpleadosModal] = useState(false);
  const [showAsignarModal, setShowAsignarModal] = useState(false);
  const [showMoverModal, setShowMoverModal] = useState(false);
  
  const [ambienteSeleccionado, setAmbienteSeleccionado] = useState<any>(null);
  const [empleadosAsignados, setEmpleadosAsignados] = useState<any[]>([]);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '' });
  
  // Formulario de asignación
  const [asignacionForm, setAsignacionForm] = useState({
    employee_id: '',
    time_block_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });
  const [asignando, setAsignando] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  
  // Estados para mover ambiente
  const [asignacionAMover, setAsignacionAMover] = useState<any>(null);
  const [nuevoAmbienteId, setNuevoAmbienteId] = useState('');
  const [moviendo, setMoviendo] = useState(false);

  const fetchAmbientes = async () => {
    const { data } = await supabase.from('work_environments').select('*').order('nombre');
    if (data) setAmbientes(data);
  };

  const fetchEmpleadosYBloques = async () => {
    const [empRes, bloqRes] = await Promise.all([
      supabase.from('employees').select('id, nombres, apellidos, correo').eq('estado', 'activo').order('nombres'),
      supabase.from('time_blocks').select('id, nombre').order('nombre')
    ]);
    if (empRes.data) setEmpleados(empRes.data);
    if (bloqRes.data) setBloques(bloqRes.data);
  };

  useEffect(() => { 
    fetchAmbientes(); 
    fetchEmpleadosYBloques();
    setLoading(false);
  }, []);

  const handleGuardarAmbiente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editandoId) {
      await supabase.from('work_environments').update(formData).eq('id', editandoId);
    } else {
      await supabase.from('work_environments').insert([formData]);
    }
    setShowModalAmbiente(false);
    setEditandoId(null);
    setFormData({ nombre: '', descripcion: '' });
    fetchAmbientes();
  };

  const handleEditar = (ambiente: any) => {
    setFormData({ nombre: ambiente.nombre, descripcion: ambiente.descripcion || '' });
    setEditandoId(ambiente.id);
    setShowModalAmbiente(true);
  };

  const handleEliminar = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este ambiente?')) {
      await supabase.from('work_environments').delete().eq('id', id);
      fetchAmbientes();
    }
  };

  const verEmpleadosAsignados = async (ambiente: any) => {
    setAmbienteSeleccionado(ambiente);
    setShowEmpleadosModal(true);

    const { data } = await supabase
      .from('assignments')
      .select(`
        id, fecha_inicio, fecha_fin, estado,
        employees (nombres, apellidos, correo, telefono),
        time_blocks (nombre, hora_inicio, hora_fin)
      `)
      .eq('environment_id', ambiente.id)
      .eq('estado', 'activo');

    if (data) setEmpleadosAsignados(data);
  };

  const abrirModalAsignar = (ambiente: any) => {
    setAmbienteSeleccionado(ambiente);
    setAsignacionForm({
      employee_id: '',
      time_block_id: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: ''
    });
    setMensaje({ tipo: '', texto: '' });
    setShowAsignarModal(true);
  };

  const handleAsignarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setAsignando(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { data: existente } = await supabase
        .from('assignments')
        .select('id')
        .eq('employee_id', asignacionForm.employee_id)
        .eq('environment_id', ambienteSeleccionado.id)
        .eq('estado', 'activo')
        .single();

      if (existente) {
        const { error } = await supabase
          .from('assignments')
          .update({
            time_block_id: asignacionForm.time_block_id,
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
            employee_id: asignacionForm.employee_id,
            time_block_id: asignacionForm.time_block_id,
            environment_id: ambienteSeleccionado.id,
            fecha_inicio: asignacionForm.fecha_inicio,
            fecha_fin: asignacionForm.fecha_fin || null,
            estado: 'activo'
          }]);

        if (error) throw error;
        setMensaje({ tipo: 'exito', texto: 'Empleado asignado exitosamente.' });
      }

      setAsignacionForm({
        employee_id: '',
        time_block_id: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: ''
      });
      verEmpleadosAsignados(ambienteSeleccionado);
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setAsignando(false);
    }
  };

  const handleEliminarAsignacion = async (asignacionId: string) => {
    if (confirm('¿Eliminar esta asignación?')) {
      await supabase.from('assignments').delete().eq('id', asignacionId);
      verEmpleadosAsignados(ambienteSeleccionado);
    }
  };

  // Funciones para mover empleado de ambiente
  const abrirModalMover = (asignacion: any) => {
    setAsignacionAMover(asignacion);
    setNuevoAmbienteId('');
    setShowMoverModal(true);
  };

  const handleMoverAmbiente = async () => {
    if (!nuevoAmbienteId || !asignacionAMover) return;
    
    setMoviendo(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ environment_id: nuevoAmbienteId })
        .eq('id', asignacionAMover.id);

      if (error) throw error;

      verEmpleadosAsignados(ambienteSeleccionado);
      setShowMoverModal(false);
      setAsignacionAMover(null);
      setNuevoAmbienteId('');
    } catch (error: any) {
      alert('Error al mover: ' + error.message);
    } finally {
      setMoviendo(false);
    }
  };

  const empleadosDisponibles = empleados.filter(emp => 
    !empleadosAsignados.some(asig => asig.employees?.id === emp.id)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-700" /> Ambientes de Trabajo
          </h1>
          <p className="text-gray-500 text-sm">Gestiona las sucursales, oficinas o áreas de trabajo.</p>
        </div>
        <button 
          onClick={() => { setShowModalAmbiente(true); setEditandoId(null); setFormData({ nombre: '', descripcion: '' }); }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Ambiente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <p className="text-gray-500">Cargando...</p> : 
          ambientes.map((amb) => (
            <div key={amb.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-lg text-gray-800">{amb.nombre}</h3>
              </div>
              <p className="text-gray-500 text-sm mb-4 line-clamp-2 min-h-[40px]">{amb.descripcion || 'Sin descripción'}</p>
              
              <div className="space-y-2 border-t pt-3">
                <button 
                  onClick={() => abrirModalAsignar(amb)} 
                  className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex justify-center items-center gap-2 text-sm font-semibold transition-colors"
                >
                  <UserPlus className="w-4 h-4" /> Agregar Empleado
                </button>
                <button 
                  onClick={() => verEmpleadosAsignados(amb)} 
                  className="w-full bg-yellow-50 text-yellow-700 py-2 rounded-lg hover:bg-yellow-100 flex justify-center items-center gap-2 text-sm font-semibold transition-colors"
                >
                  <Users className="w-4 h-4" /> Ver Empleados Asignados
                </button>
                <div className="flex gap-2">
                  <button onClick={() => handleEditar(amb)} className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg hover:bg-blue-100 flex justify-center items-center gap-1 text-sm font-semibold">
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                  <button onClick={() => handleEliminar(amb.id)} className="flex-1 bg-red-50 text-red-700 py-2 rounded-lg hover:bg-red-100 flex justify-center items-center gap-1 text-sm font-semibold">
                    <Trash2 className="w-4 h-4" /> Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))
        }
      </div>

      {/* Modal: Agregar Empleado al Ambiente */}
      {showAsignarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-green-600 p-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-yellow-400" />
                Agregar Empleado a: {ambienteSeleccionado?.nombre}
              </h2>
              <button onClick={() => setShowAsignarModal(false)} className="text-white hover:bg-green-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAsignarEmpleado} className="p-6 space-y-4">
              {mensaje.texto && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                  mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {mensaje.tipo === 'exito' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {mensaje.texto}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Empleado *</label>
                <select 
                  required 
                  value={asignacionForm.employee_id} 
                  onChange={(e) => setAsignacionForm({...asignacionForm, employee_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Seleccionar empleado...</option>
                  {empleados.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombres} {emp.apellidos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Bloque Horario *</label>
                <select 
                  required 
                  value={asignacionForm.time_block_id} 
                  onChange={(e) => setAsignacionForm({...asignacionForm, time_block_id: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Seleccionar bloque...</option>
                  {bloques.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <strong>💡 Nota:</strong> El ambiente se asignará automáticamente: <strong>{ambienteSeleccionado?.nombre}</strong>
              </div>

              <button 
                type="submit" 
                disabled={asignando}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2"
              >
                {asignando ? 'Asignando...' : (
                  <>
                    <UserCheck className="w-5 h-5" />
                    Asignar Empleado
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ver Empleados Asignados */}
      {showEmpleadosModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-blue-700 p-4 flex justify-between items-center">
              <div>
                <h2 className="text-white font-bold text-lg flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-yellow-400" />
                  Empleados en: {ambienteSeleccionado?.nombre}
                </h2>
                <p className="text-blue-200 text-xs mt-1">Asignaciones activas</p>
              </div>
              <button onClick={() => setShowEmpleadosModal(false)} className="text-white hover:bg-blue-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {empleadosAsignados.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No hay empleados asignados a este ambiente.</p>
                  <button 
                    onClick={() => { setShowEmpleadosModal(false); abrirModalAsignar(ambienteSeleccionado); }}
                    className="mt-4 bg-green-600 text-white px-4 py-2 rounded-lg text-sm"
                  >
                    Agregar el primero
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {empleadosAsignados.map((asig: any) => (
                    <div key={asig.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-800">
                            {asig.employees?.nombres} {asig.employees?.apellidos}
                          </h4>
                          <p className="text-xs text-gray-500">{asig.employees?.correo}</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => abrirModalMover(asig)}
                            className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                            title="Mover a otro ambiente"
                          >
                            <MapPin className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEliminarAsignacion(asig.id)}
                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                            title="Eliminar asignación"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <span className="text-gray-500 text-xs">Turno:</span>
                          <p className="font-semibold text-gray-700">{asig.time_blocks?.nombre}</p>
                          <p className="text-xs text-gray-500">{asig.time_blocks?.hora_inicio} - {asig.time_blocks?.hora_fin}</p>
                        </div>
                        <div>
                          <span className="text-gray-500 text-xs">Desde:</span>
                          <p className="font-semibold text-gray-700">{asig.fecha_inicio}</p>
                          {asig.fecha_fin && <p className="text-xs text-gray-500">Hasta: {asig.fecha_fin}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
              <span className="text-sm text-gray-600">Total: <strong>{empleadosAsignados.length}</strong> empleados</span>
              <button 
                onClick={() => { setShowEmpleadosModal(false); abrirModalAsignar(ambienteSeleccionado); }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Agregar más
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear/Editar Ambiente */}
      {showModalAmbiente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-700 p-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">{editandoId ? 'Editar Ambiente' : 'Nuevo Ambiente'}</h2>
              <button onClick={() => setShowModalAmbiente(false)} className="text-white hover:bg-blue-600 p-1 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGuardarAmbiente} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Ambiente *</label>
                <input 
                  value={formData.nombre} 
                  onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
                  required 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Ej: Oficina Central, Sucursal Norte" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                <textarea 
                  value={formData.descripcion} 
                  onChange={(e) => setFormData({...formData, descripcion: e.target.value})} 
                  rows={3} 
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                ></textarea>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2">
                <Save className="w-4 h-4" /> Guardar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Mover Empleado a otro Ambiente */}
      {showMoverModal && asignacionAMover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-600 p-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-yellow-400" />
                Mover Empleado de Ambiente
              </h2>
              <button 
                onClick={() => setShowMoverModal(false)} 
                className="text-white hover:bg-blue-700 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-semibold mb-1">Empleado:</p>
                <p className="font-bold text-gray-800">
                  {asignacionAMover.employees?.nombres} {asignacionAMover.employees?.apellidos}
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 font-semibold mb-1">Ambiente actual:</p>
                <p className="font-semibold text-gray-800">{ambienteSeleccionado?.nombre}</p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
                <strong>ℹ️ Nota:</strong> El bloque horario se mantendrá igual. Solo cambiará el ambiente de trabajo.
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nuevo Ambiente *
                </label>
                <select
                  value={nuevoAmbienteId}
                  onChange={(e) => setNuevoAmbienteId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Seleccionar nuevo ambiente...</option>
                  {ambientes
                    .filter(a => a.id !== ambienteSeleccionado?.id)
                    .map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowMoverModal(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleMoverAmbiente}
                  disabled={!nuevoAmbienteId || moviendo}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2"
                >
                  {moviendo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Moviendo...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4" />
                      Mover Empleado
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}