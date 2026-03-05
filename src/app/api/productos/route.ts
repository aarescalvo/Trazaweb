import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - Listar productos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activo = searchParams.get('activo');
    const buscar = searchParams.get('buscar');

    const where: any = {};

    if (activo === 'true') {
      where.activo = true;
    } else if (activo === 'false') {
      where.activo = false;
    }

    if (buscar) {
      where.OR = [
        { codigo: { contains: buscar, mode: 'insensitive' } },
        { nombre: { contains: buscar, mode: 'insensitive' } },
        { tipo: { contains: buscar, mode: 'insensitive' } },
        { tipoGeneral: { contains: buscar, mode: 'insensitive' } },
      ];
    }

    const productos = await db.producto.findMany({
      where,
      orderBy: [
        { codigo: 'asc' }
      ],
    });

    return NextResponse.json(productos);
  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// POST - Crear producto
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Verificar si el código ya existe
    const existente = await db.producto.findUnique({
      where: { codigo: body.codigo }
    });

    if (existente) {
      return NextResponse.json(
        { error: 'Ya existe un producto con ese código' },
        { status: 400 }
      );
    }

    const producto = await db.producto.create({
      data: {
        codigo: body.codigo,
        codigoSecundario: body.codigoSecundario || null,
        nombre: body.nombre,
        tara: body.tara ? parseFloat(body.tara) : null,
        vencimiento: body.vencimiento ? parseInt(body.vencimiento) : null,
        nroSenasa: body.nroSenasa || null,
        unidad: body.unidad || null,
        cantidadEtiquetas: body.cantidadEtiquetas ? parseInt(body.cantidadEtiquetas) : null,
        tieneTipificacion: body.tieneTipificacion || false,
        tipificacion: body.tipificacion || null,
        tipificacionSecundaria: body.tipificacionSecundaria || null,
        tipo: body.tipo || null,
        tipoGeneral: body.tipoGeneral || null,
        descripcionCircular: body.descripcionCircular || null,
        precioDolar: body.precioDolar ? parseFloat(body.precioDolar) : null,
        precioEuro: body.precioEuro ? parseFloat(body.precioEuro) : null,
        producidoParaCliente: body.producidoParaCliente || null,
        producidoDePieza: body.producidoDePieza || null,
        productoGeneral: body.productoGeneral || null,
        productoRepoRinde: body.productoRepoRinde || null,
        tipoTrabajo: body.tipoTrabajo || 'NINGUNO',
        idiomaEtiqueta: body.idiomaEtiqueta || 'ESPAÑOL',
        temperaturaTransporte: body.temperaturaTransporte || 'CONGELADA',
        tipoConsumo: body.tipoConsumo || 'HUMANO',
        empresa: body.empresa || 'PROPIA',
        jaslo: body.jaslo || false,
        formatoEtiqueta: body.formatoEtiqueta || null,
        textoTipoTrabajo: body.textoTipoTrabajo || null,
        textoTipoCarne: body.textoTipoCarne || null,
        textoEspanol: body.textoEspanol || null,
        textoIngles: body.textoIngles || null,
        textoTercerIdioma: body.textoTercerIdioma || null,
        especie: body.especie || null,
        codigoTipificacion: body.codigoTipificacion || null,
        codigoTipoTrabajo: body.codigoTipoTrabajo || null,
        codigoTransporte: body.codigoTransporte || null,
        codigoDestino: body.codigoDestino || null,
        diasConservacion: body.diasConservacion ? parseInt(body.diasConservacion) : null,
        tipoRotulo: body.tipoRotulo || null,
        precio: body.precio ? parseFloat(body.precio) : null,
        temperaturaConservacion: body.temperaturaConservacion || null,
        apareceRendimiento: body.apareceRendimiento || false,
        apareceStock: body.apareceStock || false,
        activo: body.activo !== false,
      }
    });

    return NextResponse.json(producto, { status: 201 });
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar producto
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    // Verificar si el código ya existe en otro producto
    if (data.codigo) {
      const existente = await db.producto.findFirst({
        where: {
          codigo: data.codigo,
          NOT: { id }
        }
      });

      if (existente) {
        return NextResponse.json(
          { error: 'Ya existe otro producto con ese código' },
          { status: 400 }
        );
      }
    }

    const producto = await db.producto.update({
      where: { id },
      data: {
        codigo: data.codigo,
        codigoSecundario: data.codigoSecundario || null,
        nombre: data.nombre,
        tara: data.tara ? parseFloat(data.tara) : null,
        vencimiento: data.vencimiento ? parseInt(data.vencimiento) : null,
        nroSenasa: data.nroSenasa || null,
        unidad: data.unidad || null,
        cantidadEtiquetas: data.cantidadEtiquetas ? parseInt(data.cantidadEtiquetas) : null,
        tieneTipificacion: data.tieneTipificacion || false,
        tipificacion: data.tipificacion || null,
        tipificacionSecundaria: data.tipificacionSecundaria || null,
        tipo: data.tipo || null,
        tipoGeneral: data.tipoGeneral || null,
        descripcionCircular: data.descripcionCircular || null,
        precioDolar: data.precioDolar ? parseFloat(data.precioDolar) : null,
        precioEuro: data.precioEuro ? parseFloat(data.precioEuro) : null,
        producidoParaCliente: data.producidoParaCliente || null,
        producidoDePieza: data.producidoDePieza || null,
        productoGeneral: data.productoGeneral || null,
        productoRepoRinde: data.productoRepoRinde || null,
        tipoTrabajo: data.tipoTrabajo || 'NINGUNO',
        idiomaEtiqueta: data.idiomaEtiqueta || 'ESPAÑOL',
        temperaturaTransporte: data.temperaturaTransporte || 'CONGELADA',
        tipoConsumo: data.tipoConsumo || 'HUMANO',
        empresa: data.empresa || 'PROPIA',
        jaslo: data.jaslo || false,
        formatoEtiqueta: data.formatoEtiqueta || null,
        textoTipoTrabajo: data.textoTipoTrabajo || null,
        textoTipoCarne: data.textoTipoCarne || null,
        textoEspanol: data.textoEspanol || null,
        textoIngles: data.textoIngles || null,
        textoTercerIdioma: data.textoTercerIdioma || null,
        especie: data.especie || null,
        codigoTipificacion: data.codigoTipificacion || null,
        codigoTipoTrabajo: data.codigoTipoTrabajo || null,
        codigoTransporte: data.codigoTransporte || null,
        codigoDestino: data.codigoDestino || null,
        diasConservacion: data.diasConservacion ? parseInt(data.diasConservacion) : null,
        tipoRotulo: data.tipoRotulo || null,
        precio: data.precio ? parseFloat(data.precio) : null,
        temperaturaConservacion: data.temperaturaConservacion || null,
        apareceRendimiento: data.apareceRendimiento || false,
        apareceStock: data.apareceStock || false,
        activo: data.activo !== false,
      }
    });

    return NextResponse.json(producto);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar producto
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ID de producto requerido' },
        { status: 400 }
      );
    }

    // Verificar si tiene precios asociados
    const preciosAsociados = await db.precioProducto.count({
      where: { productoId: id }
    });

    if (preciosAsociados > 0) {
      // En lugar de eliminar, desactivamos
      const producto = await db.producto.update({
        where: { id },
        data: { activo: false }
      });
      return NextResponse.json({ 
        message: 'Producto desactivado (tiene precios asociados)',
        producto 
      });
    }

    await db.producto.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}
