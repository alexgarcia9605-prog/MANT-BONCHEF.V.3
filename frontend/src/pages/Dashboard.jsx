import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { cn, formatDate, getStatusLabel, getPriorityLabel, getTypeLabel } from '../lib/utils';
import {
    Cog,
    ClipboardList,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Wrench,
    Plus,
    ArrowRight,
    TrendingUp,
    Activity,
    CalendarClock
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentOrders, setRecentOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, ordersRes] = await Promise.all([
                axios.get(`${API}/dashboard/stats`),
                axios.get(`${API}/dashboard/recent-orders`)
            ]);
            setStats(statsRes.data);
            setRecentOrders(ordersRes.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    const priorityClass = {
        critica: 'priority-critica',
        alta: 'priority-alta',
        media: 'priority-media',
        baja: 'priority-baja'
    };

    const statusClass = {
        pendiente: 'bg-gray-500/15 text-gray-700',
        en_progreso: 'bg-blue-500/15 text-blue-700',
        completada: 'bg-green-500/15 text-green-700',
        cancelada: 'bg-red-500/15 text-red-700'
    };

    return (
        <div className="space-y-6 animate-fade-in" data-testid="dashboard">
            <PageHeader
                title="Dashboard"
                description="Resumen general del sistema de mantenimiento"
            >
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate('/work-orders/preventive/new')} data-testid="new-preventive-btn">
                        <CalendarClock className="w-4 h-4 mr-2" />
                        Preventiva
                    </Button>
                    <Button onClick={() => navigate('/work-orders/corrective/new')} data-testid="new-corrective-btn">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Correctiva
                    </Button>
                </div>
            </PageHeader>

            {/* Stats Grid */}
            <div className="dashboard-grid">
                {/* Machines Card */}
                <Card className="card-hover metric-card tech-border" data-testid="machines-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Máquinas
                        </CardTitle>
                        <Cog className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.machines?.total || 0}</div>
                        <div className="flex gap-3 mt-3 text-xs">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                {stats?.machines?.operational || 0} Operativas
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                {stats?.machines?.in_maintenance || 0} Mtto
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Orders Card */}
                <Card className="card-hover metric-card tech-border" data-testid="orders-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Órdenes Totales
                        </CardTitle>
                        <ClipboardList className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.orders?.total || 0}</div>
                        <div className="flex gap-3 mt-3 text-xs">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                {stats?.orders?.preventive || 0} Prev.
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                {stats?.orders?.corrective || 0} Corr.
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Pending Card */}
                <Card className="card-hover metric-card tech-border" data-testid="pending-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pendientes
                        </CardTitle>
                        <Clock className="w-5 h-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.orders?.pending || 0}</div>
                        <div className="flex gap-3 mt-3 text-xs">
                            <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-blue-500" />
                                {stats?.orders?.in_progress || 0} En progreso
                            </span>
                        </div>
                    </CardContent>
                </Card>

                {/* Critical Card */}
                <Card className="card-hover metric-card tech-border" data-testid="critical-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Críticas/Altas
                        </CardTitle>
                        <AlertTriangle className="w-5 h-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">
                            {(stats?.orders?.critical || 0) + (stats?.orders?.high_priority || 0)}
                        </div>
                        <div className="flex gap-3 mt-3 text-xs">
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                {stats?.orders?.critical || 0} Críticas
                            </span>
                            <span className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-orange-500" />
                                {stats?.orders?.high_priority || 0} Altas
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Orders */}
            <Card className="card-hover" data-testid="recent-orders-card">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-primary" />
                        Órdenes Recientes
                    </CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/work-orders/preventive')}
                            data-testid="view-preventive-btn"
                        >
                            Preventivas
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/work-orders/corrective')}
                            data-testid="view-corrective-btn"
                        >
                            Correctivas
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {recentOrders.length === 0 ? (
                        <div className="empty-state py-8">
                            <ClipboardList className="empty-state-icon" />
                            <p className="text-muted-foreground">No hay órdenes recientes</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentOrders.map((order) => (
                                <div
                                    key={order.id}
                                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/work-orders/${order.id}`)}
                                    data-testid={`order-item-${order.id}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            'w-2 h-2 rounded-full',
                                            order.type === 'preventivo' ? 'bg-blue-500' : 'bg-purple-500'
                                        )} />
                                        <div>
                                            <p className="font-medium">{order.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {order.machine_name} • {formatDate(order.scheduled_date)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge className={priorityClass[order.priority]}>
                                            {getPriorityLabel(order.priority)}
                                        </Badge>
                                        <Badge className={statusClass[order.status]}>
                                            {getStatusLabel(order.status)}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="card-hover">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            Completadas este mes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold">{stats?.orders?.completed || 0}</div>
                        <p className="text-sm text-muted-foreground mt-1">
                            órdenes de trabajo finalizadas
                        </p>
                    </CardContent>
                </Card>

                <Card className="card-hover">
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            Distribución por tipo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-8">
                            <div>
                                <div className="text-2xl font-bold text-blue-600">
                                    {stats?.orders?.preventive || 0}
                                </div>
                                <p className="text-sm text-muted-foreground">Preventivas</p>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {stats?.orders?.corrective || 0}
                                </div>
                                <p className="text-sm text-muted-foreground">Correctivas</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
