import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { Wrench, Loader2 } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            toast.success('Bienvenido a Bonchef Mantenimiento');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Error al iniciar sesión');
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
                        <CardTitle className="text-xl">Iniciar Sesión</CardTitle>
                        <CardDescription>
                            Ingresa tus credenciales para acceder
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                                    data-testid="login-email"
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
                                    data-testid="login-password"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full h-12 text-base font-semibold"
                                disabled={loading}
                                data-testid="login-submit"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    'Iniciar Sesión'
                                )}
                            </Button>
                        </form>
                        <div className="mt-6 text-center">
                            <p className="text-sm text-muted-foreground">
                                ¿No tienes cuenta?{' '}
                                <Link
                                    to="/register"
                                    className="text-primary font-medium hover:underline"
                                    data-testid="register-link"
                                >
                                    Regístrate aquí
                                </Link>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
