import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get stock by corral
export async function GET(request: NextRequest) {
  try {
    // Get all tropas with corral assigned
    const tropas = await db.tropa.findMany({
      where: {
        corralId: { isNot: null },
        estado: { notIn: ['FAENADO', 'DESPACHADO'] }
      },
      include: {
        Corral: true,
        _count: {
          select: { Animal: true }
        }
      }
    })

    // Group by corral
    const corralesMap = new Map<string, { corralId: string; corralNombre: string; totalCabezas: number; tropas: { codigo: string; cantidad: number }[] }>()

    for (const tropa of tropas) {
      if (!tropa.corralId || !tropa.Corral) continue

      const corralId = tropa.corralId
      const existing = corralesMap.get(corralId) || {
        corralId,
        corralNombre: tropa.Corral.nombre,
        totalCabezas: 0,
        tropas: []
      }

      // Use animal count if available, otherwise use cantidadCabezas
      const cantidad = tropa._count.Animal || tropa.cantidadCabezas

      existing.totalCabezas += cantidad
      existing.tropas.push({ codigo: tropa.codigo, cantidad })

      corralesMap.set(corralId, existing)
    }

    // Convert to array
    const stock = Array.from(corralesMap.values()).map((data) => ({
      corralId: data.corralId,
      corralNombre: data.corralNombre,
      totalCabezas: data.totalCabezas,
      tropas: data.tropas
    }))

    return NextResponse.json({
      success: true,
      data: stock
    })
  } catch (error) {
    console.error('Error fetching corral stock:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener stock de corrales' },
      { status: 500 }
    )
  }
}
