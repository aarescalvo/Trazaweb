'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  DollarSign, FileText, TrendingUp, CreditCard, Plus, Printer,
  RefreshCw, Eye, CheckCircle, XCircle, Calendar, Search,
  Calculator, Beef, Users, AlertTriangle, Download
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

interface Operador {
  id: string
  nombre: string
  rol: string
}

interface Cliente {
  id: string
  nombre: string
  cuit?: string
  precioServicioSinRecupero?: number
  precioServicioConRecupero?: number
  tipoFacturacion?: string
}

interface Tropa {
  id: string
  codigo: string
  cantidadCabezas: number
  usuarioFaena: Cliente
  fechaRecepcion: string
  estado: string
}

interface DetalleFactura {
  id: string
  tropaId?: string
  tropaCodigo?: string
  cantidadAnimales: number
  kgGancho: number
  servicioFaena: number
  servicioDespostada: number
  ventaMenudencia: number
  ventaHueso: number
  ventaGrasa: number
  ventaCuero: number
  subtotal: number
  tropa?: Tropa
}

interface Factura {
  id: string
  numero: string
  fecha: string
  fechaVencimiento?: string
  cliente: Cliente
  subtotal: number
  iva: number
  total: number
  estado: string
  metodoPago?: string
  fechaPago?: string
  observaciones?: string
  detalles: DetalleFactura[]
}

interface ResumenMensual {
  mes: number
  anio: number
  nombreMes: string
  totalFacturado: number
  totalPagado: number
  totalPendiente: number
  totalServicioFaena: number
  totalServicioDespostada: number
  totalVentasExtras: number
  totalIva: number
  totalCabezas: number
  totalKgGancho: number
  cantidadFacturas: number
  porCliente: any[]
  resumenAnual: any[]
}

// Formatear moneda
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2
  }).format(value)
}

// Formatear fecha
const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('es-AR')
}

export function FacturacionModule({ operador }: { operador: Operador }) {
  // Estados principales
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('resumen')

  // Datos
  const [resumen, setResumen] = useState<ResumenMensual | null>(null)
  const [facturas, setFacturas] = useState<Factura[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tropasDisponibles, setTropasDisponibles] = useState<Tropa[]>([])

  // Filtros
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1)
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear())
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  // Diálogos
  const [nuevaFacturaOpen, setNuevaFacturaOpen] = useState(false)
  const [detalleFacturaOpen, setDetalleFacturaOpen] = useState(false)
  const [pagoOpen, setPagoOpen] = useState(false)
  const [tropasSelectOpen, setTropasSelectOpen] = useState(false)

  // Nueva factura
  const [clienteSeleccionado, setClienteSeleccionado] = useState('')
  const [tropasSeleccionadas, setTropasSeleccionadas] = useState<string[]>([])
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [observaciones, setObservaciones] = useState('')

  // Factura seleccionada
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null)
  const [metodoPago, setMetodoPago] = useState('')

  // Cargar datos iniciales
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [resumenRes, facturasRes, clientesRes] = await Promise.all([
        fetch(`/api/facturacion/resumen?mes=${filtroMes}&anio=${filtroAnio}`),
        fetch('/api/facturacion'),
        fetch('/api/clientes')
      ])

      const resumenData = await resumenRes.json()
      const facturasData = await facturasRes.json()
      const clientesData = await clientesRes.json()

      if (resumenData.success) setResumen(resumenData.data)
      if (facturasData.success) setFacturas(facturasData.data)
      if (clientesData.success) {
        // Filtrar solo clientes que son usuarios de faena y tienen precios
        setClientes(clientesData.data.filter((c: Cliente) => 
          c.precioServicioSinRecupero || c.precioServicioConRecupero
        ))
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  // Cargar tropas disponibles para facturar
  const fetchTropasDisponibles = async (clienteId: string) => {
    try {
      const res = await fetch(`/api/tropas?usuarioFaenaId=${clienteId}&estado=FAENADO`)
      const data = await res.json()
      
      if (data.success) {
        // Filtrar tropas que no estén ya facturadas
        const tropasNoFacturadas = data.data.filter((t: Tropa) => {
          return !facturas.some(f => 
            f.detalles.some(d => d.tropaId === t.id)
          )
        })
        setTropasDisponibles(tropasNoFacturadas)
      }
    } catch (error) {
      console.error('Error fetching tropas:', error)
    }
  }

  // Crear nueva factura
  const handleCrearFactura = async () => {
    if (!clienteSeleccionado) {
      toast.error('Seleccione un cliente')
      return
    }

    if (tropasSeleccionadas.length === 0) {
      toast.error('Seleccione al menos una tropa')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/facturacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteSeleccionado,
          fechaVencimiento,
          observaciones,
          operadorId: operador.id,
          detalles: tropasSeleccionadas.map(tropaId => ({
            tropaId,
            conRecupero: false
          }))
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Factura creada correctamente')
        setNuevaFacturaOpen(false)
        setClienteSeleccionado('')
        setTropasSeleccionadas([])
        setFechaVencimiento('')
        setObservaciones('')
        fetchData()
      } else {
        toast.error(data.error || 'Error al crear factura')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Marcar factura como pagada
  const handleMarcarPagada = async () => {
    if (!facturaSeleccionada || !metodoPago) {
      toast.error('Seleccione método de pago')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/facturacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: facturaSeleccionada.id,
          estado: 'PAGADA',
          metodoPago,
          fechaPago: new Date().toISOString()
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Factura marcada como pagada')
        setPagoOpen(false)
        setFacturaSeleccionada(null)
        setMetodoPago('')
        fetchData()
      } else {
        toast.error(data.error || 'Error al actualizar')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Anular factura
  const handleAnularFactura = async (facturaId: string) => {
    if (!confirm('¿Está seguro de anular esta factura?')) return

    try {
      const res = await fetch('/api/facturacion', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: facturaId,
          estado: 'ANULADA'
        })
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Factura anulada')
        fetchData()
      } else {
        toast.error(data.error || 'Error al anular')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  // Imprimir factura
  const handleImprimirFactura = (factura: Factura) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Factura ${factura.numero}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .empresa { font-size: 24px; font-weight: bold; }
            .factura-titulo { font-size: 20px; margin-top: 10px; }
            .datos-cliente { margin-bottom: 20px; }
            .datos-cliente p { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f5f5f5; }
            .totales { text-align: right; }
            .totales p { margin: 5px 0; }
            .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="empresa">SOLEMAR ALIMENTARIA</div>
            <div class="factura-titulo">FACTURA DE SERVICIO N° ${factura.numero}</div>
            <p>Fecha: ${formatDate(factura.fecha)}</p>
          </div>
          
          <div class="datos-cliente">
            <p><strong>Cliente:</strong> ${factura.cliente.nombre}</p>
            <p><strong>CUIT:</strong> ${factura.cliente.cuit || '-'}</p>
            ${factura.fechaVencimiento ? `<p><strong>Vencimiento:</strong> ${formatDate(factura.fechaVencimiento)}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th>Tropa</th>
                <th>Cabezas</th>
                <th>KG Gancho</th>
                <th>Servicio Faena</th>
                <th>Despostada</th>
                <th>Ventas Extras</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${factura.detalles.map(d => `
                <tr>
                  <td>${d.tropaCodigo || '-'}</td>
                  <td>${d.cantidadAnimales}</td>
                  <td>${d.kgGancho.toFixed(1)}</td>
                  <td>${formatCurrency(d.servicioFaena)}</td>
                  <td>${formatCurrency(d.servicioDespostada)}</td>
                  <td>${formatCurrency(d.ventaMenudencia + d.ventaHueso + d.ventaGrasa + d.ventaCuero)}</td>
                  <td>${formatCurrency(d.subtotal)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totales">
            <p><strong>Subtotal:</strong> ${formatCurrency(factura.subtotal)}</p>
            <p><strong>IVA (21%):</strong> ${formatCurrency(factura.iva)}</p>
            <p class="total-final"><strong>TOTAL:</strong> ${formatCurrency(factura.total)}</p>
          </div>

          ${factura.observaciones ? `<p><strong>Observaciones:</strong> ${factura.observaciones}</p>` : ''}

          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  // Actualizar resumen cuando cambien los filtros
  useEffect(() => {
    fetchResumen()
  }, [filtroMes, filtroAnio])

  const fetchResumen = async () => {
    try {
      const res = await fetch(`/api/facturacion/resumen?mes=${filtroMes}&anio=${filtroAnio}`)
      const data = await res.json()
      if (data.success) {
        setResumen(data.data)
      }
    } catch (error) {
      console.error('Error fetching resumen:', error)
    }
  }

  // Filtrar facturas
  const facturasFiltradas = facturas.filter(f => {
    if (filtroCliente && f.clienteId !== filtroCliente) return false
    if (filtroEstado && f.estado !== filtroEstado) return false
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <DollarSign className="w-8 h-8 animate-pulse text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800">Facturación de Servicios</h1>
            <p className="text-stone-500">Gestión de facturas de servicio de faena</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button 
              className="bg-amber-500 hover:bg-amber-600"
              onClick={() => setNuevaFacturaOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva Factura
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumen">Resumen Mensual</TabsTrigger>
            <TabsTrigger value="facturas">Facturas</TabsTrigger>
            <TabsTrigger value="detalle">Detalle por Tropa</TabsTrigger>
            <TabsTrigger value="pagos">Estado de Pagos</TabsTrigger>
          </TabsList>

          {/* TAB 1: RESUMEN MENSUAL */}
          <TabsContent value="resumen" className="space-y-6">
            {/* Filtros de mes/año */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Mes</Label>
                    <Select value={filtroMes.toString()} onValueChange={(v) => setFiltroMes(parseInt(v))}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                          'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((m, i) => (
                          <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Año</Label>
                    <Select value={filtroAnio.toString()} onValueChange={(v) => setFiltroAnio(parseInt(v))}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026].map(a => (
                          <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {resumen && (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-500 p-2 rounded-lg">
                          <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Total Facturado</p>
                          <p className="text-lg font-bold text-green-600">{formatCurrency(resumen.totalFacturado)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-500 p-2 rounded-lg">
                          <CheckCircle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Total Pagado</p>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(resumen.totalPagado)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-amber-500 p-2 rounded-lg">
                          <AlertTriangle className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Pendiente</p>
                          <p className="text-lg font-bold text-amber-600">{formatCurrency(resumen.totalPendiente)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-0 shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-purple-500 p-2 rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-xs text-stone-500">Facturas</p>
                          <p className="text-lg font-bold">{resumen.cantidadFacturas}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detalle de conceptos */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="bg-stone-50 rounded-t-lg">
                    <CardTitle className="text-lg">Desglose por Concepto</CardTitle>
                    <CardDescription>
                      {resumen.nombreMes.charAt(0).toUpperCase() + resumen.nombreMes.slice(1)} {resumen.anio}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="text-right">Cabezas</TableHead>
                          <TableHead className="text-right">KG Gancho</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Servicio Faena</TableCell>
                          <TableCell className="text-right">{resumen.totalCabezas}</TableCell>
                          <TableCell className="text-right">{resumen.totalKgGancho.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(resumen.totalServicioFaena)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Servicio Despostada</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(resumen.totalServicioDespostada)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Ventas Extras (Menudencias, Hueso, etc.)</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right font-bold text-red-600">-{formatCurrency(resumen.totalVentasExtras)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">IVA (21%)</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right">-</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(resumen.totalIva)}</TableCell>
                        </TableRow>
                        <TableRow className="bg-stone-50">
                          <TableCell colSpan={3} className="font-bold text-lg">TOTAL</TableCell>
                          <TableCell className="text-right font-bold text-lg">{formatCurrency(resumen.totalFacturado)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Resumen por cliente */}
                <Card className="border-0 shadow-md">
                  <CardHeader className="bg-stone-50 rounded-t-lg">
                    <CardTitle className="text-lg">Resumen por Cliente</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {resumen.porCliente.length === 0 ? (
                      <div className="p-8 text-center text-stone-400">
                        <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hay datos para este período</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead className="text-right">Facturas</TableHead>
                            <TableHead className="text-right">Cabezas</TableHead>
                            <TableHead className="text-right">KG Gancho</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">Pagado</TableHead>
                            <TableHead className="text-right">Pendiente</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {resumen.porCliente.map((c, i) => (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{c.cliente.nombre}</TableCell>
                              <TableCell className="text-right">{c.facturas}</TableCell>
                              <TableCell className="text-right">{c.cabezas}</TableCell>
                              <TableCell className="text-right">{c.kgGancho.toFixed(1)}</TableCell>
                              <TableCell className="text-right font-bold">{formatCurrency(c.total)}</TableCell>
                              <TableCell className="text-right text-blue-600">{formatCurrency(c.pagado)}</TableCell>
                              <TableCell className="text-right text-amber-600">{formatCurrency(c.pendiente)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* TAB 2: FACTURAS */}
          <TabsContent value="facturas" className="space-y-6">
            {/* Filtros */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4">
                  <div className="space-y-2">
                    <Label>Cliente</Label>
                    <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        {clientes.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                        <SelectItem value="PAGADA">Pagada</SelectItem>
                        <SelectItem value="ANULADA">Anulada</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de facturas */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-stone-50 rounded-t-lg">
                <CardTitle className="text-lg">Lista de Facturas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {facturasFiltradas.length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay facturas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Factura</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturasFiltradas.map((factura) => (
                        <TableRow key={factura.id}>
                          <TableCell className="font-mono font-bold">{factura.numero}</TableCell>
                          <TableCell>{formatDate(factura.fecha)}</TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{factura.cliente.nombre}</p>
                              <p className="text-xs text-stone-400">{factura.cliente.cuit}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(factura.total)}</TableCell>
                          <TableCell>
                            <Badge className={
                              factura.estado === 'PAGADA' ? 'bg-green-100 text-green-700' :
                              factura.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-700'
                            }>
                              {factura.estado}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-center gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setFacturaSeleccionada(factura)
                                  setDetalleFacturaOpen(true)
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleImprimirFactura(factura)}
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                              {factura.estado === 'PENDIENTE' && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-green-600"
                                    onClick={() => {
                                      setFacturaSeleccionada(factura)
                                      setPagoOpen(true)
                                    }}
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    className="text-red-600"
                                    onClick={() => handleAnularFactura(factura.id)}
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: DETALLE POR TROPA */}
          <TabsContent value="detalle" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-stone-50 rounded-t-lg">
                <CardTitle className="text-lg">Detalle por Tropa</CardTitle>
                <CardDescription>
                  Desglose detallado de cada tropa facturada
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tropa</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead className="text-right">Cabezas</TableHead>
                      <TableHead className="text-right">KG Gancho</TableHead>
                      <TableHead className="text-right">$/kg</TableHead>
                      <TableHead className="text-right">Servicio Faena</TableHead>
                      <TableHead className="text-right">Despostada</TableHead>
                      <TableHead className="text-right">Menudencias</TableHead>
                      <TableHead className="text-right">Hueso</TableHead>
                      <TableHead className="text-right">Grasa</TableHead>
                      <TableHead className="text-right">Cuero</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facturas.flatMap(f => f.detalles.map(d => ({
                      ...d,
                      factura: f,
                      cliente: f.cliente
                    }))).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-stone-400">
                          No hay detalles de facturas
                        </TableCell>
                      </TableRow>
                    ) : (
                      facturas.flatMap(f => f.detalles.map(d => {
                        const precioKg = d.kgGancho > 0 ? d.servicioFaena / d.kgGancho : 0
                        const totalDetalle = d.subtotal
                        return (
                          <TableRow key={d.id}>
                            <TableCell className="font-mono">{d.tropaCodigo}</TableCell>
                            <TableCell>{f.cliente.nombre}</TableCell>
                            <TableCell className="text-right">{d.cantidadAnimales}</TableCell>
                            <TableCell className="text-right">{d.kgGancho.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(precioKg)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(d.servicioFaena)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(d.servicioDespostada)}</TableCell>
                            <TableCell className="text-right text-red-600">-{formatCurrency(d.ventaMenudencia)}</TableCell>
                            <TableCell className="text-right text-red-600">-{formatCurrency(d.ventaHueso)}</TableCell>
                            <TableCell className="text-right text-red-600">-{formatCurrency(d.ventaGrasa)}</TableCell>
                            <TableCell className="text-right text-red-600">-{formatCurrency(d.ventaCuero)}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(totalDetalle)}</TableCell>
                          </TableRow>
                        )
                      }))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: ESTADO DE PAGOS */}
          <TabsContent value="pagos" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-stone-50 rounded-t-lg">
                <CardTitle className="text-lg">Facturas Pendientes de Pago</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {facturas.filter(f => f.estado === 'PENDIENTE').length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50 text-green-500" />
                    <p>No hay facturas pendientes</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Factura</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Días</TableHead>
                        <TableHead className="text-center">Acción</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturas.filter(f => f.estado === 'PENDIENTE').map((factura) => {
                        const hoy = new Date()
                        const fechaFactura = new Date(factura.fecha)
                        const diasTranscurridos = Math.floor((hoy.getTime() - fechaFactura.getTime()) / (1000 * 60 * 60 * 24))
                        return (
                          <TableRow key={factura.id}>
                            <TableCell className="font-mono font-bold">{factura.numero}</TableCell>
                            <TableCell>{formatDate(factura.fecha)}</TableCell>
                            <TableCell>{factura.fechaVencimiento ? formatDate(factura.fechaVencimiento) : '-'}</TableCell>
                            <TableCell className="font-medium">{factura.cliente.nombre}</TableCell>
                            <TableCell className="text-right font-bold">{formatCurrency(factura.total)}</TableCell>
                            <TableCell>
                              <Badge className={
                                diasTranscurridos > 30 ? 'bg-red-100 text-red-700' :
                                diasTranscurridos > 15 ? 'bg-amber-100 text-amber-700' :
                                'bg-green-100 text-green-700'
                              }>
                                {diasTranscurridos} días
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => {
                                  setFacturaSeleccionada(factura)
                                  setPagoOpen(true)
                                }}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Marcar Pagada
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Pagos realizados */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-stone-50 rounded-t-lg">
                <CardTitle className="text-lg">Últimos Pagos Realizados</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {facturas.filter(f => f.estado === 'PAGADA').length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay pagos registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Factura</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Fecha Pago</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {facturas.filter(f => f.estado === 'PAGADA').slice(0, 10).map((factura) => (
                        <TableRow key={factura.id}>
                          <TableCell className="font-mono">{factura.numero}</TableCell>
                          <TableCell>{factura.cliente.nombre}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(factura.total)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{factura.metodoPago || '-'}</Badge>
                          </TableCell>
                          <TableCell>{factura.fechaPago ? formatDate(factura.fechaPago) : '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Diálogo: Nueva Factura */}
        <Dialog open={nuevaFacturaOpen} onOpenChange={setNuevaFacturaOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Factura de Servicio</DialogTitle>
              <DialogDescription>
                Seleccione el cliente y las tropas a facturar
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Cliente */}
              <div className="space-y-2">
                <Label>Cliente (Usuario de Faena)</Label>
                <Select 
                  value={clienteSeleccionado} 
                  onValueChange={(v) => {
                    setClienteSeleccionado(v)
                    fetchTropasDisponibles(v)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nombre} - ${c.precioServicioSinRecupero?.toFixed(2) || '-'}/kg
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Información de precios del cliente */}
              {clienteSeleccionado && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">Precios del Cliente:</p>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-xs text-blue-600">Sin Recupero:</p>
                      <p className="font-bold">
                        {formatCurrency(clientes.find(c => c.id === clienteSeleccionado)?.precioServicioSinRecupero || 0)}/kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Con Recupero:</p>
                      <p className="font-bold">
                        {formatCurrency(clientes.find(c => c.id === clienteSeleccionado)?.precioServicioConRecupero || 0)}/kg
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tropas disponibles */}
              {clienteSeleccionado && (
                <div className="space-y-2">
                  <Label>Tropas Disponibles para Facturar</Label>
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {tropasDisponibles.length === 0 ? (
                      <div className="p-4 text-center text-stone-400">
                        No hay tropas disponibles para facturar
                      </div>
                    ) : (
                      <div className="divide-y">
                        {tropasDisponibles.map((tropa) => (
                          <div 
                            key={tropa.id} 
                            className="p-3 flex items-center gap-3 hover:bg-stone-50"
                          >
                            <Checkbox
                              checked={tropasSeleccionadas.includes(tropa.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setTropasSeleccionadas([...tropasSeleccionadas, tropa.id])
                                } else {
                                  setTropasSeleccionadas(tropasSeleccionadas.filter(id => id !== tropa.id))
                                }
                              }}
                            />
                            <div className="flex-1">
                              <p className="font-mono font-bold">{tropa.codigo}</p>
                              <p className="text-sm text-stone-500">
                                {tropa.cantidadCabezas} cabezas • {formatDate(tropa.fechaRecepcion)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Fecha de vencimiento y observaciones */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Vencimiento</Label>
                  <Input
                    type="date"
                    value={fechaVencimiento}
                    onChange={(e) => setFechaVencimiento(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Input
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones..."
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNuevaFacturaOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCrearFactura} 
                disabled={saving || !clienteSeleccionado || tropasSeleccionadas.length === 0}
                className="bg-amber-500 hover:bg-amber-600"
              >
                {saving ? 'Creando...' : 'Crear Factura'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo: Detalle Factura */}
        <Dialog open={detalleFacturaOpen} onOpenChange={setDetalleFacturaOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de Factura {facturaSeleccionada?.numero}</DialogTitle>
            </DialogHeader>
            
            {facturaSeleccionada && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-stone-500">Cliente</p>
                    <p className="font-bold">{facturaSeleccionada.cliente.nombre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-stone-500">Fecha</p>
                    <p className="font-bold">{formatDate(facturaSeleccionada.fecha)}</p>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tropa</TableHead>
                      <TableHead className="text-right">Cabezas</TableHead>
                      <TableHead className="text-right">KG</TableHead>
                      <TableHead className="text-right">Servicio</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {facturaSeleccionada.detalles.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono">{d.tropaCodigo}</TableCell>
                        <TableCell className="text-right">{d.cantidadAnimales}</TableCell>
                        <TableCell className="text-right">{d.kgGancho.toFixed(1)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(d.servicioFaena)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(d.subtotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-bold">{formatCurrency(facturaSeleccionada.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (21%):</span>
                    <span className="font-bold">{formatCurrency(facturaSeleccionada.iva)}</span>
                  </div>
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">TOTAL:</span>
                    <span className="font-bold text-green-600">{formatCurrency(facturaSeleccionada.total)}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Diálogo: Registrar Pago */}
        <Dialog open={pagoOpen} onOpenChange={setPagoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>
                Factura N° {facturaSeleccionada?.numero} - {formatCurrency(facturaSeleccionada?.total || 0)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <Select value={metodoPago} onValueChange={setMetodoPago}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EFECTIVO">Efectivo</SelectItem>
                    <SelectItem value="TRANSFERENCIA">Transferencia</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="TARJETA">Tarjeta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPagoOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleMarcarPagada} 
                disabled={saving || !metodoPago}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? 'Guardando...' : 'Confirmar Pago'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default FacturacionModule
