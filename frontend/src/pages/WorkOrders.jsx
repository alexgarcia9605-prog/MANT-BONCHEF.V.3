import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { cn, formatDate, getStatusLabel, getPriorityLabel, getTypeLabel } from '../lib/utils';
import {
    Plus,
    Search,
    Filter,
    ClipboardList,
    Paperclip,
    Eye
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function WorkOrders() {
    const [orders, setOrders] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordersRes, deptsRes] = await Promise.all([
                axios.get(`${API}/work-orders`),
                axios.get(`${API}/departments`)
            ]);
            setOrders(ordersRes.data);
            setDepartments(deptsRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.title.toLowerCase().includes(search.toLowerCase()) ||
            order.machine_name?.toLowerCase().includes(search.toLowerCase());
        const matchesType = typeFilter === 'all' || order.type === typeFilter;
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesDept = departmentFilter === 'all' || order.department_name === departmentFilter;
        return matchesSearch && matchesType && matchesStatus && matchesDept;
    });

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
        cancelada: 'bg-red-500/15 text-red-700'
    };

    const typeClass = {
        preventivo: 'badge-preventivo',
        correctivo: 'badge-correctivo'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="work-orders-page">
            <PageHeader
                title="Órdenes de Trabajo"
                description="Gestiona los mantenimientos preventivos y correctivos"
            >
                <Button onClick={() => navigate('/work-orders/new')} data-testid="new-order-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Orden
                </Button>
            </PageHeader>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por título o máquina..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                                data-testid="search-input"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full md:w-40" data-testid="type-filter">
                                <SelectValue placeholder="Tipo" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los tipos</SelectItem>
                                <SelectItem value="preventivo">Preventivo</SelectItem>
                                <SelectItem value="correctivo">Correctivo</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-40" data-testid="status-filter">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_progreso">En Progreso</SelectItem>
                                <SelectItem value="completada">Completada</SelectItem>
                                <SelectItem value="cancelada">Cancelada</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger className="w-full md:w-48" data-testid="dept-filter">
                                <SelectValue placeholder="Departamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los deptos.</SelectItem>
                                {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.name}>
                                        {dept.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Orders List */}
            <Card>
                <CardContent className="p-0">
                    {filteredOrders.length === 0 ? (
                        <div className="empty-state py-12">
                            <ClipboardList className="empty-state-icon" />
                            <p className="text-muted-foreground">No se encontraron órdenes</p>
                            <Button
                                variant="outline"
                                className="mt-4"
                                onClick={() => navigate('/work-orders/new')}
                            >
                                Crear primera orden
                            </Button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Orden</th>
                                        <th>Máquina</th>
                                        <th>Tipo</th>
                                        <th>Prioridad</th>
                                        <th>Estado</th>
                                        <th>Fecha Prog.</th>
                                        <th>Adj.</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id} data-testid={`order-row-${order.id}`}>
                                            <td>
                                                <div>
                                                    <p className="font-medium">{order.title}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {order.department_name}
                                                    </p>
                                                </div>
                                            </td>
                                            <td>{order.machine_name}</td>
                                            <td>
                                                <Badge className={typeClass[order.type]}>
                                                    {getTypeLabel(order.type)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge className={priorityClass[order.priority]}>
                                                    {getPriorityLabel(order.priority)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge className={statusClass[order.status]}>
                                                    {getStatusLabel(order.status)}
                                                </Badge>
                                            </td>
                                            <td className="mono text-sm">
                                                {formatDate(order.scheduled_date)}
                                            </td>
                                            <td>
                                                {order.attachments?.length > 0 && (
                                                    <div className="flex items-center gap-1 text-muted-foreground">
                                                        <Paperclip className="w-4 h-4" />
                                                        <span className="text-xs">{order.attachments.length}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/work-orders/${order.id}`)}
                                                    data-testid={`view-order-${order.id}`}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
