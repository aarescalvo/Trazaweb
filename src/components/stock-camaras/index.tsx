'use client'

import { useState, useEffect } from 'react'
import {
  Warehouse, TrendingUp, AlertTriangle, Search, Filter,
  Plus, Edit, Trash2, RefreshCw, Package, ArrowRight,
  Scale, Beef, Clock, X, Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

interface Operador {
  id: string
  nombre: string
  nivel: string
}

interface Camara {
  id: string
  nombre: string
  tipo: string
  capacidad: number
}

interface StockItem {
  id: string
  camaraId: string
  camaraNombre: string
  tropaCodigo?: string
  especie: string
  cantidad: number
  pesoTotal: number
  fechaIngreso: string
}

interface StockPorCamara {
  camaraId: string
  camaraNombre: string
  tipo: string
  capacidad: number
  cantidadMedias: number
  pesoTotal: number
  porcentajeOcupado: number
  alertaCapacidad: boolean
}

interface Movimiento {
  id: string
  camaraOrigen?: string
  camaraDestino?: string
  producto?: string
  cantidad?: number
  peso?: number
  tropaCodigo?: string
  fecha: string
}

interface Resumen {
  totalCamaras: number
  totalMedias: number
  totalPeso: number
  camarasConAlerta: number
}

interface StockData {
  stock: StockItem[]
  stockPorCamara: StockPorCamara[]
  movimientosRecientes: Movimiento[]
  resumen: Resumen
}

const ESPECIES = [
  { id: 'BOVINO', label: 'Bovino', color: 'bg-amber-100 text-amber-700' },
  { id: 'EQUINO', label: 'Equino', color: 'bg-blue-100 text-blue-700' },
]

const TIPOS_CAMARA = [
  { id: 'FAENA', label: 'Faena', unidad: 'ganchos' },
  { id: 'CUARTEO', label: 'Cuarteo', unidad: 'kg' },
  { id: 'DEPOSITO', label: 'Depósito', unidad: 'kg' },
]

export function StockCamarasModule({ operador }: { operador: Operador }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<StockData | null>(null)
  const [camaras, setCamaras] = useState<Camara[]>([])
  
  // Filters
  const [filtroTropa, setFiltroTropa] = useState('')
  const [filtroEspecie, setFiltroEspecie] = useState('todos')
  const [filtroCamara, setFiltroCamara] = useState('todos')
  
  // Tabs
  const [activeTab, setActiveTab] = useState('general')
  
  // Dialogs
  const [detalleCamaraOpen, setDetalleCamaraOpen] = useState(false)
  const [nuevoStockOpen, setNuevoStockOpen] = useState(false)
  const [editarStockOpen, setEditarStockOpen] = useState(false)
  const [eliminarStockOpen, setEliminarStockOpen] = useState(false)
  const [camaraSeleccionada, setCamaraSeleccionada] = useState<StockPorCamara | null>(null)
  const [stockSeleccionado, setStockSeleccionado] = useState<StockItem | null>(null)
  const [stockCamaraDetalle, setStockCamaraDetalle] = useState<StockItem[]>([])
  
  // Form
  const [formData, setFormData] = useState({
    camaraId: '',
    tropaCodigo: '',
    especie: 'BOVINO',
    cantidad: 1,
    pesoTotal: 0
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [stockRes, camarasRes] = await Promise.all([
        fetch('/api/stock-camaras'),
        fetch('/api/camaras')
      ])
      
      const stockData = await stockRes.json()
      const camarasData = await camarasRes.json()
      
      if (stockData.success) {
        setData(stockData.data)
      }
      
      if (camarasData.success) {
        setCamaras(camarasData.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const handleVerDetalleCamara = async (camara: StockPorCamara) => {
    try {
      const res = await fetch(`/api/stock-camaras?camaraId=${camara.camaraId}`)
      const data = await res.json()
      
      if (data.success) {
        setCamaraSeleccionada(camara)
        setStockCamaraDetalle(data.data.stock)
        setDetalleCamaraOpen(true)
      }
    } catch (error) {
      toast.error('Error al cargar detalle')
    }
  }

  const handleNuevoStock = () => {
    setStockSeleccionado(null)
    setFormData({
      camaraId: camaras[0]?.id || '',
      tropaCodigo: '',
      especie: 'BOVINO',
      cantidad: 1,
      pesoTotal: 0
    })
    setNuevoStockOpen(true)
  }

  const handleEditarStock = (stock: StockItem) => {
    setStockSeleccionado(stock)
    setFormData({
      camaraId: stock.camaraId,
      tropaCodigo: stock.tropaCodigo || '',
      especie: stock.especie,
      cantidad: stock.cantidad,
      pesoTotal: stock.pesoTotal
    })
    setEditarStockOpen(true)
  }

  const handleEliminarStock = (stock: StockItem) => {
    setStockSeleccionado(stock)
    setEliminarStockOpen(true)
  }

  const handleGuardarStock = async (isEdit: boolean) => {
    if (!formData.camaraId || !formData.especie) {
      toast.error('Complete los campos requeridos')
      return
    }

    setSaving(true)
    try {
      const url = '/api/stock-camaras'
      const method = isEdit ? 'PUT' : 'POST'
      const body = isEdit 
        ? { ...formData, id: stockSeleccionado?.id, operadorId: operador.id }
        : { ...formData, operadorId: operador.id }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await res.json()
      if (data.success) {
        toast.success(isEdit ? 'Stock actualizado' : 'Stock ingresado')
        setNuevoStockOpen(false)
        setEditarStockOpen(false)
        fetchData()
      } else {
        toast.error(data.error || 'Error al guardar')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmarEliminar = async () => {
    if (!stockSeleccionado) return

    setSaving(true)
    try {
      const res = await fetch(`/api/stock-camaras?id=${stockSeleccionado.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (data.success) {
        toast.success('Stock eliminado')
        setEliminarStockOpen(false)
        fetchData()
      } else {
        toast.error(data.error || 'Error al eliminar')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // Filter stock
  const stockFiltrado = data?.stock?.filter(item => {
    if (filtroEspecie !== 'todos' && item.especie !== filtroEspecie) return false
    if (filtroCamara !== 'todos' && item.camaraId !== filtroCamara) return false
    if (filtroTropa && !item.tropaCodigo?.toLowerCase().includes(filtroTropa.toLowerCase())) return false
    return true
  }) || []

  const getTipoInfo = (tipo: string) => TIPOS_CAMARA.find(t => t.id === tipo) || TIPOS_CAMARA[0]
  const getEspecieInfo = (especie: string) => ESPECIES.find(e => e.id === especie) || ESPECIES[0]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <Warehouse className="w-8 h-8 animate-pulse text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-800">Stock de Cámaras</h1>
            <p className="text-stone-500">Control de medias reses en cámaras frigoríficas</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Button onClick={handleNuevoStock} className="bg-amber-500 hover:bg-amber-600">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Ingreso
            </Button>
          </div>
        </div>

        {/* Alertas de capacidad */}
        {data?.resumen?.camarasConAlerta > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-bold text-red-700">
                    ¡Atención! {data.resumen.camarasConAlerta} cámara(s) cerca de capacidad máxima
                  </p>
                  <p className="text-sm text-red-600">
                    Revise el stock y considere redistribuir o despachar productos
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resumen General */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Warehouse className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-800">{data?.resumen?.totalCamaras || 0}</p>
                  <p className="text-sm text-stone-500">Cámaras</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Beef className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-800">{data?.resumen?.totalMedias || 0}</p>
                  <p className="text-sm text-stone-500">Medias Reses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Scale className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-800">
                    {(data?.resumen?.totalPeso || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-stone-500">KG Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-stone-800">
                    {data?.resumen?.totalMedias && data?.resumen?.totalCamaras
                      ? Math.round(data.resumen.totalMedias / data.resumen.totalCamaras)
                      : 0}
                  </p>
                  <p className="text-sm text-stone-500">Promedio/Cámara</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">Stock por Cámara</TabsTrigger>
            <TabsTrigger value="detalle">Detalle de Stock</TabsTrigger>
            <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
          </TabsList>

          {/* STOCK POR CÁMARA */}
          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data?.stockPorCamara?.map((camara) => {
                const tipoInfo = getTipoInfo(camara.tipo)
                return (
                  <Card 
                    key={camara.camaraId}
                    className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${
                      camara.alertaCapacidad ? 'ring-2 ring-red-400' : ''
                    }`}
                    onClick={() => handleVerDetalleCamara(camara)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Warehouse className={`w-5 h-5 ${camara.alertaCapacidad ? 'text-red-500' : 'text-amber-500'}`} />
                          {camara.camaraNombre}
                        </CardTitle>
                        {camara.alertaCapacidad && (
                          <Badge className="bg-red-100 text-red-700">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Alerta
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline">{tipoInfo.label}</Badge>
                        <span className="text-xs">Cap: {camara.capacidad} {tipoInfo.unidad}</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Progress bar */}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-stone-500">Ocupación</span>
                            <span className={`font-bold ${camara.porcentajeOcupado >= 90 ? 'text-red-600' : 'text-stone-700'}`}>
                              {camara.porcentajeOcupado}%
                            </span>
                          </div>
                          <Progress 
                            value={camara.porcentajeOcupado} 
                            className={`h-2 ${camara.porcentajeOcupado >= 90 ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500'}`}
                          />
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="bg-stone-50 p-3 rounded-lg">
                            <p className="text-2xl font-bold text-stone-800">{camara.cantidadMedias}</p>
                            <p className="text-xs text-stone-500">Medias</p>
                          </div>
                          <div className="bg-stone-50 p-3 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{camara.pesoTotal.toLocaleString()}</p>
                            <p className="text-xs text-stone-500">KG</p>
                          </div>
                        </div>
                        
                        <Button variant="outline" className="w-full" size="sm">
                          Ver detalle
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* DETALLE DE STOCK */}
          <TabsContent value="detalle" className="space-y-6">
            {/* Filtros */}
            <Card className="border-0 shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex-1 min-w-[200px]">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <Input
                        placeholder="Buscar por tropa..."
                        value={filtroTropa}
                        onChange={(e) => setFiltroTropa(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={filtroEspecie} onValueChange={setFiltroEspecie}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Especie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {ESPECIES.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filtroCamara} onValueChange={setFiltroCamara}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Cámara" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas</SelectItem>
                      {camaras.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Tabla de stock */}
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-stone-50 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-500" />
                  Stock de Medias Reses
                </CardTitle>
                <CardDescription>
                  Mostrando {stockFiltrado.length} registros
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {stockFiltrado.length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay stock que mostrar</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cámara</TableHead>
                        <TableHead>Tropa</TableHead>
                        <TableHead>Especie</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Peso Total</TableHead>
                        <TableHead>Peso Prom.</TableHead>
                        <TableHead>Fecha Ingreso</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stockFiltrado.map((item) => {
                        const especieInfo = getEspecieInfo(item.especie)
                        return (
                          <TableRow key={item.id} className="hover:bg-stone-50">
                            <TableCell className="font-medium">{item.camaraNombre}</TableCell>
                            <TableCell className="font-mono">{item.tropaCodigo || '-'}</TableCell>
                            <TableCell>
                              <Badge className={especieInfo.color}>{especieInfo.label}</Badge>
                            </TableCell>
                            <TableCell className="font-bold">{item.cantidad}</TableCell>
                            <TableCell className="font-bold text-green-600">{item.pesoTotal.toLocaleString()} kg</TableCell>
                            <TableCell>
                              {item.cantidad > 0 ? (item.pesoTotal / item.cantidad).toFixed(1) : 0} kg
                            </TableCell>
                            <TableCell>
                              {item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-AR') : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditarStock(item)}
                                  title="Editar"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEliminarStock(item)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* MOVIMIENTOS */}
          <TabsContent value="movimientos" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader className="bg-stone-50 rounded-t-lg">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Movimientos Recientes
                </CardTitle>
                <CardDescription>
                  Últimos 10 movimientos de stock
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {data?.movimientosRecientes?.length === 0 ? (
                  <div className="p-8 text-center text-stone-400">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay movimientos registrados</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Tropa</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Peso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.movimientosRecientes?.map((mov) => (
                        <TableRow key={mov.id}>
                          <TableCell>
                            {new Date(mov.fecha).toLocaleString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </TableCell>
                          <TableCell>{mov.camaraOrigen || '-'}</TableCell>
                          <TableCell>{mov.camaraDestino || '-'}</TableCell>
                          <TableCell>{mov.producto || '-'}</TableCell>
                          <TableCell className="font-mono">{mov.tropaCodigo || '-'}</TableCell>
                          <TableCell>
                            {mov.cantidad && (
                              <Badge variant={mov.cantidad > 0 ? 'default' : 'destructive'}>
                                {mov.cantidad > 0 ? '+' : ''}{mov.cantidad}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{mov.peso?.toLocaleString() || '-'} kg</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog Detalle Cámara */}
        <Dialog open={detalleCamaraOpen} onOpenChange={setDetalleCamaraOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-amber-500" />
                Stock de {camaraSeleccionada?.camaraNombre}
              </DialogTitle>
              <DialogDescription>
                Capacidad: {camaraSeleccionada?.capacidad} {getTipoInfo(camaraSeleccionada?.tipo || 'FAENA').unidad} | 
                Ocupación: {camaraSeleccionada?.porcentajeOcupado}%
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {stockCamaraDetalle.length === 0 ? (
                <div className="text-center text-stone-400 py-8">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay stock en esta cámara</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tropa</TableHead>
                      <TableHead>Especie</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Peso Total</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockCamaraDetalle.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono">{item.tropaCodigo || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getEspecieInfo(item.especie).color}>
                            {getEspecieInfo(item.especie).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold">{item.cantidad}</TableCell>
                        <TableCell className="font-bold text-green-600">{item.pesoTotal.toLocaleString()} kg</TableCell>
                        <TableCell>
                          {item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-AR') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetalleCamaraOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Nuevo Stock */}
        <Dialog open={nuevoStockOpen} onOpenChange={setNuevoStockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ingreso Manual de Stock</DialogTitle>
              <DialogDescription>
                Registre una entrada de medias reses en cámara
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Cámara *</Label>
                <Select value={formData.camaraId} onValueChange={(v) => setFormData({ ...formData, camaraId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cámara" />
                  </SelectTrigger>
                  <SelectContent>
                    {camaras.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Código de Tropa</Label>
                <Input
                  value={formData.tropaCodigo}
                  onChange={(e) => setFormData({ ...formData, tropaCodigo: e.target.value })}
                  placeholder="Ej: B20260001"
                />
              </div>
              <div className="space-y-2">
                <Label>Especie *</Label>
                <Select value={formData.especie} onValueChange={(v) => setFormData({ ...formData, especie: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESPECIES.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peso Total (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.pesoTotal}
                    onChange={(e) => setFormData({ ...formData, pesoTotal: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNuevoStockOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={() => handleGuardarStock(false)} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Editar Stock */}
        <Dialog open={editarStockOpen} onOpenChange={setEditarStockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Stock</DialogTitle>
              <DialogDescription>
                Modifique los datos del registro de stock
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-stone-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-stone-500">Cámara:</span>
                    <p className="font-medium">{stockSeleccionado?.camaraNombre}</p>
                  </div>
                  <div>
                    <span className="text-stone-500">Especie:</span>
                    <p className="font-medium">{stockSeleccionado?.especie}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Código de Tropa</Label>
                <Input
                  value={formData.tropaCodigo}
                  onChange={(e) => setFormData({ ...formData, tropaCodigo: e.target.value })}
                  placeholder="Ej: B20260001"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input
                    type="number"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peso Total (kg)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.pesoTotal}
                    onChange={(e) => setFormData({ ...formData, pesoTotal: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditarStockOpen(false)}>
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={() => handleGuardarStock(true)} disabled={saving} className="bg-amber-500 hover:bg-amber-600">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Eliminar Stock */}
        <Dialog open={eliminarStockOpen} onOpenChange={setEliminarStockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Eliminar Stock
              </DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar este registro de stock?
                <br />
                <strong>Cámara:</strong> {stockSeleccionado?.camaraNombre}
                <br />
                <strong>Tropa:</strong> {stockSeleccionado?.tropaCodigo || '-'}
                <br />
                <strong>Cantidad:</strong> {stockSeleccionado?.cantidad} medias
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEliminarStockOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarEliminar} disabled={saving} className="bg-red-600 hover:bg-red-700">
                {saving ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default StockCamarasModule
