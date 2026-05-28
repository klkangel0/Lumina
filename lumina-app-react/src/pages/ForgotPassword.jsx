import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, KeyRound, Lock, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const API = '/api';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [hint, setHint] = useState('');

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');
        setHint('');
        setLoading(true);
        try {
            const res = await axios.post(`${API}/auth/forgot-password`, { email: email.trim() });
            setHint(res.data?.message || '');
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo enviar la solicitud.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        const digits = code.replace(/\D/g, '').slice(0, 6);
        if (digits.length !== 6) {
            setError('Introduzca el código de 6 dígitos.');
            return;
        }
        setLoading(true);
        try {
            const res = await axios.post(`${API}/auth/verify-reset-code`, {
                email: email.trim(),
                code: digits,
            });
            setResetToken(res.data.resetToken);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.message || 'Código no válido.');
        } finally {
            setLoading(false);
        }
    };

    const handleSetPassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden.');
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${API}/auth/reset-password-with-token`, {
                resetToken,
                newPassword,
                confirmPassword,
            });
            setDone(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.message || 'No se pudo actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
            <div className="mb-6 text-center flex flex-col items-center">
                <img src="/Logo_alt.png" alt="Lumina" className="h-[56px] w-auto object-contain mb-2" />
                <p className="text-slate-500 text-sm font-medium tracking-wide">ASOTEA MARTORELL</p>
            </div>

            <div className="w-full max-w-md">
                <Card>
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-semibold text-slate-800">Recuperar contraseña</h2>
                        <p className="text-sm text-slate-500 mt-2">
                            {step === 1 && 'Indique el correo con el que se registró. Le enviaremos un código.'}
                            {step === 2 && 'Revise su bandeja de entrada (y spam) e introduzca el código de 6 dígitos.'}
                            {step === 3 && 'Elija una nueva contraseña para su cuenta.'}
                        </p>
                    </div>

                    {done ? (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={28} />
                            </div>
                            <p className="text-slate-700">Contraseña actualizada. Redirigiendo al inicio de sesión…</p>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-start gap-2 border border-red-100 mb-4">
                                    <AlertCircle size={18} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {step === 1 && (
                                <form onSubmit={handleSendCode} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Correo electrónico
                                        </label>
                                        <div className="relative">
                                            <Mail
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={18}
                                            />
                                            <Input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="correo@ejemplo.org"
                                                required
                                                disabled={loading}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full justify-center py-2.5" disabled={loading}>
                                        {loading ? 'Enviando…' : 'Enviar código'}
                                    </Button>
                                </form>
                            )}

                            {step === 2 && (
                                <form onSubmit={handleVerifyCode} className="space-y-4">
                                    {hint && (
                                        <p className="text-sm text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2">
                                            {hint}
                                        </p>
                                    )}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Código de 6 dígitos
                                        </label>
                                        <div className="relative">
                                            <KeyRound
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={18}
                                            />
                                            <Input
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="one-time-code"
                                                maxLength={6}
                                                value={code}
                                                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="000000"
                                                required
                                                disabled={loading}
                                                className="pl-10 tracking-[0.35em] font-mono text-lg text-center"
                                            />
                                        </div>
                                    </div>
                                    <Button type="submit" className="w-full justify-center py-2.5" disabled={loading}>
                                        {loading ? 'Comprobando…' : 'Verificar código'}
                                    </Button>
                                    <button
                                        type="button"
                                        className="w-full text-sm text-blue-600 hover:underline"
                                        onClick={() => {
                                            setStep(1);
                                            setCode('');
                                            setError('');
                                            setHint('');
                                        }}
                                    >
                                        Cambiar correo / reenviar código
                                    </button>
                                </form>
                            )}

                            {step === 3 && (
                                <form onSubmit={handleSetPassword} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Nueva contraseña
                                        </label>
                                        <div className="relative">
                                            <Lock
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                                size={18}
                                            />
                                            <Input
                                                type="password"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                minLength={6}
                                                required
                                                disabled={loading}
                                                className="pl-10"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Confirmar contraseña
                                        </label>
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            minLength={6}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full justify-center py-2.5" disabled={loading}>
                                        {loading ? 'Guardando…' : 'Guardar nueva contraseña'}
                                    </Button>
                                </form>
                            )}
                        </>
                    )}

                    <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600"
                        >
                            <ArrowLeft size={16} />
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
