import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all cámaras
export async function GET() {
  try {
    const camaras = await db.camara.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })
    
    return NextResponse.json({
      success: true,
      data: camaras.map(c => ({
        id: c.id,
        nombre: c.nombre,
        tipo: c.tipo,
        capacidad: c.capacidad,
        observaciones: c.observaciones,
        activo: c.activo
      }))
    })
  } catch (error) {
    console.error('Error fetching cámaras:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener cámaras' },
      { status: 500 }
    )
  }
}

// POST - Create new cámara
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, tipo, capacidad, observaciones } = body
    
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      )
    }
    
    // Verificar que no exista una cámara con el mismo nombre
    const existente = await db.camara.findUnique({
      where: { nombre }
    })
    
    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe una cámara con ese nombre' },
        { status: 400 }
      )
    }
    
    const camara = await db.camara.create({
      data: {
        nombre,
        tipo: tipo || 'FAENA',
        capacidad: capacidad || 0,
        observaciones: observaciones || null,
        activo: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: camara.id,
        nombre: camara.nombre,
        tipo: camara.tipo,
        capacidad: camara.capacidad,
        observaciones: camara.observaciones,
        activo: camara.activo
      }
    })
  } catch (error) {
    console.error('Error creating cámara:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear cámara' },
      { status: 500 }
    )
  }
}

// PUT - Update cámara
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nombre, tipo, capacidad, observaciones, activo } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      )
    }
    
    const updateData: Record<string, unknown> = {}
    if (nombre !== undefined) updateData.nombre = nombre
    if (tipo !== undefined) updateData.tipo = tipo
    if (capacidad !== undefined) updateData.capacidad = capacidad
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (activo !== undefined) updateData.activo = activo
    
    const camara = await db.camara.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: camara.id,
        nombre: camara.nombre,
        tipo: camara.tipo,
        capacidad: camara.capacidad,
        observaciones: camara.observaciones,
        activo: camara.activo
      }
    })
  } catch (error) {
    console.error('Error updating cámara:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar cámara' },
      { status: 500 }
    )
  }
}

// DELETE - Delete cámara (soft delete)
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
    
    // Soft delete - marcar como inactivo
    await db.camara.update({
      where: { id },
      data: { activo: false }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Cámara eliminada'
    })
  } catch (error) {
    console.error('Error deleting cámara:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar cámara' },
      { status: 500 }
    )
  }
}
