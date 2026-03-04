'use client'

import { useState, useEffect } from 'react'
import { 
  Scale, RefreshCw, Printer, Eye, Plus, Save, CheckCircle, AlertCircle,
  Beef, Edit, Trash2, ArrowRight, X, FileText, Minus, FileDown
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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

const TIPOS_ANIMALES: Record<string, { codigo: string; label: string }[]> = {
  BOVINO: [
    { codigo: 'TO', label: 'Toro' },
    { codigo: 'VA', label: 'Vaca' },
    { codigo: 'VQ', label: 'Vaquillona' },
    { codigo: 'MEJ', label: 'Torito/Mej' },
    { codigo: 'NO', label: 'Novillo' },
    { codigo: 'NT', label: 'Novillito' },
  ],
  EQUINO: [
    { codigo: 'PADRILLO', label: 'Padrillo' },
    { codigo: 'POTRILLO', label: 'Potrillo/Potranca' },
    { codigo: 'YEGUA', label: 'Yegua' },
    { codigo: 'CABALLO', label: 'Caballo' },
    { codigo: 'BURRO', label: 'Burro' },
    { codigo: 'MULA', label: 'Mula' },
  ]
}

const RAZAS_BOVINO = [
  'Angus', 'Hereford', 'Braford', 'Brangus', 'Charolais', 'Limousin',
  'Santa Gertrudis', 'Nelore', 'Brahman', 'Cebú', 'Cruza', 'Otro'
]

const RAZAS_EQUINO = [
  'Criollo', 'Pura Sangre', 'Cuarto de Milla', 'Percherón', 'Belga',
  'Árabe', 'Silla Argentino', 'Petiso', 'Otro'
]

interface Operador {
  id: string
  nombre: string
}

interface Corral {
  id: string
  nombre: string
  capacidad: number
  stockBovinos: number
  stockEquinos: number
}

interface Tropa {
  id: string
  numero: number
  codigo: string
  especie: string
  cantidadCabezas: number
  estado: string
  corral?: { id: string; nombre: string } | string
  corralId?: string
  pesoNeto?: number
  pesoTotalIndividual?: number
  usuarioFaena?: { nombre: string }
  tiposAnimales?: { tipoAnimal: string; cantidad: number }[]
  observaciones?: string
}

interface Animal {
  id: string
  numero: number
  codigo: string
  tipoAnimal: string
  caravana?: string
  raza?: string
  pesoVivo?: number
  observaciones?: string
  estado: string
}

export function PesajeIndividualModule({ tropas: propTropas, operador }: { tropas?: Tropa[]; operador: Operador }) {
  const [tropas, setTropas] = useState<Tropa[]>(propTropas || [])
  const [tropasListoPesaje, setTropasListoPesaje] = useState<Tropa[]>([])
  const [tropasPesado, setTropasPesado] = useState<Tropa[]>([])
  const [corrales, setCorrales] = useState<Corral[]>([])
  const [loading, setLoading] = useState(!propTropas)
  const [saving, setSaving] = useState(false)
  
  const [activeTab, setActiveTab] = useState('solicitar')
  const [tropaSeleccionada, setTropaSeleccionada] = useState<Tropa | null>(null)
  const [animales, setAnimales] = useState<Animal[]>([])
  const [animalActual, setAnimalActual] = useState(0)
  const [corralDestinoId, setCorralDestinoId] = useState('')
  
  // Form fields
  const [caravana, setCaravana] = useState('')
  const [tipoAnimalSeleccionado, setTipoAnimalSeleccionado] = useState('')
  const [raza, setRaza] = useState('')
  const [pesoActual, setPesoActual] = useState('')
  const [observacionesAnimal, setObservacionesAnimal] = useState('')
  
  // Rotulo preview
  const [showRotuloPreview, setShowRotuloPreview] = useState(false)
  const [rotuloPreviewData, setRotuloPreviewData] = useState<Animal | null>(null)
  
  // Edit dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null)
  const [editCaravana, setEditCaravana] = useState('')
  const [editTipoAnimal, setEditTipoAnimal] = useState('')
  const [editRaza, setEditRaza] = useState('')
  const [editPeso, setEditPeso] = useState('')

  // DTE - Confirmación de tipos
  const [confirmarTiposOpen, setConfirmarTiposOpen] = useState(false)
  const [tiposConfirmados, setTiposConfirmados] = useState<{ tipoAnimal: string; cantidad: number; esDeclarado: boolean }[]>([])
  const [nuevoTipo, setNuevoTipo] = useState('')
  const [nuevaCantidad, setNuevaCantidad] = useState(1)

  useEffect(() => {
    if (!propTropas) {
      fetchData()
    }
  }, [propTropas])

  useEffect(() => {
    // Filtrar tropas por estado
    setTropasListoPesaje(tropas.filter(t => t.estado === 'EN_PESAJE' || t.estado === 'RECIBIDO' || t.estado === 'EN_CORRAL'))
    setTropasPesado(tropas.filter(t => t.estado === 'PESADO'))
  }, [tropas])

  const fetchData = async () => {
    try {
      const [tropasRes, corralesRes] = await Promise.all([
        fetch('/api/tropas'),
        fetch('/api/corrales')
      ])
      const tropasData = await tropasRes.json()
      const corralesData = await corralesRes.json()
      
      if (tropasData.success) {
        setTropas(tropasData.data)
      }
      if (corralesData.success) {
        setCorrales(corralesData.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const tiposAnimalActuales = TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO'] || []
  const razasActuales = tropaSeleccionada?.especie === 'EQUINO' ? RAZAS_EQUINO : RAZAS_BOVINO

  const handleSeleccionarTropa = async (tropa: Tropa) => {
    // Fetch animals if already exist
    try {
      const res = await fetch(`/api/tropas/${tropa.id}`)
      const data = await res.json()
      if (data.success && data.data.animales && data.data.animales.length > 0) {
        setAnimales(data.data.animales)
        const pendientes = data.data.animales.filter((a: Animal) => a.estado === 'RECIBIDO')
        setAnimalActual(pendientes.length > 0 ? data.data.animales.findIndex((a: Animal) => a.estado === 'RECIBIDO') : data.data.animales.length)
      } else {
        setAnimales([])
        setAnimalActual(0)
      }
    } catch {
      setAnimales([])
      setAnimalActual(0)
    }
    
    // Set corral destino from tropa if available
    if (tropa.corralId) {
      setCorralDestinoId(tropa.corralId)
    } else if (typeof tropa.corral === 'object' && tropa.corral?.id) {
      setCorralDestinoId(tropa.corral.id)
    } else {
      setCorralDestinoId('')
    }
    
    setTropaSeleccionada(tropa)
    resetFormFields()
    
    // Abrir diálogo de confirmación de tipos DTE
    // Inicializar con los tipos declarados (esDeclarado = true)
    const tiposDeclarados = (tropa.tiposAnimales || []).map(t => ({
      tipoAnimal: t.tipoAnimal,
      cantidad: t.cantidad,
      esDeclarado: true
    }))
    setTiposConfirmados(tiposDeclarados)
    setConfirmarTiposOpen(true)
  }

  // Agregar tipo no declarado en el DTE
  const handleAgregarTipo = () => {
    if (!nuevoTipo) {
      toast.error('Seleccione un tipo de animal')
      return
    }
    if (nuevaCantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }
    // Verificar que no exista ya
    if (tiposConfirmados.some(t => t.tipoAnimal === nuevoTipo)) {
      toast.error('Este tipo ya está en la lista')
      return
    }
    setTiposConfirmados([...tiposConfirmados, {
      tipoAnimal: nuevoTipo,
      cantidad: nuevaCantidad,
      esDeclarado: false // No estaba en el DTE original
    }])
    setNuevoTipo('')
    setNuevaCantidad(1)
    toast.success('Tipo agregado correctamente')
  }

  // Modificar cantidad de un tipo
  const handleModificarCantidad = (tipoAnimal: string, cantidad: number) => {
    setTiposConfirmados(tiposConfirmados.map(t => 
      t.tipoAnimal === tipoAnimal ? { ...t, cantidad } : t
    ))
  }

  // Eliminar tipo (solo los no declarados)
  const handleEliminarTipo = (tipoAnimal: string) => {
    setTiposConfirmados(tiposConfirmados.filter(t => t.tipoAnimal !== tipoAnimal))
  }

  // Confirmar tipos y cerrar diálogo
  const handleConfirmarTipos = async () => {
    if (tiposConfirmados.length === 0) {
      toast.error('Debe confirmar al menos un tipo de animal')
      return
    }
    
    // Guardar los tipos confirmados en la tropa
    try {
      const res = await fetch('/api/tropas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tropaSeleccionada?.id,
          tiposAnimales: tiposConfirmados.map(t => ({
            tipoAnimal: t.tipoAnimal,
            cantidad: t.cantidad
          }))
        })
      })
      
      const responseData = await res.json()
      
      if (!res.ok || !responseData.success) {
        toast.error(responseData.error || 'Error al actualizar tipos')
        return
      }
      
      // Actualizar la tropa seleccionada con los nuevos tipos
      if (tropaSeleccionada) {
        setTropaSeleccionada({
          ...tropaSeleccionada,
          tiposAnimales: tiposConfirmados.map(t => ({
            tipoAnimal: t.tipoAnimal,
            cantidad: t.cantidad
          })),
          cantidadCabezas: tiposConfirmados.reduce((acc, t) => acc + t.cantidad, 0)
        })
      }
      
      setConfirmarTiposOpen(false)
      toast.success('Tipos confirmados correctamente')
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const resetFormFields = () => {
    setCaravana('')
    setTipoAnimalSeleccionado('')
    setRaza('')
    setPesoActual('')
    setObservacionesAnimal('')
  }

  const handleIniciarPesaje = async () => {
    if (!tropaSeleccionada) return
    if (!corralDestinoId) {
      toast.error('Seleccione el corral de destino')
      return
    }
    
    // Verificar que se hayan confirmado los tipos
    if (tiposConfirmados.length === 0) {
      toast.error('Debe confirmar los tipos de animales antes de iniciar el pesaje')
      return
    }
    
    setSaving(true)
    try {
      // Actualizar estado de la tropa a EN_PESAJE y asignar corral
      const res = await fetch('/api/tropas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tropaSeleccionada.id,
          estado: 'EN_PESAJE',
          corralId: corralDestinoId
        })
      })
      
      if (res.ok) {
        toast.success('Pesaje iniciado')
        setActiveTab('pesar')
        
        // Create animals list based on tiposConfirmados (not just tiposAnimales)
        if (animales.length === 0) {
          const nuevosAnimales: Animal[] = []
          let num = 1
          const prefijo = tropaSeleccionada.especie === 'BOVINO' ? 'B' : 'E'
          const year = new Date().getFullYear()
          
          // Usar tiposConfirmados en lugar de tropa.tiposAnimales
          for (const tipo of tiposConfirmados) {
            for (let i = 0; i < tipo.cantidad; i++) {
              nuevosAnimales.push({
                id: `temp-${num}`,
                numero: num,
                codigo: `${prefijo}${year}${String(tropaSeleccionada.numero).padStart(4, '0')}-${String(num).padStart(3, '0')}`,
                tipoAnimal: tipo.tipoAnimal,
                estado: 'RECIBIDO'
              })
              num++
            }
          }
          
          setAnimales(nuevosAnimales)
          setAnimalActual(0)
        }
        
        fetchData()
      } else {
        toast.error('Error al iniciar pesaje')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleRegistrarPeso = async () => {
    if (!pesoActual || !animales[animalActual]) return
    
    const peso = parseFloat(pesoActual)
    if (isNaN(peso) || peso <= 0) {
      toast.error('Ingrese un peso válido')
      return
    }

    if (!tipoAnimalSeleccionado) {
      toast.error('Seleccione el tipo de animal')
      return
    }

    setSaving(true)
    try {
      const animal = animales[animalActual]
      
      // Crear/actualizar animal en la base de datos
      const res = await fetch('/api/animales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tropaId: tropaSeleccionada?.id,
          numero: animal.numero,
          codigo: animal.codigo,
          tipoAnimal: tipoAnimalSeleccionado,
          caravana: caravana || null,
          raza: raza || null,
          pesoVivo: peso,
          observaciones: observacionesAnimal || null,
          operadorId: operador.id
        })
      })
      
      if (res.ok) {
        const newAnimal = await res.json()
        
        // Actualizar animal en la lista local
        const animalesActualizados = [...animales]
        animalesActualizados[animalActual] = {
          ...animalesActualizados[animalActual],
          id: newAnimal.id,
          caravana: caravana || undefined,
          raza: raza || undefined,
          tipoAnimal: tipoAnimalSeleccionado,
          pesoVivo: peso,
          observaciones: observacionesAnimal || undefined,
          estado: 'PESADO'
        }
        setAnimales(animalesActualizados)
        
        // Imprimir rótulo
        imprimirRotulo(animalesActualizados[animalActual])
        
        // Avanzar al siguiente animal automáticamente
        const nextIndex = animalesActualizados.findIndex((a, i) => a.estado === 'RECIBIDO' && i > animalActual)
        if (nextIndex !== -1) {
          setAnimalActual(nextIndex)
          resetFormFields()
          toast.success(`Animal ${animal.numero} registrado - ${peso} kg`, { duration: 1500 })
        } else {
          // Check if all animals are weighed
          const noPesados = animalesActualizados.filter(a => a.estado === 'RECIBIDO')
          if (noPesados.length === 0) {
            toast.success('¡Pesaje completado!')
            handleFinalizarPesaje()
          } else {
            const firstPendiente = animalesActualizados.findIndex(a => a.estado === 'RECIBIDO')
            if (firstPendiente !== -1) {
              setAnimalActual(firstPendiente)
              resetFormFields()
            }
          }
        }
      } else {
        const errorData = await res.json()
        toast.error(errorData.error || 'Error al registrar peso')
      }
    } catch (error) {
      toast.error('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const handleFinalizarPesaje = async () => {
    if (!tropaSeleccionada) return
    
    setSaving(true)
    try {
      // Calcular peso total
      const pesoTotal = animales.reduce((acc, a) => acc + (a.pesoVivo || 0), 0)
      
      // Actualizar estado de la tropa a PESADO
      const res = await fetch('/api/tropas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tropaSeleccionada.id,
          estado: 'PESADO',
          pesoTotalIndividual: pesoTotal
        })
      })
      
      const data = await res.json()
      
      if (res.ok && data.success) {
        toast.success('Tropa pesada completamente')
        setTropaSeleccionada(null)
        setAnimales([])
        setAnimalActual(0)
        setActiveTab('solicitar')
        await fetchData()
      } else {
        toast.error(data.error || 'Error al finalizar pesaje')
      }
    } catch (error) {
      console.error('Error al finalizar pesaje:', error)
      toast.error('Error de conexión al finalizar pesaje')
    } finally {
      setSaving(false)
    }
  }

  const imprimirRotulo = (animal: Animal) => {
    // Generar código EAN-128 ÚNICO para animal en pie
    // Estructura según GS1-128:
    // (01) GTIN - Identificación global del artículo (14 dígitos)
    // (10) Número de lote - Código de tropa (incluye especie + año + número)
    // (21) Número de serie - Número de animal dentro de la tropa
    // (3102) Peso neto en kg - Peso en decigramos (6 dígitos)

    // Código de tropa completo: B20260001 (especie + año + número) o E20260001 para equinos
    const codigoTropa = tropaSeleccionada?.codigo || '' // Ej: B20260001

    // Número de animal dentro de la tropa (4 dígitos)
    const numAnimal = (animal.numero || 1).toString().padStart(4, '0')

    // Peso en decigramos (6 dígitos) - EAN-128 requiere peso en decigramos para AI(3102)
    // 450.5 kg = 4505 decigramos = 004505
    const pesoKg = Math.round((animal.pesoVivo || 0) * 10).toString().padStart(6, '0')

    // Código EAN-128 ÚNICO: 01 + GTIN + 10 + Tropa + 21 + Animal + 3102 + Peso
    // Este código es único e irrepetible porque combina:
    // - Código de tropa (especie + año + número secuencial)
    // - Número de animal único dentro de la tropa
    // - Peso individual
    const codigoEAN128 = `0178912345678910${codigoTropa}21${numAnimal}3102${pesoKg}`

    const printWindow = window.open('', '_blank', 'width=300,height=400')
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Rótulo ${animal.codigo}</title>
          <style>
            @page { size: 10cm 10cm; margin: 0; }
            body {
              font-family: Arial, sans-serif;
              padding: 5mm;
              width: 10cm;
              height: 10cm;
              box-sizing: border-box;
            }
            .rotulo {
              border: 4px solid black;
              padding: 4mm;
              height: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid black;
              padding-bottom: 3mm;
              margin-bottom: 3mm;
            }
            .empresa {
              font-size: 12px;
              font-weight: bold;
            }
            .dato {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 2mm 0;
              border-bottom: 1px dashed #ccc;
            }
            .label { font-weight: bold; font-size: 14px; }
            .valor { font-size: 18px; font-weight: bold; }
            .peso-destacado {
              font-size: 32px;
              font-weight: bold;
              text-align: center;
              margin: 4mm 0;
              padding: 4mm;
              background: #000;
              color: #fff;
              border-radius: 5px;
            }
            .barcode-container {
              text-align: center;
              margin-top: auto;
              padding-top: 3mm;
            }
            .barcode {
              font-family: 'Libre Barcode 128 Text', 'Code 128', monospace;
              font-size: 40px;
              letter-spacing: 2px;
            }
            .barcode-text {
              font-size: 10px;
              font-family: monospace;
              margin-top: 2mm;
            }
          </style>
          <!-- Incluir fuente Code 128 -->
          <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128+Text&display=swap" rel="stylesheet">
        </head>
        <body>
          <div class="rotulo">
            <div class="header">
              <div class="empresa">SOLEMAR ALIMENTARIA</div>
            </div>

            <!-- DATOS CLAVE - SIN FECHA -->
            <div class="dato">
              <span class="label">TROPA:</span>
              <span class="valor">${tropaSeleccionada?.codigo || ''}</span>
            </div>

            <div class="dato">
              <span class="label">ANIMAL Nº:</span>
              <span class="valor">${animal.numero}</span>
            </div>

            <div class="dato">
              <span class="label">TIPO:</span>
              <span class="valor">${animal.tipoAnimal || '-'}</span>
            </div>

            <div class="peso-destacado">
              ${animal.pesoVivo?.toLocaleString()} KG
            </div>

            <!-- CÓDIGO EAN-128 -->
            <div class="barcode-container">
              <div class="barcode">${codigoEAN128}</div>
              <div class="barcode-text">${codigoEAN128}</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.onafterprint = function() { window.close(); }
              }, 500);
            }
          </script>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const previewRotulo = (animal: Animal) => {
    setRotuloPreviewData(animal)
    setShowRotuloPreview(true)
  }

  const handleEditAnimal = (animal: Animal) => {
    setEditingAnimal(animal)
    setEditCaravana(animal.caravana || '')
    setEditTipoAnimal(animal.tipoAnimal)
    setEditRaza(animal.raza || '')
    setEditPeso(animal.pesoVivo?.toString() || '')
    setEditDialogOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingAnimal) return
    
    try {
      const res = await fetch('/api/animales', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAnimal.id,
          caravana: editCaravana || null,
          tipoAnimal: editTipoAnimal,
          raza: editRaza || null,
          pesoVivo: parseFloat(editPeso) || null
        })
      })
      
      if (res.ok) {
        toast.success('Animal actualizado')
        setEditDialogOpen(false)
        
        // Update local state
        const updated = animales.map(a => {
          if (a.id === editingAnimal.id) {
            return {
              ...a,
              caravana: editCaravana || undefined,
              tipoAnimal: editTipoAnimal,
              raza: editRaza || undefined,
              pesoVivo: parseFloat(editPeso) || undefined
            }
          }
          return a
        })
        setAnimales(updated)
      } else {
        toast.error('Error al actualizar')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleDeleteAnimal = async (animal: Animal) => {
    if (!confirm(`¿Eliminar animal ${animal.numero}?`)) return
    
    try {
      const res = await fetch(`/api/animales?id=${animal.id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        toast.success('Animal eliminado')
        const updated = animales.filter(a => a.id !== animal.id)
        setAnimales(updated)
        if (animalActual >= updated.length) {
          setAnimalActual(Math.max(0, updated.length - 1))
        }
      } else {
        toast.error('Error al eliminar')
      }
    } catch (error) {
      toast.error('Error de conexión')
    }
  }

  const handleReprint = (animal: Animal) => {
    imprimirRotulo(animal)
    toast.success('Rótulo enviado a impresión')
  }

  // Generar Planilla 01 PDF
  const handleGenerarPlanilla01 = async (tropaId: string, tropaCodigo: string) => {
    try {
      toast.info('Generando Planilla 01...')
      
      // Llamar a la API para generar el PDF
      const response = await fetch(`/api/reportes/planilla-01?tropaId=${tropaId}`)
      
      if (!response.ok) {
        const error = await response.json()
        toast.error(error.error || 'Error al generar el PDF')
        return
      }
      
      // Descargar el PDF
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Planilla_01_${tropaCodigo}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('Planilla 01 descargada correctamente')
    } catch (error) {
      console.error('Error generando Planilla 01:', error)
      toast.error('Error al generar la Planilla 01')
    }
  }

  const animalesPendientes = animales.filter(a => a.estado === 'RECIBIDO')
  const animalesPesados = animales.filter(a => a.estado === 'PESADO')

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 flex items-center justify-center">
        <Scale className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-stone-800">Pesaje Individual</h2>
            <p className="text-stone-500">Pesaje de animales por tropa con identificación completa</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
            <Badge variant="outline" className="text-lg px-4 py-2">
              <Beef className="h-4 w-4 mr-2 text-amber-500" />
              {tropasListoPesaje.length} tropas pendientes
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="solicitar">Solicitar Tropa</TabsTrigger>
            <TabsTrigger value="pesar" disabled={!tropaSeleccionada}>Pesar Animales</TabsTrigger>
            <TabsTrigger value="historial">Historial</TabsTrigger>
          </TabsList>

          {/* SOLICITAR TROPA */}
          <TabsContent value="solicitar" className="space-y-6">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">Tropas Disponibles para Pesaje</CardTitle>
                <CardDescription>
                  Seleccione una tropa para iniciar el pesaje individual
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tropasListoPesaje.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <Beef className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay tropas pendientes de pesaje</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tropa</TableHead>
                        <TableHead>Usuario Faena</TableHead>
                        <TableHead>Especie</TableHead>
                        <TableHead>Cabezas</TableHead>
                        <TableHead>Corral</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tropasListoPesaje.map((tropa) => (
                        <TableRow key={tropa.id} className="hover:bg-stone-50">
                          <TableCell className="font-mono font-bold">{tropa.codigo}</TableCell>
                          <TableCell>{tropa.usuarioFaena?.nombre || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{tropa.especie}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{tropa.cantidadCabezas}</TableCell>
                          <TableCell>{typeof tropa.corral === 'object' ? tropa.corral?.nombre : tropa.corral || '-'}</TableCell>
                          <TableCell>
                            <Badge className={
                              tropa.estado === 'RECIBIDO' ? 'bg-amber-100 text-amber-700' :
                              tropa.estado === 'EN_CORRAL' ? 'bg-blue-100 text-blue-700' :
                              'bg-purple-100 text-purple-700'
                            }>
                              {tropa.estado === 'RECIBIDO' ? 'Recibido' : 
                               tropa.estado === 'EN_CORRAL' ? 'En Corral' : 'En Pesaje'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              onClick={() => handleSeleccionarTropa(tropa)}
                              className="bg-amber-500 hover:bg-amber-600"
                            >
                              <Scale className="w-4 h-4 mr-2" />
                              Seleccionar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Detalle de tropa seleccionada */}
            {tropaSeleccionada && (
              <Card className="border-0 shadow-md border-amber-200">
                <CardHeader className="bg-amber-50">
                  <CardTitle className="text-lg">Tropa Seleccionada</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-stone-500">Código</p>
                      <p className="text-xl font-mono font-bold">{tropaSeleccionada.codigo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Usuario Faena</p>
                      <p className="font-medium">{tropaSeleccionada.usuarioFaena?.nombre}</p>
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Especie</p>
                      <p className="font-medium">{tropaSeleccionada.especie}</p>
                    </div>
                    <div>
                      <p className="text-sm text-stone-500">Total Cabezas</p>
                      <p className="text-2xl font-bold text-amber-600">{tropaSeleccionada.cantidadCabezas}</p>
                    </div>
                  </div>
                  
                  {/* Corral de destino */}
                  <div className="mb-4 space-y-2">
                    <Label className="text-base font-semibold">Corral de Destino *</Label>
                    <Select value={corralDestinoId} onValueChange={setCorralDestinoId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccione el corral donde se ubicarán los animales..." />
                      </SelectTrigger>
                      <SelectContent>
                        {corrales.map((c) => {
                          const stockActual = tropaSeleccionada.especie === 'BOVINO' ? c.stockBovinos : c.stockEquinos
                          const disponible = c.capacidad - stockActual
                          return (
                            <SelectItem key={c.id} value={c.id}>
                              {c.nombre} - Capacidad: {c.capacidad} | Disponible: {disponible}
                            </SelectItem>
                          )
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {tropaSeleccionada.tiposAnimales && tropaSeleccionada.tiposAnimales.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-stone-500 mb-2">Tipos de Animales:</p>
                      <div className="flex flex-wrap gap-2">
                        {tropaSeleccionada.tiposAnimales.map((t, i) => (
                          <Badge key={i} variant="outline" className="text-sm">
                            {t.tipoAnimal}: {t.cantidad} cabezas
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleIniciarPesaje}
                    disabled={saving || !corralDestinoId}
                    className="w-full h-12 text-lg bg-green-600 hover:bg-green-700"
                  >
                    <Scale className="w-5 h-5 mr-2" />
                    Iniciar Pesaje Individual
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* PESAR ANIMALES */}
          <TabsContent value="pesar" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Formulario de pesaje */}
              <Card className="lg:col-span-2 border-0 shadow-md">
                <CardHeader className="bg-green-50">
                  <CardTitle className="text-lg">
                    Pesaje - {tropaSeleccionada?.codigo}
                  </CardTitle>
                  <CardDescription>
                    Animal {animalActual + 1} de {animales.length} | {animalesPendientes.length} pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Barra de progreso */}
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progreso</span>
                      <span>{animalesPesados.length} / {animales.length} pesados</span>
                    </div>
                    <div className="h-4 bg-stone-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all"
                        style={{ width: `${(animalesPesados.length / animales.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Datos del animal actual */}
                  {animales[animalActual] && (
                    <div className="space-y-4">
                      <div className="bg-stone-50 p-4 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-stone-500">Nº de Animal</p>
                            <p className="text-2xl font-bold">{animales[animalActual].numero}</p>
                          </div>
                          <div>
                            <p className="text-sm text-stone-500">Código</p>
                            <p className="text-lg font-mono">{animales[animalActual].codigo}</p>
                          </div>
                        </div>
                      </div>

                      {/* Campos de identificación */}
                      <div className="space-y-4">
                        {/* Caravana */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Caravana (opcional)</Label>
                            <Input
                              value={caravana}
                              onChange={(e) => setCaravana(e.target.value.toUpperCase())}
                              placeholder="Nº caravana"
                              className="font-mono text-lg h-12"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Peso (kg) *</Label>
                            <Input
                              type="number"
                              value={pesoActual}
                              onChange={(e) => setPesoActual(e.target.value)}
                              className="text-2xl font-bold text-center h-12"
                              placeholder="0"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* Tipo de Animal - Botones */}
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">Tipo de Animal *</Label>
                          <div className="flex flex-wrap gap-2">
                            {tiposAnimalActuales.map((t) => {
                              const isSelected = tipoAnimalSeleccionado === t.codigo
                              return (
                                <button
                                  key={t.codigo}
                                  type="button"
                                  onClick={() => setTipoAnimalSeleccionado(t.codigo)}
                                  className={`px-4 py-3 rounded-lg border-2 font-bold text-lg transition-all ${
                                    isSelected 
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-md' 
                                      : 'bg-white border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                                  }`}
                                >
                                  {t.codigo}
                                </button>
                              )
                            })}
                          </div>
                          {tipoAnimalSeleccionado && (
                            <p className="text-sm text-stone-500 mt-1">
                              Seleccionado: {tiposAnimalActuales.find(t => t.codigo === tipoAnimalSeleccionado)?.label}
                            </p>
                          )}
                        </div>

                        {/* Raza - Dropdown */}
                        <div className="space-y-2">
                          <Label>Raza (opcional)</Label>
                          <Select value={raza} onValueChange={setRaza}>
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Seleccionar raza..." />
                            </SelectTrigger>
                            <SelectContent>
                              {razasActuales.map((r) => (
                                <SelectItem key={r} value={r}>{r}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Observaciones */}
                        <div className="space-y-2">
                          <Label>Observaciones</Label>
                          <Textarea
                            value={observacionesAnimal}
                            onChange={(e) => setObservacionesAnimal(e.target.value)}
                            placeholder="Notas adicionales del animal..."
                            rows={2}
                          />
                        </div>
                      </div>

                      {/* Botón de registro */}
                      <Button
                        onClick={handleRegistrarPeso}
                        disabled={saving || !pesoActual || !tipoAnimalSeleccionado}
                        className="w-full h-16 text-xl bg-green-600 hover:bg-green-700"
                      >
                        {saving ? (
                          <>Guardando...</>
                        ) : (
                          <>
                            <Scale className="w-6 h-6 mr-2" />
                            Registrar e Imprimir <ArrowRight className="w-5 h-5 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}

                  {/* Navegación entre animales */}
                  <div className="flex gap-2 mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setAnimalActual(Math.max(0, animalActual - 1))}
                      disabled={animalActual === 0}
                      className="flex-1"
                    >
                      ← Anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setAnimalActual(Math.min(animales.length - 1, animalActual + 1))}
                      disabled={animalActual >= animales.length - 1}
                      className="flex-1"
                    >
                      Siguiente →
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Lista de animales */}
              <Card className="border-0 shadow-md">
                <CardHeader>
                  <CardTitle className="text-lg">Lista de Animales</CardTitle>
                  <CardDescription>
                    {animalesPesados.length} pesados, {animalesPendientes.length} pendientes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[500px] overflow-y-auto space-y-1">
                    {animales.map((animal, idx) => (
                      <div
                        key={animal.id}
                        className={`p-2 rounded text-sm flex items-center justify-between ${
                          idx === animalActual 
                            ? 'bg-amber-100 border-amber-300 border' 
                            : 'hover:bg-stone-50'
                        }`}
                      >
                        <button
                          onClick={() => setAnimalActual(idx)}
                          className="flex items-center gap-2 flex-1 text-left"
                        >
                          {animal.estado === 'PESADO' ? (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                          <span className="font-medium">#{animal.numero}</span>
                          {animal.caravana && (
                            <span className="text-xs text-stone-400">({animal.caravana})</span>
                          )}
                          {animal.pesoVivo && (
                            <span className="font-medium text-green-600 ml-auto mr-2">{animal.pesoVivo.toLocaleString()} kg</span>
                          )}
                        </button>
                        
                        {/* Acciones */}
                        {animal.estado === 'PESADO' && animal.id && !animal.id.startsWith('temp-') && (
                          <div className="flex gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEditAnimal(animal); }}
                              className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-blue-600"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReprint(animal); }}
                              className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-green-600"
                              title="Reimprimir"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteAnimal(animal); }}
                              className="p-1 rounded hover:bg-stone-200 text-stone-500 hover:text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Total */}
                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between font-medium">
                      <span>Total Pesado:</span>
                      <span className="text-green-600">
                        {animalesPesados.reduce((acc, a) => acc + (a.pesoVivo || 0), 0).toLocaleString()} kg
                      </span>
                    </div>
                    {animalesPesados.length > 0 && (
                      <div className="flex justify-between text-sm text-stone-500">
                        <span>Promedio:</span>
                        <span>
                          {Math.round(animalesPesados.reduce((acc, a) => acc + (a.pesoVivo || 0), 0) / animalesPesados.length).toLocaleString()} kg/cab
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HISTORIAL */}
          <TabsContent value="historial">
            <Card className="border-0 shadow-md">
              <CardHeader>
                <CardTitle>Tropas Pesadas</CardTitle>
                <CardDescription>Historial de tropas con pesaje individual completado</CardDescription>
              </CardHeader>
              <CardContent>
                {tropasPesado.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No hay tropas pesadas</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tropa</TableHead>
                        <TableHead>Usuario Faena</TableHead>
                        <TableHead>Especie</TableHead>
                        <TableHead>Cabezas</TableHead>
                        <TableHead>Peso Total</TableHead>
                        <TableHead>Peso Promedio</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tropasPesado.map((tropa) => (
                        <TableRow key={tropa.id}>
                          <TableCell className="font-mono font-bold">{tropa.codigo}</TableCell>
                          <TableCell>{tropa.usuarioFaena?.nombre || '-'}</TableCell>
                          <TableCell><Badge variant="outline">{tropa.especie}</Badge></TableCell>
                          <TableCell>{tropa.cantidadCabezas}</TableCell>
                          <TableCell className="font-bold text-green-600">
                            {tropa.pesoTotalIndividual?.toLocaleString() || '-'} kg
                          </TableCell>
                          <TableCell>
                            {tropa.pesoTotalIndividual 
                              ? Math.round(tropa.pesoTotalIndividual / tropa.cantidadCabezas).toLocaleString() 
                              : '-'} kg/cab
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerarPlanilla01(tropa.id, tropa.codigo)}
                              className="gap-1"
                            >
                              <FileDown className="w-4 h-4" />
                              Planilla 01
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Animal #{editingAnimal?.numero}</DialogTitle>
            <DialogDescription>Modifique los datos del animal</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Caravana</Label>
              <Input value={editCaravana} onChange={(e) => setEditCaravana(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Animal</Label>
              <Select value={editTipoAnimal} onValueChange={setEditTipoAnimal}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposAnimalActuales.map((t) => (
                    <SelectItem key={t.codigo} value={t.codigo}>{t.codigo} - {t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Raza</Label>
              <Select value={editRaza} onValueChange={setEditRaza}>
                <SelectTrigger>
                  <SelectValue placeholder="Sin raza" />
                </SelectTrigger>
                <SelectContent>
                  {razasActuales.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input type="number" value={editPeso} onChange={(e) => setEditPeso(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} className="bg-amber-500 hover:bg-amber-600">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rotulo Preview Dialog - SOLO 4 DATOS CLAVE */}
      <Dialog open={showRotuloPreview} onOpenChange={setShowRotuloPreview}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vista Previa del Rótulo</DialogTitle>
          </DialogHeader>
          {rotuloPreviewData && (
            <div className="border-4 border-black p-4 rounded-lg bg-white">
              <div className="text-center border-b-2 border-black pb-2 mb-3">
                <p className="font-bold text-sm">SOLEMAR ALIMENTARIA</p>
              </div>
              
              {/* 4 DATOS CLAVE */}
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-2">
                  <span className="font-bold text-sm">TROPA:</span>
                  <span className="font-bold text-lg">{tropaSeleccionada?.codigo}</span>
                </div>
                
                <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-2">
                  <span className="font-bold text-sm">ANIMAL Nº:</span>
                  <span className="font-bold text-lg">{rotuloPreviewData.numero}</span>
                </div>
                
                <div className="flex justify-between items-center border-b border-dashed border-gray-300 pb-2">
                  <span className="font-bold text-sm">FECHA:</span>
                  <span className="font-bold">{new Date().toLocaleDateString('es-AR')}</span>
                </div>
                
                <div className="text-center py-3 bg-black text-white rounded font-bold text-2xl">
                  {rotuloPreviewData.pesoVivo?.toLocaleString()} KG
                </div>
              </div>
              
              <div className="text-center mt-2 font-mono text-sm text-gray-600">
                *{rotuloPreviewData.codigo}*
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRotuloPreview(false)}>Cerrar</Button>
            <Button onClick={() => { if (rotuloPreviewData) imprimirRotulo(rotuloPreviewData); setShowRotuloPreview(false); }} className="bg-amber-500 hover:bg-amber-600">
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DTE - Confirmación de Tipos Dialog */}
      <Dialog open={confirmarTiposOpen} onOpenChange={setConfirmarTiposOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Confirmar Tipos de Animales - DTE
            </DialogTitle>
            <DialogDescription>
              Tropa: {tropaSeleccionada?.codigo} | Revise y confirme los tipos declarados. Puede agregar tipos no declarados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Tipos declarados en el DTE */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                Tipos Declarados en DTE
                <Badge variant="outline" className="text-xs">Original</Badge>
              </Label>
              <div className="border rounded-lg p-3 space-y-2 bg-stone-50">
                {tiposConfirmados.filter(t => t.esDeclarado).length === 0 ? (
                  <p className="text-stone-400 text-sm">No hay tipos declarados en el DTE</p>
                ) : (
                  tiposConfirmados.filter(t => t.esDeclarado).map((tipo) => (
                    <div key={tipo.tipoAnimal} className="flex items-center justify-between bg-white p-2 rounded border">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-amber-100 text-amber-700">{tipo.tipoAnimal}</Badge>
                        <span className="text-sm text-stone-500">
                          {TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO']?.find(t => t.codigo === tipo.tipoAnimal)?.label || tipo.tipoAnimal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleModificarCantidad(tipo.tipoAnimal, Math.max(0, tipo.cantidad - 1))}
                          disabled={tipo.cantidad <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input 
                          type="number" 
                          className="w-16 text-center" 
                          value={tipo.cantidad}
                          onChange={(e) => handleModificarCantidad(tipo.tipoAnimal, parseInt(e.target.value) || 0)}
                          min={0}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleModificarCantidad(tipo.tipoAnimal, tipo.cantidad + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Tipos agregados (no declarados en DTE) */}
            {tiposConfirmados.filter(t => !t.esDeclarado).length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  Tipos Agregados (No Declarados)
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-200">Extra</Badge>
                </Label>
                <div className="border rounded-lg p-3 space-y-2 bg-red-50 border-red-200">
                  {tiposConfirmados.filter(t => !t.esDeclarado).map((tipo) => (
                    <div key={tipo.tipoAnimal} className="flex items-center justify-between bg-white p-2 rounded border border-red-200">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-red-100 text-red-700">{tipo.tipoAnimal}</Badge>
                        <span className="text-sm text-stone-500">
                          {TIPOS_ANIMALES[tropaSeleccionada?.especie || 'BOVINO']?.find(t => t.codigo === tipo.tipoAnimal)?.label || tipo.tipoAnimal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleModificarCantidad(tipo.tipoAnimal, Math.max(0, tipo.cantidad - 1))}
                          disabled={tipo.cantidad <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Input 
                          type="number" 
                          className="w-16 text-center" 
                          value={tipo.cantidad}
                          onChange={(e) => handleModificarCantidad(tipo.tipoAnimal, parseInt(e.target.value) || 0)}
                          min={0}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleModificarCantidad(tipo.tipoAnimal, tipo.cantidad + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleEliminarTipo(tipo.tipoAnimal)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agregar nuevo tipo */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Agregar Tipo No Declarado</Label>
              <div className="flex gap-2">
                <Select value={nuevoTipo} onValueChange={setNuevoTipo}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccione tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposAnimalActuales
                      .filter(t => !tiposConfirmados.some(tc => tc.tipoAnimal === t.codigo))
                      .map((t) => (
                        <SelectItem key={t.codigo} value={t.codigo}>
                          {t.codigo} - {t.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input 
                  type="number" 
                  className="w-20" 
                  value={nuevaCantidad}
                  onChange={(e) => setNuevaCantidad(parseInt(e.target.value) || 1)}
                  min={1}
                />
                <Button 
                  variant="outline" 
                  onClick={handleAgregarTipo}
                  disabled={!nuevoTipo}
                  className="bg-amber-50 border-amber-300 hover:bg-amber-100"
                >
                  <Plus className="w-4 h-4 mr-1" /> Agregar
                </Button>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-3 flex justify-between items-center">
              <span className="font-semibold">Total Cabezas:</span>
              <Badge className="text-lg px-4 py-2 bg-amber-100 text-amber-700">
                {tiposConfirmados.reduce((acc, t) => acc + t.cantidad, 0)} cabezas
              </Badge>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmarTiposOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmarTipos} 
              className="bg-green-600 hover:bg-green-700"
              disabled={tiposConfirmados.length === 0 || saving}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirmar Tipos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default PesajeIndividualModule
