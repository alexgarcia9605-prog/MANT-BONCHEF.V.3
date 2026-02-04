# Bonchef Mantenimiento - PRD

## Roles del Sistema

### 1. Administrador (admin)
- Acceso total a todas las funciones
- Puede **crear nuevos usuarios** con email, contraseña y rol
- Gestión de usuarios y roles
- Crear/editar/eliminar todo

### 2. Supervisor (supervisor)
- Acceso a todas las operaciones
- No puede gestionar usuarios admin

### 3. Técnico (tecnico)
- Acceso a órdenes asignadas
- Dashboard, máquinas, departamentos

### 4. Encargado de Línea (encargado_linea)
- Solo acceso a Órdenes Correctivas
- Puede crear nuevas órdenes correctivas

## Funcionalidades Implementadas

### Gestión de Usuarios (Admin)
- Botón "Nuevo Usuario" en página Usuarios
- Formulario con: Nombre, Email, Contraseña, Rol
- Endpoint POST /api/auth/register-admin (solo admin)

### Órdenes de Trabajo
- Flujo "Realizar" con cierre parcial y campo de razón
- Filtros "Pendientes" incluyen cierre parcial
- Preventivos asociados visibles en cada máquina

### Sistema
- Archivos sin límite en máquinas y órdenes
- Eliminación de entidades habilitada
- Hora objetivo predefinida en líneas de producción

## Arquitectura
- Frontend: React + TailwindCSS
- Backend: FastAPI + MongoDB
