import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { NivelPermiso, ModuloSistema } from '@prisma/client'

// POST - Login con usuario/password o PIN
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { usuario, password, pin } = body
    
    // Login con usuario y password
    if (usuario && password) {
      const operador = await db.operador.findFirst({
        where: {
          usuario: String(usuario),
          activo: true
        },
        include: {
          PermisoModulo: true
        }
      })
      
      if (!operador) {
        return NextResponse.json(
          { success: false, error: 'Usuario no encontrado o inactivo' },
          { status: 401 }
        )
      }
      
      const validPassword = await bcrypt.compare(password, operador.password)
      
      if (!validPassword) {
        return NextResponse.json(
          { success: false, error: 'Contraseña incorrecta' },
          { status: 401 }
        )
      }
      
      // Registrar login en auditoría
      await db.auditoria.create({
        data: {
          operadorId: operador.id,
          modulo: 'AUTH',
          accion: 'LOGIN',
          entidad: 'Operador',
          entidadId: operador.id,
          descripcion: `Login exitoso: ${operador.nombre} (${operador.usuario})`
        }
      })
      
      // Formatear permisos como objeto para el frontend
      const permisosFormateados = formatearPermisos(operador.PermisoModulo)
      
      return NextResponse.json({
        success: true,
        data: {
          id: operador.id,
          nombre: operador.nombre,
          usuario: operador.usuario,
          email: operador.email,
          tienePin: !!operador.pin,
          permisos: permisosFormateados
        }
      })
    }
    
    // Login con PIN (para autorización rápida de operaciones críticas)
    if (pin) {
      const operador = await db.operador.findFirst({
        where: {
          pin: String(pin),
          activo: true
        },
        include: {
          PermisoModulo: true
        }
      })
      
      if (!operador) {
        return NextResponse.json(
          { success: false, error: 'PIN inválido o operador inactivo' },
          { status: 401 }
        )
      }
      
      // Registrar login en auditoría
      await db.auditoria.create({
        data: {
          operadorId: operador.id,
          modulo: 'AUTH',
          accion: 'LOGIN_PIN',
          entidad: 'Operador',
          entidadId: operador.id,
          descripcion: `Login con PIN: ${operador.nombre}`
        }
      })
      
      // Formatear permisos como objeto para el frontend
      const permisosFormateados = formatearPermisos(operador.PermisoModulo)
      
      return NextResponse.json({
        success: true,
        data: {
          id: operador.id,
          nombre: operador.nombre,
          usuario: operador.usuario,
          email: operador.email,
          tienePin: !!operador.pin,
          permisos: permisosFormateados
        }
      })
    }
    
    return NextResponse.json(
      { success: false, error: 'Debe proporcionar usuario/password o PIN' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error en login:', error)
    return NextResponse.json(
      { success: false, error: 'Error de servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Logout
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { operadorId } = body
    
    if (operadorId) {
      // Registrar logout en auditoría
      await db.auditoria.create({
        data: {
          operadorId,
          modulo: 'AUTH',
          accion: 'LOGOUT',
          entidad: 'Operador',
          entidadId: operadorId,
          descripcion: 'Logout'
        }
      })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en logout:', error)
    return NextResponse.json({ success: true })
  }
}

// Función helper para formatear permisos
function formatearPermisos(permisos: { modulo: ModuloSistema; nivel: NivelPermiso }[]) {
  const resultado: Record<string, { nivel: string; puedeAcceder: boolean; puedeSupervisar: boolean }> = {}
  
  for (const p of permisos) {
    resultado[p.modulo] = {
      nivel: p.nivel,
      puedeAcceder: p.nivel !== 'NINGUNO',
      puedeSupervisar: p.nivel === 'SUPERVISOR'
    }
  }
  
  return resultado
}
