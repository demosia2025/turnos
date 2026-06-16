// app/api/asignaciones/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

// Inicializar clientes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_id, time_block_id, environment_id, fecha_inicio, fecha_fin, employee_email, employee_name, block_name, env_name } = body;

    // 1. Guardar en la base de datos
    const { data, error } = await supabase
      .from('assignments')
      .insert([{ employee_id, time_block_id, environment_id, fecha_inicio, fecha_fin }])
      .select()
      .single();

    if (error) throw error;

    // 2. Enviar correo de notificación (Si el empleado tiene correo)
    if (employee_email) {
      await resend.emails.send({
        from: 'onboarding@resend.dev', // En producción usarás tu dominio verificado
        to: [employee_email],
        subject: `Nueva Asignación de Turno - ${env_name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #1d4ed8; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">Nueva Asignación de Turno</h1>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 16px;">Hola <strong>${employee_name}</strong>,</p>
              <p>Te informamos que se te ha asignado un nuevo bloque horario y ambiente de trabajo:</p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>🕒 Bloque Horario:</strong> ${block_name}</p>
                <p style="margin: 5px 0;"><strong>📍 Ambiente:</strong> ${env_name}</p>
                <p style="margin: 5px 0;"><strong>📅 Fecha de Inicio:</strong> ${fecha_inicio}</p>
              </div>

              <p>Por favor, revisa tu calendario y coordina con tu supervisor si tienes alguna duda.</p>
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Este es un correo automático, por favor no responder.</p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}