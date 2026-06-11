import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import {
    Settings, Save, AlertCircle, Info, Bell, ShieldCheck, ShieldAlert,
    CreditCard, Mail, Shield, FileText, CalendarClock, Minus, Plus,
} from 'lucide-react';
import Swal from 'sweetalert2';

const API = '/api/sepa-settings';
const NOTIF_API = '/api/notification-settings';

/** Interruptor on/off con el estilo de la app. */
function Toggle({ checked, onChange, disabled = false }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]/40 focus:ring-offset-2 ${
                checked ? 'bg-[#6E9EFF]' : 'bg-slate-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    checked ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
            />
        </button>
    );
}

/** Selector numérico de meses con botones - / +. */
function MonthStepper({ value, onChange, disabled = false, min = 1, max = 24 }) {
    const set = (n) => {
        let v = Math.trunc(Number(n));
        if (!Number.isFinite(v)) v = min;
        if (v < min) v = min;
        if (v > max) v = max;
        onChange(v);
    };
    return (
        <div className={`inline-flex items-center rounded-lg border border-slate-200 overflow-hidden ${disabled ? 'opacity-50' : ''}`}>
            <button
                type="button"
                disabled={disabled || value <= min}
                onClick={() => set(value - 1)}
                className="px-2.5 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Minus size={14} />
            </button>
            <input
                type="number"
                min={min}
                max={max}
                disabled={disabled}
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-12 text-center border-x border-slate-200 py-1.5 text-sm font-semibold text-slate-700 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
                type="button"
                disabled={disabled || value >= max}
                onClick={() => set(value + 1)}
                className="px-2.5 py-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                <Plus size={14} />
            </button>
        </div>
    );
}

/** Cabecera de tarjeta con icono. */
function CardHeader({ icon: Icon, title, subtitle, tone = 'blue' }) {
    const tones = {
        blue: 'bg-blue-50 text-[#6E9EFF]',
        amber: 'bg-amber-50 text-amber-500',
    };
    return (
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tones[tone]}`}>
                <Icon size={20} />
            </div>
            <div>
                <h2 className="text-base font-bold text-slate-800">{title}</h2>
                {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
        </div>
    );
}

const inputClass =
    'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]/30 focus:border-[#6E9EFF] transition-all';
const labelClass = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5';

export default function Configuracion() {
    const { token, user } = useAuthStore();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
    const isAppAdmin = user?.appRoleName === 'admin' || user?.role === 'ADMIN';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingNotif, setSavingNotif] = useState(false);
    const [notif, setNotif] = useState({
        seguroEnabled: true,
        seguroMonthsBefore: 1,
        subvencionEnabled: true,
        subvencionMonthsBefore: 1,
        actividadEnrollEnabled: true,
    });
    const [form, setForm] = useState({
        sepaEnabled: false,
        creditorLegalName: '',
        creditorIban: '',
        creditorIdentifier: '',
        bankExtraJson: '',
        memberChoosesPlan: false,
        memberAllowedPlanFrequencies: 'MONTHLY,QUARTERLY,YEARLY',
        defaultPlanTemplateId: '',
        requirePlanConfirmOnApproval: true,
    });

    const load = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API, { headers });
            setForm({
                sepaEnabled: !!res.data.sepaEnabled,
                creditorLegalName: res.data.creditorLegalName || '',
                creditorIban: res.data.creditorIban || '',
                creditorIdentifier: res.data.creditorIdentifier || '',
                bankExtraJson: res.data.bankExtraJson || '',
                memberChoosesPlan: !!res.data.memberChoosesPlan,
                memberAllowedPlanFrequencies: res.data.memberAllowedPlanFrequencies || 'MONTHLY,QUARTERLY,YEARLY',
                defaultPlanTemplateId: res.data.defaultPlanTemplateId != null ? String(res.data.defaultPlanTemplateId) : '',
                requirePlanConfirmOnApproval:
                    res.data.requirePlanConfirmOnApproval === undefined ? true : !!res.data.requirePlanConfirmOnApproval,
            });
            try {
                const nres = await axios.get(NOTIF_API, { headers });
                setNotif({
                    seguroEnabled: nres.data.seguroEnabled === undefined ? true : !!nres.data.seguroEnabled,
                    seguroMonthsBefore: nres.data.seguroMonthsBefore != null ? Number(nres.data.seguroMonthsBefore) : 1,
                    subvencionEnabled: nres.data.subvencionEnabled === undefined ? true : !!nres.data.subvencionEnabled,
                    subvencionMonthsBefore: nres.data.subvencionMonthsBefore != null ? Number(nres.data.subvencionMonthsBefore) : 1,
                    actividadEnrollEnabled: nres.data.actividadEnrollEnabled === undefined ? true : !!nres.data.actividadEnrollEnabled,
                });
            } catch (ne) {
                console.error('No se pudo cargar la configuración de notificaciones', ne);
            }
        } catch (e) {
            console.error(e);
            const status = e.response?.status;
            const msg = e.response?.data?.message || e.message || 'No se pudo cargar la configuración.';
            Swal.fire({
                icon: 'error',
                title: status === 403 ? 'Sin permiso' : status === 401 ? 'Sesión' : 'Error',
                text:
                    msg +
                    (status === 500
                        ? ' Si el problema persiste, contacta con el equipo técnico.'
                        : ''),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAppAdmin) {
            load();
        } else {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const setNotifField = (k, v) => setNotif((n) => ({ ...n, [k]: v }));

    const clampMonths = (v) => {
        const n = Math.trunc(Number(v));
        if (!Number.isFinite(n) || n < 1) return 1;
        if (n > 24) return 24;
        return n;
    };

    const handleSave = async (e) => {
        e.preventDefault();
        let bankExtraPayload = form.bankExtraJson.trim();
        if (bankExtraPayload) {
            try {
                JSON.parse(bankExtraPayload);
            } catch {
                bankExtraPayload = form.bankExtraJson;
            }
        } else {
            bankExtraPayload = '';
        }

        setSaving(true);
        try {
            await axios.put(
                API,
                {
                    sepaEnabled: form.sepaEnabled,
                    creditorLegalName: form.creditorLegalName.trim(),
                    creditorIban: form.creditorIban.trim(),
                    creditorIdentifier: form.creditorIdentifier.trim(),
                    bankExtraJson: bankExtraPayload || null,
                    memberChoosesPlan: !!form.memberChoosesPlan,
                    memberAllowedPlanFrequencies: form.memberAllowedPlanFrequencies,
                    defaultPlanTemplateId: form.defaultPlanTemplateId,
                    requirePlanConfirmOnApproval: !!form.requirePlanConfirmOnApproval,
                },
                { headers }
            );
            window.dispatchEvent(new Event('lumina:sepa-settings-changed'));
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'La configuración se ha actualizado.',
                timer: 2000,
                showConfirmButton: false,
            });
            load();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'No se pudo guardar.',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveNotif = async (e) => {
        e.preventDefault();
        setSavingNotif(true);
        try {
            await axios.put(
                NOTIF_API,
                {
                    seguroEnabled: !!notif.seguroEnabled,
                    seguroMonthsBefore: clampMonths(notif.seguroMonthsBefore),
                    subvencionEnabled: !!notif.subvencionEnabled,
                    subvencionMonthsBefore: clampMonths(notif.subvencionMonthsBefore),
                    actividadEnrollEnabled: !!notif.actividadEnrollEnabled,
                },
                { headers }
            );
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'La configuración de notificaciones se ha actualizado.',
                timer: 2000,
                showConfirmButton: false,
            });
            load();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'No se pudo guardar.',
            });
        } finally {
            setSavingNotif(false);
        }
    };

    // Bloqueo de acceso: solo administradores de la aplicación.
    if (!isAppAdmin) {
        return (
            <div className="w-full min-h-[calc(100vh-4rem)] bg-[#f5f5f7] flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-8 max-w-md text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <ShieldAlert className="text-red-500" size={28} />
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Acceso restringido</h1>
                    <p className="text-sm text-slate-500 mt-2">
                        La configuración del sistema solo está disponible para administradores de la aplicación.
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="w-full min-h-[calc(100vh-4rem)] bg-[#f5f5f7] flex items-center justify-center">
                <div className="animate-spin w-10 h-10 border-4 border-blue-100 border-t-[#6E9EFF] rounded-full" />
            </div>
        );
    }

    return (
        <div className="w-full min-h-[calc(100vh-4rem)] bg-[#f5f5f7] p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto pb-12">
                {/* Hero */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#6E9EFF] to-[#5B8FFF] p-6 sm:p-8 mb-8 shadow-lg shadow-blue-500/20">
                    <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/10 rounded-full" />
                    <div className="absolute right-12 top-16 w-52 h-52 bg-white/5 rounded-full" />
                    <div className="relative flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                            <Settings className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white">Configuración del sistema</h1>
                            <p className="text-blue-50/90 mt-1.5 text-sm max-w-xl">
                                Ajustes globales de la instalación: domiciliación SEPA y notificaciones automáticas por correo.
                            </p>
                            <span className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                                <ShieldCheck size={13} /> Solo administradores
                            </span>
                        </div>
                    </div>
                </div>

                {/* SEPA */}
                <form onSubmit={handleSave}>
                    <section className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden mb-8">
                        <CardHeader
                            icon={CreditCard}
                            title="SEPA / domiciliación bancaria"
                            subtitle="Activa cuando la entidad vaya a usar recibos SEPA."
                        />
                        <div className="p-6">
                            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3.5 mb-6">
                                <div className="flex items-center gap-3">
                                    <Shield className="text-[#6E9EFF]" size={18} />
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">SEPA activado para esta instalación</p>
                                        <p className="text-xs text-slate-400">La generación de remesas será manual y bajo demanda.</p>
                                    </div>
                                </div>
                                <Toggle checked={form.sepaEnabled} onChange={(v) => setField('sepaEnabled', v)} />
                            </div>

                            {form.sepaEnabled && (
                                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3 mb-6">
                                    <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                                    <p className="text-sm text-amber-900">
                                        Con SEPA activado debes completar nombre legal, IBAN del acreedor e identificador del acreedor
                                        (Creditor ID). Son obligatorios para guardar.
                                    </p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className={labelClass}>
                                        Nombre legal del acreedor {form.sepaEnabled && <span className="text-red-400">*</span>}
                                    </label>
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={form.creditorLegalName}
                                        onChange={(e) => setField('creditorLegalName', e.target.value)}
                                        placeholder="Igual que en facturas"
                                        autoComplete="organization"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelClass}>
                                            IBAN del acreedor {form.sepaEnabled && <span className="text-red-400">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            className={`${inputClass} font-mono tracking-wide`}
                                            value={form.creditorIban}
                                            onChange={(e) => setField('creditorIban', e.target.value)}
                                            placeholder="ES00 0000 0000 0000 0000 0000"
                                            spellCheck={false}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>
                                            Identificador del acreedor {form.sepaEnabled && <span className="text-red-400">*</span>}
                                        </label>
                                        <input
                                            type="text"
                                            className={`${inputClass} font-mono`}
                                            value={form.creditorIdentifier}
                                            onChange={(e) => setField('creditorIdentifier', e.target.value)}
                                            placeholder="El que facilita el banco"
                                            spellCheck={false}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}>Datos adicionales del banco (opcional, JSON o texto)</label>
                                    <textarea
                                        className={`${inputClass} font-mono min-h-[88px]`}
                                        value={form.bankExtraJson}
                                        onChange={(e) => setField('bankExtraJson', e.target.value)}
                                        placeholder='Ej: {"presentador": "..."}  o notas libres'
                                        spellCheck={false}
                                    />
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <FileText className="text-[#6E9EFF]" size={16} />
                                    <h3 className="text-sm font-bold text-slate-800">Cuotas SEPA (plan de pagos)</h3>
                                </div>
                                <p className="text-xs text-slate-400 mb-4">
                                    Define si el socio puede elegir su cuota. Si el socio elige, la selección se confirma al aprobar.
                                </p>

                                <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 mb-4">
                                    <span className="text-sm font-medium text-slate-700">¿El socio elige su cuota?</span>
                                    <Toggle checked={form.memberChoosesPlan} onChange={(v) => setField('memberChoosesPlan', v)} />
                                </div>

                                {form.memberChoosesPlan ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Opciones permitidas (CSV)</label>
                                            <input
                                                type="text"
                                                className={`${inputClass} font-mono`}
                                                value={form.memberAllowedPlanFrequencies}
                                                onChange={(e) => setField('memberAllowedPlanFrequencies', e.target.value)}
                                                placeholder="MONTHLY,QUARTERLY,YEARLY"
                                                spellCheck={false}
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                Valores: <code>MONTHLY</code>, <code>QUARTERLY</code>, <code>YEARLY</code>.
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 self-end">
                                            <span className="text-sm font-medium text-slate-700">Confirmar cuota al aprobar</span>
                                            <Toggle
                                                checked={form.requirePlanConfirmOnApproval}
                                                onChange={(v) => setField('requirePlanConfirmOnApproval', v)}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className={labelClass}>Plantilla por defecto (ID)</label>
                                            <input
                                                type="text"
                                                className={`${inputClass} font-mono`}
                                                value={form.defaultPlanTemplateId}
                                                onChange={(e) => setField('defaultPlanTemplateId', e.target.value)}
                                                placeholder="Ej: 1"
                                                spellCheck={false}
                                            />
                                            <p className="text-[11px] text-slate-400 mt-1">
                                                Si se deja vacío, al aprobar al socio se pedirá elegir una plantilla.
                                            </p>
                                        </div>
                                        <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 text-xs text-slate-600 self-end">
                                            Recomendación: crea plantillas en <strong>Recibos SEPA → Plantillas</strong>.
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6E9EFF] text-white font-semibold text-sm hover:bg-[#5b8fff] shadow-md shadow-blue-500/20 disabled:opacity-60 transition-all"
                            >
                                <Save size={18} />
                                {saving ? 'Guardando…' : 'Guardar SEPA'}
                            </button>
                        </div>
                    </section>
                </form>

                {/* Notificaciones */}
                <form onSubmit={handleSaveNotif}>
                    <section className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden">
                        <CardHeader
                            icon={Bell}
                            title="Notificaciones automáticas por correo"
                            subtitle="Avisos enviados desde info@assotea.cat"
                        />
                        <div className="p-6 space-y-4">
                            <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-4 flex gap-3">
                                <Mail className="text-[#6E9EFF] shrink-0 mt-0.5" size={18} />
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Los destinatarios se calculan automáticamente: <strong>seguros</strong> y{' '}
                                    <strong>subvenciones</strong> avisan al usuario que los creó (correo de su perfil); las{' '}
                                    <strong>inscripciones a actividades</strong> avisan a la delegación organizadora. No hace falta
                                    configurar correos aquí.
                                </p>
                            </div>

                            {/* Seguros */}
                            <div className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                                            <Shield className="text-emerald-500" size={17} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Caducidad de seguros</p>
                                            <p className="text-xs text-slate-400">Aviso al creador antes de que caduque la póliza.</p>
                                        </div>
                                    </div>
                                    <Toggle checked={notif.seguroEnabled} onChange={(v) => setNotifField('seguroEnabled', v)} />
                                </div>
                                <div className={`mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 ${notif.seguroEnabled ? '' : 'opacity-50'}`}>
                                    <span className="text-sm text-slate-600 flex items-center gap-1.5">
                                        <CalendarClock size={15} className="text-slate-400" /> Antelación del aviso
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <MonthStepper
                                            value={notif.seguroMonthsBefore}
                                            onChange={(v) => setNotifField('seguroMonthsBefore', v)}
                                            disabled={!notif.seguroEnabled}
                                        />
                                        <span className="text-sm text-slate-500">mes(es) antes</span>
                                    </div>
                                </div>
                            </div>

                            {/* Subvenciones */}
                            <div className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center">
                                            <FileText className="text-violet-500" size={17} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Fecha límite de subvenciones</p>
                                            <p className="text-xs text-slate-400">Aviso al creador antes de la fecha límite de justificación.</p>
                                        </div>
                                    </div>
                                    <Toggle checked={notif.subvencionEnabled} onChange={(v) => setNotifField('subvencionEnabled', v)} />
                                </div>
                                <div className={`mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-3 ${notif.subvencionEnabled ? '' : 'opacity-50'}`}>
                                    <span className="text-sm text-slate-600 flex items-center gap-1.5">
                                        <CalendarClock size={15} className="text-slate-400" /> Antelación del aviso
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <MonthStepper
                                            value={notif.subvencionMonthsBefore}
                                            onChange={(v) => setNotifField('subvencionMonthsBefore', v)}
                                            disabled={!notif.subvencionEnabled}
                                        />
                                        <span className="text-sm text-slate-500">mes(es) antes</span>
                                    </div>
                                </div>
                            </div>

                            {/* Inscripciones a actividades */}
                            <div className="rounded-xl border border-slate-200 p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                                            <Bell className="text-amber-500" size={17} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">Inscripciones a actividades</p>
                                            <p className="text-xs text-slate-400">
                                                Aviso inmediato a la delegación organizadora en cada inscripción.
                                            </p>
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={notif.actividadEnrollEnabled}
                                        onChange={(v) => setNotifField('actividadEnrollEnabled', v)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                            <button
                                type="submit"
                                disabled={savingNotif}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6E9EFF] text-white font-semibold text-sm hover:bg-[#5b8fff] shadow-md shadow-blue-500/20 disabled:opacity-60 transition-all"
                            >
                                <Save size={18} />
                                {savingNotif ? 'Guardando…' : 'Guardar notificaciones'}
                            </button>
                        </div>
                    </section>
                </form>

                {/* Nota auditoría */}
                <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4 flex gap-3 mt-8">
                    <Info className="text-slate-300 shrink-0" size={18} />
                    <p className="text-xs text-slate-500">
                        El servidor registra quién actualizó por última vez cada configuración. Solo los administradores de la
                        aplicación pueden editar esta pantalla.
                    </p>
                </div>
            </div>
        </div>
    );
}
