// lib/useAuth.ts
'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export interface UserProfile {
  id: string;
  email: string;
  nombres: string;
  apellidos: string;
  rol: 'admin' | 'supervisor';
}

export function useAuth() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserProfile = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', authUser.id)
            .single();

          if (profile) {
            setUser(profile);
          }
        }
      } catch (error) {
        console.error('Error obteniendo perfil:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserProfile();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        getUserProfile();
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, isAdmin: user?.rol === 'admin', isSupervisor: user?.rol === 'supervisor' };
}