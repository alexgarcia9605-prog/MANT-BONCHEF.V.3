import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { cn, getMachineStatusLabel, formatFileSize, formatDateTime } from '../lib/utils';
import {
    Plus,
    Search,
    Cog,
    Eye,
    Edit,
    Trash2,
    Loader2,
    Upload,
    FileText,
    Image,
    Download,
    X,
    Paperclip,
    File
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Machines() {
    const { hasRole } = useAuth();
    const navigate = useNavigate();
    const [machines, setMachines] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deptFilter, setDeptFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingMachine, setEditingMachine] = useState(null);
    const [saving, setSaving] = useState(false);
    const [viewMachine, setViewMachine] = useState(null);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [form, setForm] = useState({
        name: '',
        code: '',
        department_id: '',
        description: '',
        brand: '',
        model: '',
        serial_number: '',
        status: 'operativa'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [machinesRes, deptsRes] = await Promise.all([
                axios.get(`${API}/machines`),
                axios.get(`${API}/departments`)
            ]);
            setMachines(machinesRes.data);
            setDepartments(deptsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            code: '',
            department_id: '',
            description: '',
            brand: '',
            model: '',
            serial_number: '',
            status: 'operativa'
        });
        setEditingMachine(null);
    };

    const openEditDialog = (machine) => {
        setEditingMachine(machine);
        setForm({
            name: machine.name,
            code: machine.code,
            department_id: machine.department_id,
            description: machine.description || '',
            brand: machine.brand || '',
            model: machine.model || '',
            serial_number: machine.serial_number || '',
            status: machine.status
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.department_id) {
            toast.error('Selecciona un departamento');
            return;
        }

        setSaving(true);
        try {
            if (editingMachine) {
                await axios.put(`${API}/machines/${editingMachine.id}`, form);
                toast.success('Máquina actualizada');
            } else {
                await axios.post(`${API}/machines`, form);
                toast.success('Máquina creada');
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
        if (!window.confirm('¿Estás seguro de eliminar esta máquina?')) return;
        try {
            await axios.delete(`${API}/machines/${id}`);
            toast.success('Máquina eliminada');
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al eliminar');
        }
    };

    const openViewDialog = async (machine) => {
        setViewMachine(machine);
        setViewDialogOpen(true);
    };

    const handleFileUpload = async (e) => {
        const files = e.target.files;
        if (!files.length || !viewMachine) return;

        setUploading(true);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                await axios.post(`${API}/machines/${viewMachine.id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            toast.success('Archivo(s) subido(s)');
            // Refresh machine data
            const res = await axios.get(`${API}/machines/${viewMachine.id}`);
            setViewMachine(res.data);
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al subir archivo');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadAttachment = async (attachment) => {
        try {
            const response = await axios.get(`${API}/machines/${viewMachine.id}/attachments/${attachment.id}`);
            const data = response.data;
            
            // Create download link
            const link = document.createElement('a');
            link.href = `data:${data.file_type};base64,${data.data}`;
            link.download = data.filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            toast.error('Error al descargar archivo');
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        if (!window.confirm('¿Eliminar este archivo?')) return;
        try {
            await axios.delete(`${API}/machines/${viewMachine.id}/attachments/${attachmentId}`);
            toast.success('Archivo eliminado');
            // Refresh machine data
            const res = await axios.get(`${API}/machines/${viewMachine.id}`);
            setViewMachine(res.data);
            fetchData();
        } catch (error) {
            toast.error('Error al eliminar archivo');
        }
    };

    const filteredMachines = machines.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.code.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
        const matchesDept = deptFilter === 'all' || m.department_id === deptFilter;
        return matchesSearch && matchesStatus && matchesDept;
    });

    const statusClass = {
        operativa: 'badge-operational',
        en_mantenimiento: 'badge-maintenance',
        fuera_de_servicio: 'badge-down'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="machines-page">
            <PageHeader
                title="Máquinas"
                description="Gestiona el inventario de equipos y máquinas"
            >
                {hasRole(['admin', 'supervisor']) && (
                    <Dialog open={dialogOpen} onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}>
                        <DialogTrigger asChild>
                            <Button data-testid="new-machine-btn">
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Máquina
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingMachine ? 'Editar Máquina' : 'Nueva Máquina'}
                                </DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label htmlFor="name">Nombre *</Label>
                                        <Input
                                            id="name"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            placeholder="Compresor Principal"
                                            required
                                            data-testid="machine-name"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="code">Código *</Label>
                                        <Input
                                            id="code"
                                            value={form.code}
                                            onChange={(e) => setForm({ ...form, code: e.target.value })}
                                            placeholder="COMP-001"
                                            required
                                            data-testid="machine-code"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <Label>Departamento *</Label>
                                    <Select
                                        value={form.department_id}
                                        onValueChange={(v) => setForm({ ...form, department_id: v })}
                                    >
                                        <SelectTrigger data-testid="machine-dept">
                                            <SelectValue placeholder="Selecciona departamento" />
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
                                        <Label htmlFor="brand">Marca</Label>
                                        <Input
                                            id="brand"
                                            value={form.brand}
                                            onChange={(e) => setForm({ ...form, brand: e.target.value })}
                                            placeholder="Atlas Copco"
                                            data-testid="machine-brand"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="model">Modelo</Label>
                                        <Input
                                            id="model"
                                            value={form.model}
                                            onChange={(e) => setForm({ ...form, model: e.target.value })}
                                            placeholder="GA 30+"
                                            data-testid="machine-model"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label htmlFor="serial_number">Número de Serie</Label>
                                        <Input
                                            id="serial_number"
                                            value={form.serial_number}
                                            onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                                            placeholder="SN-123456"
                                            data-testid="machine-serial"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label>Estado</Label>
                                        <Select
                                            value={form.status}
                                            onValueChange={(v) => setForm({ ...form, status: v })}
                                        >
                                            <SelectTrigger data-testid="machine-status">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="operativa">Operativa</SelectItem>
                                                <SelectItem value="en_mantenimiento">En Mantenimiento</SelectItem>
                                                <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <Label htmlFor="description">Descripción</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Información adicional..."
                                        rows={3}
                                        data-testid="machine-description"
                                    />
                                </div>
                                <Button type="submit" className="w-full" disabled={saving} data-testid="save-machine-btn">
                                    {saving ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : editingMachine ? 'Actualizar' : 'Crear Máquina'}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </PageHeader>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nombre o código..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                                data-testid="machine-search"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-48" data-testid="machine-status-filter">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="operativa">Operativa</SelectItem>
                                <SelectItem value="en_mantenimiento">En Mantenimiento</SelectItem>
                                <SelectItem value="fuera_de_servicio">Fuera de Servicio</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={deptFilter} onValueChange={setDeptFilter}>
                            <SelectTrigger className="w-full md:w-48" data-testid="machine-dept-filter">
                                <SelectValue placeholder="Departamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los deptos.</SelectItem>
                                {departments.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Machines Grid */}
            {filteredMachines.length === 0 ? (
                <Card>
                    <CardContent className="py-12">
                        <div className="empty-state">
                            <Cog className="empty-state-icon" />
                            <p className="text-muted-foreground">No se encontraron máquinas</p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMachines.map((machine) => (
                        <Card key={machine.id} className="card-hover tech-border" data-testid={`machine-card-${machine.id}`}>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h3 className="font-semibold">{machine.name}</h3>
                                        <p className="text-sm text-muted-foreground mono">{machine.code}</p>
                                    </div>
                                    <Badge className={statusClass[machine.status]}>
                                        {getMachineStatusLabel(machine.status)}
                                    </Badge>
                                </div>
                                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                                    <p>Departamento: {machine.department_name}</p>
                                    {machine.brand && <p>Marca: {machine.brand}</p>}
                                    {machine.model && <p>Modelo: {machine.model}</p>}
                                    {machine.attachments?.length > 0 && (
                                        <div className="flex items-center gap-1 text-primary">
                                            <Paperclip className="w-3 h-3" />
                                            <span>{machine.attachments.length} archivo(s)</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openViewDialog(machine)}
                                        data-testid={`view-machine-${machine.id}`}
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Ver
                                    </Button>
                                    {hasRole(['admin', 'supervisor']) && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => openEditDialog(machine)}
                                                data-testid={`edit-machine-${machine.id}`}
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            {hasRole(['admin']) && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(machine.id)}
                                                    data-testid={`delete-machine-${machine.id}`}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* View Machine Dialog with Files */}
            <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Cog className="w-5 h-5 text-primary" />
                            {viewMachine?.name}
                        </DialogTitle>
                    </DialogHeader>
                    {viewMachine && (
                        <div className="space-y-6 mt-4">
                            {/* Machine Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Código</p>
                                    <p className="font-medium mono">{viewMachine.code}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Departamento</p>
                                    <p className="font-medium">{viewMachine.department_name}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Marca</p>
                                    <p className="font-medium">{viewMachine.brand || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Modelo</p>
                                    <p className="font-medium">{viewMachine.model || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Número de Serie</p>
                                    <p className="font-medium mono">{viewMachine.serial_number || '-'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Estado</p>
                                    <Badge className={statusClass[viewMachine.status]}>
                                        {getMachineStatusLabel(viewMachine.status)}
                                    </Badge>
                                </div>
                            </div>
                            {viewMachine.description && (
                                <div>
                                    <p className="text-muted-foreground text-sm">Descripción</p>
                                    <p className="text-sm">{viewMachine.description}</p>
                                </div>
                            )}

                            {/* Files Section */}
                            <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <Paperclip className="w-4 h-4" />
                                        Archivos Adjuntos
                                    </h4>
                                    <div>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            multiple
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploading}
                                            data-testid="upload-machine-file"
                                        >
                                            {uploading ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <>
                                                    <Upload className="w-4 h-4 mr-2" />
                                                    Subir Archivo
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                {viewMachine.attachments?.length === 0 ? (
                                    <div className="text-center py-8 bg-muted/30 rounded-lg">
                                        <File className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                                        <p className="text-sm text-muted-foreground">No hay archivos adjuntos</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Sube manuales, fichas técnicas, fotos, etc.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {viewMachine.attachments?.map((file) => (
                                            <div
                                                key={file.id}
                                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {file.file_type?.startsWith('image/') ? (
                                                        <Image className="w-8 h-8 text-blue-500" />
                                                    ) : (
                                                        <FileText className="w-8 h-8 text-orange-500" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium truncate">{file.filename}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatFileSize(file.file_size)} • {formatDateTime(file.uploaded_at)}
                                                        </p>
                                                        {file.uploaded_by_name && (
                                                            <p className="text-xs text-muted-foreground">
                                                                Subido por: {file.uploaded_by_name}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDownloadAttachment(file)}
                                                        title="Descargar"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteAttachment(file.id)}
                                                        className="text-destructive hover:text-destructive"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
