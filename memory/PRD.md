# Bonchef Mantenimiento - PRD

## Problema Original
Sistema de mantenimiento industrial para gestionar máquinas, órdenes de trabajo, paradas y arranques de líneas de producción.

## Cambios Implementados (Feb 2026)

### 1. Arranque de Líneas - Hora Objetivo Predefinida
- La hora objetivo se configura en cada línea de producción (Departamentos → Líneas)
- Al registrar arranque, la hora objetivo es **solo lectura** (auto-llenada)
- Solo se rellena manualmente la **hora real de arranque**

### 2. Eliminación Habilitada
Todos los siguientes elementos pueden ser eliminados (solo admin):
- ✅ Usuarios (DELETE /api/users/{id})
- ✅ Máquinas (DELETE /api/machines/{id})
- ✅ Líneas de producción (DELETE /api/production-lines/{id})
- ✅ Departamentos (DELETE /api/departments/{id})
- ✅ Órdenes correctivas y preventivas (DELETE /api/work-orders/{id})

### 3. Archivos en Máquinas Sin Límite
- Se pueden subir archivos de cualquier tipo a las máquinas
- Sin restricción de formato (PDFs, imágenes, documentos, etc.)

## Arquitectura
- **Frontend**: React + TailwindCSS
- **Backend**: FastAPI + MongoDB
- **Base de datos**: MongoDB

## Flujo de Arranques Actualizado
1. Crear línea en Departamentos con hora objetivo predefinida
2. Ir a "Arranques" → "Registrar Arranque"
3. Seleccionar línea (hora objetivo se auto-llena)
4. Ingresar solo la hora real
5. Sistema calcula automáticamente si fue a tiempo o retrasado

## Próximos Pasos
- P0: Ninguno
- P1: Reportes exportables de cumplimiento
- P2: Alertas por retrasos consecutivos
