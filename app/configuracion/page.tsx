// app/configuracion/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/useAuth';
import { Building2, Save, Upload, ArrowLeft, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ConfiguracionEmpresa() {
  const router = useRouter();
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
  const [formData, setFormData] = useState({
    rut: '',
    razon_social: '',
    nombre_fantasia: '',
    direccion: '',
    logo_url: ''
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    const cargarEmpresa = async () => {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          setFormData({
            rut: data.rut || '',
            razon_social: data.razon_social || '',
            nombre_fantasia: data.nombre_fantasia || '',
            direccion: data.direccion || '',
            logo_url: data.logo_url || ''
          });
        }
      } catch (error) {
        console.error('Error cargando empresa:', error);
      }
    };

    if (isAdmin) {
      cargarEmpresa();
    }
  }, [isAdmin]);

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje({ tipo: '', texto: '' });

    try {
      const { data: existentes, error: errorFetch } = await supabase
        .from('companies')
        .select('id');

      if (errorFetch) {
        throw errorFetch;
      }

      if (existentes && existentes.length > 0) {
        const { error } = await supabase
          .
