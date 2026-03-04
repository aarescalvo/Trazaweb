import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Listar facturas con filtros
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    const estado = searchParams.get('estado')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    const where: any = {}

    if (clienteId) {
      where.clienteId = clienteId
    }

    if (estado) {
      where.estado = estado
    }

    if (fechaDesde || fechaHasta) {
      where.fecha = {}
      if (fechaDesde) {
        where.fecha.gte = new Date(fechaDesde)
      }
      if (fechaHasta) {
        where.fecha.lte = new Date(fechaHasta)
      }
    }

    const facturas = await db.facturaServicio.findMany({
      where,
      include: {
        cliente: {
          select: {
            id: true,
            nombre: true,
            cuit: true,
            tipoFacturacion: true,
          }
        },
        detalles: {
          include: {
            tropa: {
              select: {
                id: true,
                codigo: true,
                cantidadCabezas: true,
              }
            }
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: facturas
    })
  } catch (error) {
    console.error('Error fetching facturas:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener facturas' },
      { status: 500 }
    )
  }
}

// POST: Crear nueva factura
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      clienteId,
      fechaVencimiento,
      observaciones,
      operadorId,
      detalles = []
    } = body

    // Verificar que el cliente existe y tiene precio configurado
    const cliente = await db.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 400 }
      )
    }

    if (!cliente.precioServicioSinRecupero && !cliente.precioServicioConRecupero) {
      return NextResponse.json(
        { success: false, error: 'El cliente no tiene precios configurados' },
        { status: 400 }
      )
    }

    // Generar número de factura
    const ultimaFactura = await db.facturaServicio.findFirst({
      orderBy: { numero: 'desc' }
    })

    const ultimoNumero = ultimaFactura?.numero 
      ? parseInt(ultimaFactura.numero.split('-')[1] || ultimaFactura.numero) 
      : 0

    const numeroFactura = `${String(ultimoNumero + 1).padStart(8, '0')}`

    // Calcular totales
    let subtotal = 0

    const detallesCalculados = await Promise.all(detalles.map(async (d: any) => {
      const tropa = await db.tropa.findUnique({
        where: { id: d.tropaId },
        include: {
          usuarioFaena: true,
        }
      })

      if (!tropa) {
        throw new Error(`Tropa ${d.tropaId} no encontrada`)
      }

      // Calcular KG gancho (suma de peso de medias reses)
      const romaneos = await db.romaneo.findMany({
        where: {
          tropaCodigo: tropa.codigo,
          estado: 'CONFIRMADO'
        }
      })

      const kgGancho = romaneos.reduce((sum, r) => sum + (r.pesoTotal || 0), 0)
      
      // Determinar precio (con o sin recupero)
      const precioPorKg = d.conRecupero 
        ? (cliente.precioServicioConRecupero || 0)
        : (cliente.precioServicioSinRecupero || 0)

      const servicioFaena = kgGancho * precioPorKg

      const detalleSubtotal = servicioFaena + (d.servicioDespostada || 0) - (d.ventaMenudencia || 0)
      subtotal += detalleSubtotal

      return {
        tropaId: d.tropaId,
        tropaCodigo: tropa.codigo,
        cantidadAnimales: d.cantidadAnimales || tropa.cantidadCabezas,
        kgGancho,
        servicioFaena,
        servicioDespostada: d.servicioDespostada || 0,
        ventaMenudencia: d.ventaMenudencia || 0,
        ventaHueso: d.ventaHueso || 0,
        ventaGrasa: d.ventaGrasa || 0,
        ventaCuero: d.ventaCuero || 0,
        subtotal: detalleSubtotal,
      }
    }))

    const iva = subtotal * 0.21
    const total = subtotal + iva

    // Crear factura con detalles
    const factura = await db.facturaServicio.create({
      data: {
        numero: numeroFactura,
        fecha: new Date(),
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        clienteId,
        subtotal,
        iva,
        total,
        estado: 'PENDIENTE',
        observaciones,
        operadorId,
        detalles: {
          create: detallesCalculados
        }
      },
      include: {
        cliente: true,
        detalles: true
      }
    })

    return NextResponse.json({
      success: true,
      data: factura
    })
  } catch (error) {
    console.error('Error creating factura:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear factura: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

// PUT: Actualizar factura (cambiar estado, agregar pago)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, estado, metodoPago, fechaPago, observaciones } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID de factura requerido' },
        { status: 400 }
      )
    }

    const updateData: any = {}

    if (estado) {
      updateData.estado = estado
    }

    if (metodoPago) {
      updateData.metodoPago = metodoPago
    }

    if (fechaPago) {
      updateData.fechaPago = new Date(fechaPago)
    }

    if (observaciones !== undefined) {
      updateData.observaciones = observaciones
    }

    const factura = await db.facturaServicio.update({
      where: { id },
      data: updateData,
      include: {
        cliente: true,
        detalles: true
      }
    })

    return NextResponse.json({
      success: true,
      data: factura
    })
  } catch (error) {
    console.error('Error updating factura:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar factura' },
      { status: 500 }
    )
  }
}
