import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import {
    User, Mail, Save, Camera, ClipboardCheck, AlertCircle, CheckCircle2,
    MapPin, CreditCard, Hash, Building2, Lock, Eye, EyeOff, Wand2,
} from 'lucide-react';
import Swal from 'sweetalert2';
import {
    MUNICIPIOS_DELEGACION,
    MUNICIPIOS_RESTO_ALFABETICO,
    getDefaultPostalYciudad,
} from '../data/baixLlobregatMunicipios';
import { validateIban } from '../utils/ibanValidation';
// Mandate UMR is managed by admins; members don't edit it here.

const API = '/api';

function formatDateInput(isoOrDate) {
    if (!isoOrDate) return '';
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
}

function splitLastNames(lastName) {
    const parts = (lastName || '').trim().split(/\s+/).filter(Boolean);
    return { apellido1: parts[0] || '', apellido2: parts.slice(1).join(' ') || '' };
}

function buildChecklist(socioForm, sepaEnabled, profile) {
    const mandatePhase = sepaEnabled && profile?.socio?.status === 'ACTIVE';
    const items = [
        {
            id: 'dni',
            label: 'DNI / NIE / identificación',
            ok: !!(socioForm.dni && String(socioForm.dni).trim()),
        },
        {
            id: 'apellido2',
            label: 'Segundo apellido',
            ok: !!(socioForm.apellido2 && String(socioForm.apellido2).trim()),
        },
        {
            id: 'gender',
            label: 'Identidad de género',
            ok: !!(socioForm.gender && String(socioForm.gender).trim()),
        },
        {
            id: 'pronouns',
            label: 'Pronombres',
            ok: !!(socioForm.pronouns && String(socioForm.pronouns).trim()),
        },
        {
            id: 'customPronouns',
            label: 'Pronombres personalizados',
            ok: socioForm.pronouns !== 'otro' || !!(socioForm.customPronouns && String(socioForm.customPronouns).trim()),
        },
        {
            id: 'address',
            label: 'Dirección completa',
            ok: !!(socioForm.address && String(socioForm.address).trim()),
        },
        {
            id: 'postalCode',
            label: 'Código postal',
            ok: !!(socioForm.postalCode && String(socioForm.postalCode).trim()),
        },
        {
            id: 'municipio',
            label: 'Municipio (Baix Llobregat)',
            ok: !!(socioForm.municipio && String(socioForm.municipio).trim()),
            recommended: true,
        },
        {
            id: 'iban',
            label: 'IBAN (cuenta bancaria)',
            ok: !mandatePhase || validateIban(socioForm.iban).ok,
        },
    ];
    const required = items.filter(
        (i) => !i.recommended && (i.id !== 'customPronouns' || socioForm.pronouns === 'otro')
    );
    const requiredOk = required.filter((i) => i.ok).length;
    const requiredTotal = required.length;
    return { items, requiredOk, requiredTotal };
}

export default function MiPerfilSocio() {
    const { token, user: authUser, login } = useAuthStore();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profile, setProfile] = useState(null);
    const [delegations, setDelegations] = useState([]);
    const fileInputRef = useRef(null);

    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [socioForm, setSocioForm] = useState({
        name: '',
        apellido1: '',
        apellido2: '',
        dni: '',
        gender: '',
        pronouns: '',
        customPronouns: '',
        address: '',
        phone2: '',
        postalCode: '',
        city: '',
        municipio: '',
        delegationId: '',
        iban: '',
        sepaProposedTemplateId: '',
    });

    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showPw, setShowPw] = useState({ cur: false, nw: false });
    /** Coincide con GET /api/sepa-settings/public — si es false, no exigimos IBAN en ficha. */
    const [sepaEnabled, setSepaEnabled] = useState(false);
    const [sepaPublic, setSepaPublic] = useState(null);
    const [quotaTemplates, setQuotaTemplates] = useState([]);
    const [quotaLoading, setQuotaLoading] = useState(false);

    const setSf = (k, v) => setSocioForm((s) => ({ ...s, [k]: v }));

    const load = async () => {
        try {
            setLoading(true);
            let publicSepa = { data: { sepaEnabled: false } };
            try {
                publicSepa = await axios.get(`${API}/sepa-settings/public`);
            } catch {
                publicSepa = { data: { sepaEnabled: false } };
            }
            setSepaEnabled(!!publicSepa.data?.sepaEnabled);
            setSepaPublic(publicSepa.data || null);

            if (publicSepa.data?.sepaEnabled && publicSepa.data?.memberChoosesPlan) {
                setQuotaLoading(true);
                try {
                    const tpl = await axios.get(`${API}/sepa-recibos/templates/public`);
                    setQuotaTemplates(Array.isArray(tpl.data?.templates) ? tpl.data.templates : []);
                } catch {
                    setQuotaTemplates([]);
                } finally {
                    setQuotaLoading(false);
                }
            } else {
                setQuotaTemplates([]);
            }

            const [pr, del] = await Promise.all([
                axios.get(`${API}/profile`, { headers }),
                axios.get(`${API}/delegaciones`, { headers }),
            ]);
            setProfile(pr.data);
            setDelegations(del.data || []);
            setEmail(pr.data.email || '');
            setPhone(pr.data.phone || '');
            const s = pr.data.socio;
            if (s) {
                const { apellido1, apellido2 } = splitLastNames(s.lastName);
                const auto = s.municipio ? getDefaultPostalYciudad(s.municipio) : { postalCode: '', city: '' };
                const postalSaved = (s.postalCode && String(s.postalCode).trim()) || '';
                const citySaved = (s.city && String(s.city).trim()) || '';
                setSocioForm({
                    name: s.name || '',
                    apellido1,
                    apellido2,
                    dni: s.dni || '',
                    gender: s.gender || '',
                    pronouns: s.pronouns || '',
                    customPronouns: s.customPronouns || '',
                    address: s.address || '',
                    phone2: s.phone2 || '',
                    postalCode: postalSaved || auto.postalCode,
                    city: citySaved || auto.city,
                    municipio: s.municipio || '',
                    delegationId: s.delegationId != null ? String(s.delegationId) : '',
                    iban: s.iban || '',
                    sepaProposedTemplateId: s.sepaProposedTemplateId != null ? String(s.sepaProposedTemplateId) : '',
                });
            }
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar tu perfil.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [headers]);

    const checklist = useMemo(() => buildChecklist(socioForm, sepaEnabled, profile), [socioForm, sepaEnabled, profile]);
    const progressPct = checklist.requiredTotal
        ? Math.round((checklist.requiredOk / checklist.requiredTotal) * 100)
        : 100;

    const composedDisplayName = useMemo(() => {
        const ln = [socioForm.apellido1, socioForm.apellido2].filter(Boolean).join(' ').trim();
        return `${socioForm.name.trim()} ${ln}`.trim();
    }, [socioForm.name, socioForm.apellido1, socioForm.apellido2]);

    const socioRequiredMessage = () => {
        if (!socioForm.dni?.trim()) return 'El DNI / NIE es obligatorio.';
        if (!socioForm.apellido2?.trim()) return 'El segundo apellido es obligatorio.';
        if (!socioForm.address?.trim()) return 'La dirección completa es obligatoria.';
        if (!socioForm.postalCode?.trim()) return 'El código postal es obligatorio.';
        const mandatePhase = sepaEnabled && profile?.socio?.status === 'ACTIVE';
        if (mandatePhase) {
            const ib = validateIban(socioForm.iban);
            if (!ib.ok) return ib.message;
        }
        return null;
    };

    /** Valor a enviar en `socio.iban` según flag SEPA global y validación. */
    const ibanForProfileApi = () => {
        const mandatePhase = sepaEnabled && profile?.socio?.status === 'ACTIVE';
        if (mandatePhase) {
            const ir = validateIban(socioForm.iban);
            return ir.ok ? ir.normalized : '';
        }
        const t = socioForm.iban.trim();
        if (!t) return '';
        const ir = validateIban(socioForm.iban);
        return ir.ok ? ir.normalized : '';
    };

    const handleAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reqMsg = socioRequiredMessage();
        if (reqMsg) {
            return Swal.fire({ icon: 'warning', title: 'Completa la ficha', text: `${reqMsg} Así podremos guardar la foto junto a tus datos.`, confirmButtonColor: '#6E9EFF' });
        }
        const mandatePh = sepaEnabled && profile?.socio?.status === 'ACTIVE';
        if (!mandatePh && socioForm.iban.trim()) {
            const chk = validateIban(socioForm.iban);
            if (!chk.ok) {
                return Swal.fire({ icon: 'warning', title: 'IBAN', text: chk.message, confirmButtonColor: '#6E9EFF' });
            }
        }
        if (!file.type.startsWith('image/')) {
            return Swal.fire({ icon: 'error', title: 'Formato no válido', text: 'Usa una imagen (JPG, PNG…).' });
        }
        if (file.size > 2 * 1024 * 1024) {
            return Swal.fire({ icon: 'error', title: 'Imagen demasiado grande', text: 'Máximo 2 MB.' });
        }
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const lastName = [socioForm.apellido1, socioForm.apellido2].filter(Boolean).join(' ');
                const res = await axios.put(
                    `${API}/profile`,
                    {
                        name: composedDisplayName || profile?.name || '',
                        email: email.trim(),
                        phone: phone.trim(),
                        avatar: reader.result,
                        socio: {
                            name: socioForm.name.trim(),
                            lastName,
                            dni: socioForm.dni || null,
                            gender: socioForm.gender || null,
                            pronouns: socioForm.pronouns || null,
                            customPronouns: socioForm.customPronouns || null,
                            address: socioForm.address || null,
                            phone2: socioForm.phone2 || null,
                            postalCode: socioForm.postalCode || null,
                            city: socioForm.city || null,
                            municipio: socioForm.municipio || null,
                            delegationId: socioForm.delegationId === '' ? null : parseInt(String(socioForm.delegationId), 10),
                            iban: ibanForProfileApi(),
                            ...(sepaPublic?.memberChoosesPlan ? { sepaProposedTemplateId: socioForm.sepaProposedTemplateId || null } : {}),
                        },
                    },
                    { headers }
                );
                setProfile(res.data.user);
                login({ ...authUser, name: res.data.user.name, email: res.data.user.email }, token);
                Swal.fire({ icon: 'success', title: 'Foto actualizada', timer: 1400, showConfirmButton: false });
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.' });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!socioForm.name.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Nombre obligatorio', text: 'Indica tu nombre en la ficha.', confirmButtonColor: '#6E9EFF' });
        }
        if (!socioForm.apellido1.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Primer apellido obligatorio', text: 'Indica tu primer apellido.', confirmButtonColor: '#6E9EFF' });
        }
        const reqMsg = socioRequiredMessage();
        if (reqMsg) {
            return Swal.fire({ icon: 'warning', title: 'Faltan datos obligatorios', text: reqMsg, confirmButtonColor: '#6E9EFF' });
        }
        const mandatePhSave = sepaEnabled && profile?.socio?.status === 'ACTIVE';
        if (!mandatePhSave && socioForm.iban.trim()) {
            const chk = validateIban(socioForm.iban);
            if (!chk.ok) {
                return Swal.fire({ icon: 'warning', title: 'IBAN', text: chk.message, confirmButtonColor: '#6E9EFF' });
            }
        }
        if (!composedDisplayName.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Datos incompletos', text: 'Revisa nombre y apellidos.', confirmButtonColor: '#6E9EFF' });
        }
        setSaving(true);
        try {
            const lastName = [socioForm.apellido1, socioForm.apellido2].filter(Boolean).join(' ');
            const res = await axios.put(
                `${API}/profile`,
                {
                    name: composedDisplayName.trim(),
                    email: email.trim(),
                    phone: phone.trim(),
                    socio: {
                        name: socioForm.name.trim(),
                        lastName,
                        dni: socioForm.dni ? socioForm.dni.trim() : null,
                        gender: socioForm.gender || null,
                        pronouns: socioForm.pronouns || null,
                        customPronouns: socioForm.customPronouns ? socioForm.customPronouns.trim() : null,
                        address: socioForm.address ? socioForm.address.trim() : null,
                        phone2: socioForm.phone2 ? socioForm.phone2.trim() : null,
                        postalCode: socioForm.postalCode ? socioForm.postalCode.trim() : null,
                        city: socioForm.city ? socioForm.city.trim() : null,
                        municipio: socioForm.municipio ? socioForm.municipio.trim() : null,
                        delegationId: socioForm.delegationId === '' ? null : parseInt(String(socioForm.delegationId), 10),
                        iban: ibanForProfileApi(),
                        ...(sepaPublic?.memberChoosesPlan ? { sepaProposedTemplateId: socioForm.sepaProposedTemplateId || null } : {}),
                    },
                },
                { headers }
            );
            setProfile(res.data.user);
            const u = res.data.user;
            setEmail(u.email || '');
            setPhone(u.phone || '');
            if (u.socio) {
                const { apellido1, apellido2 } = splitLastNames(u.socio.lastName);
                setSocioForm((prev) => ({
                    ...prev,
                    name: u.socio.name || '',
                    apellido1,
                    apellido2,
                    dni: u.socio.dni || '',
                    gender: u.socio.gender || '',
                    pronouns: u.socio.pronouns || '',
                    customPronouns: u.socio.customPronouns || '',
                    address: u.socio.address || '',
                    phone2: u.socio.phone2 || '',
                    postalCode: u.socio.postalCode || '',
                    city: u.socio.city || '',
                    municipio: u.socio.municipio || '',
                    delegationId: u.socio.delegationId != null ? String(u.socio.delegationId) : '',
                    iban: u.socio.iban || '',
                }));
            }
            login({ ...authUser, name: u.name, email: u.email }, token);
            Swal.fire({ icon: 'success', title: 'Cambios guardados', text: 'Tu ficha está actualizada.', confirmButtonColor: '#6E9EFF', timer: 2200 });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo guardar.' });
        } finally {
            setSaving(false);
        }
    };

    const handlePassword = async () => {
        if (!passwordForm.currentPassword) {
            return Swal.fire({ icon: 'warning', title: 'Contraseña actual requerida' });
        }
        if (passwordForm.newPassword.length < 6) {
            return Swal.fire({ icon: 'warning', title: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return Swal.fire({ icon: 'warning', title: 'Las contraseñas no coinciden.' });
        }
        try {
            await axios.put(`${API}/profile/password`, {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            }, { headers });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            Swal.fire({ icon: 'success', title: 'Contraseña actualizada', timer: 1800, showConfirmButton: false });
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'No se pudo cambiar.' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin w-10 h-10 border-4 border-blue-100 border-t-[#6E9EFF] rounded-full" />
            </div>
        );
    }

    if (!profile?.socio) {
        return (
            <div className="max-w-lg mx-auto bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center">
                <AlertCircle className="mx-auto text-amber-500 mb-3" size={40} />
                <p className="text-slate-700 font-medium">Tu usuario no tiene una ficha de socio vinculada.</p>
                <p className="text-sm text-slate-500 mt-2">
                    Solo los usuarios con rol de socio y una ficha enlazada pueden ver este formulario. Si entras como administrador u otro rol, es normal.
                    Tras el alta (formulario o alta desde administración) tu cuenta queda vinculada automáticamente.
                </p>
                <p className="text-sm text-slate-500 mt-3">Si crees que es un error, contacta con administración.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <User className="text-[#6E9EFF]" size={28} />
                    Mi perfil
                </h1>
                <p className="text-slate-500 mt-2 text-sm max-w-2xl">
                    Aquí ves tu ficha como socio de Assotea: lo que ya está completo y lo que falta. Los cambios se guardan en el mismo sitio que revisa el equipo en <strong className="text-slate-700">Socios → Ver detalle</strong>.
                </p>
            </div>

            {/* Progreso ficha */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6E9EFF] to-indigo-500 flex items-center justify-center text-white shadow-md">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800">Completitud de la ficha</h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Datos imprescindibles: DNI, segundo apellido, género, pronombres, dirección y código postal.
                                {sepaEnabled && profile?.socio?.status === 'ACTIVE' ? (
                                    <>
                                        {' '}
                                        Con SEPA activo, si tu ficha está <strong>activa</strong>, también: IBAN y mandato subido en «Mis documentos».
                                    </>
                                ) : sepaEnabled ? (
                                    <> También IBAN cuando actives la ficha como socio activo con domiciliación.</>
                                ) : (
                                    <> Si el centro activa SEPA en administración, se pedirá también el IBAN para domiciliación.</>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-2xl font-black text-[#6E9EFF]">{progressPct}%</span>
                        <p className="text-[11px] text-slate-400 uppercase font-semibold">
                            {checklist.requiredOk}/{checklist.requiredTotal} obligatorios
                        </p>
                    </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#6E9EFF] to-emerald-400 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {checklist.items
                        .filter((it) => it.id !== 'customPronouns' || socioForm.pronouns === 'otro')
                        .map((it) => {
                        const done = it.ok;
                        return (
                            <li
                                key={it.id}
                                className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl border ${
                                    done ? 'bg-emerald-50/80 border-emerald-100 text-emerald-900' : 'bg-slate-50 border-slate-100 text-slate-600'
                                }`}
                            >
                                {done ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-amber-500 shrink-0" />}
                                <span>
                                    {it.label}
                                    {it.recommended ? <span className="text-[10px] text-slate-400 font-normal"> (recomendado)</span> : null}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <CreditCard size={18} className="text-[#6E9EFF]" />
                                Ficha del socio — datos personales
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">Código: <strong>{profile.socio.memberCode}</strong></p>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Nombre *</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.name} onChange={(e) => setSf('name', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Primer apellido *</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.apellido1} onChange={(e) => setSf('apellido1', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Segundo apellido *</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.apellido2} onChange={(e) => setSf('apellido2', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><Hash size={12} /> DNI / NIE *</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.dni} onChange={(e) => setSf('dni', e.target.value)} placeholder="Ej: 12345678A" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Identidad de género</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.gender} onChange={(e) => setSf('gender', e.target.value)}>
                                    <option value="">Selecciona…</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="femenino">Femenino</option>
                                    <option value="no_binario">No binario</option>
                                    <option value="otro">Otro</option>
                                    <option value="prefiero_no_decir">Prefiero no decir</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Pronombres</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.pronouns} onChange={(e) => setSf('pronouns', e.target.value)}>
                                    <option value="">Selecciona…</option>
                                    <option value="el">Él</option>
                                    <option value="ella">Ella</option>
                                    <option value="elle">Elle</option>
                                    <option value="otro">Otro (personalizado)</option>
                                </select>
                            </div>
                            {socioForm.pronouns === 'otro' && (
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Pronombres personalizados</label>
                                    <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.customPronouns} onChange={(e) => setSf('customPronouns', e.target.value)} placeholder="Ej: they/them" />
                                </div>
                            )}
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><MapPin size={12} /> Dirección completa *</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.address} onChange={(e) => setSf('address', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Código postal *</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.postalCode} onChange={(e) => setSf('postalCode', e.target.value)} />
                                <p className="text-[10px] text-slate-400 mt-1">Se rellena según el municipio; puedes corregirlo.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Ciudad / población</label>
                                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.city} onChange={(e) => setSf('city', e.target.value)} />
                                <p className="text-[10px] text-slate-400 mt-1">Por defecto el nombre del municipio; editable si hace falta.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Municipio (Baix Llobregat)</label>
                                <select
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={socioForm.municipio}
                                    onChange={(e) => {
                                        const m = e.target.value;
                                        const d = getDefaultPostalYciudad(m);
                                        setSocioForm((prev) => ({
                                            ...prev,
                                            municipio: m,
                                            ...(m
                                                ? { postalCode: d.postalCode, city: d.city }
                                                : {}),
                                        }));
                                    }}
                                >
                                    <option value="">—</option>
                                    <optgroup label="Con delegación">
                                        {MUNICIPIOS_DELEGACION.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Resto">
                                        {MUNICIPIOS_RESTO_ALFABETICO.map((m) => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1"><Building2 size={12} /> Delegación preferida</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.delegationId} onChange={(e) => setSf('delegationId', e.target.value)}>
                                    <option value="">—</option>
                                    {delegations.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Mail size={18} className="text-[#6E9EFF]" />
                                Contacto de la cuenta
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase">Nombre completo en sistema</p>
                                <p className="text-sm font-bold text-slate-800">{composedDisplayName || '—'}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Se forma con nombre y apellidos de la ficha.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Email *</label>
                                <input type="email" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={email} onChange={(e) => setEmail(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono principal *</label>
                                <input type="tel" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={phone} onChange={(e) => setPhone(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Teléfono secundario</label>
                                <input type="tel" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={socioForm.phone2} onChange={(e) => setSf('phone2', e.target.value)} />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                                    <CreditCard size={12} /> IBAN (número de cuenta){sepaEnabled ? ' *' : ' (opcional)'}
                                </label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono tracking-wide"
                                    value={socioForm.iban}
                                    onChange={(e) => setSf('iban', e.target.value)}
                                    placeholder="ES00 0000 0000 0000 0000 0000"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Formato internacional (IBAN). En España son <strong>24 caracteres</strong> sin espacios (puedes escribirlos con o sin espacios). Se validan los dígitos de control.
                                </p>
                            </div>

                            {sepaEnabled && sepaPublic?.memberChoosesPlan && (
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                                        <Building2 size={12} /> Cuota / plan de pago
                                    </label>
                                    <select
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                        value={socioForm.sepaProposedTemplateId}
                                        onChange={(e) => setSf('sepaProposedTemplateId', e.target.value)}
                                        disabled={quotaLoading}
                                    >
                                        <option value="">Selecciona una opción…</option>
                                        {quotaTemplates.map((t) => (
                                            <option key={t.id} value={String(t.id)}>
                                                {t.frequency === 'MONTHLY'
                                                    ? `Mensual · ${t.name}`
                                                    : t.frequency === 'QUARTERLY'
                                                      ? `Trimestral · ${t.name}`
                                                      : t.frequency === 'YEARLY'
                                                        ? `Anual · ${t.name}`
                                                        : t.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        {quotaLoading ? 'Cargando opciones…' : 'Esta elección se confirmará cuando el equipo apruebe tu alta.'}
                                    </p>
                                </div>
                            )}

                        </div>
                    </div>

                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleSave}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#6E9EFF] to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/20 hover:opacity-95 disabled:opacity-50"
                    >
                        <Save size={20} /> {saving ? 'Guardando…' : 'Guardar cambios en la ficha'}
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
                        <div className="relative inline-block">
                            <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-[#6E9EFF] to-indigo-500 flex items-center justify-center mx-auto">
                                {profile.avatar ? (
                                    <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white text-3xl font-bold">{profile.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-xl shadow border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#6E9EFF]"
                            >
                                <Camera size={18} />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                        </div>
                        <p className="text-xs text-slate-500 mt-3">@{profile.username}</p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Lock size={16} className="text-amber-500" /> Contraseña</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Actual</label>
                                <div className="relative">
                                    <input
                                        type={showPw.cur ? 'text' : 'password'}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm"
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                                    />
                                    <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" onClick={() => setShowPw((s) => ({ ...s, cur: !s.cur }))}>
                                        {showPw.cur ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Nueva</label>
                                <input
                                    type={showPw.nw ? 'text' : 'password'}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">Repetir</label>
                                <input
                                    type="password"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                                />
                            </div>
                            <button type="button" onClick={handlePassword} className="w-full py-2.5 rounded-lg bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">
                                Cambiar contraseña
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
