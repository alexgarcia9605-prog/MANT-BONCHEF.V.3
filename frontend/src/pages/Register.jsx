import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import { Wrench, Loader2 } from 'lucide-react';

export default function Register() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('tecnico');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        setLoading(true);
        try {
            await register(email, password, name, role);
            toast.success('Cuenta creada exitosamente');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid-texture flex items-center justify-center p-4">
            <div className="w-full max-w-md animate-slide-up">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                        <Wrench className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">Bonchef</h1>
                        <p className="text-sm text-muted-foreground">Mantenimiento</p>
                    </div>
                </div>

                <Card className="border-border/50 shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl">Crear Cuenta</CardTitle>
                        <CardDescription>
                            Completa los datos para registrarte
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="form-group">
                                <Label htmlFor="name" className="form-label">
                                    Nombre completo
                                </Label>
                                <Input
                                    id="name"
                                    type="text"
                                    placeholder="Juan Pérez"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    data-testid="register-name"
                                />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="email" className="form-label">
                                    Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    data-testid="register-email"
                                />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="password" className="form-label">
                                    Contraseña
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    data-testid="register-password"
                                />
                            </div>
                            <div className="form-group">
                                <Label htmlFor="role" className="form-label">
                                    Rol
                                </Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger data-testid="register-role">
                                        <SelectValue placeholder="Selecciona un rol" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="tecnico">Técnico</SelectItem>
                                        <SelectItem value="supervisor">Supervisor</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold"
                                disabled={loading}
                                data-testid="register-submit"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Crear Cuenta'
                                )}
                            </Button>
                        </form>
                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                ¿Ya tienes cuenta?{' '}
                                <Link
                                    to="/login"
                                    className="text-primary font-medium hover:underline"
                                    data-testid="login-link"
                                >
                                    Inicia sesión
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
