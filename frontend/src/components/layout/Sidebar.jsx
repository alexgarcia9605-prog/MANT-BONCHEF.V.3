import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import {
    LayoutDashboard,
    Cog,
    Building2,
    Calendar,
    Users,
    LogOut,
    Menu,
    X,
    Wrench,
    CalendarClock,
    AlertTriangle,
    BarChart3,
    FolderOpen,
    OctagonX,
    Play
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/my-orders', icon: FolderOpen, label: 'Mis Órdenes', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/work-orders/preventive', icon: CalendarClock, label: 'Órdenes Preventivas', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/work-orders/corrective', icon: AlertTriangle, label: 'Órdenes Correctivas' },
    { to: '/machine-stops', icon: OctagonX, label: 'Paradas', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/machine-starts', icon: Play, label: 'Arranques', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/machines', icon: Cog, label: 'Máquinas', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/departments', icon: Building2, label: 'Departamentos', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/calendar', icon: Calendar, label: 'Calendario', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/analytics', icon: BarChart3, label: 'Datos', roles: ['admin', 'supervisor', 'tecnico'] },
    { to: '/users', icon: Users, label: 'Usuarios', roles: ['admin', 'supervisor'] }
];

export const Sidebar = () => {
    const { user, logout, hasRole } = useAuth();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredItems = navItems.filter(item => {
        // Si no tiene roles definidos, todos pueden ver
        if (!item.roles) return true;
        // Si tiene roles, verificar si el usuario tiene alguno de esos roles
        return hasRole(item.roles);
    });

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight">Bonchef</h1>
                        <p className="text-xs text-white/60">Mantenimiento</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            cn(
                                'sidebar-link',
                                isActive && 'active'
                            )
                        }
                        data-testid={`nav-${item.to.replace('/', '')}`}
                    >
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User info & logout */}
            <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 mb-4 px-4">
                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <span className="text-sm font-semibold">
                            {user?.name?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{user?.name}</p>
                        <p className="text-xs text-white/60 capitalize">{user?.role}</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleLogout}
                    data-testid="logout-btn"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    Cerrar Sesión
                </Button>
            </div>
        </div>
    );

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sidebar-desktop w-64 sidebar fixed left-0 top-0 h-screen z-40">
                <SidebarContent />
            </aside>

            {/* Mobile Header */}
            <div className="sidebar-mobile fixed top-0 left-0 right-0 h-16 bg-secondary text-white z-40 flex items-center px-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileOpen(true)}
                    className="text-white"
                    data-testid="mobile-menu-btn"
                >
                    <Menu className="w-6 h-6" />
                </Button>
                <div className="flex items-center gap-2 ml-3">
                    <Wrench className="w-5 h-5 text-primary" />
                    <span className="font-bold">Bonchef Mantenimiento</span>
                </div>
            </div>

            {/* Mobile Sidebar Overlay */}
            {mobileOpen && (
                <div className="sidebar-mobile fixed inset-0 z-50">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setMobileOpen(false)}
                    />
                    <aside className="absolute left-0 top-0 w-64 h-full sidebar">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 text-white"
                            onClick={() => setMobileOpen(false)}
                        >
                            <X className="w-5 h-5" />
                        </Button>
                        <SidebarContent />
                    </aside>
                </div>
            )}
        </>
    );
};
