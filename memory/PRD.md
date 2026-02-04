# Bonchef Mantenimiento - PRD

## Roles del Sistema

### 1. Administrador (admin)
- Acceso total a todas las funciones
- Gestión de usuarios y roles
- Crear/editar/eliminar todo

### 2. Supervisor (supervisor)
- Acceso a todas las operaciones
- No puede gestionar usuarios admin

### 3. Técnico (tecnico)
- Acceso a órdenes asignadas
- Dashboard, máquinas, departamentos
- Puede realizar órdenes preventivas/correctivas

### 4. Encargado de Línea (encargado_linea) - NUEVO
- **Solo acceso a Órdenes Correctivas**
- Puede crear nuevas órdenes correctivas
- Puede ver el detalle de órdenes
- NO puede acceder a: Dashboard, Preventivos, Máquinas, Departamentos, etc.
- Al hacer login es redirigido a /work-orders/corrective

## Cambios Implementados

### Flujo "Realizar" con Cierre Parcial
- Botón "Cierre Parcial" solo dentro del diálogo "Realizar"
- Campo obligatorio para explicar motivo del cierre parcial

### Filtros de Pendientes
- "Pendientes" incluye: pendiente, en_progreso, cerrada_parcial

### Preventivos en Máquinas
- Al ver una máquina se muestran los preventivos asociados

### Otros
- Archivos sin límite en máquinas y órdenes
- Eliminación de entidades habilitada
- Hora objetivo predefinida en líneas

## Arquitectura
- Frontend: React + TailwindCSS
- Backend: FastAPI + MongoDB
