import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Fetch all subproductos
// Optional query param: ?activo=true to filter only active subproductos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activoParam = searchParams.get('activo')
    
    const where = activoParam === 'true' 
      ? { activo: true } 
      : {}
    
    const subproductos = await db.subproducto.findMany({
      where,
      orderBy: { codigo: 'asc' }
    })
    
    return NextResponse.json({
      success: true,
      data: subproductos.map(s => ({
        id: s.id,
        codigo: s.codigo,
        nombre: s.nombre,
        unidad: s.unidad,
        observaciones: s.observaciones,
        activo: s.activo,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching subproductos:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener subproductos' },
      { status: 500 }
    )
  }
}

// POST - Create new subproducto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { codigo, nombre, unidad, observaciones } = body
    
    if (!codigo) {
      return NextResponse.json(
        { success: false, error: 'El código es requerido' },
        { status: 400 }
      )
    }
    
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      )
    }
    
    // Verificar que no exista un subproducto con el mismo código
    const existente = await db.subproducto.findUnique({
      where: { codigo }
    })
    
    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un subproducto con ese código' },
        { status: 400 }
      )
    }
    
    const subproducto = await db.subproducto.create({
      data: {
        codigo,
        nombre,
        unidad: unidad || 'kg',
        observaciones: observaciones || null,
        activo: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: subproducto.id,
        codigo: subproducto.codigo,
        nombre: subproducto.nombre,
        unidad: subproducto.unidad,
        observaciones: subproducto.observaciones,
        activo: subproducto.activo,
        createdAt: subproducto.createdAt,
        updatedAt: subproducto.updatedAt
      }
    })
  } catch (error) {
    console.error('Error creating subproducto:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear subproducto' },
      { status: 500 }
    )
  }
}

// PUT - Update subproducto
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, codigo, nombre, unidad, observaciones, activo } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      )
    }
    
    // Verificar que el subproducto existe
    const existente = await db.subproducto.findUnique({
      where: { id }
    })
    
    if (!existente) {
      return NextResponse.json(
        { success: false, error: 'Subproducto no encontrado' },
        { status: 404 }
      )
    }
    
    // Si se cambia el código, verificar que no exista otro con el mismo código
    if (codigo && codigo !== existente.codigo) {
      const codigoDuplicado = await db.subproducto.findUnique({
        where: { codigo }
      })
      
      if (codigoDuplicado) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un subproducto con ese código' },
          { status: 400 }
        )
      }
    }
    
    const updateData: Record<string, unknown> = {}
    if (codigo !== undefined) updateData.codigo = codigo
    if (nombre !== undefined) updateData.nombre = nombre
    if (unidad !== undefined) updateData.unidad = unidad
    if (observaciones !== undefined) updateData.observaciones = observaciones
    if (activo !== undefined) updateData.activo = activo
    
    const subproducto = await db.subproducto.update({
      where: { id },
      data: updateData
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: subproducto.id,
        codigo: subproducto.codigo,
        nombre: subproducto.nombre,
        unidad: subproducto.unidad,
        observaciones: subproducto.observaciones,
        activo: subproducto.activo,
        createdAt: subproducto.createdAt,
        updatedAt: subproducto.updatedAt
      }
    })
  } catch (error) {
    console.error('Error updating subproducto:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar subproducto' },
      { status: 500 }
    )
  }
}

// DELETE - Soft delete subproducto (set activo=false)
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
    
    // Verificar que el subproducto existe
    const existente = await db.subproducto.findUnique({
      where: { id }
    })
    
    if (!existente) {
      return NextResponse.json(
        { success: false, error: 'Subproducto no encontrado' },
        { status: 404 }
      )
    }
    
    // Soft delete - marcar como inactivo
    await db.subproducto.update({
      where: { id },
      data: { activo: false }
    })
    
    return NextResponse.json({
      success: true,
      message: 'Subproducto eliminado'
    })
  } catch (error) {
    console.error('Error deleting subproducto:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar subproducto' },
      { status: 500 }
    )
  }
}
