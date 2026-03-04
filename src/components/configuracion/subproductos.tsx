'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Search, RefreshCw, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface Subproducto {
  id: string
  codigo: string
  nombre: string
  unidad: string
  activo: boolean
  observaciones?: string
  createdAt: string
}

interface Operador {
  id: string
  nombre: string
  nivel: string
}

export function Subproductos({ operador }: { operador: Operador }) {
  const { toast } = useToast()
  const [subproductos, setSubproductos] = useState<Subproducto[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingSubproducto, setEditingSubproducto] = useState<Subproducto | null>(null)
  const [deletingSubproducto, setDeletingSubproducto] = useState<Subproducto | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    codigo: '',
    nombre: '',
    unidad: 'kg',
    observaciones: ''
  })
  const [saving, setSaving] = useState(false)

  // Subproductos base predefinidos
  const subproductosBase = [
    { codigo: 'CUERO', nombre: 'Cuero', unidad: 'unidad' },
    { codigo: 'SEBO', nombre: 'Sebo', unidad: 'kg' },
    { codigo: 'HEAD', nombre: 'Cabeza', unidad: 'kg' },
    { codigo: 'HIGADO', nombre: 'Hígado', unidad: 'kg' },
    { codigo: 'CORAZON', nombre: 'Corazón', unidad: 'kg' },
    { codigo: 'RIÑON', nombre: 'Riñón', unidad: 'kg' },
    { codigo: 'LENGUA', nombre: 'Lengua', unidad: 'kg' },
    { codigo: 'TRIPA', nombre: 'Tripa', unidad: 'kg' },
    { codigo: 'PATAS', nombre: 'Patas', unidad: 'unidad' },
    { codigo: 'SANGRE', nombre: 'Sangre', unidad: 'lt' },
  ]

  const fetchSubproductos = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/subproductos')
      const data = await response.json()
      if (data.success) {
        setSubproductos(data.data)
      }
    } catch (error) {
      console.error('Error fetching subproductos:', error)
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los subproductos',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubproductos()
  }, [])

  const handleOpenCreate = () => {
    setEditingSubproducto(null)
    setFormData({ codigo: '', nombre: '', unidad: 'kg', observaciones: '' })
    setDialogOpen(true)
  }

  const handleOpenEdit = (subproducto: Subproducto) => {
    setEditingSubproducto(subproducto)
    setFormData({
      codigo: subproducto.codigo,
      nombre: subproducto.nombre,
      unidad: subproducto.unidad,
      observaciones: subproducto.observaciones || ''
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.codigo || !formData.nombre) {
      toast({
        title: 'Error',
        description: 'Código y nombre son obligatorios',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      const url = '/api/subproductos'
      const method = editingSubproducto ? 'PUT' : 'POST'
      const body = editingSubproducto
        ? { id: editingSubproducto.id, ...formData }
        : formData

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: editingSubproducto ? 'Actualizado' : 'Creado',
          description: `Subproducto ${editingSubproducto ? 'actualizado' : 'creado'} correctamente`
        })
        setDialogOpen(false)
        fetchSubproductos()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Error al guardar',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error saving subproducto:', error)
      toast({
        title: 'Error',
        description: 'Error al guardar el subproducto',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingSubproducto) return

    try {
      const response = await fetch(`/api/subproductos?id=${deletingSubproducto.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'Eliminado',
          description: 'Subproducto desactivado correctamente'
        })
        setDeleteDialogOpen(false)
        setDeletingSubproducto(null)
        fetchSubproductos()
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Error al eliminar',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error deleting subproducto:', error)
      toast({
        title: 'Error',
        description: 'Error al eliminar el subproducto',
        variant: 'destructive'
      })
    }
  }

  const handleCargarBase = async () => {
    try {
      let creados = 0
      for (const subp of subproductosBase) {
        const exists = subproductos.find(s => s.codigo === subp.codigo)
        if (!exists) {
          const response = await fetch('/api/subproductos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(subp)
          })
          const data = await response.json()
          if (data.success) creados++
        }
      }
      
      if (creados > 0) {
        toast({
          title: 'Subproductos cargados',
          description: `Se crearon ${creados} subproductos base`
        })
        fetchSubproductos()
      } else {
        toast({
          title: 'Sin cambios',
          description: 'Todos los subproductos base ya existen'
        })
      }
    } catch (error) {
      console.error('Error loading base subproductos:', error)
      toast({
        title: 'Error',
        description: 'Error al cargar subproductos base',
        variant: 'destructive'
      })
    }
  }

  const filteredSubproductos = subproductos.filter(s =>
    s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Subproductos
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full sm:w-48"
              />
            </div>
            <Button variant="outline" size="sm" onClick={fetchSubproductos}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Actualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleCargarBase}>
              Cargar Base
            </Button>
            <Button size="sm" onClick={handleOpenCreate}>
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Cargando subproductos...
          </div>
        ) : filteredSubproductos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay subproductos. Use "Cargar Base" para agregar los subproductos predefinidos.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubproductos.map((subproducto) => (
                  <TableRow key={subproducto.id}>
                    <TableCell className="font-mono">{subproducto.codigo}</TableCell>
                    <TableCell>{subproducto.nombre}</TableCell>
                    <TableCell>{subproducto.unidad}</TableCell>
                    <TableCell>
                      <Badge variant={subproducto.activo ? 'default' : 'secondary'}>
                        {subproducto.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(subproducto)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingSubproducto(subproducto)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubproducto ? 'Editar Subproducto' : 'Nuevo Subproducto'}
            </DialogTitle>
            <DialogDescription>
              Complete los datos del subproducto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="codigo">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                placeholder="Ej: CUERO, SEBO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre completo del subproducto"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidad">Unidad</Label>
              <Input
                id="unidad"
                value={formData.unidad}
                onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                placeholder="kg, unidad, lt"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Input
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Notas adicionales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar subproducto?</AlertDialogTitle>
            <AlertDialogDescription>
              El subproducto "{deletingSubproducto?.nombre}" será marcado como inactivo.
              Esta acción se puede revertir editando el subproducto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
