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
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Upload,
    FileText,
    X,
    Loader2,
    Calendar,
    CheckSquare,
    Plus,
    Trash2,
    PenLine
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function NewWorkOrderPreventive() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [machines, setMachines] = useState([]);
    const [users, setUsers] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [checklist, setChecklist] = useState([]);
    const [newChecklistItem, setNewChecklistItem] = useState('');
    const [form, setForm] = useState({
        title: '',
        description: '', // This will be "observaciones"
        type: 'preventivo',
        priority: 'media',
        machine_id: '',
        assigned_to: '',
        scheduled_date: '',
        recurrence: '',
        estimated_hours: '',
        technician_signature: '' // Firma del técnico
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [machinesRes, usersRes, checklistRes] = await Promise.all([
                axios.get(`${API}/machines`),
                axios.get(`${API}/users`).catch(() => ({ data: [] })),
                axios.get(`${API}/checklist-templates/default`).catch(() => ({ data: [] }))
            ]);
            setMachines(machinesRes.data);
            setUsers(usersRes.data);
            // Set default checklist items
            if (checklistRes.data && checklistRes.data.length > 0) {
                setChecklist(checklistRes.data);
            } else {
                // Fallback default items
                setChecklist([
                    { id: '1', name: 'Área o máquina recogida', is_required: true, checked: false, order: 0 },
                    { id: '2', name: 'Orden y limpieza', is_required: true, checked: false, order: 1 }
                ]);
            }
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

    const handleChecklistChange = (itemId, checked) => {
        setChecklist(prev => prev.map(item => 
            item.id === itemId ? { ...item, checked } : item
        ));
    };

    const addChecklistItem = () => {
        if (!newChecklistItem.trim()) return;
        const newItem = {
            id: `custom-${Date.now()}`,
            name: newChecklistItem.trim(),
            is_required: false,
            checked: false,
            order: checklist.length
        };
        setChecklist(prev => [...prev, newItem]);
        setNewChecklistItem('');
    };

    const removeChecklistItem = (itemId) => {
        // Only allow removing non-required items
        const item = checklist.find(i => i.id === itemId);
        if (item?.is_required) {
            toast.error('No se pueden eliminar items obligatorios');
            return;
        }
        setChecklist(prev => prev.filter(item => item.id !== itemId));
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
                type: 'preventivo',
                estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
                assigned_to: form.assigned_to || null,
                recurrence: form.recurrence || null,
                checklist: checklist,
                technician_signature: form.technician_signature || null
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

            toast.success('Orden preventiva creada exitosamente');
            navigate(`/work-orders/${orderId}`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al crear la orden');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in" data-testid="new-preventive-order-page">
            <PageHeader
                title="Nueva Orden Preventiva"
                description="Crear una orden de mantenimiento preventivo programado"
            >
                <Button variant="outline" onClick={() => navigate('/work-orders/preventive')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Cancelar
                </Button>
            </PageHeader>

            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Info */}
                        <Card className="border-l-4 border-l-blue-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-blue-500" />
                                    Información del Preventivo
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="form-group">
                                    <Label htmlFor="title">Título *</Label>
                                    <Input
                                        id="title"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        placeholder="Ej: Cambio de aceite mensual"
                                        required
                                        data-testid="order-title"
                                    />
                                </div>
                                <div className="form-group">
                                    <Label htmlFor="description">Observaciones</Label>
                                    <Textarea
                                        id="description"
                                        value={form.description}
                                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                                        placeholder="Escribe observaciones sobre el trabajo preventivo..."
                                        rows={3}
                                        data-testid="order-observations"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
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
                                        <Label>Programación Automática</Label>
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
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Checklist */}
                        <Card className="border-l-4 border-l-green-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckSquare className="w-5 h-5 text-green-500" />
                                    Checklist de Verificación
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-3">
                                    {checklist.map((item) => (
                                        <div 
                                            key={item.id} 
                                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                            data-testid={`checklist-item-${item.id}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id={item.id}
                                                    checked={item.checked}
                                                    onCheckedChange={(checked) => handleChecklistChange(item.id, checked)}
                                                    data-testid={`checklist-checkbox-${item.id}`}
                                                />
                                                <label 
                                                    htmlFor={item.id} 
                                                    className={`text-sm cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                                                >
                                                    {item.name}
                                                    {item.is_required && (
                                                        <span className="ml-2 text-xs text-red-500">*</span>
                                                    )}
                                                </label>
                                            </div>
                                            {!item.is_required && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeChecklistItem(item.id)}
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                
                                {/* Add new checklist item */}
                                <div className="flex gap-2 pt-2 border-t">
                                    <Input
                                        value={newChecklistItem}
                                        onChange={(e) => setNewChecklistItem(e.target.value)}
                                        placeholder="Añadir nuevo item al checklist..."
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addChecklistItem())}
                                        data-testid="new-checklist-item-input"
                                    />
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        onClick={addChecklistItem}
                                        data-testid="add-checklist-item-btn"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    * Items obligatorios que siempre aparecerán en las órdenes preventivas
                                </p>
                            </CardContent>
                        </Card>

                        {/* Assignment */}
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
                            </CardContent>
                        </Card>

                        {/* Technician Signature */}
                        <Card className="border-l-4 border-l-purple-500">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <PenLine className="w-5 h-5 text-purple-500" />
                                    Firma del Técnico
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="form-group">
                                    <Label htmlFor="technician_signature">Nombre del técnico que realiza el preventivo</Label>
                                    <Input
                                        id="technician_signature"
                                        value={form.technician_signature}
                                        onChange={(e) => setForm({ ...form, technician_signature: e.target.value })}
                                        placeholder="Escribe el nombre completo del técnico..."
                                        data-testid="technician-signature"
                                    />
                                </div>
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
                                'Crear Orden Preventiva'
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
