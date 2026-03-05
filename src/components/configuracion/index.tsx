'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Building2, Warehouse, UserCheck, Package, Users, Truck, Beef, PawPrint, Box, Briefcase, MessageSquareWarning, Tags } from 'lucide-react'
import { ConfigFrigorifico } from './config-frigorifico'
import { Corrales } from './corrales'
import { Camaras } from './camaras'
import { Tipificadores } from './tipificadores'
import { Productos } from './productos'
import OperadoresManager from './operadores'
import { Transportistas } from './transportistas'
import { Clientes } from './clientes'
import { Razas } from './razas'
import { Subproductos } from './subproductos'
import { TiposTrabajo } from './tipos-trabajo'
import { ObservacionesUsuario } from './observaciones-usuario'
import { Articulos } from './articulos'

interface Operador {
  id: string
  nombre: string
  permisos?: Record<string, { nivel: string; puedeAcceder: boolean; puedeSupervisar: boolean }>
}

export function ConfiguracionModule({ operador }: { operador: Operador }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-stone-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-stone-800">Configuración</h1>
          <p className="text-stone-500">Gestión del sistema Solemar Alimentaria</p>
        </div>

        <Tabs defaultValue="frigorifico" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:grid-cols-13 gap-1 h-auto">
            <TabsTrigger value="frigorifico" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Building2 className="w-4 h-4" />
              <span className="hidden lg:inline">Frigorífico</span>
            </TabsTrigger>
            <TabsTrigger value="corrales" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Warehouse className="w-4 h-4" />
              <span className="hidden lg:inline">Corrales</span>
            </TabsTrigger>
            <TabsTrigger value="camaras" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Warehouse className="w-4 h-4" />
              <span className="hidden lg:inline">Cámaras</span>
            </TabsTrigger>
            <TabsTrigger value="razas" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <PawPrint className="w-4 h-4" />
              <span className="hidden lg:inline">Razas</span>
            </TabsTrigger>
            <TabsTrigger value="tipificadores" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <UserCheck className="w-4 h-4" />
              <span className="hidden lg:inline">Tipific.</span>
            </TabsTrigger>
            <TabsTrigger value="productos" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Package className="w-4 h-4" />
              <span className="hidden lg:inline">Productos</span>
            </TabsTrigger>
            <TabsTrigger value="articulos" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Tags className="w-4 h-4" />
              <span className="hidden lg:inline">Artículos</span>
            </TabsTrigger>
            <TabsTrigger value="clientes" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Beef className="w-4 h-4" />
              <span className="hidden lg:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="transportistas" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Truck className="w-4 h-4" />
              <span className="hidden lg:inline">Transp.</span>
            </TabsTrigger>
            <TabsTrigger value="operadores" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Users className="w-4 h-4" />
              <span className="hidden lg:inline">Operadores</span>
            </TabsTrigger>
            <TabsTrigger value="subproductos" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Box className="w-4 h-4" />
              <span className="hidden lg:inline">Subprod.</span>
            </TabsTrigger>
            <TabsTrigger value="tipos-trabajo" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <Briefcase className="w-4 h-4" />
              <span className="hidden lg:inline">T. Trabajo</span>
            </TabsTrigger>
            <TabsTrigger value="observaciones" className="flex items-center gap-1 text-xs md:text-sm px-2 md:px-3">
              <MessageSquareWarning className="w-4 h-4" />
              <span className="hidden lg:inline">Observac.</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="frigorifico">
            <ConfigFrigorifico operador={operador} />
          </TabsContent>
          <TabsContent value="corrales">
            <Corrales operador={operador} />
          </TabsContent>
          <TabsContent value="camaras">
            <Camaras operador={operador} />
          </TabsContent>
          <TabsContent value="razas">
            <Razas operador={operador} />
          </TabsContent>
          <TabsContent value="tipificadores">
            <Tipificadores operador={operador} />
          </TabsContent>
          <TabsContent value="productos">
            <Productos operador={operador} />
          </TabsContent>
          <TabsContent value="articulos">
            <Articulos operador={operador} />
          </TabsContent>
          <TabsContent value="clientes">
            <Clientes operador={operador} />
          </TabsContent>
          <TabsContent value="transportistas">
            <Transportistas operador={operador} />
          </TabsContent>
          <TabsContent value="operadores">
            <OperadoresManager />
          </TabsContent>
          <TabsContent value="subproductos">
            <Subproductos operador={operador} />
          </TabsContent>
          <TabsContent value="tipos-trabajo">
            <TiposTrabajo operador={operador} />
          </TabsContent>
          <TabsContent value="observaciones">
            <ObservacionesUsuario operador={operador} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ConfiguracionModule
