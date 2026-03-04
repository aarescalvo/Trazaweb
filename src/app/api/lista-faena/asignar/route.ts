import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT - Assign animal to existing garron (for garrones without animal)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { asignacionId, animalCodigo } = body

    if (!asignacionId || !animalCodigo) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      )
    }

    // Find animal
    const animal = await db.animal.findUnique({
      where: { codigo: animalCodigo }
    })

    if (!animal) {
      return NextResponse.json(
        { success: false, error: 'Animal no encontrado' },
        { status: 404 }
      )
    }

    // Check if animal already assigned
    const existingAnimal = await db.asignacionGarron.findUnique({
      where: { animalId: animal.id }
    })

    if (existingAnimal) {
      return NextResponse.json(
        { success: false, error: 'El animal ya tiene garrón asignado' },
        { status: 400 }
      )
    }

    // Get the assignment
    const asignacion = await db.asignacionGarron.findUnique({
      where: { id: asignacionId }
    })

    if (!asignacion) {
      return NextResponse.json(
        { success: false, error: 'Asignación no encontrada' },
        { status: 404 }
      )
    }

    // Check if assignment already has an animal
    if (asignacion.animalId) {
      return NextResponse.json(
        { success: false, error: 'El garrón ya tiene un animal asignado' },
        { status: 400 }
      )
    }

    // Update assignment
    const updated = await db.asignacionGarron.update({
      where: { id: asignacionId },
      data: {
        animalId: animal.id,
        numeroAnimal: animal.numero
      },
      include: {
        animal: {
          select: {
            id: true,
            codigo: true,
            numero: true,
            tipoAnimal: true
          }
        }
      }
    })

    // Update animal status
    await db.animal.update({
      where: { id: animal.id },
      data: { estado: 'EN_FAENA' }
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error updating garron:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar garrón' },
      { status: 500 }
    )
  }
}
