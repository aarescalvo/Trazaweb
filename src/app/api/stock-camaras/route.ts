import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Especie } from '@prisma/client'

// GET - Fetch stock by cámara or all stock across cámaras
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const camaraId = searchParams.get('camaraId')
    const tropaCodigo = searchParams.get('tropaCodigo')
    const especie = searchParams.get('especie')

    // If camaraId is provided, get stock for that specific cámara
    if (camaraId) {
      const where: Record<string, unknown> = { camaraId }
      if (tropaCodigo) where.tropaCodigo = tropaCodigo
      if (especie) where.especie = especie as Especie

      const stock = await db.stockMediaRes.findMany({
        where,
        include: {
          camara: {
            select: { id: true, nombre: true, tipo: true, capacidad: true }
          }
        },
        orderBy: { fechaIngreso: 'desc' }
      })

      // Get media res count for this cámara
      const mediasEnCamara = await db.mediaRes.findMany({
        where: { camaraId, estado: 'EN_CAMARA' },
        select: { peso: true, lado: true, romaneo: { select: { tropaCodigo: true, especie: true } } }
      })

      // Calculate totals
      const totalMedias = mediasEnCamara.length
      const totalPeso = mediasEnCamara.reduce((acc, m) => acc + (m.peso || 0), 0)

      // Get cámara info with capacity
      const camara = await db.camara.findUnique({
        where: { id: camaraId },
        select: { nombre: true, tipo: true, capacidad: true }
      })

      // Calculate capacity percentage
      const capacidad = camara?.capacidad || 0
      const porcentajeOcupado = capacidad > 0 ? (totalMedias / capacidad) * 100 : 0

      return NextResponse.json({
        success: true,
        data: {
          camara,
          stock: stock.map(s => ({
            id: s.id,
            camaraId: s.camaraId,
            camaraNombre: s.camara.nombre,
            tropaCodigo: s.tropaCodigo,
            especie: s.especie,
            cantidad: s.cantidad,
            pesoTotal: s.pesoTotal,
            fechaIngreso: s.fechaIngreso
          })),
          resumen: {
            totalMedias,
            totalPeso,
            capacidad,
            porcentajeOcupado: Math.round(porcentajeOcupado * 10) / 10,
            alertaCapacidad: porcentajeOcupado >= 90
          }
        }
      })
    }

    // Get all stock across all cámaras
    const where: Record<string, unknown> = {}
    if (tropaCodigo) where.tropaCodigo = tropaCodigo
    if (especie) where.especie = especie as Especie

    const stock = await db.stockMediaRes.findMany({
      where,
      include: {
        camara: {
          select: { id: true, nombre: true, tipo: true, capacidad: true }
        }
      },
      orderBy: [
        { camara: { nombre: 'asc' } },
        { fechaIngreso: 'desc' }
      ]
    })

    // Get all cámaras with their current stock
    const camaras = await db.camara.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    })

    // Get media res count per cámara
    const mediasPorCamara = await db.mediaRes.groupBy({
      by: ['camaraId'],
      where: { estado: 'EN_CAMARA', camaraId: { isNot: null } },
      _count: { id: true },
      _sum: { peso: true }
    })

    // Build summary per cámara
    const stockPorCamara = camaras.map(camara => {
      const medias = mediasPorCamara.find(m => m.camaraId === camara.id)
      const cantidad = medias?._count?.id || 0
      const pesoTotal = medias?._sum?.peso || 0
      const porcentajeOcupado = camara.capacidad > 0 ? (cantidad / camara.capacidad) * 100 : 0

      return {
        camaraId: camara.id,
        camaraNombre: camara.nombre,
        tipo: camara.tipo,
        capacidad: camara.capacidad,
        cantidadMedias: cantidad,
        pesoTotal,
        porcentajeOcupado: Math.round(porcentajeOcupado * 10) / 10,
        alertaCapacidad: porcentajeOcupado >= 90
      }
    })

    // Get recent movements
    const movimientosRecientes = await db.movimientoCamara.findMany({
      take: 10,
      orderBy: { fecha: 'desc' },
      include: {
        camaraOrigen: { select: { nombre: true } },
        camaraDestino: { select: { nombre: true } }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        stock: stock.map(s => ({
          id: s.id,
          camaraId: s.camaraId,
          camaraNombre: s.camara.nombre,
          tropaCodigo: s.tropaCodigo,
          especie: s.especie,
          cantidad: s.cantidad,
          pesoTotal: s.pesoTotal,
          fechaIngreso: s.fechaIngreso
        })),
        stockPorCamara,
        movimientosRecientes: movimientosRecientes.map(m => ({
          id: m.id,
          camaraOrigen: m.camaraOrigen?.nombre,
          camaraDestino: m.camaraDestino?.nombre,
          producto: m.producto,
          cantidad: m.cantidad,
          peso: m.peso,
          tropaCodigo: m.tropaCodigo,
          fecha: m.fecha
        })),
        resumen: {
          totalCamaras: camaras.length,
          totalMedias: mediasPorCamara.reduce((acc, m) => acc + m._count.id, 0),
          totalPeso: mediasPorCamara.reduce((acc, m) => acc + (m._sum.peso || 0), 0),
          camarasConAlerta: stockPorCamara.filter(c => c.alertaCapacidad).length
        }
      }
    })
  } catch (error) {
    console.error('Error fetching stock cámaras:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener stock de cámaras' },
      { status: 500 }
    )
  }
}

// POST - Create manual stock entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { camaraId, tropaCodigo, especie, cantidad, pesoTotal, operadorId } = body

    if (!camaraId) {
      return NextResponse.json(
        { success: false, error: 'La cámara es requerida' },
        { status: 400 }
      )
    }

    if (!especie) {
      return NextResponse.json(
        { success: false, error: 'La especie es requerida' },
        { status: 400 }
      )
    }

    // Check if stock entry exists for this camara + tropa + especie
    const existente = await db.stockMediaRes.findFirst({
      where: { camaraId, tropaCodigo: tropaCodigo || null, especie: especie as Especie }
    })

    let stock
    if (existente) {
      // Update existing stock
      stock = await db.stockMediaRes.update({
        where: { id: existente.id },
        data: {
          cantidad: existente.cantidad + (cantidad || 1),
          pesoTotal: existente.pesoTotal + (pesoTotal || 0)
        }
      })
    } else {
      // Create new stock entry
      stock = await db.stockMediaRes.create({
        data: {
          camaraId,
          tropaCodigo: tropaCodigo || null,
          especie: especie as Especie,
          cantidad: cantidad || 1,
          pesoTotal: pesoTotal || 0
        }
      })
    }

    // Create movement record
    await db.movimientoCamara.create({
      data: {
        camaraDestinoId: camaraId,
        producto: 'Media Res',
        cantidad: cantidad || 1,
        peso: pesoTotal,
        tropaCodigo: tropaCodigo || null,
        operadorId: operadorId || null,
        observaciones: 'Ingreso manual'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: stock.id,
        camaraId: stock.camaraId,
        tropaCodigo: stock.tropaCodigo,
        especie: stock.especie,
        cantidad: stock.cantidad,
        pesoTotal: stock.pesoTotal,
        fechaIngreso: stock.fechaIngreso
      }
    })
  } catch (error) {
    console.error('Error creating stock entry:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear entrada de stock' },
      { status: 500 }
    )
  }
}

// PUT - Update stock entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, cantidad, pesoTotal, tropaCodigo, operadorId, observaciones } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID es requerido' },
        { status: 400 }
      )
    }

    const stockActual = await db.stockMediaRes.findUnique({
      where: { id },
      include: { camara: true }
    })

    if (!stockActual) {
      return NextResponse.json(
        { success: false, error: 'Stock no encontrado' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (cantidad !== undefined) updateData.cantidad = cantidad
    if (pesoTotal !== undefined) updateData.pesoTotal = pesoTotal
    if (tropaCodigo !== undefined) updateData.tropaCodigo = tropaCodigo

    const stock = await db.stockMediaRes.update({
      where: { id },
      data: updateData
    })

    // Create movement record for the update
    await db.movimientoCamara.create({
      data: {
        camaraOrigenId: stockActual.camaraId,
        camaraDestinoId: stockActual.camaraId,
        producto: 'Media Res',
        cantidad: cantidad !== undefined ? cantidad - stockActual.cantidad : 0,
        peso: pesoTotal !== undefined ? pesoTotal - stockActual.pesoTotal : 0,
        tropaCodigo: stockActual.tropaCodigo,
        operadorId: operadorId || null,
        observaciones: observaciones || 'Ajuste de stock'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: stock.id,
        camaraId: stock.camaraId,
        tropaCodigo: stock.tropaCodigo,
        especie: stock.especie,
        cantidad: stock.cantidad,
        pesoTotal: stock.pesoTotal,
        fechaIngreso: stock.fechaIngreso
      }
    })
  } catch (error) {
    console.error('Error updating stock:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar stock' },
      { status: 500 }
    )
  }
}

// DELETE - Remove stock entry
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

    const stock = await db.stockMediaRes.findUnique({
      where: { id },
      include: { camara: true }
    })

    if (!stock) {
      return NextResponse.json(
        { success: false, error: 'Stock no encontrado' },
        { status: 404 }
      )
    }

    // Create movement record before deleting
    await db.movimientoCamara.create({
      data: {
        camaraOrigenId: stock.camaraId,
        producto: 'Media Res',
        cantidad: -stock.cantidad,
        peso: -stock.pesoTotal,
        tropaCodigo: stock.tropaCodigo,
        observaciones: 'Eliminación de stock'
      }
    })

    await db.stockMediaRes.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Stock eliminado'
    })
  } catch (error) {
    console.error('Error deleting stock:', error)
    return NextResponse.json(
      { success: false, error: 'Error al eliminar stock' },
      { status: 500 }
    )
  }
}
