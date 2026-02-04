import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../contexts/AuthContext';
import {
    formatDate,
    getStatusLabel,
    getPriorityLabel,
    getRecurrenceLabel
} from '../lib/utils';
import {
    FolderOpen,
    ClipboardList,
    Wrench,
    CheckCircle2,
    Clock,
    Eye,
    Calendar,
    RefreshCw,
    AlertTriangle,
    ChevronRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MyOrders() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('preventivo');

    useEffect(() => {
        fetchMyOrders();
    }, []);

    const fetchMyOrders = async () => {
        try {
            const response = await axios.get(`${API}/my-orders`);
            setData(response.data);
        } catch (error) {
            console.error('Error fetching my orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const priorityClass = {
        critica: 'priority-critica',
        alta: 'priority-alta',
        media: 'priority-media',
        baja: 'priority-baja'
    };

    const statusClass = {
        pendiente: 'bg-yellow-500/15 text-yellow-700',
        en_progreso: 'bg-blue-500/15 text-blue-700',
        completada: 'bg-green-500/15 text-green-700',
        cancelada: 'bg-red-500/15 text-red-700'
    };

    const OrderCard = ({ order }) => (
        <div 
            className="p-4 bg-card border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => navigate(`/work-orders/${order.id}`)}
            data-testid={`order-card-${order.id}`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{order.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                        {order.machine_name} • {order.department_name}
                    </p>
                    {order.scheduled_date && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(order.scheduled_date)}</span>
                            {order.recurrence && (
                                <>
                                    <RefreshCw className="w-3 h-3 ml-2" />
                                    <span>{getRecurrenceLabel(order.recurrence)}</span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex flex-col items-end gap-2">
                    <Badge className={priorityClass[order.priority]}>
                        {getPriorityLabel(order.priority)}
                    </Badge>
                    <Badge className={statusClass[order.status]}>
                        {getStatusLabel(order.status)}
                    </Badge>
                </div>
            </div>
            {order.type === 'preventivo' && order.checklist && order.checklist.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ClipboardList className="w-3 h-3" />
                        <span>
                            Checklist: {order.checklist.filter(i => i.checked).length}/{order.checklist.length} completado
                        </span>
                    </div>
                </div>
            )}
        </div>
    );

    const OrderSection = ({ title, orders, icon: Icon, emptyMessage }) => (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="w-4 h-4" />
                <span>{title}</span>
                <Badge variant="secondary" className="ml-auto">
                    {orders.length}
                </Badge>
            </div>
            {orders.length === 0 ? (
                <div className="p-6 bg-muted/30 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">{emptyMessage}</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {orders.map(order => (
                        <OrderCard key={order.id} order={order} />
                    ))}
                </div>
            )}
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Error al cargar las órdenes</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="my-orders-page">
            <PageHeader
                title="Mis Órdenes"
                description={`Órdenes asignadas a ${user?.name || 'ti'}`}
            >
                <div className="flex items-center gap-2 text-sm">
                    <FolderOpen className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Total:</span>
                    <Badge variant="outline">{data.summary.total}</Badge>
                </div>
            </PageHeader>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Preventivas Pendientes</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {data.summary.preventivo_pendientes}
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-blue-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Preventivas Completadas</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {data.summary.preventivo_completadas}
                                </p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-green-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Correctivas Pendientes</p>
                                <p className="text-2xl font-bold text-orange-600">
                                    {data.summary.correctivo_pendientes}
                                </p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-orange-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-muted-foreground">Correctivas Completadas</p>
                                <p className="text-2xl font-bold text-emerald-600">
                                    {data.summary.correctivo_completadas}
                                </p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-emerald-500/30" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs for Order Type */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="preventivo" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Preventivas
                        <Badge variant="secondary" className="ml-1">
                            {data.preventivo.pendientes.length + data.preventivo.en_progreso.length + data.preventivo.completadas.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="correctivo" className="flex items-center gap-2">
                        <Wrench className="w-4 h-4" />
                        Correctivas
                        <Badge variant="secondary" className="ml-1">
                            {data.correctivo.pendientes.length + data.correctivo.en_progreso.length + data.correctivo.completadas.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="preventivo" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pending & In Progress */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-yellow-500" />
                                    Pendientes / En Progreso
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <OrderSection
                                    title="En Progreso"
                                    orders={data.preventivo.en_progreso}
                                    icon={RefreshCw}
                                    emptyMessage="Sin órdenes en progreso"
                                />
                                <OrderSection
                                    title="Pendientes"
                                    orders={data.preventivo.pendientes}
                                    icon={Clock}
                                    emptyMessage="Sin órdenes pendientes"
                                />
                            </CardContent>
                        </Card>

                        {/* Completed */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                    Completadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <OrderSection
                                    title="Completadas"
                                    orders={data.preventivo.completadas}
                                    icon={CheckCircle2}
                                    emptyMessage="Sin órdenes completadas"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="correctivo" className="mt-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pending & In Progress */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-orange-500" />
                                    Pendientes / En Progreso
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <OrderSection
                                    title="En Progreso"
                                    orders={data.correctivo.en_progreso}
                                    icon={RefreshCw}
                                    emptyMessage="Sin órdenes en progreso"
                                />
                                <OrderSection
                                    title="Pendientes"
                                    orders={data.correctivo.pendientes}
                                    icon={Clock}
                                    emptyMessage="Sin órdenes pendientes"
                                />
                            </CardContent>
                        </Card>

                        {/* Completed */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    Completadas
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <OrderSection
                                    title="Completadas"
                                    orders={data.correctivo.completadas}
                                    icon={CheckCircle2}
                                    emptyMessage="Sin órdenes completadas"
                                />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {data.summary.total === 0 && (
                <Card className="mt-6">
                    <CardContent className="py-12 text-center">
                        <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium mb-2">No tienes órdenes asignadas</h3>
                        <p className="text-muted-foreground">
                            Cuando te asignen una orden de trabajo, aparecerá aquí.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
