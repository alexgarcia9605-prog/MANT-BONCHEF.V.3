import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line
} from 'recharts';
import {
    BarChart3,
    PieChart as PieChartIcon,
    TrendingUp,
    AlertTriangle,
    CheckCircle2,
    Clock,
    OctagonX,
    Play,
    Repeat,
    Cog,
    ChevronRight
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Analytics() {
    const [preventiveVsCorrective, setPreventiveVsCorrective] = useState([]);
    const [failureCauses, setFailureCauses] = useState([]);
    const [compliance, setCompliance] = useState(null);
    const [stopsAnalytics, setStopsAnalytics] = useState(null);
    const [lineStartsAnalytics, setLineStartsAnalytics] = useState(null);
    const [recurringCorrectives, setRecurringCorrectives] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const [pvcRes, causesRes, complianceRes, stopsRes, lineStartsRes, recurringRes] = await Promise.all([
                axios.get(`${API}/analytics/preventive-vs-corrective`),
                axios.get(`${API}/analytics/failure-causes`),
                axios.get(`${API}/analytics/preventive-compliance`),
                axios.get(`${API}/analytics/stops`),
                axios.get(`${API}/analytics/line-starts`),
                axios.get(`${API}/analytics/recurring-correctives`)
            ]);
            setPreventiveVsCorrective(pvcRes.data);
            setFailureCauses(causesRes.data);
            setCompliance(complianceRes.data);
            setStopsAnalytics(stopsRes.data);
            setLineStartsAnalytics(lineStartsRes.data);
            setRecurringCorrectives(recurringRes.data);
        } catch (error) {
            console.error('Error fetching analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#3b82f6', '#8b5cf6', '#f97316', '#22c55e', '#ef4444', '#eab308', '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f43f5e'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="analytics-page">
            <PageHeader
                title="Datos y Análisis"
                description="Estadísticas y métricas del sistema de mantenimiento"
            />

            <Tabs defaultValue="maintenance" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="maintenance" data-testid="tab-maintenance">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Mantenimiento
                    </TabsTrigger>
                    <TabsTrigger value="stops" data-testid="tab-stops">
                        <OctagonX className="w-4 h-4 mr-2" />
                        Paradas
                    </TabsTrigger>
                    <TabsTrigger value="line-starts" data-testid="tab-lines">
                        <Play className="w-4 h-4 mr-2" />
                        Arranque de Líneas
                    </TabsTrigger>
                </TabsList>

                {/* TAB: MANTENIMIENTO */}
                <TabsContent value="maintenance" className="space-y-6">
                    {/* Summary Cards */}
                    {compliance && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <Card className="card-hover">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Tasa de Cumplimiento</p>
                                            <p className="text-3xl font-bold text-emerald-600">{compliance.summary.compliance_rate}%</p>
                                        </div>
                                        <CheckCircle2 className="w-10 h-10 text-emerald-500/20" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="card-hover">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Completados a Tiempo</p>
                                            <p className="text-3xl font-bold text-blue-600">{compliance.summary.completed_on_time}</p>
                                        </div>
                                        <Clock className="w-10 h-10 text-blue-500/20" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="card-hover">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Completados Tarde</p>
                                            <p className="text-3xl font-bold text-amber-600">{compliance.summary.completed_late}</p>
                                        </div>
                                        <AlertTriangle className="w-10 h-10 text-amber-500/20" />
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="card-hover">
                                <CardContent className="pt-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Pendientes Atrasados</p>
                                            <p className="text-3xl font-bold text-red-600">{compliance.summary.pending_late}</p>
                                        </div>
                                        <AlertTriangle className="w-10 h-10 text-red-500/20" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Preventive vs Corrective */}
                        <Card className="card-hover">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-primary" />
                                    Preventivo vs Correctivo
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {preventiveVsCorrective.length === 0 ? (
                                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                                        No hay datos suficientes
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={preventiveVsCorrective}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#6b7280" />
                                            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                            <Legend />
                                            <Bar dataKey="preventivo" name="Preventivo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="correctivo" name="Correctivo" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Compliance Pie Chart */}
                        <Card className="card-hover">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-primary" />
                                    Cumplimiento de Preventivos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {!compliance || compliance.pie_data.every(d => d.value === 0) ? (
                                    <div className="flex items-center justify-center h-64 text-muted-foreground">
                                        No hay datos suficientes
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie data={compliance.pie_data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                {compliance.pie_data.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Failure Causes */}
                    <Card className="card-hover">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-purple-500" />
                                Causas de Fallo más Frecuentes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {failureCauses.length === 0 ? (
                                <div className="flex items-center justify-center h-64 text-muted-foreground">
                                    No hay datos de causas de fallo
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={failureCauses} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                                        <YAxis dataKey="causa" type="category" tick={{ fontSize: 11 }} stroke="#6b7280" width={150} />
                                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                        <Bar dataKey="cantidad" name="Cantidad" fill="#8b5cf6" radius={[0, 4, 4, 0]}>
                                            {failureCauses.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recurring Correctives by Machine */}
                    {recurringCorrectives && (
                        <>
                            {/* Summary Cards for Recurring */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="card-hover border-l-4 border-l-orange-500">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Máquinas Analizadas</p>
                                                <p className="text-3xl font-bold">{recurringCorrectives.summary.total_machines_analyzed}</p>
                                            </div>
                                            <Cog className="w-10 h-10 text-gray-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="card-hover border-l-4 border-l-red-500">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Máquinas con Averías Repetidas</p>
                                                <p className="text-3xl font-bold text-red-600">{recurringCorrectives.summary.machines_with_recurring_issues}</p>
                                            </div>
                                            <Repeat className="w-10 h-10 text-red-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="card-hover border-l-4 border-l-amber-500">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Averías Recurrentes</p>
                                                <p className="text-3xl font-bold text-amber-600">{recurringCorrectives.summary.total_recurring_issues}</p>
                                            </div>
                                            <AlertTriangle className="w-10 h-10 text-amber-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Top Recurring Issues Chart */}
                            <Card className="card-hover">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Repeat className="w-5 h-5 text-red-500" />
                                        Correctivos más Repetidos (Top 10)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {recurringCorrectives.top_recurring_issues.length === 0 ? (
                                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                                            No hay averías recurrentes detectadas
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <BarChart data={recurringCorrectives.top_recurring_issues} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                <YAxis 
                                                    dataKey="machine_name" 
                                                    type="category" 
                                                    tick={{ fontSize: 11 }} 
                                                    stroke="#6b7280" 
                                                    width={120} 
                                                />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                    formatter={(value, name, props) => [value, 'Repeticiones']}
                                                    labelFormatter={(label) => `Máquina: ${label}`}
                                                    content={({ active, payload }) => {
                                                        if (active && payload && payload.length) {
                                                            const data = payload[0].payload;
                                                            return (
                                                                <div className="bg-white p-3 border rounded-lg shadow-lg max-w-xs">
                                                                    <p className="font-semibold text-sm">{data.machine_name}</p>
                                                                    <p className="text-xs text-muted-foreground mb-2">{data.department_name}</p>
                                                                    <p className="text-sm mb-1"><strong>Repeticiones:</strong> {data.count}</p>
                                                                    <p className="text-xs text-gray-600 line-clamp-3">{data.description}</p>
                                                                </div>
                                                            );
                                                        }
                                                        return null;
                                                    }}
                                                />
                                                <Bar dataKey="count" name="Repeticiones" fill="#ef4444" radius={[0, 4, 4, 0]}>
                                                    {recurringCorrectives.top_recurring_issues.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Detailed List by Machine */}
                            <Card className="card-hover">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Cog className="w-5 h-5 text-orange-500" />
                                        Detalle por Máquina - Averías Recurrentes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {recurringCorrectives.machines_with_recurring.length === 0 ? (
                                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                                            No hay máquinas con averías recurrentes
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[500px] overflow-y-auto">
                                            {recurringCorrectives.machines_with_recurring.map((machine, idx) => (
                                                <div key={machine.machine_id} className="border rounded-lg p-4 bg-muted/30">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <Cog className="w-5 h-5 text-orange-500" />
                                                            <div>
                                                                <h4 className="font-semibold">{machine.machine_name}</h4>
                                                                <p className="text-xs text-muted-foreground">{machine.department_name}</p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="destructive">
                                                            {machine.total_recurring} averías recurrentes
                                                        </Badge>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {machine.recurring_issues.map((issue, i) => (
                                                            <div 
                                                                key={i} 
                                                                className="flex items-start justify-between p-2 bg-background rounded border-l-4 border-l-red-400"
                                                            >
                                                                <div className="flex-1 min-w-0 mr-4">
                                                                    <p className="text-sm font-medium truncate">{issue.title || 'Sin título'}</p>
                                                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                                                        {issue.description || 'Sin descripción'}
                                                                    </p>
                                                                    {issue.failure_cause && (
                                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                                            {issue.failure_cause}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-700 font-bold text-sm">
                                                                        {issue.count}
                                                                    </span>
                                                                    <p className="text-xs text-muted-foreground mt-1">veces</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* TAB: PARADAS */}
                <TabsContent value="stops" className="space-y-6">
                    {stopsAnalytics && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="card-hover">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Paradas</p>
                                                <p className="text-3xl font-bold">{stopsAnalytics.total}</p>
                                            </div>
                                            <OctagonX className="w-10 h-10 text-red-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="card-hover">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Tiempo Total Parado</p>
                                                <p className="text-3xl font-bold text-amber-600">{stopsAnalytics.total_duration_hours}h</p>
                                            </div>
                                            <Clock className="w-10 h-10 text-amber-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="card-hover">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Tipo más Frecuente</p>
                                                <p className="text-xl font-bold text-purple-600">
                                                    {stopsAnalytics.by_type[0]?.tipo || '-'}
                                                </p>
                                            </div>
                                            <AlertTriangle className="w-10 h-10 text-purple-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Paradas por tipo */}
                                <Card className="card-hover">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-red-500" />
                                            Paradas por Tipo
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {stopsAnalytics.by_type.length === 0 ? (
                                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                                No hay datos
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={stopsAnalytics.by_type}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="tipo" tick={{ fontSize: 10 }} stroke="#6b7280" />
                                                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                                    <Bar dataKey="cantidad" name="Cantidad" fill="#ef4444" radius={[4, 4, 0, 0]}>
                                                        {stopsAnalytics.by_type.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Duración por tipo */}
                                <Card className="card-hover">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-amber-500" />
                                            Duración por Tipo (horas)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {stopsAnalytics.by_duration.length === 0 ? (
                                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                                No hay datos
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={stopsAnalytics.by_duration} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                    <YAxis dataKey="tipo" type="category" tick={{ fontSize: 11 }} stroke="#6b7280" width={120} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                                    <Bar dataKey="horas" name="Horas" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Paradas por día */}
                            <Card className="card-hover">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-blue-500" />
                                        Paradas por Día de la Semana
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={250}>
                                        <BarChart data={stopsAnalytics.by_day}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="dia" tick={{ fontSize: 12 }} stroke="#6b7280" />
                                            <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                                            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                            <Bar dataKey="cantidad" name="Paradas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>

                {/* TAB: ARRANQUE DE LÍNEAS */}
                <TabsContent value="line-starts" className="space-y-6">
                    {lineStartsAnalytics && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="card-hover">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Cumplimiento</p>
                                                <p className="text-3xl font-bold text-emerald-600">{lineStartsAnalytics.summary.compliance_rate}%</p>
                                            </div>
                                            <CheckCircle2 className="w-10 h-10 text-emerald-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="card-hover">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Total Registros</p>
                                                <p className="text-3xl font-bold">{lineStartsAnalytics.summary.total}</p>
                                            </div>
                                            <Play className="w-10 h-10 text-blue-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="card-hover">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">A Tiempo</p>
                                                <p className="text-3xl font-bold text-green-600">{lineStartsAnalytics.summary.on_time}</p>
                                            </div>
                                            <CheckCircle2 className="w-10 h-10 text-green-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="card-hover">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm text-muted-foreground">Con Retraso</p>
                                                <p className="text-3xl font-bold text-red-600">{lineStartsAnalytics.summary.late}</p>
                                            </div>
                                            <Clock className="w-10 h-10 text-red-500/20" />
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Cumplimiento pie */}
                                <Card className="card-hover">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <PieChartIcon className="w-5 h-5 text-primary" />
                                            Cumplimiento de Arranque
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {lineStartsAnalytics.pie_data.every(d => d.value === 0) ? (
                                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                                No hay datos
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie data={lineStartsAnalytics.pie_data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                                                        {lineStartsAnalytics.pie_data.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Cumplimiento por línea */}
                                <Card className="card-hover">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-blue-500" />
                                            Cumplimiento por Línea (%)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {lineStartsAnalytics.by_line.length === 0 ? (
                                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                                No hay datos
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={lineStartsAnalytics.by_line} layout="vertical">
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                    <YAxis dataKey="linea" type="category" tick={{ fontSize: 11 }} stroke="#6b7280" width={120} />
                                                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                                    <Bar dataKey="cumplimiento" name="Cumplimiento %" fill="#22c55e" radius={[0, 4, 4, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Motivos de retraso */}
                            {lineStartsAnalytics.by_reason.length > 0 && (
                                <Card className="card-hover">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                                            Motivos de Retraso más Frecuentes
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ResponsiveContainer width="100%" height={250}>
                                            <BarChart data={lineStartsAnalytics.by_reason}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis dataKey="motivo" tick={{ fontSize: 10 }} stroke="#6b7280" />
                                                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                                <Bar dataKey="cantidad" name="Cantidad" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
