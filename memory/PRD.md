# Bonchef Mantenimiento - PRD

## Módulo Almacén de Repuestos (NUEVO)

### Características
- **Inventario de repuestos** con referencia interna y externa
- **Stock con límites**: mínimo (rojo) y máximo (verde)
- **Ubicación física** en el almacén
- **Máquina asociada** a cada repuesto
- **Solicitudes de técnicos** que admin/supervisor aprueban
- **Descuento automático** de stock al entregar

### Campos de Repuesto
- Nombre, Descripción
- Referencia interna (única)
- Referencia proveedor
- Stock actual, mínimo, máximo
- Ubicación en almacén
- Máquina asociada
- Unidad (unidad, kg, litros, etc.)
- Proveedor, Precio

### Permisos
- **Admin**: CRUD completo de repuestos
- **Supervisor**: Aprobar/rechazar solicitudes
- **Técnico**: Ver inventario, solicitar repuestos

## Roles del Sistema
- Admin: Acceso total
- Supervisor: Operaciones + aprobar solicitudes
- Técnico: Órdenes + solicitar repuestos
- Encargado de Línea: Solo correctivos

## Diseño "Performance Pro"
- Sidebar oscuro con accent naranja
- Tipografía Barlow Condensed / Manrope
- Cards con hover glow
- Login con glassmorphism

## Arquitectura
- Frontend: React + TailwindCSS
- Backend: FastAPI + MongoDB
