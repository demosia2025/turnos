// app/api/usuarios/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, nombres, apellidos, rol } = body;

    if (!email || !password || !nombres || !apellidos) {
      return NextResponse.json(
        { error: 'Todos los campos son obligatorios' }, 
        { status: 400 }
      );
    }

    // 1. Crear usuario en auth.users con opciones para evitar email de confirmación
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Forzar confirmación automática
      user_metadata: { 
        nombres, 
        apellidos, 
        rol,
        full_name: `${nombres} ${apellidos}`
      }
    });

    if (authError) {
      console.error('Error creando usuario auth:', authError);
      
      // Si el error es específicamente del email, damos un mensaje más claro
      if (authError.message.includes('email')) {
        return NextResponse.json(
          { 
            error: 'Error con el servicio de email. Verifica que en Supabase > Authentication > Providers > Email esté desactivada la opción "Enable email confirmations"',
            details: authError.message
          }, 
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: authError.message }, 
        { status: 500 }
      );
    }

    // 2. Esperar un momento a que el trigger cree el perfil automáticamente
    await new Promise(resolve => setTimeout(resolve, 200));

    // 3. Actualizar el perfil con los datos adicionales
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ 
        nombres, 
        apellidos, 
        rol,
        email 
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Error actualizando perfil:', profileError);
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: authData.user.id,
        email: authData.user.email,
        nombres,
        apellidos,
        rol
      }
    });
  } catch (error: any) {
    console.error('Error en API usuarios:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' }, 
      { status: 500 }
    );
  }
}

// ... (mantén las funciones GET, PATCH y DELETE como estaban)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, rol } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ rol })
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}