import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generarPlanilla01PDF, getNumeroSemana, getSexoAnimal } from '@/lib/pdf/planilla-01'

// GET - Generar PDF de Planilla 01
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tropaId = searchParams.get('tropaId')
    const tropaCodigo = searchParams.get('tropaCodigo')
    
    if (!tropaId && !tropaCodigo) {
      return NextResponse.json(
        { success: false, error: 'Se requiere tropaId o tropaCodigo' },
        { status: 400 }
      )
    }
    
    // Buscar la tropa con todos sus datos relacionados
    const tropa = await db.tropa.findFirst({
      where: tropaId 
        ? { id: tropaId }
        : { codigo: tropaCodigo },
      include: {
        productor: true,
        usuarioFaena: true,
        corral: true,
        tiposAnimales: true,
        animales: {
          orderBy: { numero: 'asc' },
          include: {
            pesajeIndividual: true
          }
        },
        pesajeCamion: {
          include: {
            transportista: true
          }
        }
      }
    })
    
    if (!tropa) {
      return NextResponse.json(
        { success: false, error: 'Tropa no encontrada' },
        { status: 404 }
      )
    }
    
    // Obtener configuración del frigorífico
    const configuracion = await db.configuracionFrigorifico.findFirst()
    
    // Obtener el número de semana
    const fechaRecepcion = new Date(tropa.fechaRecepcion)
    const numeroSemana = getNumeroSemana(fechaRecepcion)
    
    // Preparar los datos para el PDF
    const datosPlanilla = {
      // Encabezado
      fechaPlanilla: tropa.fechaRecepcion,
      numeroRegistro: tropa.codigo,
      horaIngreso: fechaRecepcion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      numeroSemana,
      tropaCodigo: tropa.codigo,
      nombreRomaneo: tropa.usuarioFaena?.nombre || '-',
      
      // Datos del transporte
      empresaTransportadora: tropa.pesajeCamion?.transportista?.nombre || '-',
      patenteChasis: tropa.pesajeCamion?.patenteChasis || '-',
      patenteRemolque: tropa.pesajeCamion?.patenteAcoplado || undefined,
      renspsa: undefined, // No está en el modelo actual
      lugarEmisionGuia: undefined, // No está en el modelo actual
      numeroGuia: tropa.guia || '-',
      dta: tropa.dte || undefined,
      numeroPrecinto: tropa.pesajeCamion?.precintos || undefined,
      
      // Datos del productor/consignatario
      consignatarioNombre: tropa.productor?.nombre || tropa.usuarioFaena?.nombre || '-',
      cuitProveedor: tropa.productor?.cuit || tropa.usuarioFaena?.cuit || undefined,
      
      // Datos del remitente
      nombreRemitente: tropa.productor?.nombre || undefined,
      
      // Especie
      especie: tropa.especie as 'BOVINO' | 'EQUINO',
      
      // Animales
      animales: tropa.animales.map(animal => ({
        numero: animal.numero,
        notaPorFaena: undefined,
        tipoAnimal: animal.tipoAnimal,
        sexo: getSexoAnimal(animal.tipoAnimal),
        color: undefined,
        pesoEntrada: animal.pesoVivo || animal.pesajeIndividual?.peso || undefined,
        desba: undefined,
        tipificacion: undefined,
        estadoCarne: undefined,
        corralNumero: tropa.corral?.nombre || undefined,
        notaAnimal: undefined
      })),
      
      // Totales
      totalAnimales: tropa.animales.length,
      totalPeso: tropa.animales.reduce((sum, a) => sum + (a.pesoVivo || a.pesajeIndividual?.peso || 0), 0),
      observaciones: tropa.observaciones || undefined,
      
      // Configuración
      configuracion: {
        nombre: configuracion?.nombre,
        logo: configuracion?.logo
      }
    }
    
    // Generar el PDF
    const pdfBuffer = await generarPlanilla01PDF(datosPlanilla)
    
    // Devolver el PDF como respuesta
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Planilla_01_${tropa.codigo}.pdf"`,
        'Content-Length': pdfBuffer.length.toString()
      }
    })
    
  } catch (error) {
    console.error('Error generando Planilla 01:', error)
    return NextResponse.json(
      { success: false, error: 'Error al generar el PDF' },
      { status: 500 }
    )
  }
}
