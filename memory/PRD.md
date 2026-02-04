# Bonchef Mantenimiento - PRD

## Problema Original
Sistema completo de gestión de mantenimiento con:
1. Órdenes preventivas con checklist, observaciones, firma
2. Órdenes correctivas con causas de fallo
3. Posponer y cierre parcial de órdenes
4. Archivos en máquinas accesibles a todos
5. Vista "Mis Órdenes" para técnicos
6. Análisis de correctivos recurrentes
7. **Paradas de máquinas** (avería, producción, calidad)
8. **Arranques de máquinas** con hora objetivo vs real y gráficas

## Arquitectura
- **Backend**: FastAPI con MongoDB
- **Frontend**: React con Tailwind CSS y Recharts
- **Auth**: JWT con roles (admin, supervisor, tecnico)

## Implementado (3 Feb 2026)

### Backend
- CRUD órdenes preventivas/correctivas con estados
- Checklist templates, firma del técnico, fecha de cierre
- Posponer y cierre parcial de órdenes
- Archivos en máquinas sin límites
- Endpoint `/api/my-orders`
- Análisis de correctivos recurrentes
- **Endpoints `/api/machine-stops`**: Registro de paradas por tipo
- **Endpoints `/api/machine-starts`**: Registro de arranques
- **Endpoint `/api/machine-starts/compliance-stats`**: Estadísticas de cumplimiento

### Frontend
- Órdenes: Checklist, firma, posponer, cierre parcial
- Máquinas: Vista con archivos adjuntos
- Mis Órdenes: Vista organizada por tipo/estado
- Analytics: Correctivos recurrentes por máquina
- **MachineStops.jsx**: Paradas con tipos (avería/producción/calidad), motivo, duración
- **MachineStarts.jsx**: Arranques con hora objetivo/real, razón de retraso
  - Tab "Registros": Tabla con estado (a tiempo/retrasado/pendiente)
  - Tab "Gráficas": Pie de distribución, barras por sección, línea temporal, barras por máquina
  - % Cumplimiento calculado automáticamente

## User Personas
- **Admin**: Control total
- **Supervisor**: Gestiona órdenes y departamentos
- **Técnico**: Mis Órdenes, completar checklist, posponer/cerrar parcial

## Backlog (P1)
- Exportar reportes a PDF
- Notificaciones por email
- Gestión de plantillas de checklist desde UI

## Próximos Pasos
- Alertas automáticas para averías recurrentes
- Análisis predictivo de fallos
- Dashboard de tiempo real para paradas activas
