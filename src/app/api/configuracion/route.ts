import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Obtener configuración del frigorífico
export async function GET() {
  try {
    // Buscar o crear la configuración (solo debe haber una)
    let config = await db.configuracionFrigorifico.findFirst()

    if (!config) {
      // Crear configuración por defecto
      config = await db.configuracionFrigorifico.create({
        data: {
          nombre: 'Solemar Alimentaria',
          direccion: 'Ruta Provincial N° 11 - Km 45.5, San Martín, Mendoza',
          emailHabilitado: false
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        id: config.id,
        nombre: config.nombre,
        direccion: config.direccion,
        numeroEstablecimiento: config.numeroEstablecimiento,
        cuit: config.cuit,
        numeroMatricula: config.numeroMatricula,
        logo: config.logo,
        emailHost: config.emailHost,
        emailPuerto: config.emailPuerto,
        emailUsuario: config.emailUsuario,
        emailHabilitado: config.emailHabilitado
      }
    })
  } catch (error) {
    console.error('Error fetching configuracion:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar configuración del frigorífico
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      id,
      nombre,
      direccion,
      numeroEstablecimiento,
      cuit,
      numeroMatricula,
      logo,
      emailHost,
      emailPuerto,
      emailUsuario,
      emailPassword,
      emailHabilitado
    } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de configuración requerido' },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}

    if (nombre !== undefined) updateData.nombre = nombre
    if (direccion !== undefined) updateData.direccion = direccion
    if (numeroEstablecimiento !== undefined) updateData.numeroEstablecimiento = numeroEstablecimiento
    if (cuit !== undefined) updateData.cuit = cuit
    if (numeroMatricula !== undefined) updateData.numeroMatricula = numeroMatricula
    if (logo !== undefined) updateData.logo = logo
    if (emailHost !== undefined) updateData.emailHost = emailHost
    if (emailPuerto !== undefined) updateData.emailPuerto = emailPuerto
    if (emailUsuario !== undefined) updateData.emailUsuario = emailUsuario
    if (emailPassword !== undefined) updateData.emailPassword = emailPassword
    if (emailHabilitado !== undefined) updateData.emailHabilitado = emailHabilitado

    const config = await db.configuracionFrigorifico.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Configuración actualizada correctamente'
    })
  } catch (error) {
    console.error('Error updating configuracion:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    )
  }
}
