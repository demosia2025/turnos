// app/dashboard/asignaciones/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { UserCheck, Save, AlertCircle, CheckCircle } from 'lucide-react';
// 1. AÑADIDO: Importar useSearchParams según la guía
import { useSearchParams } from 'next/navigation';

function AsignacionesForm() {
  // 2. AÑADIDO: Inicializar los parámetros de búsqueda de la URL
  const searchParams = useSearchParams();
  const empleadoPreseleccionado = searchParams.get('empleado');

  const [empleados, setEmpleados] = useState<any[]>([]);
  const [bloques, setBloques] = useState<any[]>([]);
  const [ambientes, setAmbientes] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    time_block_id: '',
    environment_id: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });

  // 3. MODIFICADO: useEffect adaptado según las instrucciones exactas de la guía
  useEffect(() => {
    const fetchData = async () => {
      const [empRes, bloqRes, ambRes] = await Promise.all([
        supabase.from('employees').select('id, nombres, apellidos, correo').eq('estado', 'activo'),
        supabase.from('time_blocks').select('id, nombre'),
        supabase.from('work_environments').select('id, nombre')
      ]);
      if (empRes.data) setEmpleados(empRes.data);
      if (bloqRes.data) setBloques(bloqRes.data);
      if (ambRes.data) setAmbientes(ambRes.data);

      // Pre-seleccionar empleado si viene de la URL
      if (empleadoPreseleccionado) {
        setFormData(prev => ({ ...prev, employee_id: empleadoPreseleccionado }));
      }
    };
    fetchData();
  }, [empleadoPreseleccionado]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    const empleado = empleados.find(emp => emp.id === formData.employee_id);
    const bloque = bloques.find(b => b.id === formData.time_block_id);
    const ambiente = ambientes.find(a => a.id === formData.environment_id);

    try {
      const res = await fetch('/api/asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          employee_email: empleado?.correo,
          employee_name: `${empleado?.nombres} ${empleado?.apellidos}`,
          block_name: bloque?.nombre,
          env_name: ambiente?.nombre
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      setMensaje({ tipo: 'exito', texto: `¡Asignación guardada! Correo enviado a ${empleado?.correo || 'sin correo registrado'}.` });
      setFormData({ employee_id: '', time_block_id: '', environment_id: '', fecha_inicio: '', fecha_fin: '' });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + error.message });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-blue-700" /> Asignación de Turnos
        </h1>
        <p className="text-gray-500 text-sm">Asigna bloques horarios y ambientes a los empleados.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-3xl">
        <div className="bg-blue-700 p-6">
          <h2 className="text-white font-bold text-lg">Nueva Asignación</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {mensaje.texto && (
            <div className={`p-4 rounded-lg flex items-center gap-2 ${
              mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {mensaje.texto}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Empleado *</label>
              <select 
                required 
                value={formData.employee_id} 
                onChange={(e) => setFormData({...formData, employee_id: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar empleado...</option>
                {empleados.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nombres} {emp.apellidos} {emp.correo ? `(${emp.correo})` : '(Sin correo)'}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Bloque Horario *</label>
              <select 
                required 
                value={formData.time_block_id} 
                onChange={(e) => setFormData({...formData, time_block_id: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar bloque...</option>
                {bloques.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Ambiente de Trabajo *</label>
              <select 
                required 
                value={formData.environment_id} 
                onChange={(e) => setFormData({...formData, environment_id: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Seleccionar ambiente...</option>
                {ambientes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Inicio *</label>
              <input 
                type="date" 
                required 
                value={formData.fecha_inicio} 
                onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha Fin (Opcional)</label>
              <input 
                type="date" 
                value={formData.fecha_fin} 
                onChange={(e) => setFormData({...formData, fecha_fin: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md mt-4"
          >
            {loading ? 'Procesando y enviando correo...' : (
              <>
                <Save className="w-5 h-5" />
                Guardar Asignación y Notificar
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// 4. AÑADIDO: Envoltura Suspense requerida por Next.js para renderizar hooks de búsqueda (useSearchParams)
export default function AsignacionesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Cargando formulario...</div>}>
      <AsignacionesForm />
    </Suspense>
  );
}
