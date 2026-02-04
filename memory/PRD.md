# Bonchef Mantenimiento - PRD

## Diseño "Performance Pro" - Industrial Elegance

### Paleta de Colores
- Primary: #FF5500 (Orange 600)
- Background: Slate 900-800 (dark), Slate 100 (light)
- Accent: Orange gradients

### Tipografía
- Títulos: Barlow Condensed (industrial, bold)
- Cuerpo: Manrope (moderno, legible)
- Código: JetBrains Mono

### Componentes
- Sidebar: Dark theme con gradient, links con border-left naranja
- Cards: Bordes sutiles con hover glow naranja
- Tablas: Headers uppercase, filas con hover suave
- Login: Glassmorphism con gradiente oscuro

## Roles del Sistema
- **Admin**: Acceso total + crear usuarios
- **Supervisor**: Operaciones + gestión parcial
- **Técnico**: Órdenes asignadas
- **Encargado de Línea**: Solo correctivos

## Funcionalidades
- Gestión de usuarios (admin crea usuarios)
- Flujo "Realizar" con cierre parcial
- Preventivos asociados en máquinas
- Archivos sin límite
- Hora objetivo predefinida en líneas

## Arquitectura
- Frontend: React + TailwindCSS
- Backend: FastAPI + MongoDB
