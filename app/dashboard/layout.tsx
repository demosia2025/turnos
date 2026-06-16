// app/dashboard/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { 
  Building2, Users, Clock, MapPin, Shield, ShieldCheck,
  LogOut, Menu, X, Home, BarChart3, UserCheck, Database, Shuffle
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [empresa, setEmpresa] = useState<any>(null);

  useEffect(() => {
    const fetchEmpresa = async () => {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .limit(1)
        .single();
      
      if (data) setEmpresa(data);
    };
    
    fetchEmpresa();
  }, []);

  const menuItems = isAdmin ? [
    { name: 'Inicio', href: '/dashboard', icon: Home },
    { name: 'Configuración', href: '/configuracion', icon: Building2 },
    { name: 'Empleados', href: '/dashboard/empleados', icon: Users },
    { name: 'Bloques Horarios', href: '/dashboard/bloques', icon: Clock },
    { name: 'Ambientes', href: '/dashboard/ambientes', icon: MapPin },
    { name: 'Asignaciones', href: '/dashboard/asignaciones', icon: UserCheck },
    { name: 'Permisos', href: '/dashboard/permisos', icon: Shield },
    { name: 'Usuarios', href: '/dashboard/usuarios', icon: ShieldCheck },
    { name: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
    { name: 'Rotación Horarios', href: '/dashboard/rotacion', icon: Shuffle },
    { name: 'Respaldos', href: '/dashboard/respaldos', icon: Database },
  ] : [
    { name: 'Inicio', href: '/dashboard', icon: Home },
    { name: 'Empleados', href: '/dashboard/empleados', icon: Users },
    { name: 'Bloques Horarios', href: '/dashboard/bloques', icon: Clock },
    { name: 'Ambientes', href: '/dashboard/ambientes', icon: MapPin },
    { name: 'Asignaciones', href: '/dashboard/asignaciones', icon: UserCheck },
    { name: 'Permisos', href: '/dashboard/permisos', icon: Shield },
    { name: 'Reportes', href: '/dashboard/reportes', icon: BarChart3 },
    { name: 'Rotación Horarios', href: '/dashboard/rotacion', icon: Shuffle },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-blue-800 text-white">
        <div className="p-6 border-b border-blue-700">
          <div className="flex items-center gap-3 mb-2">
            {empresa?.logo_url ? (
              <img 
                src={empresa.logo_url} 
                alt="Logo" 
                className="w-12 h-12 object-contain bg-white rounded-lg p-1"
              />
            ) : (
              <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                <Building2 className="w-7 h-7 text-blue-800" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-white truncate">
                {empresa?.nombre_fantasia || 'Mi Empresa'}
              </h1>
              <p className="text-blue-200 text-xs truncate">
                {empresa?.razon_social || 'Sistema de Gestión'}
              </p>
            </div>
          </div>
          
          <div className="mt-3 pt-3 border-t border-blue-700">
            <p className="text-blue-200 text-xs truncate">{user?.email}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
              isAdmin ? 'bg-blue-600 text-blue-100' : 'bg-yellow-600 text-yellow-100'
            }`}>
              {isAdmin ? 'Administrador' : 'Supervisor'}
            </span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-700 text-white border-l-4 border-yellow-400' 
                    : 'text-blue-100 hover:bg-blue-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-600 hover:text-white transition-colors mb-2"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Cerrar Sesión</span>
          </button>
          
          <div className="text-center mt-4">
            <p className="text-[10px] text-blue-300 opacity-70">
              Desarrollado por: <span className="font-semibold text-yellow-400">RafaG</span>
            </p>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-blue-800 text-white p-4 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                {empresa?.logo_url ? (
                  <img src={empresa.logo_url} alt="Logo" className="w-8 h-8 object-contain bg-white rounded p-0.5" />
                ) : (
                  <Building2 className="w-8 h-8 text-yellow-400" />
                )}
                <h1 className="text-lg font-bold truncate">
                  {empresa?.nombre_fantasia || 'Mi Empresa'}
                </h1>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      isActive ? 'bg-blue-700 border-l-4 border-yellow-400' : 'hover:bg-blue-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-300 hover:bg-red-600 mt-4"
              >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </aside>
        </div>
      )}

      {/* Contenido Principal */}
      <div className="flex-1 flex flex-col">
        {/* Header Mobile */}
        <header className="md:hidden bg-blue-800 text-white p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            {empresa?.logo_url ? (
              <img src={empresa.logo_url} alt="Logo" className="w-6 h-6 object-contain bg-white rounded p-0.5" />
            ) : (
              <Building2 className="w-6 h-6 text-yellow-400" />
            )}
            <h1 className="font-bold text-sm truncate">
              {empresa?.nombre_fantasia || 'Mi Empresa'}
            </h1>
          </div>
          <div className="w-6" />
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
