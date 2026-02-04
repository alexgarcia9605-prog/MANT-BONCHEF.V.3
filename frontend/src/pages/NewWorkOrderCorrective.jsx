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
    Loader2,
    AlertTriangle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewWorkOrderCorrective() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [machines, setMachines] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [form, setForm] = useState({
        title: '',
        description: '',
        type: 'correctivo',
        priority: 'alta',
        machine_id: '',
        assigned_to: '',
        scheduled_date: '',
        estimated_hours: '',
        part_number: '',
        failure_cause: '',
        spare_part_used: '',
        spare_part_reference: ''
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
            const orderData = {
                ...form,
                type: 'correctivo',
                estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
                assigned_to: form.assigned_to || null,
                part_number: form.part_number || null,
                failure_cause: form.failure_cause || null,
                spare_part_used: form.spare_part_used || null,
                spare_part_reference: form.spare_part_reference || null
            };
            const response = await axios.post(`${API}/work-orders`, orderData);
            const orderId = response.data.id;

            if (selectedFiles.length > 0) {
                for (const file of selectedFiles) {
                    const formData = new FormData();
                    formData.append('file', file);
                    await axios.post(`${API}/work-orders/${orderId}/attachments`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }

            toast.success('Orden correctiva creada exitosamente');
            navigate(`/work-orders/${orderId}`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al crear la orden');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in" data-testid="new-corrective-order-page">
            <PageHeader
                title="Nueva Orden Correctiva"
                description="Crear una orden de mantenimiento correctivo o reparación"
            >
                <Button variant="outline" onClick={() => navigate('/work-orders/corrective')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancelar
                </Button>
            </PageHeader>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <Card className="border-l-4 border-l-purple-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="w-5 h-5 text-purple-500" />
                                    Información del Correctivo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label htmlFor="title">Título *</Label>
                                        <Input
                                            id="title"
                                            value={form.title}
                                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                                            placeholder="Ej: Reparación de motor"
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
                                    <Label htmlFor="description">Descripción del problema *</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Describe el problema detectado y la reparación necesaria..."
                                        rows={4}
                                        required
                                        data-testid="order-description"
                                    />
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
                                <div className="form-group">
                                    <Label>Causa del Fallo</Label>
                                    <Select
                                        value={form.failure_cause || "none"}
                                        onValueChange={(v) => setForm({ ...form, failure_cause: v === "none" ? "" : v })}
                                    >
                                        <SelectTrigger data-testid="order-failure-cause">
                                            <SelectValue placeholder="Selecciona la causa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">Sin especificar</SelectItem>
                                            <SelectItem value="accidente">Accidente</SelectItem>
                                            <SelectItem value="mala_utilizacion">Mala utilización</SelectItem>
                                            <SelectItem value="instruccion_no_respetada">Instrucción no respetada</SelectItem>
                                            <SelectItem value="mala_intervencion_anterior">Mala intervención anterior</SelectItem>
                                            <SelectItem value="fatiga_acumulada">Fatiga acumulada</SelectItem>
                                            <SelectItem value="golpe">Golpe</SelectItem>
                                            <SelectItem value="diseno_inadecuado">Diseño inadecuado</SelectItem>
                                            <SelectItem value="desgaste">Desgaste</SelectItem>
                                            <SelectItem value="mal_montaje">Mal montaje</SelectItem>
                                            <SelectItem value="corrosion">Corrosión</SelectItem>
                                            <SelectItem value="otros">Otros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Repuesto utilizado */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Repuesto Utilizado</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <Label htmlFor="spare_part_used">Nombre del Repuesto</Label>
                                        <Input
                                            id="spare_part_used"
                                            value={form.spare_part_used}
                                            onChange={(e) => setForm({ ...form, spare_part_used: e.target.value })}
                                            placeholder="Ej: Rodamiento SKF"
                                            data-testid="order-spare-part"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <Label htmlFor="spare_part_reference">Referencia del Repuesto</Label>
                                        <Input
                                            id="spare_part_reference"
                                            value={form.spare_part_reference}
                                            onChange={(e) => setForm({ ...form, spare_part_reference: e.target.value })}
                                            placeholder="Ej: SKF-6205-2RS"
                                            data-testid="order-spare-reference"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Assignment */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Asignación</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="form-group">
                                    <Label>Máquina afectada *</Label>
                                    <Select
                                        value={form.machine_id}
                                        onValueChange={(v) => setForm({ ...form, machine_id: v })}
                                    >
                                        <SelectTrigger data-testid="order-machine">
                                            <SelectValue placeholder="Selecciona la máquina afectada" />
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
                                    <Label>Técnico asignado</Label>
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
                                        <Label htmlFor="scheduled_date">Fecha objetivo</Label>
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
                                            placeholder="4.0"
                                            data-testid="order-hours"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar - Files */}
                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Evidencia / Archivos</CardTitle>
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
                                        Sube fotos del problema
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
                            className="w-full h-12 text-base font-semibold bg-purple-600 hover:bg-purple-700"
                            disabled={loading}
                            data-testid="submit-order-btn"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                'Crear Orden Correctiva'
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
