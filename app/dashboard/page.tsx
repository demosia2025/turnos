// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { 
  Building2, Users, Clock, MapPin, Shield, 
  TrendingUp, Calendar, AlertCircle 
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [empresa, setEmpresa] = useState<any>(null);
  const [stats, setStats] = useState({
    empleados: 0,
    ambientes: 0,
    bloques: 0,
    permisosPendientes: 0,
    asignacionesActivas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar datos de la empresa
        const { data: empresaData } = await supabase
          .from('companies')
          .select('*')
          .limit(1)
          .single();

        if (empresaData) setEmpresa(empresaData);

        // Cargar estadísticas
        const [empCount, ambCount, bloqCount, permCount, asigCount] = await Promise.all([
          supabase.from('employees').select('id', { count: 'exact' }).eq('estado', 'activo'),
          supabase.from('work_environments').select('id', { count: 'exact' }),
          supabase.from('time_blocks').select('id', { count: 'exact' }),
          supabase.from('permissions').select('id', { count: 'exact' }).eq('estado', 'pendiente'),
          supabase.from('assignments').select('id', { count: 'exact' }).eq('estado', 'activo')
        ]);

        setStats({
          empleados: empCount.count || 0,
          ambientes: ambCount.count || 0,
          bloques: bloqCount.count || 0,
          permisosPendientes: permCount.count || 0,
          asignacionesActivas: asigCount.count || 0
        });
      } catch (error) {
        console.error('Error cargando datos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida con Logo y Nombre de Fantasía */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Logo de la Empresa */}
            {empresa?.logo_url ? (
              <div className="w-32 h-32 bg-white rounded-2xl p-4 shadow-lg flex-shrink-0">
                <img 
                  src={empresa.logo_url} 
                  alt={empresa.nombre_fantasia}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-32 h-32 bg-white/10 backdrop-blur rounded-2xl p-4 shadow-lg flex-shrink-0 flex items-center justify-center">
                <Building2 className="w-16 h-16 text-yellow-400" />
              </div>
            )}

            {/* Información de la Empresa */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                Bienvenido a {empresa?.nombre_fantasia || 'Sistema de Gestión'}
              </h1>
              <p className="text-blue-200 text-lg">
                {empresa?.razon_social || 'Panel de Administración'}
              </p>
              {empresa?.direccion && (
                <p className="text-blue-300 text-sm mt-2">
                  📍 {empresa.direccion}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Barra decorativa inferior */}
        <div className="h-2 bg-gradient-to-r from-yellow-400 via-green-500 to-red-500"></div>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard 
          icon={Users}
          label="Empleados Activos"
          value={stats.empleados}
          color="blue"
          href="/dashboard/empleados"
        />
        <StatCard 
          icon={MapPin}
          label="Ambientes"
          value={stats.ambientes}
          color="green"
          href="/dashboard/ambientes"
        />
        <StatCard 
          icon={Clock}
          label="Bloques Horarios"
          value={stats.bloques}
          color="yellow"
          href="/dashboard/bloques"
        />
        <StatCard 
          icon={TrendingUp}
          label="Asignaciones Activas"
          value={stats.asignacionesActivas}
          color="blue"
          href="/dashboard/asignaciones"
        />
        <StatCard 
          icon={AlertCircle}
          label="Permisos Pendientes"
          value={stats.permisosPendientes}
          color="red"
          href="/dashboard/permisos"
        />
      </div>

      {/* Accesos Rápidos */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-700" />
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <QuickAccess 
            title="Nuevo Empleado"
            description="Registrar trabajador"
            href="/dashboard/empleados/nuevo"
            color="green"
          />
          <QuickAccess 
            title="Asignar Turno"
            description="Bloque + Ambiente"
            href="/dashboard/asignaciones"
            color="blue"
          />
          <QuickAccess 
            title="Gestionar Permisos"
            description="Aprobar solicitudes"
            href="/dashboard/permisos"
            color="yellow"
          />
          <QuickAccess 
            title="Ver Reportes"
            description="Estadísticas y CSV"
            href="/dashboard/reportes"
            color="blue"
          />
        </div>
      </div>

      {/* Información de la Empresa */}
      {empresa && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Información de la Empresa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoRow label="RUT" value={empresa.rut} />
            <InfoRow label="Razón Social" value={empresa.razon_social} />
            <InfoRow label="Nombre de Fantasía" value={empresa.nombre_fantasia} />
            <InfoRow label="Dirección" value={empresa.direccion || 'No registrada'} />
          </div>
          <div className="mt-4 pt-4 border-t">
            <Link 
              href="/configuracion"
              className="text-blue-600 hover:text-blue-800 text-sm font-semibold"
            >
              Editar información de la empresa →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// Componente de Tarjeta de Estadística
function StatCard({ icon: Icon, label, value, color, href }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
    red: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  };

  return (
    <Link href={href} className={`block p-6 rounded-xl border-2 transition-all hover:shadow-md ${colorClasses[color]}`}>
      <Icon className="w-8 h-8 mb-3" />
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className="text-sm font-semibold">{label}</p>
    </Link>
  );
}

// Componente de Acceso Rápido
function QuickAccess({ title, description, href, color }: any) {
  const colorClasses: any = {
    blue: 'bg-blue-600 hover:bg-blue-700',
    green: 'bg-green-600 hover:bg-green-700',
    yellow: 'bg-yellow-500 hover:bg-yellow-600',
    red: 'bg-red-600 hover:bg-red-700',
  };

  return (
    <Link 
      href={href}
      className={`block p-4 rounded-lg text-white transition-all hover:shadow-md ${colorClasses[color]}`}
    >
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm opacity-90">{description}</p>
    </Link>
  );
}

// Componente de Fila de Información
function InfoRow({ label, value }: any) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className="text-gray-800 font-medium">{value}</p>
    </div>
  );
}