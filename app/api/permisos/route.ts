// app/api/permisos/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee_id, fecha_inicio, fecha_fin, tipo, motivo, employee_email, employee_name } = body;

    // 1. Guardar permiso en BD
    const { data, error } = await supabase
      .from('permissions')
      .insert([{ employee_id, fecha_inicio, fecha_fin, tipo, motivo, estado: 'pendiente' }])
      .select()
      .single();

    if (error) throw error;

    // 2. (Opcional) Notificar al admin sobre nueva solicitud
    // Aquí podrías enviar un correo al administrador

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Endpoint para aprobar/rechazar
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { permission_id, estado, comentario, employee_email, employee_name, fecha_inicio, fecha_fin } = body;

    // Actualizar estado
    const { error } = await supabase
      .from('permissions')
      .update({ estado, comentario_aprobacion: comentario })
      .eq('id', permission_id);

    if (error) throw error;

    // Enviar correo al empleado
    if (employee_email) {
      const asunto = estado === 'aprobado' 
        ? `✅ Permiso Aprobado (${fecha_inicio} al ${fecha_fin})`
        : ` Permiso Rechazado`;
      
      const color = estado === 'aprobado' ? '#16a34a' : '#dc2626';
      const icono = estado === 'aprobado' ? '✅' : '❌';
      
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: [employee_email],
        subject: asunto,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <div style="background-color: ${color}; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">${icono} Permiso ${estado === 'aprobado' ? 'Aprobado' : 'Rechazado'}</h1>
            </div>
            <div style="padding: 20px;">
              <p style="font-size: 16px;">Hola <strong>${employee_name}</strong>,</p>
              <p>Tu solicitud de permiso del <strong>${fecha_inicio}</strong> al <strong>${fecha_fin}</strong> ha sido <strong>${estado}</strong>.</p>
              ${comentario ? `<div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;"><strong>Comentario del supervisor:</strong><br/>${comentario}</div>` : ''}
              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">Este es un correo automático.</p>
            </div>
          </div>
        `,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}