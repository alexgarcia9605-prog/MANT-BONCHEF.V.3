import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Upload,
    FileText,
    X,
    Loader2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewWorkOrder() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [machines, setMachines] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        type: 'preventivo',
        priority: 'media',
        machine_id: '',
        assigned_to: '',
        scheduled_date: '',
        recurrence: '',
        estimated_hours: '',
        part_number: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [machinesRes, usersRes] = await Promise.all([
                axios.get(`${API}/machines`),
                axios.get(`${API}/users`).catch(() => ({ data: [] }))
            ]);
            setMachines(machinesRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        const validFiles = files.filter(file => {
            const isValid = file.type.startsWith('image/') || file.type === 'application/pdf';
            if (!isValid) {
                toast.error(`${file.name}: formato no permitido`);
            }
            return isValid;
        });
        setSelectedFiles(prev => [...prev, ...validFiles]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.machine_id) {
            toast.error('Selecciona una máquina');
            return;
        }

        setLoading(true);
        try {
            // Create order
            const orderData = {
                ...form,
                estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
                assigned_to: form.assigned_to || null,
                recurrence: form.type === 'preventivo' ? form.recurrence || null : null,
                part_number: form.part_number || null
            };
            const response = await axios.post(`${API}/work-orders`, orderData);
            const orderId = response.data.id;

            // Upload files
            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const formData = new FormData();
                    formData.append('file', file);
                    await axios.post(`${API}/work-orders/${orderId}/attachments`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }

            toast.success('Orden creada exitosamente');
            navigate(`/work-orders/${orderId}`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al crear la orden');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in" data-testid="new-work-order-page">
            <PageHeader
                title="Nueva Orden de Trabajo"
                description="Crear una orden de mantenimiento preventivo o correctivo"
            >
                <Button variant="outline" onClick={() => navigate('/work-orders')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancelar
                </Button>
            </PageHeader>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Información Básica</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label htmlFor="title">Título *</Label>
                                        <Input
                                            id="title"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            placeholder="Ej: Cambio de aceite compresor"
                                            required
                                            data-testid="order-title"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="part_number">Número de Parte</Label>
                                        <Input
                                            id="part_number"
                                            value={form.part_number}
                                            onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                                            placeholder="Ej: PN-12345-A"
                                            data-testid="order-part-number"
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <Label htmlFor="description">Descripción *</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe el trabajo a realizar..."
                                        rows={4}
                                        required
                                        data-testid="order-description"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label>Tipo *</Label>
                                        <Select
                                            value={form.type}
                                            onValueChange={(v) => setForm({ ...form, type: v })}
                                        >
                                            <SelectTrigger data-testid="order-type">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="preventivo">Preventivo</SelectItem>
                                                <SelectItem value="correctivo">Correctivo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="form-group">
                                        <Label>Prioridad</Label>
                                        <Select
                                            value={form.priority}
                                            onValueChange={(v) => setForm({ ...form, priority: v })}
                                        >
                                            <SelectTrigger data-testid="order-priority">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="baja">Baja</SelectItem>
                                                <SelectItem value="media">Media</SelectItem>
                                                <SelectItem value="alta">Alta</SelectItem>
                                                <SelectItem value="critica">Crítica</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Machine & Assignment */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Asignación</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="form-group">
                                    <Label>Máquina *</Label>
                                    <Select
                                        value={form.machine_id}
                                        onValueChange={(v) => setForm({ ...form, machine_id: v })}
                                    >
                                        <SelectTrigger data-testid="order-machine">
                                            <SelectValue placeholder="Selecciona una máquina" />
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
                                    <Label>Asignar a</Label>
                                    <Select
                                        value={form.assigned_to || "none"}
                                        onValueChange={(v) => setForm({ ...form, assigned_to: v === "none" ? "" : v })}
                                    >
                                        <SelectTrigger data-testid="order-assigned">
                                            <SelectValue placeholder="Sin asignar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin asignar</SelectItem>
                                            {users.map(u => (
                                                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label htmlFor="scheduled_date">Fecha programada</Label>
                                        <Input
                                            id="scheduled_date"
                                            type="date"
                                            value={form.scheduled_date}
                                            onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })}
                                            data-testid="order-date"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="estimated_hours">Horas estimadas</Label>
                                        <Input
                                            id="estimated_hours"
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={form.estimated_hours}
                                            onChange={(e) => setForm({ ...form, estimated_hours: e.target.value })}
                                            placeholder="2.5"
                                            data-testid="order-hours"
                                        />
                                    </div>
                                </div>
                                {form.type === 'preventivo' && (
                                    <div className="form-group">
                                        <Label>Programación automática</Label>
                                        <Select
                                            value={form.recurrence || "none"}
                                            onValueChange={(v) => setForm({ ...form, recurrence: v === "none" ? "" : v })}
                                        >
                                            <SelectTrigger data-testid="order-recurrence">
                                                <SelectValue placeholder="Sin recurrencia" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Sin recurrencia</SelectItem>
                                                <SelectItem value="diario">Diario</SelectItem>
                                                <SelectItem value="semanal">Semanal</SelectItem>
                                                <SelectItem value="mensual">Mensual</SelectItem>
                                                <SelectItem value="trimestral">Trimestral</SelectItem>
                                                <SelectItem value="anual">Anual</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Al completar esta orden, se creará automáticamente la siguiente
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Files */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Archivos Adjuntos</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf"
                                    multiple
                                    onChange={handleFileSelect}
                                    className="hidden"
                                    data-testid="file-input"
                                />
                                <div
                                    className="file-upload-zone cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Clic para seleccionar archivos
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Imágenes y PDFs permitidos
                                    </p>
                                </div>

                                {selectedFiles.length > 0 && (
                                    <div className="mt-4 space-y-2">
                                        {selectedFiles.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-muted rounded-lg"
                                            >
                                                <div className="flex items-center gap-2 min-w-0">
                                                    {file.type.startsWith('image/') ? (
                                                        <img
                                                            src={URL.createObjectURL(file)}
                                                            alt=""
                                                            className="w-8 h-8 rounded object-cover"
                                                        />
                                                    ) : (
                                                        <FileText className="w-8 h-8 text-muted-foreground" />
                                                    )}
                                                    <span className="text-sm truncate">{file.name}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base font-semibold"
                            disabled={loading}
                            data-testid="submit-order-btn"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Crear Orden'
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
