// app/api/usuarios/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Obtener perfiles de usuario
    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('*');

    const usuarios = users.users.map(user => {
      const profile = profiles?.find(p => p.id === user.id);
      return {
        id: user.id,
        email: user.email,
        nombres: profile?.nombres || '',
        apellidos: profile?.apellidos || '',
        rol: profile?.rol || 'supervisor',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at
      };
    });

    return NextResponse.json(usuarios);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { email, password, nombres, apellidos, rol } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombres: nombres || '',
        apellidos: apellidos || '',
        rol: rol || 'supervisor'
      }
    });

    if (authError) {
      console.error('Error creando usuario auth:', authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    // Crear perfil en user_profiles
    if (authData.user) {
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .insert([
          {
            id: authData.user.id,
            email: email,
            nombres: nombres || '',
            apellidos: apellidos || '',
            rol: rol || 'supervisor'
          }
        ]);

      if (profileError) {
        console.error('Error creando perfil:', profileError);
        // No fallar si el perfil ya existe (por el trigger)
        if (!profileError.message.includes('duplicate')) {
          return NextResponse.json(
            { error: profileError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      user: authData.user 
    });
  } catch (error: any) {
    console.error('Error en POST /api/usuarios:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // Eliminar perfil primero
    await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    // Eliminar usuario de auth
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
