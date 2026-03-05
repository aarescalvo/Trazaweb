import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Especie, TipoAnimal, EstadoPesaje, TipoPesajeCamion } from '@prisma/client'

// V3 - Updated: 2025-03-03 - Fixed FK validation

// Función para generar código de tropa
async function generarCodigoTropa(especie: Especie): Promise<{ codigo: string; numero: number }> {
  const year = new Date().getFullYear()
  const letra = especie === 'BOVINO' ? 'B' : especie === 'EQUINO' ? 'E' : 'O'
  
  const tropas = await db.tropa.findMany({
    where: {
      codigo: {
        startsWith: `${letra} ${year}`
      }
    },
    orderBy: { numero: 'desc' }
  })
  
  const nextNumero = tropas.length > 0 ? (tropas[0].numero || 0) + 1 : 1
  const secuencial = String(nextNumero).padStart(4, '0')
  
  return {
    codigo: `${letra} ${year} ${secuencial}`,
    numero: nextNumero
  }
}

// GET - Fetch pesajes or next tropa code
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')
  
  // Get next tropa code preview
  if (action === 'nextTropaCode') {
    const especie = (searchParams.get('especie') || 'BOVINO') as Especie
    const { codigo, numero } = await generarCodigoTropa(especie)
    return NextResponse.json({
      success: true,
      data: { codigo, numero }
    })
  }
  
  try {
    const pesajes = await db.pesajeCamion.findMany({
      include: {
        Transportista: true,
        Tropa: {
          include: {
            Cliente_Tropa_productorIdToCliente: true,
            Cliente_Tropa_usuarioFaenaIdToCliente: true,
            TropaAnimalCantidad: true,
            Corral: true
          }
        },
        Operador: true
      },
      orderBy: {
        fecha: 'desc'
      }
    })
    
    const lastPesaje = await db.pesajeCamion.findFirst({
      orderBy: { numeroTicket: 'desc' }
    })
    const nextTicketNumber = (lastPesaje?.numeroTicket || 0) + 1
    
    // Mapear al formato que espera el frontend
    const formatted = pesajes.map(p => ({
      id: p.id,
      tipo: p.tipo,
      numeroTicket: p.numeroTicket,
      fecha: p.fecha,
      patenteChasis: p.patenteChasis,
      patenteAcoplado: p.patenteAcoplado,
      chofer: p.choferNombre,
      dniChofer: p.choferDni,
      transportista: p.Transportista,
      destino: p.destino,
      remito: p.remito,
      pesoBruto: p.pesoBruto,
      pesoTara: p.pesoTara,
      pesoNeto: p.pesoNeto,
      descripcion: p.observaciones,
      estado: p.estado,
      operador: p.Operador,
      tropa: p.Tropa ? {
        id: p.Tropa.id,
        codigo: p.Tropa.codigo,
        productor: p.Tropa.Cliente_Tropa_productorIdToCliente,
        usuarioFaena: p.Tropa.Cliente_Tropa_usuarioFaenaIdToCliente,
        especie: p.Tropa.especie,
        cantidadCabezas: p.Tropa.cantidadCabezas,
        corral: p.Tropa.Corral?.nombre || null,
        dte: p.Tropa.dte,
        guia: p.Tropa.guia,
        tiposAnimales: p.Tropa.TropaAnimalCantidad,
        observaciones: p.Tropa.observaciones
      } : null
    }))
    
    return NextResponse.json({
      success: true,
      data: formatted,
      nextTicketNumber
    })
  } catch (error) {
    console.error('Error fetching pesajes:', error)
    return NextResponse.json(
      { success: false, error: 'Error al obtener pesajes' },
      { status: 500 }
    )
  }
}

// POST - Create new pesaje
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('[POST pesaje-camion] === INICIANDO CREACIÓN DE PESAJE v2 ===')
    console.log('[POST pesaje-camion] Body:', JSON.stringify(body, null, 2))
    
    const {
      tipo,
      patenteChasis,
      patenteAcoplado,
      chofer,
      dniChofer,
      transportistaId,
      dte,
      guia,
      productorId,
      usuarioFaenaId,
      especie,
      tiposAnimales,
      cantidadCabezas,
      corralId,
      pesoBruto,
      pesoTara,
      pesoNeto,
      observaciones,
      destino,
      remito,
      descripcion,
      operadorId
    } = body
    
    // Obtener último número de ticket
    const lastPesaje = await db.pesajeCamion.findFirst({
      orderBy: { numeroTicket: 'desc' }
    })
    const numeroTicket = (lastPesaje?.numeroTicket || 0) + 1
    
    // Determinar estado
    const estado: EstadoPesaje = pesoBruto && pesoTara ? 'CERRADO' : 'ABIERTO'
    
    // === VALIDACIÓN DE CLAVES FORÁNEAS ===
    console.log('[POST pesaje-camion] === VALIDANDO FKs ===')
    console.log('[POST pesaje-camion] operadorId recibido:', operadorId)
    console.log('[POST pesaje-camion] transportistaId recibido:', transportistaId)
    
    // Validate operadorId if provided
    let validOperadorId: string | undefined = undefined
    if (operadorId) {
      const operadorExists = await db.operador.findUnique({
        where: { id: operadorId }
      })
      if (operadorExists) {
        validOperadorId = operadorId
      } else {
        console.log('[POST pesaje-camion] operadorId no válido, ignorando:', operadorId)
      }
    }
    
    // Validate transportistaId if provided
    let validTransportistaId: string | undefined = undefined
    if (transportistaId) {
      const transportistaExists = await db.transportista.findUnique({
        where: { id: transportistaId }
      })
      if (transportistaExists) {
        validTransportistaId = transportistaId
      } else {
        console.log('[POST pesaje-camion] transportistaId no válido, ignorando:', transportistaId)
      }
    }
    
    // Crear pesaje - NO pasar IDs de FKs inválidos
    const pesajeData: any = {
      tipo: (tipo || 'INGRESO_HACIENDA') as TipoPesajeCamion,
      numeroTicket,
      patenteChasis: patenteChasis || '',
      patenteAcoplado: patenteAcoplado || null,
      choferNombre: chofer || null,
      choferDni: dniChofer || null,
      destino: destino || null,
      remito: remito || null,
      pesoBruto: pesoBruto ? parseFloat(pesoBruto) : null,
      pesoTara: pesoTara ? parseFloat(pesoTara) : null,
      pesoNeto: pesoNeto ? parseFloat(pesoNeto) : null,
      observaciones: observaciones || descripcion || null,
      estado,
      fechaTara: pesoTara ? new Date() : null
    }
    
    // Solo agregar FKs si tienen valores válidos (null es válido para FKs opcionales)
    // NO agregar FKs con IDs que no existen en la BD
    if (validTransportistaId) {
      pesajeData.transportistaId = validTransportistaId
    }
    // Importante: operadorId se pasa solo si es válido, de lo contrario no se incluye
    // Esto previene el error de FK constraint
    if (validOperadorId) {
      pesajeData.operadorId = validOperadorId
    }
    
    console.log('[POST pesaje-camion] === DATOS VALIDADOS ===')
    console.log('[POST pesaje-camion] pesajeData:', JSON.stringify(pesajeData, null, 2))
    
    const pesaje = await db.pesajeCamion.create({
      data: pesajeData,
      include: {
        Transportista: true,
        Operador: true
      }
    })
    
    console.log('[POST pesaje-camion] Pesaje creado:', pesaje.id)
    
    // Si es ingreso de hacienda, crear la tropa
    if (tipo === 'INGRESO_HACIENDA') {
      // Verificar que tenemos los datos mínimos para crear la tropa
      if (!usuarioFaenaId) {
        console.log('[POST pesaje-camion] Sin usuarioFaenaId, no se crea tropa')
        return NextResponse.json({
          success: true,
          data: {
            ...pesaje,
            chofer: pesaje.choferNombre,
            dniChofer: pesaje.choferDni,
            descripcion: pesaje.observaciones,
            tropa: null
          }
        })
      }
      
      // Validate usuarioFaenaId exists
      const usuarioFaenaExists = await db.cliente.findUnique({
        where: { id: usuarioFaenaId }
      })
      if (!usuarioFaenaExists) {
        console.log('[POST pesaje-camion] usuarioFaenaId no válido:', usuarioFaenaId)
        return NextResponse.json({
          success: false,
          error: 'Usuario de faena no válido'
        }, { status: 400 })
      }
      
      // Validate productorId if provided
      let validProductorId: string | undefined = undefined
      if (productorId) {
        const productorExists = await db.cliente.findUnique({
          where: { id: productorId }
        })
        if (productorExists) {
          validProductorId = productorId
        }
      }
      
      // Validate corralId if provided
      let validCorralId: string | undefined = undefined
      if (corralId) {
        const corralExists = await db.corral.findUnique({
          where: { id: corralId }
        })
        if (corralExists) {
          validCorralId = corralId
        }
      }
      
      const especieEnum = (especie || 'BOVINO') as Especie
      const { codigo, numero } = await generarCodigoTropa(especieEnum)
      
      // Crear la tropa
      const tropaData: any = {
        numero,
        codigo,
        usuarioFaenaId,
        especie: especieEnum,
        cantidadCabezas: parseInt(cantidadCabezas) || 0,
        dte: dte || '',
        guia: guia || '',
        pesajeCamionId: pesaje.id,
        estado: 'RECIBIDO'
      }
      
      // Campos opcionales validados
      if (validProductorId) tropaData.productorId = validProductorId
      if (validCorralId) tropaData.corralId = validCorralId
      if (pesoBruto) tropaData.pesoBruto = parseFloat(pesoBruto)
      if (pesoTara) tropaData.pesoTara = parseFloat(pesoTara)
      if (pesoNeto) tropaData.pesoNeto = parseFloat(pesoNeto)
      if (observaciones) tropaData.observaciones = observaciones
      if (validOperadorId) tropaData.operadorId = validOperadorId
      
      console.log('[POST pesaje-camion] Creando tropa:', tropaData)
      
      const tropa = await db.tropa.create({
        data: tropaData,
        include: {
          Cliente_Tropa_productorIdToCliente: true,
          Cliente_Tropa_usuarioFaenaIdToCliente: true,
          TropaAnimalCantidad: true,
          Corral: true
        }
      })
      
      console.log('[POST pesaje-camion] Tropa creada:', tropa.id, tropa.codigo)
      
      // Crear tipos de animales si existen
      if (tiposAnimales && Array.isArray(tiposAnimales) && tiposAnimales.length > 0) {
        console.log('[POST pesaje-camion] Creando tiposAnimales:', tiposAnimales.length)
        for (const t of tiposAnimales) {
          if (t.tipoAnimal && t.cantidad > 0) {
            console.log('[POST pesaje-camion] Insertando tipo:', t.tipoAnimal, 'cantidad:', t.cantidad)
            try {
              await db.tropaAnimalCantidad.create({
                data: {
                  tropaId: tropa.id,
                  tipoAnimal: t.tipoAnimal as TipoAnimal,
                  cantidad: parseInt(t.cantidad)
                }
              })
              console.log('[POST pesaje-camion] Tipo insertado:', t.tipoAnimal)
            } catch (insertError) {
              console.error('[POST pesaje-camion] Error insertando tipo:', t.tipoAnimal, insertError)
            }
          }
        }
        console.log('[POST pesaje-camion] Todos los tipos insertados')
      }
      
      // Re-fetch tropa with tiposAnimales
      const tropaCompleta = await db.tropa.findUnique({
        where: { id: tropa.id },
        include: {
          Cliente_Tropa_productorIdToCliente: true,
          Cliente_Tropa_usuarioFaenaIdToCliente: true,
          TropaAnimalCantidad: true,
          Corral: true
        }
      })
      
      console.log('[POST pesaje-camion] Retornando con tropa')
      
      return NextResponse.json({
        success: true,
        data: {
          ...pesaje,
          chofer: pesaje.choferNombre,
          dniChofer: pesaje.choferDni,
          descripcion: pesaje.observaciones,
          tropa: tropaCompleta ? {
            id: tropaCompleta.id,
            codigo: tropaCompleta.codigo,
            productor: tropaCompleta.Cliente_Tropa_productorIdToCliente,
            usuarioFaena: tropaCompleta.Cliente_Tropa_usuarioFaenaIdToCliente,
            especie: tropaCompleta.especie,
            cantidadCabezas: tropaCompleta.cantidadCabezas,
            corral: tropaCompleta.Corral?.nombre || null,
            dte: tropaCompleta.dte,
            guia: tropaCompleta.guia,
            tiposAnimales: tropaCompleta.TropaAnimalCantidad,
            observaciones: tropaCompleta.observaciones
          } : null
        }
      })
    }
    
    console.log('[POST pesaje-camion] Retornando sin tropa')
    
    return NextResponse.json({
      success: true,
      data: {
        ...pesaje,
        chofer: pesaje.choferNombre,
        dniChofer: pesaje.choferDni,
        descripcion: pesaje.observaciones
      }
    })
  } catch (error) {
    console.error('Error creating pesaje:', error)
    return NextResponse.json(
      { success: false, error: 'Error al crear pesaje: ' + String(error) },
      { status: 500 }
    )
  }
}

// PUT - Update pesaje (add tara)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, pesoTara, pesoNeto } = body
    
    const pesaje = await db.pesajeCamion.update({
      where: { id },
      data: {
        pesoTara: parseFloat(pesoTara),
        pesoNeto: parseFloat(pesoNeto),
        estado: 'CERRADO',
        fechaTara: new Date()
      },
      include: {
        Transportista: true,
        Operador: true,
        Tropa: {
          include: {
            Cliente_Tropa_productorIdToCliente: true,
            Cliente_Tropa_usuarioFaenaIdToCliente: true,
            TropaAnimalCantidad: true,
            Corral: true
          }
        }
      }
    })
    
    // Actualizar tropa si existe
    if (pesaje.Tropa) {
      await db.tropa.update({
        where: { id: pesaje.Tropa.id },
        data: {
          pesoTara: parseFloat(pesoTara),
          pesoNeto: parseFloat(pesoNeto),
          estado: 'EN_CORRAL'
        }
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...pesaje,
        chofer: pesaje.choferNombre,
        dniChofer: pesaje.choferDni,
        descripcion: pesaje.observaciones,
        tropa: pesaje.Tropa ? {
          id: pesaje.Tropa.id,
          codigo: pesaje.Tropa.codigo,
          productor: pesaje.Tropa.Cliente_Tropa_productorIdToCliente,
          usuarioFaena: pesaje.Tropa.Cliente_Tropa_usuarioFaenaIdToCliente,
          especie: pesaje.Tropa.especie,
          cantidadCabezas: pesaje.Tropa.cantidadCabezas,
          corral: pesaje.Tropa.Corral?.nombre || null,
          tiposAnimales: pesaje.Tropa.TropaAnimalCantidad,
          observaciones: pesaje.Tropa.observaciones
        } : null
      }
    })
  } catch (error) {
    console.error('Error updating pesaje:', error)
    return NextResponse.json(
      { success: false, error: 'Error al actualizar pesaje' },
      { status: 500 }
    )
  }
}
