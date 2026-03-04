import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST - Confirm romaneo and send email
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { romaneoId, supervisorId } = body

    if (!romaneoId) {
      return NextResponse.json(
        { success: false, error: 'ID de romaneo requerido' },
        { status: 400 }
      )
    }

    // Get romaneo
    const romaneo = await db.romaneo.findUnique({
      where: { id: romaneoId },
      include: {
        tipificador: true
      }
    })

    if (!romaneo) {
      return NextResponse.json(
        { success: false, error: 'Romaneo no encontrado' },
        { status: 404 }
      )
    }

    if (romaneo.estado === 'CONFIRMADO') {
      return NextResponse.json(
        { success: false, error: 'El romaneo ya está confirmado' },
        { status: 400 }
      )
    }

    // Update romaneo status
    const updated = await db.romaneo.update({
      where: { id: romaneoId },
      data: {
        estado: 'CONFIRMADO',
        supervisorId,
        fechaConfirmacion: new Date(),
        emailEnviado: false // Will be set to true when email is actually sent
      }
    })

    // TODO: Send email notification
    // For now, we just mark as confirmed
    // Email sending would be implemented with nodemailer or similar

    return NextResponse.json({ 
      success: true, 
      data: updated,
      message: 'Romaneo confirmado correctamente' 
    })
  } catch (error) {
    console.error('Error confirming romaneo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al confirmar romaneo' },
      { status: 500 }
    )
  }
}
