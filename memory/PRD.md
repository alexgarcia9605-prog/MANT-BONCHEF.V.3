# Bonchef Mantenimiento - PRD

## Cambios Implementados (Feb 2026)

### 1. Arranque de Líneas
- Hora objetivo predefinida en cada línea de producción
- Al registrar arranque, hora objetivo es solo lectura
- Solo se rellena la hora real de arranque

### 2. Eliminación Habilitada (Solo Admin)
- ✅ Usuarios, Máquinas, Líneas, Departamentos
- ✅ Órdenes correctivas y preventivas

### 3. Archivos Sin Límite
- ✅ Máquinas: cualquier tipo de archivo
- ✅ Órdenes correctivas: cualquier tipo de archivo
- ✅ Órdenes preventivas: cualquier tipo de archivo

### 4. Roles en Órdenes de Trabajo
**Técnico asignado:**
- Ve botón "Realizar" (no "Editar")
- Opciones: "Realizada" o "Cierre Parcial"
- Puede completar checklist, agregar observaciones, firmar

**Administrador:**
- Ve botón "Editar" completo
- Puede cambiar estado, prioridad, asignación
- Puede eliminar órdenes
- Puede hacer todo lo que hace el técnico

## Arquitectura
- Frontend: React + TailwindCSS
- Backend: FastAPI + MongoDB
- Base de datos: MongoDB

## Próximos Pasos
- P0: Ninguno
- P1: Reportes exportables
- P2: Alertas por retrasos
