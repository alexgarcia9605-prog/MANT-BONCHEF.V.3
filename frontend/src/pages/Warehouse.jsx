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
    Plus,
    Search,
    Package,
    Edit,
    Trash2,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    Clock,
    MapPin,
    Cog,
    Hash,
    BoxesIcon,
    ShoppingCart,
    Send,
    X,
    Check
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Warehouse() {
    const { hasRole, user } = useAuth();
    const [parts, setParts] = useState([]);
    const [requests, setRequests] = useState([]);
    const [machines, setMachines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [requestDialogOpen, setRequestDialogOpen] = useState(false);
    const [editingPart, setEditingPart] = useState(null);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('inventory');
    const [selectedPartForRequest, setSelectedPartForRequest] = useState(null);
    
    const [form, setForm] = useState({
        name: '',
        internal_reference: '',
        external_reference: '',
        description: '',
        location: '',
        machine_id: '',
        stock_current: 0,
        stock_min: 0,
        stock_max: 100,
        unit: 'unidad',
        supplier: '',
        price: 0
    });

    const [requestForm, setRequestForm] = useState({
        spare_part_id: '',
        quantity: 1,
        reason: '',
        urgency: 'normal'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [partsRes, requestsRes, machinesRes] = await Promise.all([
                axios.get(`${API}/spare-parts`),
                axios.get(`${API}/spare-part-requests`),
                axios.get(`${API}/machines`)
            ]);
            setParts(partsRes.data);
            setRequests(requestsRes.data);
            setMachines(machinesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            internal_reference: '',
            external_reference: '',
            description: '',
            location: '',
            machine_id: '',
            stock_current: 0,
            stock_min: 0,
            stock_max: 100,
            unit: 'unidad',
            supplier: '',
            price: 0
        });
        setEditingPart(null);
    };

    const openEditDialog = (part) => {
        setEditingPart(part);
        setForm({
            name: part.name,
            internal_reference: part.internal_reference,
            external_reference: part.external_reference || '',
            description: part.description || '',
            location: part.location || '',
            machine_id: part.machine_id || '',
            stock_current: part.stock_current,
            stock_min: part.stock_min,
            stock_max: part.stock_max,
            unit: part.unit || 'unidad',
            supplier: part.supplier || '',
            price: part.price || 0
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.internal_reference) {
            toast.error('Nombre y referencia interna son obligatorios');
            return;
        }

        setSaving(true);
        try {
            if (editingPart) {
                await axios.put(`${API}/spare-parts/${editingPart.id}`, form);
                toast.success('Repuesto actualizado');
            } else {
                await axios.post(`${API}/spare-parts`, form);
                toast.success('Repuesto creado');
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
        if (!window.confirm('¿Eliminar este repuesto?')) return;
        try {
            await axios.delete(`${API}/spare-parts/${id}`);
            toast.success('Repuesto eliminado');
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar');
        }
    };

    const openRequestDialog = (part) => {
        setSelectedPartForRequest(part);
        setRequestForm({
            spare_part_id: part.id,
            quantity: 1,
            reason: '',
            urgency: 'normal'
        });
        setRequestDialogOpen(true);
    };

    const handleRequestSubmit = async (e) => {
        e.preventDefault();
        if (!requestForm.reason) {
            toast.error('Indica el motivo de la solicitud');
            return;
        }

        setSaving(true);
        try {
            await axios.post(`${API}/spare-part-requests`, requestForm);
            toast.success('Solicitud enviada');
            setRequestDialogOpen(false);
            setSelectedPartForRequest(null);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al enviar solicitud');
        } finally {
            setSaving(false);
        }
    };

    const handleResolveRequest = async (requestId, status) => {
        try {
            await axios.put(`${API}/spare-part-requests/${requestId}/resolve?status=${status}`);
            toast.success(`Solicitud ${status}`);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al resolver solicitud');
        }
    };

    const filteredParts = parts.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.internal_reference.toLowerCase().includes(search.toLowerCase()) ||
            p.external_reference?.toLowerCase().includes(search.toLowerCase()) ||
            p.location?.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const lowStockCount = parts.filter(p => p.status === 'bajo').length;
    const pendingRequestsCount = requests.filter(r => r.status === 'pendiente').length;

    const getStatusBadge = (status) => {
        switch (status) {
            case 'bajo':
                return <Badge className="bg-red-500/15 text-red-700 border-red-500/30"><AlertTriangle className="w-3 h-3 mr-1" />Stock Bajo</Badge>;
            case 'alto':
                return <Badge className="bg-green-500/15 text-green-700 border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Stock Alto</Badge>;
            default:
                return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30">Normal</Badge>;
        }
    };

    const getUrgencyBadge = (urgency) => {
        const colors = {
            baja: 'bg-gray-500/15 text-gray-700',
            normal: 'bg-blue-500/15 text-blue-700',
            alta: 'bg-orange-500/15 text-orange-700',
            urgente: 'bg-red-500/15 text-red-700'
        };
        return <Badge className={colors[urgency]}>{urgency}</Badge>;
    };

    const getRequestStatusBadge = (status) => {
        const colors = {
            pendiente: 'bg-yellow-500/15 text-yellow-700',
            aprobada: 'bg-blue-500/15 text-blue-700',
            rechazada: 'bg-red-500/15 text-red-700',
            entregada: 'bg-green-500/15 text-green-700'
        };
        return <Badge className={colors[status]}>{status}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="warehouse-page">
            <PageHeader
                title="Almacén de Repuestos"
                description="Gestión de inventario y solicitudes de repuestos"
            >
                {hasRole(['admin']) && (
                    <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button data-testid="new-part-btn">
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Repuesto
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Package className="w-5 h-5 text-primary" />
                                    {editingPart ? 'Editar Repuesto' : 'Nuevo Repuesto'}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group col-span-2">
                                        <Label>Nombre del Repuesto *</Label>
                                        <Input
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="Ej: Rodamiento 6205"
                                            data-testid="part-name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label className="flex items-center gap-1">
                                            <Hash className="w-3 h-3" />
                                            Referencia Interna *
                                        </Label>
                                        <Input
                                            value={form.internal_reference}
                                            onChange={(e) => setForm({ ...form, internal_reference: e.target.value })}
                                            placeholder="Ej: REP-001"
                                            data-testid="part-internal-ref"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label>Referencia Proveedor</Label>
                                        <Input
                                            value={form.external_reference}
                                            onChange={(e) => setForm({ ...form, external_reference: e.target.value })}
                                            placeholder="Ej: SKF-6205-2RS"
                                            data-testid="part-external-ref"
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <Label>Descripción</Label>
                                    <Textarea
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Descripción del repuesto..."
                                        rows={2}
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="form-group">
                                        <Label className="flex items-center gap-1">
                                            <BoxesIcon className="w-3 h-3" />
                                            Stock Actual
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={form.stock_current}
                                            onChange={(e) => setForm({ ...form, stock_current: parseInt(e.target.value) || 0 })}
                                            data-testid="part-stock"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label className="text-red-600">Stock Mínimo</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={form.stock_min}
                                            onChange={(e) => setForm({ ...form, stock_min: parseInt(e.target.value) || 0 })}
                                            className="border-red-200"
                                            data-testid="part-stock-min"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label className="text-green-600">Stock Máximo</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            value={form.stock_max}
                                            onChange={(e) => setForm({ ...form, stock_max: parseInt(e.target.value) || 0 })}
                                            className="border-green-200"
                                            data-testid="part-stock-max"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            Ubicación en Almacén
                                        </Label>
                                        <Input
                                            value={form.location}
                                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                                            placeholder="Ej: Estante A3, Cajón 5"
                                            data-testid="part-location"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label className="flex items-center gap-1">
                                            <Cog className="w-3 h-3" />
                                            Máquina Asociada
                                        </Label>
                                        <Select
                                            value={form.machine_id || "none"}
                                            onValueChange={(v) => setForm({ ...form, machine_id: v === "none" ? "" : v })}
                                        >
                                            <SelectTrigger data-testid="part-machine">
                                                <SelectValue placeholder="Seleccionar máquina" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin asignar</SelectItem>
                                                {machines.map(m => (
                                                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="form-group">
                                        <Label>Unidad</Label>
                                        <Select
                                            value={form.unit}
                                            onValueChange={(v) => setForm({ ...form, unit: v })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="unidad">Unidad</SelectItem>
                                                <SelectItem value="kg">Kilogramos</SelectItem>
                                                <SelectItem value="litros">Litros</SelectItem>
                                                <SelectItem value="metros">Metros</SelectItem>
                                                <SelectItem value="cajas">Cajas</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="form-group">
                                        <Label>Proveedor</Label>
                                        <Input
                                            value={form.supplier}
                                            onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                                            placeholder="Nombre proveedor"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label>Precio (€)</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.price}
                                            onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={saving}>
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingPart ? 'Actualizar' : 'Crear Repuesto')}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </PageHeader>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="metric-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Repuestos</p>
                                <p className="text-2xl font-bold">{parts.length}</p>
                            </div>
                            <Package className="w-8 h-8 text-primary/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="metric-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Bajo</p>
                                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
                            </div>
                            <AlertTriangle className="w-8 h-8 text-red-500/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="metric-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Solicitudes Pendientes</p>
                                <p className="text-2xl font-bold text-yellow-600">{pendingRequestsCount}</p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500/50" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="metric-card">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Stock Normal</p>
                                <p className="text-2xl font-bold text-green-600">{parts.filter(p => p.status === 'normal').length}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-green-500/50" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="inventory" className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Inventario
                    </TabsTrigger>
                    <TabsTrigger value="requests" className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4" />
                        Solicitudes
                        {pendingRequestsCount > 0 && (
                            <Badge className="ml-1 bg-yellow-500 text-white">{pendingRequestsCount}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="inventory" className="mt-4">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar por nombre, referencia o ubicación..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-full md:w-48">
                                        <SelectValue placeholder="Estado" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="bajo">Stock Bajo</SelectItem>
                                        <SelectItem value="normal">Normal</SelectItem>
                                        <SelectItem value="alto">Stock Alto</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {filteredParts.length === 0 ? (
                                <div className="empty-state py-12">
                                    <Package className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground">No hay repuestos</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Repuesto</th>
                                                <th>Ref. Interna</th>
                                                <th>Ref. Proveedor</th>
                                                <th>Ubicación</th>
                                                <th>Máquina</th>
                                                <th>Stock</th>
                                                <th>Estado</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredParts.map((part) => (
                                                <tr key={part.id} className={part.status === 'bajo' ? 'bg-red-50/50' : part.status === 'alto' ? 'bg-green-50/50' : ''}>
                                                    <td className="font-medium">{part.name}</td>
                                                    <td className="mono text-xs">{part.internal_reference}</td>
                                                    <td className="mono text-xs text-muted-foreground">{part.external_reference || '-'}</td>
                                                    <td>
                                                        {part.location ? (
                                                            <span className="flex items-center gap-1 text-sm">
                                                                <MapPin className="w-3 h-3" />
                                                                {part.location}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="text-sm">{part.machine_name || '-'}</td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-bold ${part.status === 'bajo' ? 'text-red-600' : part.status === 'alto' ? 'text-green-600' : ''}`}>
                                                                {part.stock_current}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                ({part.stock_min}-{part.stock_max})
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>{getStatusBadge(part.status)}</td>
                                                    <td>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => openRequestDialog(part)}
                                                                title="Solicitar"
                                                                data-testid={`request-${part.id}`}
                                                            >
                                                                <ShoppingCart className="w-4 h-4 text-primary" />
                                                            </Button>
                                                            {hasRole(['admin']) && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => openEditDialog(part)}
                                                                        title="Editar"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => handleDelete(part.id)}
                                                                        className="text-destructive hover:text-destructive"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="requests" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            {requests.length === 0 ? (
                                <div className="empty-state py-12">
                                    <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                                    <p className="text-muted-foreground">No hay solicitudes</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Fecha</th>
                                                <th>Repuesto</th>
                                                <th>Referencia</th>
                                                <th>Cantidad</th>
                                                <th>Urgencia</th>
                                                <th>Solicitante</th>
                                                <th>Estado</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requests.map((req) => (
                                                <tr key={req.id}>
                                                    <td className="mono text-sm">{formatDate(req.requested_at)}</td>
                                                    <td className="font-medium">{req.spare_part_name}</td>
                                                    <td className="mono text-xs">{req.internal_reference}</td>
                                                    <td className="font-bold">{req.quantity}</td>
                                                    <td>{getUrgencyBadge(req.urgency)}</td>
                                                    <td className="text-sm">{req.requested_by_name}</td>
                                                    <td>{getRequestStatusBadge(req.status)}</td>
                                                    <td>
                                                        {req.status === 'pendiente' && hasRole(['admin', 'supervisor']) && (
                                                            <div className="flex gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleResolveRequest(req.id, 'entregada')}
                                                                    className="text-green-600 hover:text-green-700"
                                                                    title="Entregar"
                                                                >
                                                                    <Check className="w-4 h-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleResolveRequest(req.id, 'rechazada')}
                                                                    className="text-red-600 hover:text-red-700"
                                                                    title="Rechazar"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Request Dialog */}
            <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            Solicitar Repuesto
                        </DialogTitle>
                    </DialogHeader>
                    {selectedPartForRequest && (
                        <form onSubmit={handleRequestSubmit} className="space-y-4 mt-4">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-medium">{selectedPartForRequest.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    Ref: {selectedPartForRequest.internal_reference} • Stock: {selectedPartForRequest.stock_current}
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <Label>Cantidad *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={requestForm.quantity}
                                        onChange={(e) => setRequestForm({ ...requestForm, quantity: parseInt(e.target.value) || 1 })}
                                        data-testid="request-quantity"
                                    />
                                </div>
                                <div className="form-group">
                                    <Label>Urgencia</Label>
                                    <Select
                                        value={requestForm.urgency}
                                        onValueChange={(v) => setRequestForm({ ...requestForm, urgency: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="baja">Baja</SelectItem>
                                            <SelectItem value="normal">Normal</SelectItem>
                                            <SelectItem value="alta">Alta</SelectItem>
                                            <SelectItem value="urgente">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="form-group">
                                <Label>Motivo de la solicitud *</Label>
                                <Textarea
                                    value={requestForm.reason}
                                    onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
                                    placeholder="Explica para qué necesitas este repuesto..."
                                    rows={3}
                                    data-testid="request-reason"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                    <>
                                        <Send className="w-4 h-4 mr-2" />
                                        Enviar Solicitud
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
