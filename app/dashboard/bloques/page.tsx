// app/dashboard/bloques/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Clock, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function BloquesPage() {
  const [bloques, setBloques] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nombre: '', hora_inicio: '09:00', hora_fin: '18:00', dias_semana: '' });

  const fetchBloques = async () => {
    const { data } = await supabase.from('time_blocks').select('*').order('nombre');
    if (data) setBloques(data);
    setLoading(false);
  };

  useEffect(() => { fetchBloques(); }, []);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editandoId) {
      await supabase.from('time_blocks').update(formData).eq('id', editandoId);
    } else {
      await supabase.from('time_blocks').insert([formData]);
    }
    setShowModal(false);
    setEditandoId(null);
    setFormData({ nombre: '', hora_inicio: '09:00', hora_fin: '18:00', dias_semana: '' });
    fetchBloques();
  };

  const toggleDia = (dia: string) => {
    const diasActuales = formData.dias_semana ? formData.dias_semana.split(',').map(d => d.trim()) : [];
    if (diasActuales.includes(dia)) {
      setFormData({ ...formData, dias_semana: diasActuales.filter(d => d !== dia).join(', ') });
    } else {
      setFormData({ ...formData, dias_semana: [...diasActuales, dia].join(', ') });
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-700" /> Bloques Horarios
          </h1>
          <p className="text-gray-500 text-sm">Define los turnos y horarios de trabajo.</p>
        </div>
        <button 
          onClick={() => { setShowModal(true); setEditandoId(null); setFormData({ nombre: '', hora_inicio: '09:00', hora_fin: '18:00', dias_semana: '' }); }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Bloque
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? <div className="p-8 text-center">Cargando...</div> :
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Horario</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Días</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {bloques.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{b.nombre}</td>
                    <td className="px-6 py-4 text-gray-700">{b.hora_inicio} - {b.hora_fin}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {b.dias_semana?.split(',').map((d: string, i: number) => (
                          <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">{d.trim()}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => { setFormData({ nombre: b.nombre, hora_inicio: b.hora_inicio, hora_fin: b.hora_fin, dias_semana: b.dias_semana }); setEditandoId(b.id); setShowModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={async () => { if(confirm('¿Eliminar?')) { await supabase.from('time_blocks').delete().eq('id', b.id); fetchBloques(); }}} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-blue-700 p-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg">{editandoId ? 'Editar Bloque' : 'Nuevo Bloque Horario'}</h2>
              <button onClick={() => setShowModal(false)} className="text-white hover:bg-blue-600 p-1 rounded"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleGuardar} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Bloque *</label>
                <input value={formData.nombre} onChange={(e) => setFormData({...formData, nombre: e.target.value})} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Turno Mañana, Jornada Partida" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Inicio *</label>
                  <input type="time" value={formData.hora_inicio} onChange={(e) => setFormData({...formData, hora_inicio: e.target.value})} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hora Fin *</label>
                  <input type="time" value={formData.hora_fin} onChange={(e) => setFormData({...formData, hora_fin: e.target.value})} required className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Días de la semana</label>
                <div className="flex flex-wrap gap-2">
                  {DIAS_SEMANA.map(dia => (
                    <button key={dia} type="button" onClick={() => toggleDia(dia)} className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${formData.dias_semana.includes(dia) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                      {dia}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 mt-4">
                <Save className="w-4 h-4" /> Guardar Bloque
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}