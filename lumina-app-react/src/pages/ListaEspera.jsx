import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import Card from '../components/Card';
import useAuthStore from '../store/authStore';
import { Clock, ShieldAlert, CheckCircle2, FileBadge, User, ClipboardList, RefreshCw, Loader2 } from 'lucide-react';
import { evaluatePostuladorProfileComplete } from '../utils/postuladorOnboarding';

const API = '/api';

const ListaEspera = () => {
    const { user, token } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [formComplete, setFormComplete] = useState(false);
    const [profileEval, setProfileEval] = useState({ ok: false, missing: [] });

    const loadStatus = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [qRes, pRes] = await Promise.all([
                axios.get(`${API}/socios/me/questionnaire`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
                axios.get(`${API}/profile`, {
                    headers: { Authorization: `Bearer ${token}` },
                }),
            ]);
            setFormComplete(!!qRes.data?.completeness?.ok);
            setProfileEval(evaluatePostuladorProfileComplete(pRes.data));
        } catch (e) {
            console.error(e);
            setFormComplete(false);
            setProfileEval({ ok: false, missing: ['No se pudo comprobar el estado. Intenta actualizar.'] });
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        loadStatus();
    }, [loadStatus]);

    useEffect(() => {
        const onVis = () => {
            if (document.visibilityState === 'visible') loadStatus();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => document.removeEventListener('visibilitychange', onVis);
    }, [loadStatus]);

    const profileComplete = profileEval.ok;
    const dataComplete = formComplete && profileComplete;
    /** 1=registro OK, 2=pendiente datos, 3=a la espera junta, 4=futuro socio */
    const activeStep = dataComplete ? 3 : 2;

    const steps = [
        {
            n: 1,
            title: 'Registro',
            short: 'Cuenta creada',
            body: 'Has solicitado formar parte de Asotea y ya tienes usuario en la lista de espera.',
            icon: 'check',
        },
        {
            n: 2,
            title: 'Datos por completar',
            short: 'Formulario y perfil',
            body: 'Completa el formulario de alta y tu ficha en Mi perfil (datos obligatorios) para que la junta pueda valorar tu solicitud.',
            icon: 'clock',
        },
        {
            n: 3,
            title: 'Pendiente de aprobación',
            short: 'En revisión',
            body: 'Tu expediente está listo. La junta revisará la solicitud. Recibirás acceso al panel completo cuando te den de alta.',
            icon: 'clock',
        },
        {
            n: 4,
            title: 'Alta como socio',
            short: 'Acceso completo',
            body: 'Tras la aprobación administrativa pasarás a ser socio y podrás usar Mis pacientes, actividades y el resto de herramientas.',
            icon: 'shield',
        },
    ];

    return (
        <div className="p-8 max-w-5xl mx-auto mt-10">
            <Card className="p-10 text-center border-t-4 border-amber-400">
                <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock size={40} />
                </div>

                <h1 className="text-3xl font-bold text-slate-800 mb-4">
                    Hola, {user?.name || 'Futuro Socio'} 👋
                </h1>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                    <button
                        type="button"
                        onClick={() => loadStatus()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        Actualizar estado
                    </button>
                </div>

                <div className="bg-amber-50/50 rounded-xl p-6 mb-8 max-w-3xl mx-auto border border-amber-100/50 text-left">
                    <p className="text-lg text-slate-600 mb-2">
                        Tu solicitud para formar parte de Asotea está en nuestra <strong>lista de espera</strong>.
                    </p>
                    {activeStep === 2 && (
                        <>
                            <p className="text-slate-700 mb-3 font-medium">
                                Falta completar parte de tu expediente. Revisa el paso <strong>2 · Datos por completar</strong> abajo.
                            </p>
                            <ul className="text-sm text-slate-600 space-y-2 mb-4">
                                {!formComplete && (
                                    <li className="flex gap-2 items-start">
                                        <ClipboardList className="shrink-0 text-amber-600 mt-0.5" size={18} />
                                        <span>
                                            Envía el{' '}
                                            <Link to="/formulario-alta" className="font-semibold text-[#6E9EFF] hover:underline">
                                                formulario de alta
                                            </Link>{' '}
                                            (todas las partes hasta finalizar).
                                        </span>
                                    </li>
                                )}
                                {!profileComplete && (
                                    <li className="flex gap-2 items-start">
                                        <User className="shrink-0 text-amber-600 mt-0.5" size={18} />
                                        <span>
                                            Completa los datos obligatorios en{' '}
                                            <Link to="/mi-perfil" className="font-semibold text-[#6E9EFF] hover:underline">
                                                Mi perfil
                                            </Link>{' '}
                                            (apellidos con dos apellidos, DNI/NIE, dirección, código postal, teléfono y correo).
                                        </span>
                                    </li>
                                )}
                            </ul>
                            {profileEval.missing?.length > 0 && (
                                <div className="rounded-lg bg-white/80 border border-amber-100 px-4 py-3 mb-3">
                                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
                                        Pendiente en perfil
                                    </p>
                                    <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
                                        {profileEval.missing.map((m) => (
                                            <li key={m}>{m}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                    {activeStep === 3 && (
                        <p className="text-slate-600 mb-4">
                            Tu formulario y tu perfil están completos. El siguiente paso es la <strong>validación por la junta</strong>{' '}
                            (paso 3). Sigue revisando{' '}
                            <Link to="/mis-documentos" className="font-semibold text-[#6E9EFF] hover:underline">
                                Mis documentos
                            </Link>{' '}
                            por si falta algún archivo.
                        </p>
                    )}
                    <p className="text-sm font-semibold text-slate-700 mb-2">Recomendaciones</p>
                    <ul className="text-sm text-slate-600 space-y-2 pl-1">
                        <li className="flex gap-2 items-start">
                            <FileBadge className="shrink-0 text-amber-600 mt-0.5" size={18} />
                            <span>
                                Revisa{' '}
                                <Link to="/mis-documentos" className="font-semibold text-[#6E9EFF] hover:underline">
                                    Mis documentos
                                </Link>{' '}
                                y sube cualquier documento que aún falte.
                            </span>
                        </li>
                        <li className="flex gap-2 items-start">
                            <User className="shrink-0 text-amber-600 mt-0.5" size={18} />
                            <span>
                                Mantén actualizada tu información en{' '}
                                <Link to="/mi-perfil" className="font-semibold text-[#6E9EFF] hover:underline">
                                    Mi perfil
                                </Link>
                                .
                            </span>
                        </li>
                    </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left max-w-6xl mx-auto mt-10">
                    {steps.map((s) => {
                        const done = s.n === 1 || (s.n === 2 && activeStep > 2) || (s.n === 3 && activeStep > 3);
                        const current = s.n === activeStep;
                        const future = s.n > activeStep;

                        return (
                            <div
                                key={s.n}
                                className={`rounded-xl p-4 border shadow-sm relative min-h-[180px] flex flex-col ${
                                    current
                                        ? 'bg-white border-2 border-amber-400 ring-1 ring-amber-200/50'
                                        : done
                                          ? 'bg-slate-50 border border-slate-100'
                                          : 'bg-slate-50/80 border border-slate-100 opacity-80'
                                }`}
                            >
                                {current && (
                                    <div className="absolute -top-2 -right-2">
                                        <span className="flex h-6 w-6 relative">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                                            <span className="relative inline-flex rounded-full h-6 w-6 bg-amber-500 border-2 border-white items-center justify-center text-[10px] text-white font-bold">
                                                !
                                            </span>
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 mb-2">
                                    {s.icon === 'check' || done ? (
                                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={16} />
                                        </div>
                                    ) : s.icon === 'shield' ? (
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                            <ShieldAlert size={16} />
                                        </div>
                                    ) : (
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                                current ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'
                                            }`}
                                        >
                                            <Clock size={16} />
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                            {s.n}. {s.title}
                                        </p>
                                        <p className="text-xs text-slate-500 leading-tight">{s.short}</p>
                                    </div>
                                </div>
                                <p
                                    className={`text-sm mt-1 flex-1 leading-snug ${
                                        current ? 'text-slate-700 font-medium' : future ? 'text-slate-500' : 'text-slate-600'
                                    }`}
                                >
                                    {s.body}
                                </p>
                                {current && (
                                    <p className="text-xs font-semibold text-amber-800 mt-2">Estás aquí.</p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default ListaEspera;
