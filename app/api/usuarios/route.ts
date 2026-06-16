// app/api/usuarios/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    if (authError) {
      console.error('Error listando usuarios:', authError);
      return NextResponse.json({ 
        error: authError.message,
        data: [] 
      }, { status: 500 });
    }

    const { data: profiles } = await supabaseAdmin
      .from('user_profiles')
      .select('*');

    const usuarios = authData.users.map(user => {
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

    return NextResponse.json({ 
      success: true,
      data: usuarios 
    });
  } catch (error: any) {
    console.error('Error en GET /api/usuarios:', error);
    return NextResponse.json({ 
      error: error.message,
      data: [] 
    }, { status: 500 });
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

    if (authData.user) {
      // Guardar nombres y apellidos tal como vienen del formulario
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
        if (!profileError.message.includes('duplicate') && !profileError.code?.includes('23505')) {
          return NextResponse.json(
            { error: profileError.message },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Usuario creado exitosamente',
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

export async function PATCH(request: Request) {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
    );

    const body = await request.json();
    const { id, rol, action, password } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de usuario requerido' },
        { status: 400 }
      );
    }

    // CAMBIAR CONTRASEÑA
    if (action === 'change_password') {
      if (!password || password.length < 6) {
        return NextResponse.json(
          { error: 'La contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        );
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
        password: password
      });

      if (error) {
        console.error('Error cambiando contraseña:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        success: true,
        message: 'Contraseña actualizada exitosamente'
      });
    }

    // CAMBIAR ROL
    if (rol) {
      const { error } = await supabaseAdmin
        .from('user_profiles')
        .update({ rol })
        .eq('id', id);

      if (error) {
        console.error('Error actualizando rol:', error);
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: 'Acción no válida' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error en PATCH /api/usuarios:', error);
    return NextResponse.json(
      { error: error.message },
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

    await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error eliminando usuario:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error en DELETE /api/usuarios:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
