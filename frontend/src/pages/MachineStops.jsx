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
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime } from '../lib/utils';
import {
    Plus,
    OctagonX,
    Search,
    AlertTriangle,
    Factory,
    ShieldAlert,
    Clock,
    Edit,
    Trash2,
    Loader2,
    CheckCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function MachineStops() {
    const { hasRole } = useAuth();
    const [stops, setStops] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStop, setEditingStop] = useState(null);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [form, setForm] = useState({
        machine_id: '',
        stop_type: '',
        reason: '',
        start_time: '',
        end_time: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [stopsRes, machinesRes] = await Promise.all([
                axios.get(`${API}/machine-stops`),
                axios.get(`${API}/machines`)
            ]);
            setStops(stopsRes.data);
            setMachines(machinesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            machine_id: '',
            stop_type: '',
            reason: '',
            start_time: new Date().toISOString().slice(0, 16),
            end_time: ''
        });
        setEditingStop(null);
    };

    const openCreateDialog = () => {
        resetForm();
        setForm(prev => ({
            ...prev,
            start_time: new Date().toISOString().slice(0, 16)
        }));
        setDialogOpen(true);
    };

    const openEditDialog = (stop) => {
        setEditingStop(stop);
        setForm({
            machine_id: stop.machine_id,
            stop_type: stop.stop_type,
            reason: stop.reason,
            start_time: stop.start_time?.slice(0, 16) || '',
            end_time: stop.end_time?.slice(0, 16) || ''
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.machine_id || !form.stop_type || !form.reason) {
            toast.error('Completa todos los campos requeridos');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                ...form,
                start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
                end_time: form.end_time ? new Date(form.end_time).toISOString() : null
            };

            if (editingStop) {
                await axios.put(`${API}/machine-stops/${editingStop.id}`, payload);
                toast.success('Parada actualizada');
            } else {
                await axios.post(`${API}/machine-stops`, payload);
                toast.success('Parada registrada');
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
        if (!window.confirm('¿Eliminar esta parada?')) return;
        try {
            await axios.delete(`${API}/machine-stops/${id}`);
            toast.success('Parada eliminada');
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const handleEndStop = async (stop) => {
        try {
            await axios.put(`${API}/machine-stops/${stop.id}`, {
                ...stop,
                end_time: new Date().toISOString()
            });
            toast.success('Parada finalizada');
            fetchData();
        } catch (error) {
            toast.error('Error al finalizar parada');
        }
    };

    const filteredStops = stops.filter(s => {
        const matchesSearch = s.machine_name?.toLowerCase().includes(search.toLowerCase()) ||
            s.reason?.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || s.stop_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const stopTypeConfig = {
        averia: { label: 'Avería', icon: AlertTriangle, class: 'bg-red-500/15 text-red-700', color: 'text-red-500' },
        produccion: { label: 'Producción', icon: Factory, class: 'bg-blue-500/15 text-blue-700', color: 'text-blue-500' },
        calidad: { label: 'Calidad', icon: ShieldAlert, class: 'bg-amber-500/15 text-amber-700', color: 'text-amber-500' }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="machine-stops-page">
            <PageHeader
                title="Paradas de Máquinas"
                description="Registro de paradas por avería, producción o calidad"
            >
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={openCreateDialog} data-testid="new-stop-btn">
                            <Plus className="w-4 h-4 mr-2" />
                            Registrar Parada
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <OctagonX className="w-5 h-5 text-red-500" />
                                {editingStop ? 'Editar Parada' : 'Nueva Parada'}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="form-group">
                                <Label>Máquina *</Label>
                                <Select
                                    value={form.machine_id}
                                    onValueChange={(v) => setForm({ ...form, machine_id: v })}
                                >
                                    <SelectTrigger data-testid="stop-machine">
                                        <SelectValue placeholder="Selecciona la máquina parada" />
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
                                <Label>Causa de la Parada *</Label>
                                <Select
                                    value={form.stop_type}
                                    onValueChange={(v) => setForm({ ...form, stop_type: v })}
                                >
                                    <SelectTrigger data-testid="stop-type">
                                        <SelectValue placeholder="Selecciona el tipo de parada" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="averia">
                                            <div className="flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 text-red-500" />
                                                Parada por Avería
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="produccion">
                                            <div className="flex items-center gap-2">
                                                <Factory className="w-4 h-4 text-blue-500" />
                                                Parada por Producción
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="calidad">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                                Parada por Calidad
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="form-group">
                                <Label>Motivo de la Parada *</Label>
                                <Textarea
                                    value={form.reason}
                                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                                    placeholder="Explica detalladamente el motivo de la parada..."
                                    rows={4}
                                    data-testid="stop-reason"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <Label>Hora de Inicio *</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.start_time}
                                        onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                                        data-testid="stop-start"
                                    />
                                </div>
                                <div className="form-group">
                                    <Label>Hora de Fin</Label>
                                    <Input
                                        type="datetime-local"
                                        value={form.end_time}
                                        onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                                        data-testid="stop-end"
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingStop ? 'Actualizar' : 'Registrar Parada')}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por máquina o motivo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Tipo de parada" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas las causas</SelectItem>
                                <SelectItem value="averia">Por Avería</SelectItem>
                                <SelectItem value="produccion">Por Producción</SelectItem>
                                <SelectItem value="calidad">Por Calidad</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-gray-500">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Paradas</p>
                                <p className="text-2xl font-bold">{stops.length}</p>
                            </div>
                            <OctagonX className="w-8 h-8 text-gray-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Por Avería</p>
                                <p className="text-2xl font-bold text-red-600">
                                    {stops.filter(s => s.stop_type === 'averia').length}
                                </p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-blue-500">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Por Producción</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {stops.filter(s => s.stop_type === 'produccion').length}
                                </p>
                            </div>
                            <Factory className="w-8 h-8 text-blue-500/30" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-amber-500">
                    <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Por Calidad</p>
                                <p className="text-2xl font-bold text-amber-600">
                                    {stops.filter(s => s.stop_type === 'calidad').length}
                                </p>
                            </div>
                            <ShieldAlert className="w-8 h-8 text-amber-500/30" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Stops List */}
            {filteredStops.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="empty-state">
                            <OctagonX className="empty-state-icon" />
                            <p className="text-muted-foreground">No hay paradas registradas</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {filteredStops.map((stop) => {
                        const config = stopTypeConfig[stop.stop_type] || stopTypeConfig.averia;
                        const Icon = config.icon;
                        const isActive = !stop.end_time;

                        return (
                            <Card key={stop.id} className={`card-hover ${isActive ? 'border-red-500 bg-red-50/50' : ''}`}>
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-3 rounded-lg ${config.class}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold">{stop.machine_name}</h3>
                                                    {isActive && (
                                                        <Badge variant="destructive" className="animate-pulse">
                                                            EN CURSO
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground">{stop.department_name}</p>
                                                <Badge className={`mt-2 ${config.class}`}>
                                                    {config.label}
                                                </Badge>
                                                <p className="mt-3 text-sm">{stop.reason}</p>
                                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        Inicio: {formatDateTime(stop.start_time)}
                                                    </span>
                                                    {stop.end_time && (
                                                        <span>Fin: {formatDateTime(stop.end_time)}</span>
                                                    )}
                                                    {stop.duration_minutes && (
                                                        <span className="font-medium">
                                                            Duración: {stop.duration_minutes} min
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {isActive && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEndStop(stop)}
                                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                                >
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Finalizar
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEditDialog(stop)}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            {hasRole(['admin', 'supervisor']) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(stop.id)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
