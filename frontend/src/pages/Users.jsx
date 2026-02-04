import { useState, useEffect } from 'react';
import axios from 'axios';
import { PageHeader } from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { getRoleLabel, formatDate } from '../lib/utils';
import {
    Users as UsersIcon,
    Shield,
    User,
    Mail,
    Trash2,
    Plus,
    Loader2,
    Eye,
    EyeOff,
    Key
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Users() {
    const { hasRole, user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '',
        email: '',
        password: '',
        role: 'tecnico'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API}/users`);
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await axios.put(`${API}/users/${userId}/role?role=${newRole}`);
            toast.success('Rol actualizado');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al actualizar rol');
        }
    };

    const handleDelete = async (userId) => {
        if (!window.confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await axios.delete(`${API}/users/${userId}`);
            toast.success('Usuario eliminado');
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al eliminar usuario');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        if (!newUser.name || !newUser.email || !newUser.password) {
            toast.error('Completa todos los campos');
            return;
        }
        if (newUser.password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setSaving(true);
        try {
            await axios.post(`${API}/auth/register-admin`, newUser);
            toast.success('Usuario creado correctamente');
            setDialogOpen(false);
            setNewUser({ name: '', email: '', password: '', role: 'tecnico' });
            fetchUsers();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al crear usuario');
        } finally {
            setSaving(false);
        }
    };

    const roleClass = {
        admin: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
        supervisor: 'bg-blue-500/15 text-blue-700 border-blue-500/30',
        tecnico: 'bg-green-500/15 text-green-700 border-green-500/30',
        encargado_linea: 'bg-orange-500/15 text-orange-700 border-orange-500/30'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in" data-testid="users-page">
            <PageHeader
                title="Usuarios"
                description="Gestiona los usuarios y sus roles"
            />

            <Card>
                <CardContent className="p-0">
                    {users.length === 0 ? (
                        <div className="empty-state py-12">
                            <UsersIcon className="empty-state-icon" />
                            <p className="text-muted-foreground">No hay usuarios registrados</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Usuario</th>
                                        <th>Email</th>
                                        <th>Rol</th>
                                        <th>Registrado</th>
                                        {hasRole(['admin']) && <th>Acciones</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((u) => (
                                        <tr key={u.id} data-testid={`user-row-${u.id}`}>
                                            <td>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                                        <User className="w-5 h-5 text-muted-foreground" />
                                                    </div>
                                                    <span className="font-medium">{u.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Mail className="w-4 h-4" />
                                                    {u.email}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge className={roleClass[u.role]}>
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    {getRoleLabel(u.role)}
                                                </Badge>
                                            </td>
                                            <td className="mono text-sm">
                                                {formatDate(u.created_at)}
                                            </td>
                                            {hasRole(['admin']) && (
                                                <td>
                                                    <div className="flex items-center gap-2">
                                                        {u.id !== currentUser?.id && (
                                                            <>
                                                                <Select
                                                                    value={u.role}
                                                                    onValueChange={(v) => handleRoleChange(u.id, v)}
                                                                >
                                                                    <SelectTrigger className="w-40" data-testid={`role-select-${u.id}`}>
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="tecnico">Técnico</SelectItem>
                                                                        <SelectItem value="encargado_linea">Encargado Línea</SelectItem>
                                                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                                                        <SelectItem value="admin">Administrador</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleDelete(u.id)}
                                                                    className="text-destructive hover:text-destructive"
                                                                    data-testid={`delete-user-${u.id}`}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
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
