import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, AlertCircle, Phone, Mail, User, Shield, Eye, EyeOff } from 'lucide-react';
import Input from '../components/Input';
import Button from '../components/Button';
import Card from '../components/Card';
import axios from 'axios';

const Register = () => {
    const navigate = useNavigate();

    // Form State
    const [formData, setFormData] = useState({
        socioName: '',
        phone: '',
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post('/api/auth/register', formData);
            setSuccess(true);
            setTimeout(() => {
                navigate('/login');
            }, 3000); // Redirect after 3 seconds
        } catch (err) {
            if (err.response && err.response.data && err.response.data.message) {
                setError(err.response.data.message);
            } else {
                setError('Error al conectar con el servidor. Inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
                <Card className="max-w-md text-center p-8">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserPlus size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Registro Completado!</h2>
                    <p className="text-slate-600 mb-6">
                        Te has registrado correctamente. Ahora estás en la <strong>Lista de Espera</strong>.
                        Cuando seas socio podrás dar de alta a hijos/as desde <strong>Mis pacientes</strong>.
                        Serás redirigido al inicio de sesión en unos segundos…
                    </p>
                    <Link to="/login">
                        <Button className="w-full justify-center">Ir al Login ahora</Button>
                    </Link>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 py-10">
            <div className="mb-8 text-center animate-fade-in-up flex flex-col items-center">
                <img src="/Logo_alt.png" alt="Lumina Logo" className="h-[60px] w-auto object-contain mb-2" />
                <p className="text-slate-500 mt-2 text-sm font-medium tracking-wide uppercase">Registro de Socios - Lista de Espera</p>
            </div>

            <div className="w-full max-w-3xl animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                <Card className="border-0 shadow-xl shadow-slate-200/50">
                    <div className="px-6 py-8 border-b border-slate-100 bg-white rounded-t-2xl">
                        <h2 className="text-2xl font-bold text-slate-800">Solicitud de Registro</h2>
                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            Completa este formulario para registrarte como padre/madre/tutor. Tu solicitud pasará a la lista de espera.
                            Los datos del menor se pedirán en el <strong>formulario de alta</strong> y, una vez aprobado, podrás crear la ficha del paciente en <strong>Mis pacientes</strong>.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 sm:p-8 bg-slate-50/30">

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-100 mx-2">
                                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Col 1: Datos del Socio */}
                            <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <User size={16} className="text-blue-500" /> Contacto (Socio)
                                </h3>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Nombre y Apellidos (Contacto/Parentesco)</label>
                                    <Input
                                        type="text"
                                        name="socioName"
                                        value={formData.socioName}
                                        onChange={handleChange}
                                        placeholder="Ej: María García (Madre)"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Teléfono de Contacto</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <Input
                                            type="tel"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="600 000 000"
                                            className="pl-9"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">Correo Electrónico</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <Input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="correo@ejemplo.com"
                                            className="pl-9"
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Col 2: Cuenta */}
                            <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Shield size={16} className="text-violet-500" /> Accesos
                                </h3>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-2">Usuario</label>
                                        <Input
                                            type="text"
                                            name="username"
                                            value={formData.username}
                                            onChange={handleChange}
                                            placeholder="Usuario"
                                            required
                                            disabled={isLoading}
                                            className="py-3.5 text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-2">Contraseña</label>
                                        <div className="relative">
                                            <Input
                                                type={showPassword ? 'text' : 'password'}
                                                name="password"
                                                value={formData.password}
                                                onChange={handleChange}
                                                placeholder="Tu contraseña"
                                                required
                                                disabled={isLoading}
                                                className="py-3.5 pr-11 text-base"
                                            />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none">
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-600 mb-2">Confirmar contraseña</label>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                name="confirmPassword"
                                                value={formData.confirmPassword}
                                                onChange={handleChange}
                                                placeholder="Repite la contraseña"
                                                required
                                                disabled={isLoading}
                                                className="py-3.5 pr-11 text-base"
                                            />
                                            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none">
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 flex flex-col items-center gap-5">
                            <Button
                                type="submit"
                                className="w-full sm:w-80 flex justify-center py-3.5 text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all font-bold tracking-wide"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Procesando registro...' : 'Enviar Solicitud'}
                            </Button>

                            <p className="text-center text-sm text-slate-500 font-medium bg-white px-6 py-2 rounded-full border border-slate-100 shadow-sm">
                                ¿Ya has enviado tu solicitud o tienes cuenta?{' '}
                                <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 hover:underline transition-colors ml-1">
                                    Inicia sesión aquí
                                </Link>
                            </p>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default Register;
