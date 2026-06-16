// app/dashboard/respaldos/page.tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Database, Download, Upload, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function RespaldosPage() {
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [progreso, setProgreso] = useState(0);

  const tablas = [
    'companies',
    'employees',
    'work_environments',
    'time_blocks',
    'assignments',
    'permissions',
    'user_profiles'
  ];

  const generarRespaldo = async () => {
    setLoading(true);
    setProgreso(0);
    setMensaje({ tipo: '', texto: '' });

    try {
      const respaldo: any = {
        fecha: new Date().toISOString(),
        version: '1.0',
        datos: {}
      };

      // Exportar cada tabla
      for (let i = 0; i < tablas.length; i++) {
        const tabla = tablas[i];
        const { data, error } = await supabase.from(tabla).select('*');
        
        if (error) {
          throw new Error(`Error al exportar ${tabla}: ${error.message}`);
        }

        respaldo.datos[tabla] = data;
        setProgreso(((i + 1) / tablas.length) * 100);
      }

      // Crear archivo JSON
      const jsonStr = JSON.stringify(respaldo, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `respaldo_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMensaje({ tipo: 'exito', texto: `¡Respaldo generado exitosamente! (${tablas.length} tablas exportadas)` });
    } catch (error: any) {
      setMensaje({ tipo: 'error', texto: error.message });
    } finally {
      setLoading(false);
    }
  };

  const restaurarRespaldo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const text = await file.text();
      const respaldo = JSON.parse(text);

      if (!respaldo.datos)