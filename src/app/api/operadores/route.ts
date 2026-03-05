import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { ModuloSistema, NivelPermiso } from '@prisma/client'

// GET - Listar operadores con sus permisos
export async function GET(request: NextRequest) {
  try {
    const operadores = await db.operador.findMany({
      include: {
        PermisoModulo: {
          orderBy: { modulo: 'asc' }
        }
      },
      orderBy: { nombre: 'asc' }
    })
    
    // Formatear respuesta
    const resultado = operadores.map(op => ({
      id: op.id,
      nombre: op.nombre,
      usuario: op.usuario,
      email: op.email,
      tienePin: !!op.pin,
      activo: op.activo,
      createdAt: op.createdAt,
      permisos: op.PermisoModulo.map(p => ({
        modulo: p.modulo,
        nivel: p.nivel
      }))
    }))
    
    return NextResponse.json({
      success: true,
      data: resultado
    })
  } catch (error) {
    console.error('Error fetching operadores:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener operadores' },
      { status: 500 }
    )
  }
}

// POST - Crear operador con permisos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, usuario, password, pin, email, permisos } = body
    
    if (!nombre || !usuario || !password) {
      return NextResponse.json(
        { success: false, error: 'Nombre, usuario y contraseña son requeridos' },
        { status: 400 }
      )
    }
    
    // Verificar si ya existe un operador con el mismo usuario
    const existingUsuario = await db.operador.findFirst({
      where: { usuario }
    })
    
    if (existingUsuario) {
      return NextResponse.json(
        { success: false, error: 'Ya existe un operador con ese usuario' },
        { status: 400 }
      )
    }
    
    // Verificar PIN si se proporciona
    if (pin) {
      const existingPin = await db.operador.findFirst({
        where: { pin }
      })
      
      if (existingPin) {
        return NextResponse.json(
          { success: false, error: 'Ya existe un operador con ese PIN' },
          { status: 400 }
        )
      }
    }
    
    // Hashear contraseña
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Crear operador con permisos
    const operador = await db.operador.create({
      data: {
        nombre,
        usuario,
        password: hashedPassword,
        pin: pin || null,
        email: email || null,
        activo: true,
        PermisoModulo: {
          create: permisos && permisos.length > 0
            ? permisos.map((p: { modulo: string; nivel: string }) => ({
                modulo: p.modulo as ModuloSistema,
                nivel: p.nivel as NivelPermiso
              }))
            : Object.values(ModuloSistema).map(modulo => ({
                modulo,
                nivel: NivelPermiso.NINGUNO
              }))
        }
      },
      include: {
        PermisoModulo: true
      }
    })
    
    return NextResponse.json({
      success: true,
      data: {
        id: operador.id,
        nombre: operador.nombre,
        usuario: operador.usuario,
        permisos: operador.PermisoModulo
      }
    })
  } catch (error) {
    console.error('Error creating operador:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear operador' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar operador y sus permisos
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nombre, usuario, password, pin, email, activo, permisos } = body
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      )
    }
    
    const updateData: Record<string, unknown> = {}
    
    if (nombre !== undefined) updateData.nombre = nombre
    if (usuario !== undefined) {
      // Verificar que el usuario no exista
      const existing = await db.operador.findFirst({
        where: { usuario, NOT: { id } }
      })
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'Ya existe otro operador con ese usuario' },
          { status: 400 }
        )
      }
      updateData.usuario = usuario
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }
    if (pin !== undefined) {
      if (pin) {
        const existingPin = await db.operador.findFirst({
          where: { pin, NOT: { id } }
        })
        if (existingPin) {
          return NextResponse.json(
            { success: false, error: 'Ya existe otro operador con ese PIN' },
            { status: 400 }
          )
        }
      }
      updateData.pin = pin || null
    }
    if (email !== undefined) updateData.email = email || null
    if (activo !== undefined) updateData.activo = activo
    
    // Actualizar operador
    const operador = await db.operador.update({
      where: { id },
      data: updateData
    })
    
    // Actualizar permisos si se proporcionan
    if (permisos && Array.isArray(permisos)) {
      // Eliminar permisos existentes
      await db.permisoModulo.deleteMany({
        where: { operadorId: id }
      })
      
      // Crear nuevos permisos
      await db.permisoModulo.createMany({
        data: permisos.map((p: { modulo: string; nivel: string }) => ({
          operadorId: id,
          modulo: p.modulo as ModuloSistema,
          nivel: p.nivel as NivelPermiso
        }))
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        id: operador.id,
        nombre: operador.nombre,
        usuario: operador.usuario
      }
    })
  } catch (error) {
    console.error('Error updating operador:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar operador' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar operador
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
    
    // Los permisos se eliminan automáticamente por onDelete: Cascade
    await db.operador.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting operador:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar operador' },
      { status: 500 }
    )
  }
}
