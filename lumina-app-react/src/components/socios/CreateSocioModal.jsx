import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, UserPlus, User, Mail, ToggleLeft, Lock, Edit3, Building2, CreditCard, Wand2 } from 'lucide-react';
import { generateProposedMandateUm } from '../../utils/sepaMandate';
import useAuthStore from '../../store/authStore';
import { MUNICIPIOS_DELEGACION, MUNICIPIOS_RESTO_ALFABETICO } from '../../data/baixLlobregatMunicipios';

const CreateSocioModal = ({ isOpen, onClose, onSave, socio }) => {
    const { token } = useAuthStore();
    const isEdit = !!socio;
    const [saving, setSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [form, setForm] = useState({
        nombre: '',
        apellido1: '',
        apellido2: '',
        dni: '',
        gender: '',
        pronouns: '',
        customPronouns: '',
        email: '',
        phone: '',
        phone2: '',
        address: '',
        username: '',
        password: '',
        passwordConfirm: '',
        active: true,
        municipio: '',
        delegationId: '',
        iban: '',
        sepaMandateUm: '',
        sepaMandateSignedAt: '',
    });
    const [delegations, setDelegations] = useState([]);
    const [sepaOrgEnabled, setSepaOrgEnabled] = useState(false);

    // Pre-fill form when editing
    useEffect(() => {
        if (socio) {
            const parts = (socio.lastName || '').split(' ');
            setForm({
                nombre: socio.name || '',
                apellido1: parts[0] || '',
                apellido2: parts.slice(1).join(' ') || '',
                dni: socio.dni || '',
                gender: socio.gender || '',
                pronouns: socio.pronouns || '',
                customPronouns: socio.customPronouns || '',
                email: socio.email || '',
                phone: socio.phone || '',
                phone2: socio.phone2 || '',
                address: socio.address || '',
                username: socio.user?.username || '',
                password: '',
                passwordConfirm: '',
                active: socio.status === 'ACTIVE',
                municipio: socio.municipio || '',
                delegationId: socio.delegationId != null ? String(socio.delegationId) : '',
                iban: socio.iban || '',
                sepaMandateUm: socio.sepaMandateUm || '',
                sepaMandateSignedAt: socio.sepaMandateSignedAt
                    ? new Date(socio.sepaMandateSignedAt).toISOString().slice(0, 10)
                    : '',
            });
        } else {
            resetForm();
        }
        setPasswordError('');
    }, [socio, isOpen]);

    useEffect(() => {
        if (!isOpen || !token) return;
        axios
            .get('/api/delegaciones', { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setDelegations(res.data || []))
            .catch(() => setDelegations([]));
        axios
            .get('/api/sepa-settings/public')
            .then((r) => setSepaOrgEnabled(!!r.data?.sepaEnabled))
            .catch(() => setSepaOrgEnabled(false));
    }, [isOpen, token]);

    const resetForm = () => {
        setForm({
            nombre: '', apellido1: '', apellido2: '', dni: '',
            gender: '', pronouns: '', customPronouns: '',
            email: '', phone: '', phone2: '', address: '',
            username: '', password: '', passwordConfirm: '',
            active: true,
            municipio: '', delegationId: '',
            iban: '', sepaMandateUm: '', sepaMandateSignedAt: '',
        });
        setPasswordError('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPasswordError('');

        // Validar contraseña:
        // - En creación: obligatoria
        // - En edición: solo si el usuario escribe algo (opcional)
        const wantsPasswordChange = !!(form.password || form.passwordConfirm);
        if (!isEdit || wantsPasswordChange) {
            if (String(form.password || '').length < 6) {
                setPasswordError('La contraseña debe tener al menos 6 caracteres');
                return;
            }
            if (form.password !== form.passwordConfirm) {
                setPasswordError('Las contraseñas no coinciden');
                return;
            }
        }

        setSaving(true);
        const lastName = [form.apellido1, form.apellido2].filter(Boolean).join(' ');

        try {
            const payload = {
                name: form.nombre,
                lastName,
                dni: form.dni || null,
                email: form.email,
                phone: form.phone || null,
                phone2: form.phone2 || null,
                address: form.address || null,
                gender: form.gender || null,
                pronouns: form.pronouns || null,
                customPronouns: form.customPronouns || null,
                status: form.active ? 'ACTIVE' : 'INACTIVE',
                municipio: form.municipio ? form.municipio.trim() : null,
                delegationId: form.delegationId === '' ? null : parseInt(String(form.delegationId), 10),
            };
            if (!isEdit) {
                payload.username = form.username || null;
                payload.password = form.password;
            }
            if (isEdit && wantsPasswordChange) {
                payload.password = form.password;
            }
            if (isEdit) {
                payload.iban = form.iban.trim() || null;
                payload.sepaMandateUm = form.sepaMandateUm.trim() || null;
                payload.sepaMandateSignedAt = form.sepaMandateSignedAt || null;
            }
            await onSave(payload, isEdit ? socio.id : null);
            if (!isEdit) resetForm();
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                className="relative z-10 bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            {isEdit ? <Edit3 size={20} /> : <UserPlus size={24} />}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {isEdit ? 'Editar Socio' : 'NUEVO SOCIO'}
                        </h2>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto p-8 space-y-8 flex-1">

                        {/* ─── Información Personal ─── */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <User size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-slate-700">Información Personal</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Nombre <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={form.nombre}
                                        onChange={e => handleChange('nombre', e.target.value)}
                                        required
                                        placeholder="Ej: Juan"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Primer Apellido
                                    </label>
                                    <input
                                        type="text"
                                        value={form.apellido1}
                                        onChange={e => handleChange('apellido1', e.target.value)}
                                        placeholder="Ej: García"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Segundo Apellido
                                    </label>
                                    <input
                                        type="text"
                                        value={form.apellido2}
                                        onChange={e => handleChange('apellido2', e.target.value)}
                                        placeholder="Ej: López"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        DNI/NIE
                                    </label>
                                    <input
                                        type="text"
                                        value={form.dni}
                                        onChange={e => handleChange('dni', e.target.value)}
                                        placeholder="Ej: 12345678A"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Identidad de Género
                                    </label>
                                    <select
                                        value={form.gender}
                                        onChange={e => handleChange('gender', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    >
                                        <option value="">No especificado</option>
                                        <option value="masculino">Masculino</option>
                                        <option value="femenino">Femenino</option>
                                        <option value="no_binario">No binario</option>
                                        <option value="otro">Otro</option>
                                        <option value="prefiero_no_decir">Prefiero no decir</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Pronombres
                                    </label>
                                    <select
                                        value={form.pronouns}
                                        onChange={e => handleChange('pronouns', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    >
                                        <option value="">No especificado</option>
                                        <option value="el">Él/Él</option>
                                        <option value="ella">Ella/Ella</option>
                                        <option value="elle">Elle/Elle</option>
                                        <option value="otro">Otro (personalizado)</option>
                                    </select>
                                </div>

                                {/* Pronombres personalizados - only shows when "otro" is selected */}
                                {form.pronouns === 'otro' && (
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                            Pronombres Personalizados
                                        </label>
                                        <input
                                            type="text"
                                            value={form.customPronouns}
                                            onChange={e => handleChange('customPronouns', e.target.value)}
                                            placeholder="Ej: They/Them, Ze/Zir, etc."
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── Datos de Contacto ─── */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <Mail size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-slate-700">Datos de Contacto</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Email <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => handleChange('email', e.target.value)}
                                        required
                                        autoComplete="off"
                                        placeholder="usuario@ejemplo.com"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Teléfono Principal
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone}
                                        onChange={e => handleChange('phone', e.target.value)}
                                        placeholder="Ej: 612345678"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Teléfono Secundario
                                    </label>
                                    <input
                                        type="tel"
                                        value={form.phone2}
                                        onChange={e => handleChange('phone2', e.target.value)}
                                        placeholder="Ej: 654321987"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Dirección Completa (Domicilio)
                                    </label>
                                    <input
                                        type="text"
                                        value={form.address}
                                        onChange={e => handleChange('address', e.target.value)}
                                        placeholder="Ej: Calle Principal 123, 1º A, 08001 Barcelona"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Municipio (Baix Llobregat)
                                    </label>
                                    <select
                                        value={form.municipio}
                                        onChange={e => handleChange('municipio', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
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
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Building2 size={12} /> Delegación preferida
                                    </label>
                                    <select
                                        value={form.delegationId}
                                        onChange={e => handleChange('delegationId', e.target.value)}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    >
                                        <option value="">—</option>
                                        {delegations.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ─── Información de Cuenta ─── */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <Lock size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-slate-700">Información de Cuenta</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Nombre de Usuario
                                    </label>
                                    <input
                                        type="text"
                                        value={form.username}
                                        onChange={e => handleChange('username', e.target.value)}
                                        placeholder="Se generará automáticamente si se deja vacío"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Contraseña {isEdit ? '' : <span className="text-red-400">*</span>}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.password}
                                        onChange={e => handleChange('password', e.target.value)}
                                        required={!isEdit}
                                        autoComplete="new-password"
                                        placeholder="Mínimo 6 caracteres"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Confirmar Contraseña {isEdit ? '' : <span className="text-red-400">*</span>}
                                    </label>
                                    <input
                                        type="password"
                                        value={form.passwordConfirm}
                                        onChange={e => handleChange('passwordConfirm', e.target.value)}
                                        required={!isEdit}
                                        autoComplete="new-password"
                                        placeholder="Repetir contraseña"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                {isEdit && (
                                    <div className="sm:col-span-2 text-[11px] text-slate-500 -mt-2">
                                        Deja los campos vacíos si no quieres cambiar la contraseña.
                                    </div>
                                )}
                                {passwordError && (
                                    <div className="sm:col-span-2">
                                        <p className="text-sm text-red-500 font-black">{passwordError}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ─── SEPA (solo edición, si la org tiene SEPA activo) ─── */}
                        {isEdit && sepaOrgEnabled && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 text-indigo-600 mb-2">
                                    <CreditCard size={18} strokeWidth={2.5} />
                                    <h3 className="text-sm font-bold text-slate-700">SEPA / domiciliación</h3>
                                </div>
                                <p className="text-xs text-slate-500 -mt-2">
                                    Obligatorio para socios <strong>activos</strong> si el centro tiene SEPA activado. Los recibos se generarán manualmente en una fase posterior.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">IBAN</label>
                                        <input
                                            type="text"
                                            value={form.iban}
                                            onChange={(e) => handleChange('iban', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                                            placeholder="ES00…"
                                            spellCheck={false}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">UMR (mandato)</label>
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <input
                                                type="text"
                                                value={form.sepaMandateUm}
                                                onChange={(e) => handleChange('sepaMandateUm', e.target.value)}
                                                maxLength={35}
                                                className="flex-1 px-3 py-2.5 border border-slate-200 rounded-lg text-sm font-mono"
                                                spellCheck={false}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleChange('sepaMandateUm', generateProposedMandateUm())}
                                                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-50 border border-indigo-200 text-indigo-800 shrink-0"
                                            >
                                                <Wand2 size={14} /> Proponer UMR
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Firma del mandato</label>
                                        <input
                                            type="date"
                                            value={form.sepaMandateSignedAt}
                                            onChange={(e) => handleChange('sepaMandateSignedAt', e.target.value)}
                                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ─── Estado del Socio ─── */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                <ToggleLeft size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-slate-700">Estado del Socio</h3>
                            </div>

                            <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border-2 border-transparent">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={form.active}
                                        onChange={e => handleChange('active', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                                </label>
                                <div>
                                    <p className="text-sm font-bold text-slate-700">Socio Activo</p>
                                    <p className="text-xs font-medium text-slate-400 mt-0.5">El socio podrá acceder al sistema y utilizar sus funcionalidades</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all disabled:opacity-50"
                        >
                            {saving ? 'GUARDANDO...' : (isEdit ? 'GUARDAR CAMBIOS' : 'CREAR SOCIO')}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
                .animate-modalIn { animation: modalIn 0.25s ease-out; }
            `}</style>
        </div>
    );
};

export default CreateSocioModal;
