# Bonchef Mantenimiento - PRD

## Cambios Implementados (Feb 2026)

### 1. Preventivos Asociados en Máquinas
- Al ver una máquina, se muestra sección "Órdenes Preventivas Asociadas"
- Lista los preventivos con estado, prioridad y fecha programada
- Click en un preventivo navega al detalle de la orden

### 2. Cierre Parcial Dentro de Realizar
- Botón "Cierre Parcial" eliminado de fuera del detalle de orden
- Solo queda el botón "Posponer" como acción externa
- Al hacer clic en "Realizar" y luego "Cierre Parcial", aparece campo para explicar el motivo

### 3. Filtro Pendientes Incluye Cierre Parcial
- En listados de preventivos y correctivos, nuevo filtro "Pendientes"
- Incluye estados: pendiente, en_progreso, cerrada_parcial
- Órdenes con cierre parcial muestran badge púrpura

### 4. Flujo "Realizar" en Órdenes
- Preventivos: Observaciones, Checklist, Firma
- Correctivos: Notas, Causa del Fallo, Repuesto
- Botones: "Realizada" o "Cierre Parcial" (con campo de razón)

### 5. Otros Cambios
- Archivos sin límite en máquinas y órdenes
- Eliminación de usuarios, máquinas, líneas, departamentos, órdenes
- Hora objetivo predefinida en líneas de producción

## Arquitectura
- Frontend: React + TailwindCSS
- Backend: FastAPI + MongoDB

## Próximos Pasos
- P0: Ninguno
- P1: Reportes exportables
