# Bonchef Mantenimiento - PRD

## Cambios Implementados (Feb 2026)

### 1. Flujo "Realizar" en Órdenes
**Preventivos:**
- Botón "Realizar" abre diálogo con: Observaciones, Checklist, Firma
- Al finalizar: botones "Realizada" o "Cierre Parcial"

**Correctivos:**
- Botón "Realizar" abre diálogo con: Notas, Causa del Fallo, Repuesto
- Al finalizar: botones "Realizada" o "Cierre Parcial"

**Admin:**
- Ve botón "Realizar" + botón "Editar" separado
- Puede cambiar estado, prioridad, asignación

### 2. Archivos Sin Límite
- Máquinas: cualquier tipo de archivo
- Órdenes preventivas: cualquier tipo de archivo
- Órdenes correctivas: cualquier tipo de archivo

### 3. Eliminación Habilitada
- Usuarios, Máquinas, Líneas, Departamentos, Órdenes

### 4. Arranque de Líneas
- Hora objetivo predefinida en cada línea
- Solo se rellena la hora real

## Arquitectura
- Frontend: React + TailwindCSS
- Backend: FastAPI + MongoDB

## Próximos Pasos
- P0: Ninguno
- P1: Reportes exportables
