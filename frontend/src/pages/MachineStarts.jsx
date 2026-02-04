import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Plus,
    Play,
    Search,
    Clock,
    Target,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Edit,
    Trash2,
    Loader2,
    TrendingUp,
    BarChart3
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const COLORS = ['#10b981', '#ef4444', '#6b7280'];

export default function MachineStarts() {
    const { hasRole } = useAuth();
    const [starts, setStarts] = useState([]);
    const [machines, setMachines] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStart, setEditingStart] = useState(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('list');
    const [form, setForm] = useState({
        machine_id: '',
        department_id: '',
        target_time: '',
        actual_time: '',
        delay_reason: '',
        date: new Date().toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [startsRes, machinesRes, deptsRes, statsRes] = await Promise.all([
                axios.get(`${API}/machine-starts`),
                axios.get(`${API}/machines`),
                axios.get(`${API}/departments`),
                axios.get(`${API}/machine-starts/compliance-stats`)
            ]);
            setStarts(startsRes.data);
            setMachines(machinesRes.data);
            setDepartments(deptsRes.data);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            machine_id: '',
            department_id: '',
            target_time: '',
            actual_time: '',
            delay_reason: '',
            date: new Date().toISOString().split('T')[0]
        });
        setEditingStart(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEditDialog = (start) => {
        setEditingStart(start);
        setForm({
            machine_id: start.machine_id,
            department_id: start.department_id,
            target_time: start.target_time || '',
            actual_time: start.actual_time || '',
            delay_reason: start.delay_reason || '',
            date: start.date || new Date().toISOString().split('T')[0]
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.machine_id || !form.department_id || !form.target_time || !form.date) {
            toast.error('Completa todos los campos requeridos');
            return;
        }

        setSaving(true);
        try {
            if (editingStart) {
                await axios.put(`${API}/machine-starts/${editingStart.id}`, form);
                toast.success('Arranque actualizado');
            } else {
                await axios.post(`${API}/machine-starts`, form);
                toast.success('Arranque registrado');
            }
            setDialogOpen(false);
            resetForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar este arranque?')) return;
        try {
            await axios.delete(`${API}/machine-starts/${id}`);
            toast.success('Arranque eliminado');
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleMachineChange = (machineId) => {
        const machine = machines.find(m => m.id === machineId);
        setForm({
            ...form,
            machine_id: machineId,
            department_id: machine?.department_id || ''
        });
    };

    const filteredStarts = starts.filter(s => {
        const matchesSearch = s.machine_name?.toLowerCase().includes(search.toLowerCase());
        const matchesDept = deptFilter === 'all' || s.department_id === deptFilter;
        return matchesSearch && matchesDept;
    });

    // Prepare chart data
    const pieData = stats ? [
        { name: 'A tiempo', value: stats.summary.on_time, color: '#10b981' },
        { name: 'Con retraso', value: stats.summary.delayed, color: '#ef4444' },
        { name: 'Pendientes', value: stats.summary.pending, color: '#6b7280' }
    ].filter(d => d.value > 0) : [];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="machine-starts-page">
            <PageHeader
                title="Arranque de Máquinas"
                description="Control de hora objetivo vs hora real de arranque"
            >
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog} data-testid="new-start-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            Registrar Arranque
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Play className="w-5 h-5 text-green-500" />
                                {editingStart ? 'Editar Arranque' : 'Nuevo Arranque'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="form-group">
                                <Label>Fecha *</Label>
                                <Input
                                    type="date"
                                    value={form.date}
                                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                                    data-testid="start-date"
                                />
                            </div>

                            <div className="form-group">
                                <Label>Máquina *</Label>
                                <Select
                                    value={form.machine_id}
                                    onValueChange={handleMachineChange}
                                >
                                    <SelectTrigger data-testid="start-machine">
                                        <SelectValue placeholder="Selecciona la máquina" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {machines.map(m => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.name} - {m.department_name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="form-group">
                                <Label>Sección/Departamento *</Label>
                                <Select
                                    value={form.department_id}
                                    onValueChange={(v) => setForm({ ...form, department_id: v })}
                                >
                                    <SelectTrigger data-testid="start-dept">
                                        <SelectValue placeholder="Selecciona la sección" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {departments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <Label>Hora Objetivo *</Label>
                                    <Input
                                        type="time"
                                        value={form.target_time}
                                        onChange={(e) => setForm({ ...form, target_time: e.target.value })}
                                        data-testid="start-target"
                                    />
                                </div>
                                <div className="form-group">
                                    <Label>Hora Real</Label>
                                    <Input
                                        type="time"
                                        value={form.actual_time}
                                        onChange={(e) => setForm({ ...form, actual_time: e.target.value })}
                                        data-testid="start-actual"
                                    />
                                </div>
                            </div>

                            {form.actual_time && form.target_time && form.actual_time > form.target_time && (
                                <div className="form-group">
                                    <Label className="text-amber-600">Razón del Retraso</Label>
                                    <Textarea
                                        value={form.delay_reason}
                                        onChange={(e) => setForm({ ...form, delay_reason: e.target.value })}
                                        placeholder="Explica el motivo del retraso en el arranque..."
                                        rows={3}
                                        className="border-amber-300"
                                        data-testid="start-delay-reason"
                                    />
                                </div>
                            )}

                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingStart ? 'Actualizar' : 'Registrar Arranque')}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            {/* Summary Cards */}
            {stats && (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <Card className="border-l-4 border-l-gray-500">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Registros</p>
                                    <p className="text-2xl font-bold">{stats.summary.total}</p>
                                </div>
                                <Play className="w-8 h-8 text-gray-500/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-green-500">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">A Tiempo</p>
                                    <p className="text-2xl font-bold text-green-600">{stats.summary.on_time}</p>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-green-500/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Con Retraso</p>
                                    <p className="text-2xl font-bold text-red-600">{stats.summary.delayed}</p>
                                </div>
                                <XCircle className="w-8 h-8 text-red-500/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-amber-500">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Pendientes</p>
                                    <p className="text-2xl font-bold text-amber-600">{stats.summary.pending}</p>
                                </div>
                                <Clock className="w-8 h-8 text-amber-500/30" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">% Cumplimiento</p>
                                    <p className={`text-2xl font-bold ${stats.summary.compliance_rate >= 80 ? 'text-green-600' : stats.summary.compliance_rate >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                        {stats.summary.compliance_rate}%
                                    </p>
                                </div>
                                <Target className="w-8 h-8 text-primary/30" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="list" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Registros
                    </TabsTrigger>
                    <TabsTrigger value="charts" className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Gráficas de Cumplimiento
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-6 space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por máquina..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={deptFilter} onValueChange={setDeptFilter}>
                                    <SelectTrigger className="w-full md:w-48">
                                        <SelectValue placeholder="Sección" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas las secciones</SelectItem>
                                        {departments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Starts List */}
                    {filteredStarts.length === 0 ? (
                        <Card>
                            <CardContent className="py-12">
                                <div className="empty-state">
                                    <Play className="empty-state-icon" />
                                    <p className="text-muted-foreground">No hay arranques registrados</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Máquina</th>
                                                <th>Sección</th>
                                                <th>Hora Objetivo</th>
                                                <th>Hora Real</th>
                                                <th>Estado</th>
                                                <th>Retraso</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredStarts.map((start) => (
                                                <tr key={start.id}>
                                                    <td className="mono">{formatDate(start.date)}</td>
                                                    <td className="font-medium">{start.machine_name}</td>
                                                    <td>{start.department_name}</td>
                                                    <td className="mono">
                                                        <div className="flex items-center gap-1">
                                                            <Target className="w-3 h-3 text-muted-foreground" />
                                                            {start.target_time}
                                                        </div>
                                                    </td>
                                                    <td className="mono">
                                                        {start.actual_time ? (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                                {start.actual_time}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">-</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {start.actual_time ? (
                                                            start.on_time ? (
                                                                <Badge className="bg-green-500/15 text-green-700">
                                                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                    A tiempo
                                                                </Badge>
                                                            ) : (
                                                                <Badge className="bg-red-500/15 text-red-700">
                                                                    <XCircle className="w-3 h-3 mr-1" />
                                                                    Retrasado
                                                                </Badge>
                                                            )
                                                        ) : (
                                                            <Badge className="bg-amber-500/15 text-amber-700">
                                                                <Clock className="w-3 h-3 mr-1" />
                                                                Pendiente
                                                            </Badge>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {start.delay_minutes > 0 ? (
                                                            <span className="text-red-600 font-medium">
                                                                +{start.delay_minutes} min
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openEditDialog(start)}
                                                            >
                                                                <Edit className="w-4 h-4" />
                                                            </Button>
                                                            {hasRole(['admin', 'supervisor']) && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(start.id)}
                                                                    className="text-destructive hover:text-destructive"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="charts" className="mt-6 space-y-6">
                    {stats && (
                        <>
                            {/* Pie Chart - Compliance Overview */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Target className="w-5 h-5 text-primary" />
                                            Distribución de Cumplimiento
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {pieData.length === 0 ? (
                                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                                No hay datos suficientes
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ name, value }) => `${name}: ${value}`}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* By Department */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="w-5 h-5 text-blue-500" />
                                            Cumplimiento por Sección
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {stats.by_department.length === 0 ? (
                                            <div className="flex items-center justify-center h-64 text-muted-foreground">
                                                No hay datos por sección
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={300}>
                                                <BarChart data={stats.by_department}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                    <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="#6b7280" />
                                                    <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                    <Tooltip />
                                                    <Legend />
                                                    <Bar dataKey="on_time" name="A tiempo" fill="#10b981" stackId="a" />
                                                    <Bar dataKey="delayed" name="Con retraso" fill="#ef4444" stackId="a" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Daily Compliance Line Chart */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-500" />
                                        Hora Objetivo vs Hora Real (Últimos 30 días)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {stats.daily_chart.length === 0 ? (
                                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                                            No hay datos diarios
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={350}>
                                            <LineChart data={stats.daily_chart}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis 
                                                    dataKey="date" 
                                                    tick={{ fontSize: 11 }} 
                                                    stroke="#6b7280"
                                                    tickFormatter={(val) => val.slice(5)}
                                                />
                                                <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                <Tooltip 
                                                    labelFormatter={(label) => `Fecha: ${label}`}
                                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                                />
                                                <Legend />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="on_time" 
                                                    name="A tiempo" 
                                                    stroke="#10b981" 
                                                    strokeWidth={2}
                                                    dot={{ fill: '#10b981' }}
                                                />
                                                <Line 
                                                    type="monotone" 
                                                    dataKey="delayed" 
                                                    name="Con retraso" 
                                                    stroke="#ef4444" 
                                                    strokeWidth={2}
                                                    dot={{ fill: '#ef4444' }}
                                                />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* By Machine */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        Rendimiento por Máquina
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {stats.by_machine.length === 0 ? (
                                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                                            No hay datos por máquina
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={stats.by_machine} layout="vertical">
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
                                                <YAxis dataKey="machine" type="category" tick={{ fontSize: 11 }} stroke="#6b7280" width={120} />
                                                <Tooltip />
                                                <Legend />
                                                <Bar dataKey="on_time" name="A tiempo" fill="#10b981" />
                                                <Bar dataKey="delayed" name="Con retraso" fill="#ef4444" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
