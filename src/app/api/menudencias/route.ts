import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch registros de menudencias con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tropaCodigo = searchParams.get('tropaCodigo')
    const fecha = searchParams.get('fecha')
    
    const where: Record<string, unknown> = {}
    
    if (tropaCodigo) {
      where.tropaCodigo = tropaCodigo
    }
    
    if (fecha) {
      const fechaInicio = new Date(fecha)
      fechaInicio.setHours(0, 0, 0, 0)
      const fechaFin = new Date(fecha)
      fechaFin.setHours(23, 59, 59, 999)
      where.fecha = {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
    
    const registros = await db.registroMenudencia.findMany({
      where,
      orderBy: [
        { fecha: 'desc' },
        { articulo: 'asc' }
      ]
    })
    
    return NextResponse.json({
      success: true,
      data: registros.map(r => ({
        id: r.id,
        tropaCodigo: r.tropaCodigo,
        tropaId: r.tropaId,
        fecha: r.fecha,
        articulo: r.articulo,
        kgCamara: r.kgCamara,
        kgElaborado: r.kgElaborado,
        cantidadBolsas: r.cantidadBolsas,
        clienteId: r.clienteId,
        operadorId: r.operadorId,
        observaciones: r.observaciones,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching menudencias:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener registros de menudencias' },
      { status: 500 }
    )
  }
}

// POST - Create new registro de menudencia
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      tropaCodigo, 
      tropaId,
      fecha,
      articulo, 
      kgCamara, 
      kgElaborado, 
      cantidadBolsas,
      clienteId,
      operadorId,
      observaciones 
    } = body
    
    if (!tropaCodigo) {
      return NextResponse.json(
        { success: false, error: 'El código de tropa es requerido' },
        { status: 400 }
      )
    }
    
    if (!articulo) {
      return NextResponse.json(
        { success: false, error: 'El artículo es requerido' },
        { status: 400 }
      )
    }
    
    const registro = await db.registroMenudencia.create({
      data: {
        tropaCodigo,
        tropaId: tropaId || null,
        fecha: fecha ? new Date(fecha) : new Date(),
        articulo,
        kgCamara: parseFloat(kgCamara) || 0,
        kgElaborado: parseFloat(kgElaborado) || 0,
        cantidadBolsas: parseInt(cantidadBolsas) || 0,
        clienteId: clienteId || null,
        operadorId: operadorId || null,
        observaciones: observaciones || null
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: registro.id,
        tropaCodigo: registro.tropaCodigo,
        tropaId: registro.tropaId,
        fecha: registro.fecha,
        articulo: registro.articulo,
        kgCamara: registro.kgCamara,
        kgElaborado: registro.kgElaborado,
        cantidadBolsas: registro.cantidadBolsas,
        clienteId: registro.clienteId,
        operadorId: registro.operadorId,
        observaciones: registro.observaciones,
        createdAt: registro.createdAt,
        updatedAt: registro.updatedAt
      }
    })
  } catch (error) {
    console.error('Error creating menudencia:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear registro de menudencia' },
      { status: 500 }
    )
  }
}

// PUT - Update registro de menudencia
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      tropaCodigo, 
      tropaId,
      fecha,
      articulo, 
      kgCamara, 
      kgElaborado, 
      cantidadBolsas,
      clienteId,
      operadorId,
      observaciones 
    } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      )
    }
    
    // Verificar que el registro existe
    const existente = await db.registroMenudencia.findUnique({
      where: { id }
    })
    
    if (!existente) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      )
    }
    
    const updateData: Record<string, unknown> = {}
    if (tropaCodigo !== undefined) updateData.tropaCodigo = tropaCodigo
    if (tropaId !== undefined) updateData.tropaId = tropaId
    if (fecha !== undefined) updateData.fecha = new Date(fecha)
    if (articulo !== undefined) updateData.articulo = articulo
    if (kgCamara !== undefined) updateData.kgCamara = parseFloat(kgCamara) || 0
    if (kgElaborado !== undefined) updateData.kgElaborado = parseFloat(kgElaborado) || 0
    if (cantidadBolsas !== undefined) updateData.cantidadBolsas = parseInt(cantidadBolsas) || 0
    if (clienteId !== undefined) updateData.clienteId = clienteId
    if (operadorId !== undefined) updateData.operadorId = operadorId
    if (observaciones !== undefined) updateData.observaciones = observaciones
    
    const registro = await db.registroMenudencia.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: registro.id,
        tropaCodigo: registro.tropaCodigo,
        tropaId: registro.tropaId,
        fecha: registro.fecha,
        articulo: registro.articulo,
        kgCamara: registro.kgCamara,
        kgElaborado: registro.kgElaborado,
        cantidadBolsas: registro.cantidadBolsas,
        clienteId: registro.clienteId,
        operadorId: registro.operadorId,
        observaciones: registro.observaciones,
        createdAt: registro.createdAt,
        updatedAt: registro.updatedAt
      }
    })
  } catch (error) {
    console.error('Error updating menudencia:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar registro de menudencia' },
      { status: 500 }
    )
  }
}

// DELETE - Delete registro de menudencia
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      )
    }
    
    // Verificar que el registro existe
    const existente = await db.registroMenudencia.findUnique({
      where: { id }
    })
    
    if (!existente) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      )
    }
    
    await db.registroMenudencia.delete({
      where: { id }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Registro de menudencia eliminado'
    })
  } catch (error) {
    console.error('Error deleting menudencia:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar registro de menudencia' },
      { status: 500 }
    )
  }
}
