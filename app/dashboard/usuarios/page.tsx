// app/dashboard/usuarios/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { UserPlus, Users, Shield, Trash2, X, Save, AlertCircle, CheckCircle, Loader2, Key } from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState<any>(null);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formData, setFormData] = useState({
    email: '', password: '', nombres: '', apellidos: '', rol: 'supervisor'
  });
  const [passwordForm, setPasswordForm] = useState({
    nuevaPassword: '',
    confirmarPassword: ''
  });
  const [cambiandoPassword, setCambiandoPassword] = useState(false);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/usuarios');
      const result = await res.json();
      
      if (result.success && result.data) {
        setUsuarios(result.data);
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: result.error || 'Error al cargar usuarios' 
        });
        setUsuarios([]);
      }
    } catch (error: any) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error de conexión al cargar usuarios' 
      });
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchUsuarios(); 
  }, []);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const result = await res.json();
      
      if (result.success) {
        setMensaje({ 
          tipo: 'exito', 
          texto: `Usuario ${formData.nombres} creado exitosamente.` 
        });
        setFormData({ 
          email: '', 
          password: '', 
          nombres: '', 
          apellidos: '', 
          rol: 'supervisor' 
        });
        setShowModal(false);
        fetchUsuarios();
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: result.error || 'Error al crear usuario' 
        });
      }
    } catch (error: any) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error de conexión al crear usuario' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarRol = async (id: string, nuevoRol: string) => {
    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, rol: nuevoRol })
      });
      
      const result = await res.json();
      
      if (result.success) {
        fetchUsuarios();
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: result.error || 'Error al cambiar rol' 
        });
      }
    } catch (error: any) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error de conexión al cambiar rol' 
      });
    }
  };

  const handleEliminar = async (id: string, email: string) => {
    if (confirm(`¿Estás seguro de eliminar al usuario ${email}?`)) {
      try {
        const res = await fetch(`/api/usuarios?id=${id}`, { 
          method: 'DELETE' 
        });
        
        const result = await res.json();
        
        if (result.success) {
          setMensaje({ 
            tipo: 'exito', 
            texto: 'Usuario eliminado exitosamente.' 
          });
          fetchUsuarios();
        } else {
          setMensaje({ 
            tipo: 'error', 
            texto: result.error || 'Error al eliminar usuario' 
          });
        }
      } catch (error: any) {
        setMensaje({ 
          tipo: 'error', 
          texto: 'Error de conexión al eliminar usuario' 
        });
      }
    }
  };

  const abrirModalPassword = (usuario: any) => {
    setUsuarioSeleccionado(usuario);
    setPasswordForm({ nuevaPassword: '', confirmarPassword: '' });
    setMensaje({ tipo: '', texto: '' });
    setShowPasswordModal(true);
  };

  const handleCambiarPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCambiandoPassword(true);
    setMensaje({ tipo: '', texto: '' });

    if (passwordForm.nuevaPassword !== passwordForm.confirmarPassword) {
      setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' });
      setCambiandoPassword(false);
      return;
    }

    if (passwordForm.nuevaPassword.length < 6) {
      setMensaje({ tipo: 'error', texto: 'Mínimo 6 caracteres.' });
      setCambiandoPassword(false);
      return;
    }

    try {
      const res = await fetch('/api/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: usuarioSeleccionado.id, 
          action: 'change_password',
          password: passwordForm.nuevaPassword 
        })
      });
      
      const result = await res.json();
      
      if (result.success) {
        setMensaje({ 
          tipo: 'exito', 
          texto: `Contraseña actualizada` 
        });
        setPasswordForm({ nuevaPassword: '', confirmarPassword: '' });
        setShowPasswordModal(false);
        setUsuarioSeleccionado(null);
      } else {
        setMensaje({ 
          tipo: 'error', 
          texto: result.error || 'Error al cambiar contraseña' 
        });
      }
    } catch (error: any) {
      setMensaje({ 
        tipo: 'error', 
        texto: 'Error de conexión' 
      });
    } finally {
      setCambiandoPassword(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-700" /> Gestión de Usuarios
          </h1>
          <p className="text-gray-500 text-sm">Administra administradores y supervisores.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {mensaje.texto && (
        <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
          mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {mensaje.tipo === 'exito' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {mensaje.texto}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            Cargando...
          </div>
        ) : usuarios.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Correo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rol</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Creado</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">
                        {u.nombres || 'Sin nombre'} {u.apellidos || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{u.email}</td>
                    <td className="px-6 py-4">
                      <select 
                        value={u.rol} 
                        onChange={(e) => handleCambiarRol(u.id, e.target.value)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                          u.rol === 'admin' 
                            ? 'bg-blue-100 text-blue-800 border-blue-200' 
                            : 'bg-yellow-100 text-yellow-800 border-yellow-200'
                        }`}
                      >
                        <option value="admin">Administrador</option>
                        <option value="supervisor">Supervisor</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => abrirModalPassword(u)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Cambiar contraseña"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEliminar(u.id, u.email)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar usuario"
                        >
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

      <div className="mt-4 text-sm text-gray-500">
        Total: {usuarios.length} usuarios
      </div>

      {/* Modal Crear Usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="bg-blue-700 p-4 flex justify-between items-center sticky top-0">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-yellow-400" />
                Crear Nuevo Usuario
              </h2>
              <button onClick={() => setShowModal(false)} className="text-white hover:bg-blue-600 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nombres *</label>
                  <input 
                    required 
                    value={formData.nombres} 
                    onChange={(e) => setFormData({...formData, nombres: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Apellidos *</label>
                  <input 
                    required 
                    value={formData.apellidos} 
                    onChange={(e) => setFormData({...formData, apellidos: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Correo Electrónico *</label>
                <input 
                  type="email" 
                  required 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="usuario@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña *</label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={formData.password} 
                  onChange={(e) => setFormData({...formData, password: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Rol *</label>
                <select 
                  value={formData.rol} 
                  onChange={(e) => setFormData({...formData, rol: e.target.value})} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="supervisor">Supervisor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Crear Usuario
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cambiar Contraseña */}
      {showPasswordModal && usuarioSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-purple-600 p-4 flex justify-between items-center">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Key className="w-5 h-5 text-yellow-400" />
                Cambiar Contraseña
              </h2>
              <button onClick={() => setShowPasswordModal(false)} className="text-white hover:bg-purple-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-600 font-semibold mb-1">Usuario:</p>
                <p className="font-bold text-gray-800 text-sm">{usuarioSeleccionado.email}</p>
              </div>

              <form onSubmit={handleCambiarPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva Contraseña *</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6}
                    value={passwordForm.nuevaPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, nuevaPassword: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar Contraseña *</label>
                  <input 
                    type="password" 
                    required 
                    minLength={6}
                    value={passwordForm.confirmarPassword} 
                    onChange={(e) => setPasswordForm({...passwordForm, confirmarPassword: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none" 
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    disabled={cambiandoPassword} 
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2"
                  >
                    {cambiandoPassword ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cambiando...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Cambiar
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
