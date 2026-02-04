import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import {
    Plus,
    Building2,
    MapPin,
    Edit,
    Trash2,
    Loader2,
    Cog,
    ChevronDown,
    ChevronRight,
    GitBranch,
    Clock,
    Power,
    PowerOff
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Departments() {
    const { hasRole } = useAuth();
    const [departments, setDepartments] = useState([]);
    const [machines, setMachines] = useState([]);
    const [productionLines, setProductionLines] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingDept, setEditingDept] = useState(null);
    const [saving, setSaving] = useState(false);
    const [expandedDepts, setExpandedDepts] = useState({});
    
    // Line dialog state
    const [lineDialogOpen, setLineDialogOpen] = useState(false);
    const [editingLine, setEditingLine] = useState(null);
    const [selectedDeptForLine, setSelectedDeptForLine] = useState(null);
    const [lineForm, setLineForm] = useState({
        name: '',
        code: '',
        description: '',
        target_start_time: ''
    });
    
    const [form, setForm] = useState({
        name: '',
        description: '',
        location: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [deptsRes, machinesRes, linesRes] = await Promise.all([
                axios.get(`${API}/departments`),
                axios.get(`${API}/machines`),
                axios.get(`${API}/production-lines`)
            ]);
            setDepartments(deptsRes.data);
            setMachines(machinesRes.data);
            setProductionLines(linesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({ name: '', description: '', location: '' });
        setEditingDept(null);
    };

    const resetLineForm = () => {
        setLineForm({ name: '', code: '', description: '', target_start_time: '' });
        setEditingLine(null);
        setSelectedDeptForLine(null);
    };

    const openEditDialog = (dept) => {
        setEditingDept(dept);
        setForm({
            name: dept.name,
            description: dept.description || '',
            location: dept.location || ''
        });
        setDialogOpen(true);
    };

    const openLineDialog = (deptId, line = null) => {
        setSelectedDeptForLine(deptId);
        if (line) {
            setEditingLine(line);
            setLineForm({
                name: line.name,
                code: line.code,
                description: line.description || '',
                target_start_time: line.target_start_time || ''
            });
        } else {
            resetLineForm();
            setSelectedDeptForLine(deptId);
        }
        setLineDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editingDept) {
                await axios.put(`${API}/departments/${editingDept.id}`, form);
                toast.success('Departamento actualizado');
            } else {
                await axios.post(`${API}/departments`, form);
                toast.success('Departamento creado');
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

    const handleLineSubmit = async (e) => {
        e.preventDefault();
        if (!lineForm.name || !lineForm.code) {
            toast.error('Nombre y código son requeridos');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                ...lineForm,
                department_id: selectedDeptForLine
            };
            
            if (editingLine) {
                await axios.put(`${API}/production-lines/${editingLine.id}`, payload);
                toast.success('Línea actualizada');
            } else {
                await axios.post(`${API}/production-lines`, payload);
                toast.success('Línea creada');
            }
            setLineDialogOpen(false);
            resetLineForm();
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al guardar línea');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este departamento?')) return;
        try {
            await axios.delete(`${API}/departments/${id}`);
            toast.success('Departamento eliminado');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al eliminar');
        }
    };

    const handleDeleteLine = async (lineId) => {
        if (!window.confirm('¿Eliminar esta línea de producción?')) return;
        try {
            await axios.delete(`${API}/production-lines/${lineId}`);
            toast.success('Línea eliminada');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al eliminar línea');
        }
    };

    const handleToggleLineStatus = async (line) => {
        try {
            await axios.put(`${API}/production-lines/${line.id}/status`);
            toast.success(line.status === 'activa' ? 'Línea desactivada' : 'Línea activada');
            fetchData();
        } catch (error) {
            toast.error('Error al cambiar estado');
        }
    };

    const getMachineCount = (deptId) => {
        return machines.filter(m => m.department_id === deptId).length;
    };

    const getLineCount = (deptId) => {
        return productionLines.filter(l => l.department_id === deptId).length;
    };

    const getLinesForDept = (deptId) => {
        return productionLines.filter(l => l.department_id === deptId);
    };

    const toggleExpand = (deptId) => {
        setExpandedDepts(prev => ({
            ...prev,
            [deptId]: !prev[deptId]
        }));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="departments-page">
            <PageHeader
                title="Departamentos"
                description="Organiza las máquinas y líneas de producción por áreas"
            >
                {hasRole(['admin', 'supervisor']) && (
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button data-testid="new-dept-btn">
                                <Plus className="w-4 h-4 mr-2" />
                                Nuevo Departamento
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    {editingDept ? 'Editar Departamento' : 'Nuevo Departamento'}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                <div className="form-group">
                                    <Label htmlFor="name">Nombre *</Label>
                                    <Input
                                        id="name"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        placeholder="Ej: Producción"
                                        required
                                        data-testid="dept-name"
                                    />
                                </div>
                                <div className="form-group">
                                    <Label htmlFor="location">Ubicación</Label>
                                    <Input
                                        id="location"
                                        value={form.location}
                                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                                        placeholder="Ej: Edificio A, Planta Baja"
                                        data-testid="dept-location"
                                    />
                                </div>
                                <div className="form-group">
                                    <Label htmlFor="description">Descripción</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Información adicional..."
                                        rows={3}
                                        data-testid="dept-description"
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={saving} data-testid="save-dept-btn">
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : editingDept ? 'Actualizar' : 'Crear Departamento'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </PageHeader>

            {/* Line Dialog */}
            <Dialog open={lineDialogOpen} onOpenChange={(open) => {
                setLineDialogOpen(open);
                if (!open) resetLineForm();
            }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <GitBranch className="w-5 h-5 text-green-500" />
                            {editingLine ? 'Editar Línea de Producción' : 'Nueva Línea de Producción'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleLineSubmit} className="space-y-4 mt-4">
                        <div className="form-group">
                            <Label htmlFor="line-name">Nombre *</Label>
                            <Input
                                id="line-name"
                                value={lineForm.name}
                                onChange={(e) => setLineForm({ ...lineForm, name: e.target.value })}
                                placeholder="Ej: Línea de Envasado 1"
                                required
                                data-testid="line-name"
                            />
                        </div>
                        <div className="form-group">
                            <Label htmlFor="line-code">Código *</Label>
                            <Input
                                id="line-code"
                                value={lineForm.code}
                                onChange={(e) => setLineForm({ ...lineForm, code: e.target.value })}
                                placeholder="Ej: LIN-001"
                                required
                                data-testid="line-code"
                            />
                        </div>
                        <div className="form-group">
                            <Label htmlFor="line-target-time">Hora Objetivo de Arranque</Label>
                            <Input
                                id="line-target-time"
                                type="time"
                                value={lineForm.target_start_time}
                                onChange={(e) => setLineForm({ ...lineForm, target_start_time: e.target.value })}
                                data-testid="line-target-time"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Hora objetivo por defecto para los arranques de esta línea
                            </p>
                        </div>
                        <div className="form-group">
                            <Label htmlFor="line-description">Descripción</Label>
                            <Textarea
                                id="line-description"
                                value={lineForm.description}
                                onChange={(e) => setLineForm({ ...lineForm, description: e.target.value })}
                                placeholder="Descripción de la línea..."
                                rows={2}
                                data-testid="line-description"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : editingLine ? 'Actualizar Línea' : 'Crear Línea'}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {departments.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="empty-state">
                            <Building2 className="empty-state-icon" />
                            <p className="text-muted-foreground">No hay departamentos</p>
                            {hasRole(['admin', 'supervisor']) && (
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setDialogOpen(true)}
                                >
                                    Crear primer departamento
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {departments.map((dept) => {
                        const lines = getLinesForDept(dept.id);
                        const isExpanded = expandedDepts[dept.id];
                        
                        return (
                            <Card key={dept.id} className="card-hover" data-testid={`dept-card-${dept.id}`}>
                                <CardContent className="p-0">
                                    {/* Department Header */}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                                                    <Building2 className="w-6 h-6 text-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{dept.name}</h3>
                                                    {dept.location && (
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {dept.location}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            {hasRole(['admin', 'supervisor']) && (
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => openEditDialog(dept)}
                                                        data-testid={`edit-dept-${dept.id}`}
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    {hasRole(['admin']) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDelete(dept.id)}
                                                            data-testid={`delete-dept-${dept.id}`}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {dept.description && (
                                            <p className="text-sm text-muted-foreground mt-3">
                                                {dept.description}
                                            </p>
                                        )}
                                        
                                        {/* Stats */}
                                        <div className="flex items-center gap-6 mt-4 pt-4 border-t">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Cog className="w-4 h-4" />
                                                <span>{getMachineCount(dept.id)} máquinas</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <GitBranch className="w-4 h-4" />
                                                <span>{getLineCount(dept.id)} líneas</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => toggleExpand(dept.id)}
                                                className="ml-auto"
                                            >
                                                {isExpanded ? (
                                                    <ChevronDown className="w-4 h-4 mr-1" />
                                                ) : (
                                                    <ChevronRight className="w-4 h-4 mr-1" />
                                                )}
                                                {isExpanded ? 'Ocultar líneas' : 'Ver líneas'}
                                            </Button>
                                        </div>
                                    </div>
                                    
                                    {/* Production Lines Section */}
                                    {isExpanded && (
                                        <div className="border-t bg-muted/30 p-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <h4 className="font-medium flex items-center gap-2">
                                                    <GitBranch className="w-4 h-4 text-green-500" />
                                                    Líneas de Producción
                                                </h4>
                                                {hasRole(['admin', 'supervisor']) && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openLineDialog(dept.id)}
                                                        data-testid={`new-line-${dept.id}`}
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Nueva Línea
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            {lines.length === 0 ? (
                                                <div className="text-center py-6 bg-background rounded-lg border border-dashed">
                                                    <GitBranch className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                                                    <p className="text-sm text-muted-foreground">
                                                        No hay líneas de producción
                                                    </p>
                                                    {hasRole(['admin', 'supervisor']) && (
                                                        <Button
                                                            variant="link"
                                                            size="sm"
                                                            onClick={() => openLineDialog(dept.id)}
                                                        >
                                                            Crear primera línea
                                                        </Button>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {lines.map((line) => (
                                                        <div
                                                            key={line.id}
                                                            className={`p-4 bg-background rounded-lg border ${
                                                                line.status === 'inactiva' ? 'opacity-60' : ''
                                                            }`}
                                                            data-testid={`line-card-${line.id}`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <h5 className="font-medium">{line.name}</h5>
                                                                        <Badge 
                                                                            variant={line.status === 'activa' ? 'default' : 'secondary'}
                                                                            className={line.status === 'activa' ? 'bg-green-500' : ''}
                                                                        >
                                                                            {line.status === 'activa' ? 'Activa' : 'Inactiva'}
                                                                        </Badge>
                                                                    </div>
                                                                    <p className="text-xs text-muted-foreground mono mt-1">
                                                                        {line.code}
                                                                    </p>
                                                                    {line.target_start_time && (
                                                                        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                                                                            <Clock className="w-3 h-3" />
                                                                            <span>Hora objetivo: {line.target_start_time}</span>
                                                                        </div>
                                                                    )}
                                                                    {line.description && (
                                                                        <p className="text-xs text-muted-foreground mt-2">
                                                                            {line.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                {hasRole(['admin', 'supervisor']) && (
                                                                    <div className="flex gap-1">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => handleToggleLineStatus(line)}
                                                                            title={line.status === 'activa' ? 'Desactivar' : 'Activar'}
                                                                        >
                                                                            {line.status === 'activa' ? (
                                                                                <PowerOff className="w-4 h-4 text-amber-500" />
                                                                            ) : (
                                                                                <Power className="w-4 h-4 text-green-500" />
                                                                            )}
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className="h-8 w-8"
                                                                            onClick={() => openLineDialog(dept.id, line)}
                                                                        >
                                                                            <Edit className="w-4 h-4" />
                                                                        </Button>
                                                                        {hasRole(['admin']) && (
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                                                onClick={() => handleDeleteLine(line.id)}
                                                                            >
                                                                                <Trash2 className="w-4 h-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
