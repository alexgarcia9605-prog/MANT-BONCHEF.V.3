import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
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
import {
    cn,
    formatDate,
    formatDateTime,
    getStatusLabel,
    getPriorityLabel,
    getTypeLabel,
    getRecurrenceLabel,
    getFailureCauseLabel,
    formatFileSize
} from '../lib/utils';
import {
    ArrowLeft,
    Edit,
    Trash2,
    Upload,
    FileText,
    Image,
    Download,
    X,
    Clock,
    User,
    Cog,
    Building2,
    History,
    Paperclip,
    Loader2,
    Hash,
    Wrench,
    AlertCircle,
    CheckSquare,
    PenLine,
    Check,
    Square,
    CalendarCheck,
    CalendarClock,
    AlertOctagon,
    CheckCircle2
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WorkOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasRole, user } = useAuth();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [realizarDialogOpen, setRealizarDialogOpen] = useState(false);
    const [postponeDialogOpen, setPostponeDialogOpen] = useState(false);
    const [partialCloseDialogOpen, setPartialCloseDialogOpen] = useState(false);
    const [postponeData, setPostponeData] = useState({ date: '', reason: '' });
    const [partialCloseData, setPartialCloseData] = useState({ notes: '' });
    const [uploading, setUploading] = useState(false);
    const [users, setUsers] = useState([]);
    const [editData, setEditData] = useState({});
    const [checklistData, setChecklistData] = useState([]);

    const fetchOrder = useCallback(async () => {
        try {
            const [orderRes, usersRes] = await Promise.all([
                axios.get(`${API}/work-orders/${id}`),
                axios.get(`${API}/users`).catch(() => ({ data: [] }))
            ]);
            setOrder(orderRes.data);
            setChecklistData(orderRes.data.checklist || []);
            setEditData({
                status: orderRes.data.status,
                priority: orderRes.data.priority,
                assigned_to: orderRes.data.assigned_to || '',
                notes: orderRes.data.notes || '',
                description: orderRes.data.description || '',
                part_number: orderRes.data.part_number || '',
                failure_cause: orderRes.data.failure_cause || '',
                spare_part_used: orderRes.data.spare_part_used || '',
                spare_part_reference: orderRes.data.spare_part_reference || '',
                checklist: orderRes.data.checklist || [],
                technician_signature: orderRes.data.technician_signature || ''
            });
            setUsers(usersRes.data);
        } catch (error) {
            console.error('Error fetching order:', error);
            toast.error('Error al cargar la orden');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchOrder();
    }, [fetchOrder]);

    const handleUpdate = async () => {
        try {
            await axios.put(`${API}/work-orders/${id}`, editData);
            toast.success('Orden actualizada');
            setEditing(false);
            fetchOrder();
        } catch (error) {
            toast.error('Error al actualizar la orden');
        }
    };

    const handlePostpone = async () => {
        if (!postponeData.date) {
            toast.error('Selecciona una fecha');
            return;
        }
        try {
            await axios.put(`${API}/work-orders/${id}`, {
                status: 'pospuesta',
                postponed_date: postponeData.date,
                postpone_reason: postponeData.reason,
                scheduled_date: postponeData.date
            });
            toast.success('Orden pospuesta exitosamente');
            setPostponeDialogOpen(false);
            setPostponeData({ date: '', reason: '' });
            fetchOrder();
        } catch (error) {
            toast.error('Error al posponer la orden');
        }
    };

    const handlePartialClose = async () => {
        if (!partialCloseData.notes) {
            toast.error('Añade notas del cierre parcial');
            return;
        }
        try {
            await axios.put(`${API}/work-orders/${id}`, {
                status: 'cerrada_parcial',
                partial_close_notes: partialCloseData.notes
            });
            toast.success('Orden cerrada parcialmente');
            setPartialCloseDialogOpen(false);
            setPartialCloseData({ notes: '' });
            fetchOrder();
        } catch (error) {
            toast.error('Error al cerrar parcialmente');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Estás seguro de eliminar esta orden?')) return;
        try {
            await axios.delete(`${API}/work-orders/${id}`);
            toast.success('Orden eliminada');
            navigate('/work-orders');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al eliminar');
        }
    };

    const handleFileUpload = async (e) => {
        const files = e.target.files;
        if (!files.length) return;

        setUploading(true);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                await axios.post(`${API}/work-orders/${id}/attachments`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            toast.success('Archivo(s) subido(s)');
            fetchOrder();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al subir archivo');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        try {
            await axios.delete(`${API}/work-orders/${id}/attachments/${attachmentId}`);
            toast.success('Archivo eliminado');
            fetchOrder();
        } catch (error) {
            toast.error('Error al eliminar archivo');
        }
    };

    const downloadAttachment = (attachment) => {
        const link = document.createElement('a');
        link.href = `data:${attachment.file_type};base64,${attachment.data}`;
        link.download = attachment.filename;
        link.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">Orden no encontrada</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate('/work-orders')}>
                    Volver a órdenes
                </Button>
            </div>
        );
    }

    const priorityClass = {
        critica: 'priority-critica',
        alta: 'priority-alta',
        media: 'priority-media',
        baja: 'priority-baja'
    };

    const statusClass = {
        pendiente: 'bg-gray-500/15 text-gray-700',
        en_progreso: 'bg-blue-500/15 text-blue-700',
        completada: 'bg-green-500/15 text-green-700',
        cancelada: 'bg-red-500/15 text-red-700',
        pospuesta: 'bg-amber-500/15 text-amber-700',
        cerrada_parcial: 'bg-purple-500/15 text-purple-700'
    };

    // Check if current user is the assigned technician
    const isAssignedTechnician = order.assigned_to === user?.id;
    const canEditOrder = hasRole(['admin', 'supervisor']) || isAssignedTechnician;
    const canPostponeOrPartialClose = hasRole(['admin', 'supervisor']) || isAssignedTechnician;

    return (
        <div className="space-y-6 animate-fade-in" data-testid="work-order-detail">
            <PageHeader
                title={order.title}
                description={`Orden ${order.type === 'preventivo' ? 'preventiva' : 'correctiva'}`}
            >
                <Button variant="outline" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver
                </Button>
                {hasRole(['admin', 'supervisor']) && (
                    <Button variant="destructive" onClick={handleDelete} data-testid="delete-order-btn">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                    </Button>
                )}
            </PageHeader>

            {/* Action Buttons: Postpone and Partial Close */}
            {canPostponeOrPartialClose && order.status !== 'completada' && order.status !== 'cancelada' && (
                <div className="flex flex-wrap gap-3">
                    {/* Postpone Dialog */}
                    <Dialog open={postponeDialogOpen} onOpenChange={setPostponeDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50" data-testid="postpone-btn">
                                <CalendarClock className="w-4 h-4 mr-2" />
                                Posponer
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <CalendarClock className="w-5 h-5 text-amber-500" />
                                    Posponer Orden
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <div className="form-group">
                                    <Label>Nueva Fecha *</Label>
                                    <Input
                                        type="date"
                                        value={postponeData.date}
                                        onChange={(e) => setPostponeData({ ...postponeData, date: e.target.value })}
                                        data-testid="postpone-date"
                                    />
                                </div>
                                <div className="form-group">
                                    <Label>Razón del Aplazamiento</Label>
                                    <Textarea
                                        value={postponeData.reason}
                                        onChange={(e) => setPostponeData({ ...postponeData, reason: e.target.value })}
                                        placeholder="Indica el motivo por el que se pospone la orden..."
                                        rows={3}
                                        data-testid="postpone-reason"
                                    />
                                </div>
                                <Button onClick={handlePostpone} className="w-full bg-amber-500 hover:bg-amber-600" data-testid="confirm-postpone">
                                    Confirmar Aplazamiento
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Partial Close Dialog */}
                    <Dialog open={partialCloseDialogOpen} onOpenChange={setPartialCloseDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50" data-testid="partial-close-btn">
                                <AlertOctagon className="w-4 h-4 mr-2" />
                                Cierre Parcial
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <AlertOctagon className="w-5 h-5 text-purple-500" />
                                    Cierre Parcial de Orden
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 mt-4">
                                <p className="text-sm text-muted-foreground">
                                    El cierre parcial indica que la orden se ha trabajado pero no se ha completado totalmente.
                                    Se requiere seguimiento posterior.
                                </p>
                                <div className="form-group">
                                    <Label>Notas del Cierre Parcial *</Label>
                                    <Textarea
                                        value={partialCloseData.notes}
                                        onChange={(e) => setPartialCloseData({ ...partialCloseData, notes: e.target.value })}
                                        placeholder="Describe qué se ha realizado y qué queda pendiente..."
                                        rows={4}
                                        data-testid="partial-close-notes"
                                    />
                                </div>
                                <Button onClick={handlePartialClose} className="w-full bg-purple-500 hover:bg-purple-600" data-testid="confirm-partial-close">
                                    Confirmar Cierre Parcial
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            {/* Show postpone/partial close info if applicable */}
            {(order.status === 'pospuesta' || order.postponed_date) && (
                <Card className="border-amber-500 bg-amber-50">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <CalendarClock className="w-5 h-5 text-amber-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-amber-800">Orden Pospuesta</p>
                                <p className="text-sm text-amber-700">Nueva fecha: {formatDate(order.postponed_date || order.scheduled_date)}</p>
                                {order.postpone_reason && (
                                    <p className="text-sm text-amber-600 mt-1">Razón: {order.postpone_reason}</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {(order.status === 'cerrada_parcial' || order.partial_close_notes) && (
                <Card className="border-purple-500 bg-purple-50">
                    <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                            <AlertOctagon className="w-5 h-5 text-purple-600 mt-0.5" />
                            <div>
                                <p className="font-medium text-purple-800">Cierre Parcial</p>
                                <p className="text-sm text-purple-700">{order.partial_close_notes}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Información General</CardTitle>
                            <div className="flex gap-2">
                                {/* Botón REALIZAR - para técnicos asignados o admin */}
                                {(isAssignedTechnician || hasRole(['admin', 'supervisor'])) && order.status !== 'completada' && order.status !== 'cancelada' && (
                                    <Dialog open={realizarDialogOpen} onOpenChange={setRealizarDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700" data-testid="realizar-order-btn">
                                                <CheckSquare className="w-4 h-4 mr-2" />
                                                Realizar
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <CheckSquare className="w-5 h-5 text-green-600" />
                                                    Realizar Orden {order?.type === 'preventivo' ? 'Preventiva' : 'Correctiva'}
                                                </DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 mt-4">
                                                {/* Campos para PREVENTIVOS */}
                                                {order?.type === 'preventivo' && (
                                                    <>
                                                        <div className="form-group">
                                                            <Label>Observaciones</Label>
                                                            <Textarea
                                                                value={editData.description || ''}
                                                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                                placeholder="Escribe observaciones sobre el trabajo preventivo..."
                                                                data-testid="realizar-observations"
                                                                rows={3}
                                                            />
                                                        </div>
                                                        {editData.checklist && editData.checklist.length > 0 && (
                                                            <div className="form-group">
                                                                <Label>Checklist de Verificación</Label>
                                                                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded p-2">
                                                                    {editData.checklist.map((item, idx) => (
                                                                        <div 
                                                                            key={item.id || idx}
                                                                            className="flex items-center gap-2 p-2 bg-muted rounded cursor-pointer hover:bg-muted/80"
                                                                            onClick={() => {
                                                                                const newChecklist = [...editData.checklist];
                                                                                newChecklist[idx] = { ...item, checked: !item.checked };
                                                                                setEditData({ ...editData, checklist: newChecklist });
                                                                            }}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={item.checked || false}
                                                                                onChange={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const newChecklist = [...editData.checklist];
                                                                                    newChecklist[idx] = { ...item, checked: e.target.checked };
                                                                                    setEditData({ ...editData, checklist: newChecklist });
                                                                                }}
                                                                                className="h-4 w-4"
                                                                            />
                                                                            <span className={`text-sm flex-1 ${item.checked ? 'line-through text-muted-foreground' : ''}`}>
                                                                                {item.name}
                                                                                {item.is_required && <span className="text-red-500 ml-1">*</span>}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div className="form-group">
                                                            <Label>Firma del Técnico</Label>
                                                            <Input
                                                                value={editData.technician_signature || ''}
                                                                onChange={(e) => setEditData({ ...editData, technician_signature: e.target.value })}
                                                                placeholder="Tu nombre como firma"
                                                                data-testid="realizar-signature"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {/* Campos para CORRECTIVOS */}
                                                {order?.type === 'correctivo' && (
                                                    <>
                                                        <div className="form-group">
                                                            <Label>Notas del trabajo realizado</Label>
                                                            <Textarea
                                                                value={editData.notes || ''}
                                                                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                                                                placeholder="Describe el trabajo realizado..."
                                                                data-testid="realizar-notes"
                                                                rows={3}
                                                            />
                                                        </div>
                                                        <div className="form-group">
                                                            <Label>Causa del Fallo</Label>
                                                            <Select
                                                                value={editData.failure_cause || "none"}
                                                                onValueChange={(v) => setEditData({ ...editData, failure_cause: v === "none" ? "" : v })}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecciona la causa" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="none">Sin especificar</SelectItem>
                                                                    <SelectItem value="accidente">Accidente</SelectItem>
                                                                    <SelectItem value="mala_utilizacion">Mala utilización</SelectItem>
                                                                    <SelectItem value="desgaste">Desgaste</SelectItem>
                                                                    <SelectItem value="fatiga_acumulada">Fatiga acumulada</SelectItem>
                                                                    <SelectItem value="otros">Otros</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="form-group">
                                                                <Label>Repuesto Utilizado</Label>
                                                                <Input
                                                                    value={editData.spare_part_used || ''}
                                                                    onChange={(e) => setEditData({ ...editData, spare_part_used: e.target.value })}
                                                                    placeholder="Nombre del repuesto"
                                                                />
                                                            </div>
                                                            <div className="form-group">
                                                                <Label>Referencia</Label>
                                                                <Input
                                                                    value={editData.spare_part_reference || ''}
                                                                    onChange={(e) => setEditData({ ...editData, spare_part_reference: e.target.value })}
                                                                    placeholder="Referencia"
                                                                />
                                                            </div>
                                                        </div>
                                                    </>
                                                )}
                                                
                                                {/* Botones de acción - REALIZADA o CIERRE PARCIAL */}
                                                <div className="flex gap-3 pt-4 border-t">
                                                    <Button 
                                                        onClick={async () => {
                                                            try {
                                                                await axios.put(`${API}/work-orders/${id}`, { ...editData, status: 'completada' });
                                                                toast.success('Orden marcada como REALIZADA');
                                                                setRealizarDialogOpen(false);
                                                                fetchOrder();
                                                            } catch (error) {
                                                                toast.error('Error al marcar como realizada');
                                                            }
                                                        }} 
                                                        className="flex-1 bg-green-600 hover:bg-green-700"
                                                        data-testid="btn-realizada"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                        Realizada
                                                    </Button>
                                                    <Button 
                                                        onClick={async () => {
                                                            try {
                                                                await axios.put(`${API}/work-orders/${id}`, { ...editData, status: 'cerrada_parcial' });
                                                                toast.success('Orden con CIERRE PARCIAL');
                                                                setRealizarDialogOpen(false);
                                                                fetchOrder();
                                                            } catch (error) {
                                                                toast.error('Error al cerrar parcialmente');
                                                            }
                                                        }} 
                                                        variant="outline"
                                                        className="flex-1 border-purple-500 text-purple-600 hover:bg-purple-50"
                                                        data-testid="btn-cierre-parcial"
                                                    >
                                                        <AlertOctagon className="w-4 h-4 mr-2" />
                                                        Cierre Parcial
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                                
                                {/* Botón EDITAR solo para admin/supervisor */}
                                {hasRole(['admin', 'supervisor']) && (
                                    <Dialog open={editing} onOpenChange={setEditing}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" data-testid="edit-order-btn">
                                                <Edit className="w-4 h-4 mr-2" />
                                                Editar
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                                            <DialogHeader>
                                                <DialogTitle>Editar Orden</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 mt-4">
                                                <div className="form-group">
                                                    <Label>Estado</Label>
                                                    <Select
                                                        value={editData.status}
                                                        onValueChange={(v) => setEditData({ ...editData, status: v })}
                                                    >
                                                        <SelectTrigger data-testid="edit-status">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="pendiente">Pendiente</SelectItem>
                                                            <SelectItem value="en_progreso">En Progreso</SelectItem>
                                                            <SelectItem value="pospuesta">Pospuesta</SelectItem>
                                                            <SelectItem value="cerrada_parcial">Cerrada Parcial</SelectItem>
                                                            <SelectItem value="completada">Completada</SelectItem>
                                                            <SelectItem value="cancelada">Cancelada</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="form-group">
                                                    <Label>Prioridad</Label>
                                                    <Select
                                                        value={editData.priority}
                                                        onValueChange={(v) => setEditData({ ...editData, priority: v })}
                                                    >
                                                        <SelectTrigger data-testid="edit-priority">
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
                                                    <Label>Asignado a</Label>
                                                    <Select
                                                        value={editData.assigned_to || "none"}
                                                        onValueChange={(v) => setEditData({ ...editData, assigned_to: v === "none" ? "" : v })}
                                                    >
                                                        <SelectTrigger data-testid="edit-assigned">
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
                                                <Button onClick={handleUpdate} className="w-full" data-testid="save-edit-btn">
                                                    Guardar cambios
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                                <Badge className={order.type === 'preventivo' ? 'badge-preventivo' : 'badge-correctivo'}>
                                    {getTypeLabel(order.type)}
                                </Badge>
                                <Badge className={priorityClass[order.priority]}>
                                    {getPriorityLabel(order.priority)}
                                </Badge>
                                <Badge className={statusClass[order.status]}>
                                    {getStatusLabel(order.status)}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground">
                                {order.type === 'preventivo' ? (
                                    <><span className="font-medium text-sm">Observaciones:</span> {order.description || 'Sin observaciones'}</>
                                ) : (
                                    order.description
                                )}
                            </p>
                            {order.notes && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-medium mb-1">Notas:</p>
                                    <p className="text-sm text-muted-foreground">{order.notes}</p>
                                </div>
                            )}
                            {/* Part number - only for corrective orders */}
                            {order.type === 'correctivo' && order.part_number && (
                                <div className="p-3 bg-primary/10 rounded-lg flex items-center gap-2">
                                    <Hash className="w-4 h-4 text-primary" />
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Número de Parte</p>
                                        <p className="text-sm font-semibold text-primary">{order.part_number}</p>
                                    </div>
                                </div>
                            )}
                            {/* Checklist - only for preventive orders */}
                            {order.type === 'preventivo' && order.checklist && order.checklist.length > 0 && (
                                <div className="p-4 bg-green-500/10 rounded-lg" data-testid="order-checklist">
                                    <div className="flex items-center gap-2 mb-3">
                                        <CheckSquare className="w-4 h-4 text-green-600" />
                                        <span className="text-sm font-medium text-green-700">Checklist de Verificación</span>
                                    </div>
                                    <div className="space-y-2">
                                        {order.checklist.map((item, idx) => (
                                            <div key={item.id || idx} className="flex items-center gap-2">
                                                {item.checked ? (
                                                    <Check className="w-4 h-4 text-green-600" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-muted-foreground" />
                                                )}
                                                <span className={`text-sm ${item.checked ? 'text-green-700' : 'text-muted-foreground'}`}>
                                                    {item.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {/* Technician Signature - only for preventive orders */}
                            {order.type === 'preventivo' && order.technician_signature && (
                                <div className="p-3 bg-purple-500/10 rounded-lg flex items-center gap-2" data-testid="order-signature">
                                    <PenLine className="w-4 h-4 text-purple-600" />
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Firma del Técnico</p>
                                        <p className="text-sm font-semibold text-purple-700">{order.technician_signature}</p>
                                    </div>
                                </div>
                            )}
                            {/* Closed date - for completed orders */}
                            {order.type === 'preventivo' && order.closed_date && (
                                <div className="p-3 bg-emerald-500/10 rounded-lg flex items-center gap-2" data-testid="order-closed-date">
                                    <CalendarCheck className="w-4 h-4 text-emerald-600" />
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Fecha de Cierre</p>
                                        <p className="text-sm font-semibold text-emerald-700">{formatDateTime(order.closed_date)}</p>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                <div className="flex items-center gap-2">
                                    <Cog className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{order.machine_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{order.department_name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{formatDate(order.scheduled_date)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">{order.assigned_to_name || 'Sin asignar'}</span>
                                </div>
                            </div>
                            {order.recurrence && (
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        Programación automática: {getRecurrenceLabel(order.recurrence)}
                                    </p>
                                </div>
                            )}
                            {/* Campos específicos de correctivos */}
                            {order.type === 'correctivo' && (order.failure_cause || order.spare_part_used) && (
                                <div className="space-y-3 pt-4 border-t">
                                    {order.failure_cause && (
                                        <div className="p-3 bg-purple-500/10 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <AlertCircle className="w-4 h-4 text-purple-600" />
                                                <span className="text-xs font-medium text-purple-600">Causa del Fallo</span>
                                            </div>
                                            <p className="text-sm font-semibold text-purple-700">
                                                {getFailureCauseLabel(order.failure_cause)}
                                            </p>
                                        </div>
                                    )}
                                    {(order.spare_part_used || order.spare_part_reference) && (
                                        <div className="p-3 bg-emerald-500/10 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Wrench className="w-4 h-4 text-emerald-600" />
                                                <span className="text-xs font-medium text-emerald-600">Repuesto Utilizado</span>
                                            </div>
                                            {order.spare_part_used && (
                                                <p className="text-sm font-semibold text-emerald-700">{order.spare_part_used}</p>
                                            )}
                                            {order.spare_part_reference && (
                                                <p className="text-xs text-emerald-600 mono mt-1">Ref: {order.spare_part_reference}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Attachments */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2">
                                <Paperclip className="w-5 h-5" />
                                Archivos Adjuntos ({order.attachments?.length || 0})
                            </CardTitle>
                            <div className="relative">
                                <input
                                    type="file"
                                    multiple
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    disabled={uploading}
                                    data-testid="file-upload-input"
                                />
                                <Button variant="outline" size="sm" disabled={uploading}>
                                    {uploading ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    Subir archivo
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {!order.attachments?.length ? (
                                <div className="file-upload-zone">
                                    <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                        Arrastra archivos aquí o haz clic en Subir archivo
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Cualquier tipo de archivo permitido
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {order.attachments.map((att) => (
                                        <div key={att.id} className="attachment-preview" data-testid={`attachment-${att.id}`}>
                                            {att.file_type.startsWith('image/') ? (
                                                <img
                                                    src={`data:${att.file_type};base64,${att.data}`}
                                                    alt={att.filename}
                                                />
                                            ) : (
                                                <div className="w-full h-32 bg-muted flex items-center justify-center">
                                                    <FileText className="w-12 h-12 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="overlay gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    onClick={() => downloadAttachment(att)}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    onClick={() => handleDeleteAttachment(att.id)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <div className="p-2 bg-card">
                                                <p className="text-xs font-medium truncate">{att.filename}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatFileSize(att.file_size)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar - History */}
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="w-5 h-5" />
                                Historial
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!order.history?.length ? (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    Sin cambios registrados
                                </p>
                            ) : (
                                <div className="history-timeline">
                                    {order.history.map((entry) => (
                                        <div key={entry.id} className="history-item">
                                            <p className="text-sm font-medium">
                                                {entry.action === 'creada' && 'Orden creada'}
                                                {entry.action === 'actualizada' && `${entry.field_changed} actualizado`}
                                                {entry.action === 'archivo_adjunto' && 'Archivo adjuntado'}
                                                {entry.action === 'archivo_eliminado' && 'Archivo eliminado'}
                                            </p>
                                            {entry.old_value && entry.new_value && (
                                                <p className="text-xs text-muted-foreground">
                                                    {entry.old_value} → {entry.new_value}
                                                </p>
                                            )}
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {entry.changed_by_name} • {formatDateTime(entry.timestamp)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Meta Info */}
                    <Card className="mt-4">
                        <CardContent className="pt-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Creado por</span>
                                <span className="font-medium">{order.created_by_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Creado el</span>
                                <span className="mono">{formatDateTime(order.created_at)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Actualizado</span>
                                <span className="mono">{formatDateTime(order.updated_at)}</span>
                            </div>
                            {order.estimated_hours && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Horas estimadas</span>
                                    <span>{order.estimated_hours}h</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
