'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Shield,
  ShieldCheck,
  ShieldOff,
  Key,
  Mail
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mapeo de nombres de módulos para mostrar
const NOMBRES_MODULOS: Record<string, string> = {
  PESAJE_CAMIONES: 'Pesaje Camiones',
  PESAJE_INDIVIDUAL: 'Pesaje Individual',
  MOVIMIENTO_HACIENDA: 'Movimiento Hacienda',
  LISTA_FAENA: 'Lista de Faena',
  INGRESO_FAENA: 'Ingreso a Faena',
  CIERRE_FAENA: 'Cierre de Faena',
  ROMANEO: 'Romaneo',
  MENUDENCIAS: 'Menudencias',
  STOCK_CAMARAS: 'Stock Cámaras',
  FACTURACION: 'Facturación',
  PRODUCTOS: 'Productos',
  REPORTES: 'Reportes',
  CONFIGURACION: 'Configuración',
};

const MODULOS = Object.keys(NOMBRES_MODULOS);

const NIVELES = [
  { value: 'NINGUNO', label: 'Ninguno', color: 'bg-gray-200 text-gray-700' },
  { value: 'OPERADOR', label: 'Operador', color: 'bg-blue-100 text-blue-700' },
  { value: 'SUPERVISOR', label: 'Supervisor', color: 'bg-green-100 text-green-700' },
];

interface Permiso {
  modulo: string;
  nivel: string;
}

interface Operador {
  id: string;
  nombre: string;
  usuario: string;
  email: string | null;
  tienePin: boolean;
  activo: boolean;
  createdAt: string;
  permisos: Permiso[];
}

const permisoInicial = MODULOS.map(modulo => ({
  modulo,
  nivel: 'NINGUNO'
}));

export default function OperadoresManager() {
  const { toast } = useToast();
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [operadorEditando, setOperadorEditando] = useState<Operador | null>(null);
  const [cargando, setCargando] = useState(false);
  
  // Formulario
  const [nombre, setNombre] = useState('');
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [email, setEmail] = useState('');
  const [activo, setActivo] = useState(true);
  const [permisos, setPermisos] = useState<Permiso[]>(permisoInicial);

  // Cargar operadores
  const cargarOperadores = async () => {
    try {
      const res = await fetch('/api/operadores');
      const data = await res.json();
      if (data.success) {
        setOperadores(data.data);
      }
    } catch (error) {
      console.error('Error cargando operadores:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los operadores',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    cargarOperadores();
  }, []);

  // Abrir modal para nuevo
  const abrirNuevo = () => {
    setOperadorEditando(null);
    setNombre('');
    setUsuario('');
    setPassword('');
    setPin('');
    setEmail('');
    setActivo(true);
    setPermisos(permisoInicial);
    setModalAbierto(true);
  };

  // Abrir modal para editar
  const abrirEditar = (op: Operador) => {
    setOperadorEditando(op);
    setNombre(op.nombre);
    setUsuario(op.usuario);
    setPassword('');
    setPin('');
    setEmail(op.email || '');
    setActivo(op.activo);
    setPermisos(op.permisos.length > 0 ? op.permisos : permisoInicial);
    setModalAbierto(true);
  };

  // Cambiar nivel de permiso
  const cambiarPermiso = (modulo: string, nivel: string) => {
    setPermisos(prev => 
      prev.map(p => p.modulo === modulo ? { ...p, nivel } : p)
    );
  };

  // Establecer todos los permisos
  const establecerTodos = (nivel: string) => {
    setPermisos(prev => prev.map(p => ({ ...p, nivel })));
  };

  // Guardar operador
  const guardar = async () => {
    if (!nombre || !usuario) {
      toast({
        title: 'Error',
        description: 'Nombre y usuario son obligatorios',
        variant: 'destructive',
      });
      return;
    }

    if (!operadorEditando && !password) {
      toast({
        title: 'Error',
        description: 'La contraseña es obligatoria para nuevos operadores',
        variant: 'destructive',
      });
      return;
    }

    setCargando(true);
    try {
      const body: any = {
        nombre,
        usuario,
        email: email || null,
        activo,
        permisos
      };

      if (password) body.password = password;
      if (pin) body.pin = pin;
      
      if (operadorEditando) {
        body.id = operadorEditando.id;
      }

      const res = await fetch('/api/operadores', {
        method: operadorEditando ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Error al guardar');
      }

      toast({
        title: operadorEditando ? 'Operador actualizado' : 'Operador creado',
        description: 'Los cambios se guardaron correctamente',
      });

      setModalAbierto(false);
      cargarOperadores();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCargando(false);
    }
  };

  // Eliminar operador
  const eliminar = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este operador?')) return;

    try {
      const res = await fetch(`/api/operadores?id=${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!data.success) throw new Error('Error al eliminar');

      toast({
        title: 'Operador eliminado',
        description: 'El operador fue eliminado correctamente',
      });

      cargarOperadores();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el operador',
        variant: 'destructive',
      });
    }
  };

  // Obtener badge de nivel
  const getBadgeNivel = (nivel: string) => {
    const n = NIVELES.find(n => n.value === nivel) || NIVELES[0];
    return (
      <Badge variant="outline" className={n.color}>
        {n.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestión de Operadores
          </h2>
          <p className="text-muted-foreground">
            Administra usuarios y permisos del sistema
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Operador
        </Button>
      </div>

      {/* Tabla de operadores */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">PIN</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead>Permisos Resumen</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operadores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay operadores registrados
                  </TableCell>
                </TableRow>
              ) : (
                operadores.map(op => {
                  const supervisorEn = op.permisos.filter(p => p.nivel === 'SUPERVISOR').length;
                  const operadorEn = op.permisos.filter(p => p.nivel === 'OPERADOR').length;
                  
                  return (
                    <TableRow key={op.id} className={!op.activo ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{op.nombre}</TableCell>
                      <TableCell className="font-mono">{op.usuario}</TableCell>
                      <TableCell>{op.email || '-'}</TableCell>
                      <TableCell className="text-center">
                        {op.tienePin ? (
                          <Key className="h-4 w-4 mx-auto text-amber-500" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={op.activo ? 'default' : 'secondary'}>
                          {op.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {supervisorEn > 0 && (
                            <Badge className="bg-green-100 text-green-700">
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              {supervisorEn} Sup.
                            </Badge>
                          )}
                          {operadorEn > 0 && (
                            <Badge className="bg-blue-100 text-blue-700">
                              <Shield className="h-3 w-3 mr-1" />
                              {operadorEn} Op.
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => abrirEditar(op)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => eliminar(op.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de edición */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-4 border-b bg-muted/50">
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {operadorEditando ? 'Editar Operador' : 'Nuevo Operador'}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[calc(90vh-140px)]">
            <div className="p-4 space-y-6">
              {/* Datos básicos */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Datos de Acceso</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre completo *</Label>
                    <Input
                      value={nombre}
                      onChange={e => setNombre(e.target.value)}
                      placeholder="Juan Pérez"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Usuario *</Label>
                    <Input
                      value={usuario}
                      onChange={e => setUsuario(e.target.value.toLowerCase().replace(/\s/g, ''))}
                      placeholder="usuario"
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contraseña {operadorEditando ? '(dejar vacío para no cambiar)' : '*'}</Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>PIN (para autorización rápida)</Label>
                    <Input
                      type="password"
                      value={pin}
                      onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="4-6 dígitos"
                      maxLength={6}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Solo para supervisores que necesiten autorizar operaciones
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="usuario@ejemplo.com"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 flex items-center gap-3 pt-6">
                    <Switch
                      checked={activo}
                      onCheckedChange={setActivo}
                    />
                    <Label>Usuario activo</Label>
                  </div>
                </CardContent>
              </Card>

              {/* Permisos */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Permisos por Módulo</CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => establecerTodos('NINGUNO')}>
                        <ShieldOff className="h-3 w-3 mr-1" />
                        Ninguno
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => establecerTodos('OPERADOR')}>
                        <Shield className="h-3 w-3 mr-1" />
                        Operador
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => establecerTodos('SUPERVISOR')}>
                        <ShieldCheck className="h-3 w-3 mr-1" />
                        Supervisor
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    NINGUNO: Sin acceso | OPERADOR: Puede operar | SUPERVISOR: Puede autorizar operaciones críticas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {MODULOS.map(modulo => {
                      const permiso = permisos.find(p => p.modulo === modulo);
                      const nivel = permiso?.nivel || 'NINGUNO';
                      
                      return (
                        <div
                          key={modulo}
                          className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                        >
                          <Label className="text-sm">{NOMBRES_MODULOS[modulo]}</Label>
                          <Select
                            value={nivel}
                            onValueChange={v => cambiarPermiso(modulo, v)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {NIVELES.map(n => (
                                <SelectItem key={n.value} value={n.value}>
                                  {n.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>

          {/* Botones */}
          <div className="border-t p-4 flex justify-end gap-3 bg-muted/50">
            <Button variant="outline" onClick={() => setModalAbierto(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={cargando}>
              <Save className="h-4 w-4 mr-2" />
              {cargando ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
