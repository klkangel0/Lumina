import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import axios from 'axios';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response = await axios.post('/api/auth/login', {
                username,
                password,
            });

            // On success, save to Zustand and redirect based on role
            login(response.data.user, response.data.token);
            if (response.data.user.role === 'SOCIO') {
                if (response.data.user.socioStatus === 'PENDING') {
                    navigate('/lista-espera');
                } else {
                    navigate('/mis-pacientes');
                }
            } else {
                navigate('/');
            }

        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Error al conectar con el servidor. Verifica que la API esté encendida.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            {/* Lumina Logo/Branding Placeholder */}
            <div className="mb-8 text-center animate-fade-in-up flex flex-col items-center">
                <div className="flex items-center justify-center gap-3">
                    <img src="/Logo_alt.png" alt="Lumina Logo" className="h-[70px] w-auto object-contain" />
                    <span className="text-sm bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full font-semibold relative top-[-10px]">1.0</span>
                </div>
                <p className="text-slate-500 mt-2 text-sm font-medium tracking-wide">ASOTEA MARTORELL</p>
            </div>

            <div className="w-full max-w-md">
                <Card>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-semibold text-slate-800">Iniciar Sesión</h2>
                        <p className="text-sm text-slate-500 mt-1">Ingresa tus credenciales para acceder</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-100">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Ej: admin"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                disabled={isLoading}
                            />
                        </div>

                        <div className="text-right">
                            <Link
                                to="/recuperar-contrasena"
                                className="text-sm text-blue-600 font-medium hover:underline"
                            >
                                ¿Has olvidado tu contraseña?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full flex justify-center py-2.5 mt-2"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Conectando...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <LogIn size={20} /> Entrar al sistema
                                </span>
                            )}
                        </Button>
                    </form>
                </Card>
            </div>

            <div className="mt-8 text-center text-sm text-slate-400 space-y-4">
                <p>
                    ¿Quieres solicitar plaza en Asotea?{' '}
                    <Link to="/register" className="text-blue-600 font-semibold hover:underline">
                        Regístrate para la lista de espera
                    </Link>
                </p>
                <p>&copy; {new Date().getFullYear()} Lumina. Todos los derechos reservados.</p>
            </div>
        </div>
    );
};

export default Login;
