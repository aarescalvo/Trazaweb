import { TIPOS_PESAJE } from './constants'
import type { Pesaje } from './types'

// Interfaz para configuración del frigorífico
interface ConfiguracionFrigorifico {
  nombre?: string
  direccion?: string
  cuit?: string
  numeroEstablecimiento?: string
  logo?: string
}

// Imprimir ticket individual
export function imprimirTicket(pesaje: Pesaje, duplicado: boolean = false, config?: ConfiguracionFrigorifico) {
  const tipoLabel = TIPOS_PESAJE.find(t => t.id === pesaje.tipo)?.label || pesaje.tipo
  const copia = duplicado ? ' - COPIA' : ''
  
  // Usar logo de configuración o el default
  const logoUrl = config?.logo 
    ? (config.logo.startsWith('http') ? config.logo : `${typeof window !== 'undefined' ? window.location.origin : ''}${config.logo}`)
    : (typeof window !== 'undefined' ? `${window.location.origin}/logo-solemar.png` : '/logo-solemar.png')
  
  // Usar datos de configuración o valores default
  const empresaNombre = config?.nombre || 'SOLEMAR ALIMENTARIA S.A.'
  const empresaDireccion = config?.direccion || 'Ruta Provincial N° 11 - Km 45.5 | San Martín, Mendoza'

  const printWindow = window.open('', '_blank', 'width=400,height=700')
  if (!printWindow) return

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ticket #${pesaje.numeroTicket}${copia}</title>
      <style>
        @page { size: 80mm auto; margin: 3mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 5mm; max-width: 74mm; }
        .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 8px; margin-bottom: 8px; }
        .logo { max-width: 60mm; max-height: 20mm; margin-bottom: 5px; }
        .empresa { font-size: 14px; font-weight: bold; }
        .direccion { font-size: 9px; color: #555; }
        .ticket-title { font-size: 12px; margin-top: 5px; }
        .ticket-num { font-size: 18px; font-weight: bold; background: #000; color: #fff; padding: 2px 8px; display: inline-block; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .label { font-weight: bold; }
        .section { border-top: 1px dashed black; padding-top: 6px; margin-top: 6px; }
        .section-title { font-weight: bold; text-align: center; margin-bottom: 4px; font-size: 10px; }
        .peso { font-size: 12px; font-weight: bold; }
        .peso-neto { font-size: 14px; font-weight: bold; background: #f0f0f0; padding: 4px; text-align: center; margin: 4px 0; }

        .firma-section { margin-top: 15px; padding-top: 10px; border-top: 2px solid black; }
        .firma-title { font-weight: bold; text-align: center; font-size: 10px; margin-bottom: 8px; }
        .firma-container { display: flex; justify-content: space-between; gap: 10px; }
        .firma-box { flex: 1; text-align: center; }
        .firma-linea { border-bottom: 1px solid black; height: 25px; margin-top: 3px; }
        .firma-label { font-size: 9px; margin-top: 3px; }

        .chofer-info { background: #f9f9f9; padding: 5px; margin: 5px 0; border: 1px solid #ddd; }
        .chofer-info .row { margin: 2px 0; }

        .footer { margin-top: 10px; text-align: center; font-size: 8px; color: #777; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
        <div class="empresa">${empresaNombre}</div>
        <div class="direccion">${empresaDireccion}</div>
        <div class="ticket-title">TICKET DE PESAJE${copia}</div>
        <div class="ticket-num">Nº ${String(pesaje.numeroTicket).padStart(6, '0')}</div>
      </div>

      <div class="row"><span class="label">Tipo:</span><span>${tipoLabel}</span></div>
      <div class="row"><span class="label">Fecha:</span><span>${new Date(pesaje.fecha).toLocaleDateString('es-AR')}</span></div>
      <div class="row"><span class="label">Hora:</span><span>${new Date(pesaje.fecha).toLocaleTimeString('es-AR')}</span></div>
      ${pesaje.operador ? `<div class="row"><span class="label">Operador:</span><span>${pesaje.operador.nombre}</span></div>` : ''}

      <div class="section">
        <div class="section-title">DATOS DEL VEHÍCULO</div>
        <div class="row"><span class="label">Patente Chasis:</span><span>${pesaje.patenteChasis}</span></div>
        ${pesaje.patenteAcoplado ? `<div class="row"><span class="label">Patente Acoplado:</span><span>${pesaje.patenteAcoplado}</span></div>` : ''}
      </div>

      ${pesaje.chofer || pesaje.choferDni ? `
        <div class="chofer-info">
          <div class="section-title">DATOS DEL CHOFER</div>
          ${pesaje.chofer ? `<div class="row"><span class="label">Nombre:</span><span>${pesaje.chofer}</span></div>` : ''}
          ${pesaje.choferDni ? `<div class="row"><span class="label">DNI:</span><span>${pesaje.choferDni}</span></div>` : ''}
        </div>
      ` : ''}

      ${pesaje.tipo === 'INGRESO_HACIENDA' && pesaje.tropa ? `
        <div class="section">
          <div class="section-title">DATOS DE HACIENDA</div>
          <div class="row"><span class="label">Tropa:</span><span style="font-weight: bold;">${pesaje.tropa.codigo}</span></div>
          ${pesaje.tropa.productor ? `<div class="row"><span class="label">Productor:</span><span>${pesaje.tropa.productor.nombre}</span></div>` : ''}
          <div class="row"><span class="label">Usuario Faena:</span><span>${pesaje.tropa.usuarioFaena?.nombre || '-'}</span></div>
          <div class="row"><span class="label">Especie:</span><span>${pesaje.tropa.especie}</span></div>
          <div class="row"><span class="label">Cabezas:</span><span>${pesaje.tropa.cantidadCabezas || '-'}</span></div>
          ${pesaje.tropa.corral ? `<div class="row"><span class="label">Corral:</span><span>${pesaje.tropa.corral}</span></div>` : ''}
          ${pesaje.tropa.dte ? `<div class="row"><span class="label">DTE:</span><span>${pesaje.tropa.dte}</span></div>` : ''}
          ${pesaje.tropa.guia ? `<div class="row"><span class="label">Guía:</span><span>${pesaje.tropa.guia}</span></div>` : ''}
        </div>
      ` : ''}

      ${pesaje.tipo === 'SALIDA_MERCADERIA' ? `
        <div class="section">
          <div class="section-title">DATOS DE SALIDA</div>
          <div class="row"><span class="label">Destino:</span><span>${pesaje.destino || '-'}</span></div>
          ${pesaje.remito ? `<div class="row"><span class="label">Remito:</span><span>${pesaje.remito}</span></div>` : ''}
        </div>
      ` : ''}

      <div class="section">
        <div class="section-title">PESOS</div>
        <div class="row peso"><span class="label">Bruto:</span><span>${pesaje.pesoBruto?.toLocaleString() || '-'} kg</span></div>
        <div class="row peso"><span class="label">Tara:</span><span>${pesaje.pesoTara?.toLocaleString() || '-'} kg</span></div>
        <div class="peso-neto">
          <span>PESO NETO: ${pesaje.pesoNeto?.toLocaleString() || '-'} kg</span>
        </div>
      </div>

      <div class="firma-section">
        <div class="firma-title">CONSTANCIA DE RECEPCIÓN CONFORME</div>
        <div class="firma-container">
          <div class="firma-box">
            <div class="firma-linea"></div>
            <div class="firma-label">Firma Operador</div>
          </div>
          <div class="firma-box">
            <div class="firma-linea"></div>
            <div class="firma-label">Firma Chofer - Aclaración: ${pesaje.chofer || '..................'}</div>
            <div class="firma-label">DNI: ${pesaje.choferDni || '..................'}</div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Documento generado: ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}</p>
        <p>Este ticket es válido como comprobante de pesaje</p>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); window.onafterprint = function() { window.close(); } }, 300);
        }
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

// Imprimir reporte por rango de fechas
export function imprimirReporte(pesajes: Pesaje[], fechaDesde: string, fechaHasta: string, config?: ConfiguracionFrigorifico) {
  const printWindow = window.open('', '_blank', 'width=800,height=600')
  if (!printWindow) return

  const totalBruto = pesajes.reduce((acc, p) => acc + (p.pesoBruto || 0), 0)
  const totalTara = pesajes.reduce((acc, p) => acc + (p.pesoTara || 0), 0)
  const totalNeto = pesajes.reduce((acc, p) => acc + (p.pesoNeto || 0), 0)
  
  // Usar logo de configuración o el default
  const logoUrl = config?.logo 
    ? (config.logo.startsWith('http') ? config.logo : `${typeof window !== 'undefined' ? window.location.origin : ''}${config.logo}`)
    : (typeof window !== 'undefined' ? `${window.location.origin}/logo-solemar.png` : '/logo-solemar.png')
  
  // Usar datos de configuración o valores default
  const empresaNombre = config?.nombre || 'SOLEMAR ALIMENTARIA S.A.'
  const empresaDireccion = config?.direccion || 'Ruta Provincial N° 11 - Km 45.5 | San Martín, Mendoza'

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reporte de Pesajes</title>
      <style>
        @page { size: A4 landscape; margin: 15mm; }
        body { font-family: Arial, sans-serif; padding: 20px; }
        .header { text-align: center; border-bottom: 2px solid black; padding-bottom: 10px; margin-bottom: 20px; }
        .logo { max-width: 150px; max-height: 50px; }
        h1 { margin: 10px 0 5px; font-size: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; font-size: 11px; }
        th { background: #f0f0f0; }
        .totals { margin-top: 20px; padding: 10px; background: #f9f9f9; }
        .totals p { margin: 5px 0; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="${logoUrl}" alt="Logo" class="logo" onerror="this.style.display='none'">
        <h1>${empresaNombre}</h1>
        <p>${empresaDireccion}</p>
        <h2>Reporte de Pesajes</h2>
      </div>

      <p><strong>Período:</strong> ${fechaDesde ? new Date(fechaDesde).toLocaleDateString('es-AR') : 'Inicio'} - ${fechaHasta ? new Date(fechaHasta).toLocaleDateString('es-AR') : 'Hoy'}</p>
      <p><strong>Generado:</strong> ${new Date().toLocaleDateString('es-AR')} ${new Date().toLocaleTimeString('es-AR')}</p>

      <table>
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Fecha</th>
            <th>Tipo</th>
            <th>Patente</th>
            <th>Chofer</th>
            <th>Tropa</th>
            <th>Productor/Usuario</th>
            <th>Bruto (kg)</th>
            <th>Tara (kg)</th>
            <th>Neto (kg)</th>
          </tr>
        </thead>
        <tbody>
          ${pesajes.map(p => `
            <tr>
              <td>#${String(p.numeroTicket).padStart(6, '0')}</td>
              <td>${new Date(p.fecha).toLocaleDateString('es-AR')}</td>
              <td>${TIPOS_PESAJE.find(t => t.id === p.tipo)?.label || p.tipo}</td>
              <td>${p.patenteChasis}${p.patenteAcoplado ? ' / ' + p.patenteAcoplado : ''}</td>
              <td>${p.chofer || '-'}</td>
              <td>${p.tropa?.codigo || '-'}</td>
              <td>${p.tropa?.productor?.nombre || p.tropa?.usuarioFaena?.nombre || '-'}</td>
              <td>${p.pesoBruto?.toLocaleString() || '-'}</td>
              <td>${p.pesoTara?.toLocaleString() || '-'}</td>
              <td><strong>${p.pesoNeto?.toLocaleString() || '-'}</strong></td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="totals">
        <p>Total de pesajes: ${pesajes.length}</p>
        <p>Total Bruto: ${totalBruto.toLocaleString()} kg</p>
        <p>Total Tara: ${totalTara.toLocaleString()} kg</p>
        <p>Total Neto: ${totalNeto.toLocaleString()} kg</p>
      </div>

      <div class="footer">
        <p>Documento generado automáticamente por el sistema de gestión - ${empresaNombre}</p>
      </div>

      <script>
        window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}
