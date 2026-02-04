# Bonchef Mantenimiento - PRD

## Problema Original
Sistema de mantenimiento industrial para gestionar máquinas, órdenes de trabajo, paradas y arranques de líneas de producción.

## Cambio Solicitado (Feb 2026)
Modificar el formulario de "Arranque de Líneas" para que al registrar un arranque:
- Solo se muestre la línea de producción creada dentro de cada departamento
- Se auto-llene la hora objetivo desde la configuración de la línea
- Se registre la hora real del arranque

## Lo Implementado
1. **Frontend - MachineStarts.jsx**
   - Eliminados campos de "Máquina" y "Departamento/Sección"
   - Agregado selector de "Línea de Producción" agrupado por departamento
   - Auto-llenado de hora objetivo al seleccionar una línea
   - Tabla actualizada para mostrar "Línea de Producción" en lugar de "Máquina"

2. **Backend - server.py**
   - Corregido bug: `machine_stats` → `line_stats` en endpoint de estadísticas

## Arquitectura
- **Frontend**: React + TailwindCSS
- **Backend**: FastAPI + MongoDB
- **Base de datos**: MongoDB

## Flujo de Arranques
1. Usuario va a "Arranques"
2. Clic en "Registrar Arranque"
3. Selecciona fecha y línea de producción
4. Hora objetivo se auto-llena
5. Usuario ingresa hora real
6. Sistema calcula si fue a tiempo o retrasado

## Próximos Pasos Sugeridos
- P0: Ninguno
- P1: Agregar reportes exportables de cumplimiento por línea
- P2: Notificaciones cuando hay retrasos consecutivos
