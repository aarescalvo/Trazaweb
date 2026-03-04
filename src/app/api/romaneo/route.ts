import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Get romaneos (all or by garron)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const garron = searchParams.get('garron')
    const listaFaenaId = searchParams.get('listaFaenaId')

    if (garron) {
      // Get romaneo by garron from the current lista de faena
      const listaActual = await db.listaFaena.findFirst({
        where: {
          estado: { in: ['ABIERTA', 'EN_PROCESO'] }
        },
        orderBy: { fecha: 'desc' }
      })

      if (!listaActual) {
        return NextResponse.json({ 
          success: false, 
          error: 'No hay lista de faena activa' 
        })
      }

      // Get the garron assignment
      const asignacion = await db.asignacionGarron.findFirst({
        where: {
          listaFaenaId: listaActual.id,
          garron: parseInt(garron)
        },
        include: {
          animal: {
            include: {
              tropa: {
                include: {
                  usuarioFaena: true
                }
              }
            }
          }
        }
      })

      if (!asignacion) {
        return NextResponse.json({ 
          success: false, 
          error: 'Garrón no encontrado en la lista actual' 
        })
      }

      // Check if romaneo already exists
      let romaneo = await db.romaneo.findFirst({
        where: { garron: parseInt(garron) },
        include: { tipificador: true }
      })

      // If no romaneo yet, create pending one with animal data
      if (!romaneo && asignacion.animal) {
        romaneo = await db.romaneo.create({
          data: {
            garron: parseInt(garron),
            tropaCodigo: asignacion.animal.tropa.codigo,
            numeroAnimal: asignacion.animal.numero,
            tipoAnimal: asignacion.animal.tipoAnimal,
            raza: asignacion.animal.raza,
            pesoVivo: asignacion.animal.pesoVivo,
            estado: 'PENDIENTE',
            listaFaenaId: listaActual.id
          },
          include: { tipificador: true }
        })
      }

      return NextResponse.json({ 
        success: true, 
        data: romaneo ? {
          ...romaneo,
          animal: asignacion.animal ? {
            codigo: asignacion.animal.codigo,
            caravana: asignacion.animal.caravana,
            tropa: asignacion.animal.tropa
          } : null
        } : null 
      })
    }

    // Get all romaneos
    const where: any = {}
    if (listaFaenaId) {
      where.listaFaenaId = listaFaenaId
    }

    const romaneos = await db.romaneo.findMany({
      where,
      include: {
        tipificador: true
      },
      orderBy: { garron: 'asc' }
    })

    return NextResponse.json({ success: true, data: romaneos })
  } catch (error) {
    console.error('Error fetching romaneo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener romaneo' },
      { status: 500 }
    )
  }
}

// PUT - Update romaneo with weights and create medias reses
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      pesoMediaIzq, 
      pesoMediaDer, 
      pesoTotal, 
      rinde, 
      denticion, 
      tipificadorId,
      camaraId,
      operadorId 
    } = body

    if (!id || !pesoMediaIzq || !pesoMediaDer) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Get the romaneo
    const romaneo = await db.romaneo.findUnique({
      where: { id },
      include: { mediasRes: true }
    })

    if (!romaneo) {
      return NextResponse.json(
        { success: false, error: 'Romaneo no encontrado' },
        { status: 404 }
      )
    }

    // Update romaneo
    const updated = await db.romaneo.update({
      where: { id },
      data: {
        pesoMediaIzq,
        pesoMediaDer,
        pesoTotal,
        rinde,
        denticion,
        tipificadorId: tipificadorId || null,
        operadorId: operadorId || null,
        updatedAt: new Date()
      },
      include: { tipificador: true }
    })

    // Create or update medias reses
    // Delete existing ones if any
    if (romaneo.mediasRes.length > 0) {
      await db.mediaRes.deleteMany({
        where: { romaneoId: id }
      })
    }

    // Create media izquierda
    const codigoIzq = `${romaneo.garron}-IZQ-${Date.now()}`
    await db.mediaRes.create({
      data: {
        romaneoId: id,
        lado: 'IZQUIERDA',
        peso: pesoMediaIzq,
        sigla: 'A', // Default to Asado
        codigo: codigoIzq,
        estado: 'EN_CAMARA',
        camaraId: camaraId || null
      }
    })

    // Create media derecha
    const codigoDer = `${romaneo.garron}-DER-${Date.now()}`
    await db.mediaRes.create({
      data: {
        romaneoId: id,
        lado: 'DERECHA',
        peso: pesoMediaDer,
        sigla: 'A',
        codigo: codigoDer,
        estado: 'EN_CAMARA',
        camaraId: camaraId || null
      }
    })

    // Update animal status if we have the animal
    if (romaneo.numeroAnimal) {
      const animal = await db.animal.findFirst({
        where: { 
          numero: romaneo.numeroAnimal,
          tropa: { codigo: romaneo.tropaCodigo }
        }
      })
      if (animal) {
        await db.animal.update({
          where: { id: animal.id },
          data: { estado: 'FAENADO' }
        })
      }
    }

    // Update stock in camara if specified
    if (camaraId) {
      await db.stockMediaRes.upsert({
        where: {
          camaraId_tropaCodigo_especie: {
            camaraId,
            tropaCodigo: romaneo.tropaCodigo || '',
            especie: 'BOVINO' // Default
          }
        },
        create: {
          camaraId,
          tropaCodigo: romaneo.tropaCodigo,
          especie: 'BOVINO',
          cantidad: 2,
          pesoTotal: pesoTotal
        },
        update: {
          cantidad: { increment: 2 },
          pesoTotal: { increment: pesoTotal }
        }
      })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating romaneo:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar romaneo' },
      { status: 500 }
    )
  }
}
