import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X, Calendar, MapPin, Users, Clock,
    User, Building2, Phone, Mail, CheckCircle,
    ChevronLeft, Baby, UserCircle2, Minus, Plus, Info
} from 'lucide-react';

const API_URL = '/api';

const ActivityDetailModal = ({
    isOpen,
    onClose,
    activity,
    isFull,
    status,
    isEnrolled,
    myEnrollment,
    token,
    onEnroll,
    onUnenroll
}) => {
    const [step, setStep] = useState('view');
    const [patients, setPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [selectedPatientIds, setSelectedPatientIds] = useState(new Set());
    const [guestChildren, setGuestChildren] = useState(0);
    const [guestAdults, setGuestAdults] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setStep('view');
            setSelectedPatientIds(new Set());
            setGuestChildren(0);
            setGuestAdults(0);
            setPatients([]);
            return;
        }
        if (isOpen && step === 'enroll' && token) {
            let cancelled = false;
            (async () => {
                try {
                    setLoadingPatients(true);
                    const res = await axios.get(`${API_URL}/pacientes/me`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!cancelled) setPatients(res.data?.patients || []);
                } catch (e) {
                    if (!cancelled) setPatients([]);
                } finally {
                    if (!cancelled) setLoadingPatients(false);
                }
            })();
            return () => { cancelled = true; };
        }
    }, [isOpen, step, token]);

    if (!isOpen || !activity) return null;

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    };

    const enrolledCount = (activity._count?.socios || 0) + (activity._count?.patients || 0);
    const slotsIfEnroll = 1 + selectedPatientIds.size;
    const wouldExceed =
        activity.maxCapacity != null &&
        enrolledCount + slotsIfEnroll > activity.maxCapacity;

    const togglePatient = (id) => {
        setSelectedPatientIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const bump = (setter, delta, current) => {
        const n = Math.max(0, Math.min(50, current + delta));
        setter(n);
    };

    const handleConfirmEnroll = async () => {
        if (wouldExceed || submitting) return;
        setSubmitting(true);
        try {
            await onEnroll(activity.id, {
                patientIds: Array.from(selectedPatientIds),
                guestChildrenUnder18: guestChildren,
                guestAdults18Plus: guestAdults
            });
            setStep('view');
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    const detailBody = (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600 shrink-0">
                            <Calendar size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Cuándo</p>
                            <p className="font-semibold text-slate-700 text-sm capitalize">{formatDateTime(activity.startTime)}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Hasta {formatDateTime(activity.endTime)}</p>
                        </div>
                    </div>
                </div>

                {activity.location && (
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600 shrink-0">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Dónde</p>
                                <p className="font-semibold text-slate-700 text-sm">{activity.location}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {activity.description && (
                <div className="mb-8">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        Acerca de esta actividad
                    </h3>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                            {activity.description}
                        </p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        Organiza
                    </h3>
                    <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                                {activity.organizerName ? activity.organizerName.charAt(0).toUpperCase() : <User size={16} />}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-slate-700 text-sm truncate">{activity.organizerName || 'Organización Lumina'}</p>
                                <div className="flex items-center gap-1 mt-0.5 text-slate-500 text-xs">
                                    <Building2 size={12} />
                                    <span className="truncate">{activity.organizerDelegation || 'General'}</span>
                                </div>
                            </div>
                        </div>
                        {(activity.organizerPhone || activity.organizerEmail) && (
                            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                                {activity.organizerPhone && (
                                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500">
                                        <Phone size={14} className="text-slate-400" /> {activity.organizerPhone}
                                    </p>
                                )}
                                {activity.organizerEmail && (
                                    <p className="flex items-center gap-2 text-xs font-medium text-slate-500 truncate">
                                        <Mail size={14} className="text-slate-400" /> {activity.organizerEmail}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Plazas e inscripción
                        </h3>
                        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${isFull ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    <Users size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Ocupadas (aforo)</p>
                                    <p className={`text-base font-black ${isFull ? 'text-rose-600' : 'text-slate-700'}`}>
                                        {enrolledCount} <span className="text-sm text-slate-400 font-medium">/ {activity.maxCapacity || 'Ilimitadas'}</span>
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-snug flex items-start gap-1">
                                        <Info size={12} className="shrink-0 mt-0.5 text-slate-400" />
                                        El aforo cuenta el titular y los pacientes inscritos, no los invitados adicionales.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {activity.registrationDeadline && (
                        <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100 flex items-center gap-3">
                            <div className="p-2.5 bg-white rounded-xl shadow-sm text-amber-500 shrink-0">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-amber-500/70 uppercase tracking-widest mb-0.5">Cierre de inscripción</p>
                                <p className="font-bold text-slate-700 text-sm">
                                    {formatDateTime(activity.registrationDeadline)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {isEnrolled && myEnrollment && (
                <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                    <p className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-3">Tu inscripción</p>
                    <p className="text-sm text-slate-700 mb-2">
                        <span className="font-bold">Pacientes:</span>{' '}
                        {myEnrollment.patients?.length
                            ? myEnrollment.patients.map((p) => `${p.name} ${p.lastName || ''}`.trim()).join(', ')
                            : 'Ninguno (solo asistes tú como titular)'}
                    </p>
                    <p className="text-sm text-slate-600">
                        <span className="font-bold">Invitados (no ocupan plaza):</span>{' '}
                        {myEnrollment.guestChildrenUnder18 || 0} menor(es) de 18 ·{' '}
                        {myEnrollment.guestAdults18Plus || 0} adulto(s)
                    </p>
                </div>
            )}
        </>
    );

    const enrollBody = (
        <div className="space-y-8">
            <button
                type="button"
                onClick={() => setStep('view')}
                className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800"
            >
                <ChevronLeft size={18} /> Volver al detalle
            </button>

            <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <Users size={16} className="text-indigo-500" />
                    1. ¿Qué pacientes asisten?
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    Marca los pacientes de tu cuenta que participan. Tú como titular siempre cuentas como una plaza.
                </p>
                {loadingPatients ? (
                    <div className="flex justify-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-600 border-t-transparent" />
                    </div>
                ) : patients.length === 0 ? (
                    <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-4 border border-slate-100">
                        No tienes pacientes dados de alta. Puedes inscribirte solo como titular (1 plaza).
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {patients.map((p) => (
                            <li key={p.id}>
                                <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-indigo-300 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedPatientIds.has(p.id)}
                                        onChange={() => togglePatient(p.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <p className="font-semibold text-slate-800 text-sm">
                                            {p.name} {p.lastName || ''}
                                        </p>
                                        <p className="text-xs text-slate-500">{p.patientCode || p.id.slice(0, 8)}</p>
                                    </div>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div>
                <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <UserCircle2 size={16} className="text-violet-500" />
                    2. Invitados adicionales (no cuentan en el aforo)
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                    Indica cuántas personas acompañan fuera de los pacientes registrados: menores de 18 y adultos (18 o más).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-center gap-2 mb-3 text-slate-700">
                            <Baby size={18} className="text-sky-600" />
                            <span className="text-xs font-black uppercase tracking-widest">Menores de 18</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => bump(setGuestChildren, -1, guestChildren)}
                                className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
                            >
                                <Minus size={18} />
                            </button>
                            <span className="text-2xl font-black text-slate-800 tabular-nums">{guestChildren}</span>
                            <button
                                type="button"
                                onClick={() => bump(setGuestChildren, 1, guestChildren)}
                                className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                        <div className="flex items-center gap-2 mb-3 text-slate-700">
                            <UserCircle2 size={18} className="text-amber-600" />
                            <span className="text-xs font-black uppercase tracking-widest">Adultos (+18)</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => bump(setGuestAdults, -1, guestAdults)}
                                className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
                            >
                                <Minus size={18} />
                            </button>
                            <span className="text-2xl font-black text-slate-800 tabular-nums">{guestAdults}</span>
                            <button
                                type="button"
                                onClick={() => bump(setGuestAdults, 1, guestAdults)}
                                className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`rounded-xl p-4 text-sm ${wouldExceed ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-indigo-50 text-indigo-900 border border-indigo-100'}`}>
                <p className="font-bold mb-1">Resumen de plazas de aforo</p>
                <p>
                    Usarás <strong>{slotsIfEnroll}</strong> plaza(s): 1 titular
                    {selectedPatientIds.size > 0 ? ` + ${selectedPatientIds.size} paciente(s)` : ''}.
                </p>
                {activity.maxCapacity != null && (
                    <p className="mt-1 text-xs opacity-90">
                        Quedan {Math.max(0, activity.maxCapacity - enrolledCount)} libres antes de tu inscripción.
                        {wouldExceed && ' — Con esta selección superas el aforo.'}
                    </p>
                )}
                <p className="mt-2 text-xs opacity-80">
                    Invitados registrados: {guestChildren} menor(es), {guestAdults} adulto(s) — informativo, no restan plazas.
                </p>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                    <div>
                        <span className={`inline-block px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border mb-3 ${status.color}`}>
                            {status.label}
                        </span>
                        <h2 className="text-2xl font-black text-slate-800 leading-tight">
                            {step === 'enroll' ? 'Inscripción' : activity.title}
                        </h2>
                        {step === 'enroll' && (
                            <p className="text-xs text-slate-500 mt-1 font-medium">{activity.title}</p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0 shadow-sm self-start"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {step === 'view' ? detailBody : enrollBody}
                </div>

                <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-3 justify-end items-center">
                    {step === 'view' ? (
                        <>
                            <button
                                onClick={onClose}
                                className="w-full sm:w-auto px-6 py-3 font-bold text-sm text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cerrar
                            </button>
                            {isEnrolled ? (
                                <button
                                    onClick={() => { onUnenroll(activity.id); onClose(); }}
                                    className="w-full sm:w-auto px-6 py-3 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-sm uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-colors border border-emerald-200 shadow-sm"
                                >
                                    <CheckCircle size={18} /> Apuntado (Cancelar)
                                </button>
                            ) : (
                                <button
                                    onClick={() => setStep('enroll')}
                                    disabled={isFull || !status.active}
                                    className={`w-full sm:w-auto px-8 py-3 font-bold text-sm uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
                                        isFull || !status.active
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md border border-indigo-700'
                                    }`}
                                >
                                    {isFull ? 'Aforo completo' : (!status.active ? 'No disponible' : 'Inscribirse')}
                                </button>
                            )}
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setStep('view')}
                                className="w-full sm:w-auto px-6 py-3 font-bold text-sm text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmEnroll}
                                disabled={wouldExceed || submitting || !status.active}
                                className={`w-full sm:w-auto px-8 py-3 font-bold text-sm uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm ${
                                    wouldExceed || submitting || !status.active
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700'
                                }`}
                            >
                                {submitting ? 'Enviando…' : 'Confirmar inscripción'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityDetailModal;
