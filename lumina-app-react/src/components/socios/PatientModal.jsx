import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, User, Calendar, Heart, School, FileText, AlertTriangle, Upload, File, Trash2, MapPin, Building2 } from 'lucide-react';
import Swal from 'sweetalert2';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import { MUNICIPIOS_DELEGACION, MUNICIPIOS_RESTO_ALFABETICO } from '../../data/baixLlobregatMunicipios';

const DOC_FIELDS = [
    { key: 'docMedical', label: 'Informe Médico', desc: 'PDF o imagen del informe médico', color: 'text-blue-500', bg: 'bg-blue-50' },
    { key: 'docDisability', label: 'Certificado Discapacidad', desc: 'Certificado oficial de discapacidad', color: 'text-violet-500', bg: 'bg-violet-50' },
    { key: 'docSchool', label: 'Informe Escolar', desc: 'Informe del centro educativo', color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { key: 'docId', label: 'DNI / Documento', desc: 'Documento de identidad del paciente', color: 'text-amber-500', bg: 'bg-amber-50' },
];

const PatientModal = ({ isOpen, onClose, onSave, patient, socioName, defaultDelegationId, delegaciones: delegacionesProp }) => {
    const { token } = useAuthStore();
    const [delegaciones, setDelegaciones] = useState(delegacionesProp || []);
    const [form, setForm] = useState({
        name: '',
        lastName: '',
        birthDate: '',
        gender: '',
        autismDegree: '',
        disabilityPct: '',
        specialNeeds: '',
        allergies: '',
        school: '',
        schoolYear: '',
        notes: '',
        relationship: '',
        address: '',
        municipio: '',
        delegationId: '',
    });
    const [files, setFiles] = useState({ docMedical: null, docDisability: null, docSchool: null, docId: null });
    const [removeDocs, setRemoveDocs] = useState({ docMedical: false, docDisability: false, docSchool: false, docId: false });
    const [saving, setSaving] = useState(false);

    const loadDelegaciones = useCallback(async () => {
        if (delegacionesProp && delegacionesProp.length > 0) {
            setDelegaciones(delegacionesProp);
            return;
        }
        try {
            const res = await axios.get('/api/delegaciones', {
                headers: { Authorization: `Bearer ${token}` },
            });
            setDelegaciones((res.data || []).filter((d) => d.active !== false));
        } catch {
            setDelegaciones([]);
        }
    }, [delegacionesProp, token]);

    useEffect(() => {
        if (!isOpen) return;
        loadDelegaciones();
    }, [isOpen, loadDelegaciones]);

    useEffect(() => {
        if (delegacionesProp && delegacionesProp.length > 0) {
            setDelegaciones(delegacionesProp);
        }
    }, [delegacionesProp]);

    useEffect(() => {
        if (patient) {
            setForm({
                name: patient.name || '',
                lastName: patient.lastName || '',
                birthDate: patient.birthDate ? patient.birthDate.split('T')[0] : '',
                gender: patient.gender || '',
                autismDegree: patient.autismDegree || '',
                disabilityPct: patient.disabilityPct ?? '',
                specialNeeds: patient.specialNeeds || '',
                allergies: patient.allergies || '',
                school: patient.school || '',
                schoolYear: patient.schoolYear || '',
                notes: patient.notes || '',
                relationship: patient.relationship || '',
                address: patient.address || '',
                municipio: patient.municipio || '',
                delegationId:
                    patient.delegationId != null && patient.delegationId !== ''
                        ? String(patient.delegationId)
                        : '',
            });
        } else {
            setForm({
                name: '',
                lastName: '',
                birthDate: '',
                gender: '',
                relationship: '',
                autismDegree: '',
                disabilityPct: '',
                specialNeeds: '',
                allergies: '',
                school: '',
                schoolYear: '',
                notes: '',
                address: '',
                municipio: '',
                delegationId: defaultDelegationId != null ? String(defaultDelegationId) : '',
            });
        }
        setFiles({ docMedical: null, docDisability: null, docSchool: null, docId: null });
        setRemoveDocs({ docMedical: false, docDisability: false, docSchool: false, docId: false });
    }, [patient, isOpen, defaultDelegationId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const addressTrim = String(form.address || '').trim();
        if (!addressTrim) {
            Swal.fire({
                icon: 'warning',
                title: 'Dirección obligatoria',
                text: 'Indica la dirección completa del paciente (calle, número, piso…).',
            });
            return;
        }
        if (!patient) {
            const del = form.delegationId;
            if (!del && defaultDelegationId == null) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Delegación obligatoria',
                    text: 'Selecciona la delegación del paciente o la opción por defecto del tutor.',
                });
                return;
            }
        }
        setSaving(true);
        try {
            const formData = new FormData();
            const { delegationId, municipio, ...rest } = form;
            Object.entries(rest).forEach(([key, value]) => {
                if (value === '' || value === null || value === undefined) return;
                formData.append(key, value);
            });
            formData.append('delegationId', delegationId);
            formData.append('municipio', municipio || '');
            Object.entries(files).forEach(([key, file]) => {
                if (file) formData.append(key, file);
            });
            Object.entries(removeDocs).forEach(([key, removed]) => {
                if (removed) formData.append('remove' + key.charAt(0).toUpperCase() + key.slice(1), 'true');
            });
            await onSave(formData);
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = (field, file) => {
        setFiles((f) => ({ ...f, [field]: file }));
        setRemoveDocs((r) => ({ ...r, [field]: false }));
    };

    const handleRemoveDoc = (field) => {
        setFiles((f) => ({ ...f, [field]: null }));
        setRemoveDocs((r) => ({ ...r, [field]: true }));
    };

    if (!isOpen) return null;

    const inputClass =
        'w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';
    const labelClass = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5';

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="bg-gradient-to-r from-[#6E9EFF] to-[#8b5cf6] px-6 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-white">{patient ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
                        {socioName && <p className="text-blue-100 text-xs mt-0.5">Socio: {socioName}</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] space-y-5">
                    <div>
                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-3">
                            <User size={15} className="text-[#6E9EFF]" /> Datos Personales
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Nombre *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.name}
                                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Nombre del paciente"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Apellidos *</label>
                                <input
                                    type="text"
                                    required
                                    value={form.lastName}
                                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Apellidos"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>
                                    <Calendar size={12} className="inline mr-1" />
                                    Fecha de nacimiento
                                </label>
                                <input
                                    type="date"
                                    value={form.birthDate}
                                    onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Género</label>
                                <select
                                    value={form.gender}
                                    onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="">Seleccionar</option>
                                    <option value="masculino">Masculino</option>
                                    <option value="femenino">Femenino</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Relación con Socio/Tutor *</label>
                                <select
                                    required
                                    value={form.relationship}
                                    onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="">Seleccionar relación</option>
                                    <option value="padre">Padre</option>
                                    <option value="madre">Madre</option>
                                    <option value="tutor">Tutor/a Legal</option>
                                    <option value="hermano">Hermano/a</option>
                                    <option value="abuelo">Abuelo/a</option>
                                    <option value="otro">Otro familiar / allegado</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-3">
                            <MapPin size={15} className="text-teal-600" /> Ubicación y delegación del paciente
                        </h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className={labelClass}>
                                    <MapPin size={12} className="inline mr-1" />
                                    Dirección completa *
                                </label>
                                <textarea
                                    required
                                    value={form.address}
                                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                                    className={`${inputClass} resize-none`}
                                    rows={2}
                                    placeholder="Calle, número, piso, puerta…"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>Municipio (Baix Llobregat)</label>
                                    <select
                                        value={form.municipio}
                                        onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))}
                                        className={inputClass}
                                    >
                                        <option value="">Seleccionar…</option>
                                        <optgroup label="Delegaciones">
                                            {MUNICIPIOS_DELEGACION.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Resto Baix Llobregat">
                                            {MUNICIPIOS_RESTO_ALFABETICO.map((m) => (
                                                <option key={m} value={m}>
                                                    {m}
                                                </option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>
                                        <Building2 size={12} className="inline mr-1" />
                                        Delegación del paciente{!patient ? ' *' : ''}
                                    </label>
                                    <select
                                        value={form.delegationId}
                                        onChange={(e) => setForm((f) => ({ ...f, delegationId: e.target.value }))}
                                        className={inputClass}
                                        required={!patient && defaultDelegationId == null}
                                    >
                                        <option value="">
                                            {defaultDelegationId != null
                                                ? 'Misma que el tutor (por defecto)'
                                                : 'Seleccionar delegación…'}
                                        </option>
                                        <option value="__none__">Sin delegación asignada</option>
                                        {delegaciones.map((d) => (
                                            <option key={d.id} value={String(d.id)}>
                                                {d.name}
                                                {d.shortName ? ` (${d.shortName})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-3">
                            <Heart size={15} className="text-rose-500" /> Información Clínica
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Grado de autismo</label>
                                <select
                                    value={form.autismDegree}
                                    onChange={(e) => setForm((f) => ({ ...f, autismDegree: e.target.value }))}
                                    className={inputClass}
                                >
                                    <option value="">Sin especificar</option>
                                    <option value="grado1">Grado 1 - Necesita apoyo</option>
                                    <option value="grado2">Grado 2 - Necesita apoyo notable</option>
                                    <option value="grado3">Grado 3 - Necesita apoyo muy notable</option>
                                    <option value="diagnostico_pendiente">Diagnóstico pendiente</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>% Discapacidad</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={form.disabilityPct}
                                    onChange={(e) => setForm((f) => ({ ...f, disabilityPct: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Ej: 33"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>Necesidades especiales</label>
                                <textarea
                                    value={form.specialNeeds}
                                    onChange={(e) => setForm((f) => ({ ...f, specialNeeds: e.target.value }))}
                                    className={`${inputClass} resize-none`}
                                    rows={2}
                                    placeholder="Describe las necesidades especiales del paciente..."
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className={labelClass}>
                                    <AlertTriangle size={12} className="inline mr-1 text-amber-500" />
                                    Alergias
                                </label>
                                <textarea
                                    value={form.allergies}
                                    onChange={(e) => setForm((f) => ({ ...f, allergies: e.target.value }))}
                                    className={`${inputClass} resize-none`}
                                    rows={2}
                                    placeholder="Alergias conocidas..."
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-3">
                            <School size={15} className="text-emerald-500" /> Educación
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>Centro escolar</label>
                                <input
                                    type="text"
                                    value={form.school}
                                    onChange={(e) => setForm((f) => ({ ...f, school: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Nombre del colegio"
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Curso</label>
                                <input
                                    type="text"
                                    value={form.schoolYear}
                                    onChange={(e) => setForm((f) => ({ ...f, schoolYear: e.target.value }))}
                                    className={inputClass}
                                    placeholder="Ej: 3º Primaria"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-3">
                            <Upload size={15} className="text-indigo-500" /> Documentos
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {DOC_FIELDS.map(({ key, label, desc, color, bg }) => {
                                const hasExistingDoc = patient && patient[key] && !removeDocs[key];
                                const hasNewFile = files[key];
                                const existingFileName = patient?.[key]?.split('/').pop();

                                return (
                                    <div
                                        key={key}
                                        className={`rounded-xl border-2 border-dashed p-4 transition-all ${
                                            hasExistingDoc || hasNewFile
                                                ? 'border-green-300 bg-green-50/30'
                                                : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
                                                <File size={14} className={color} />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-600">{label}</p>
                                                <p className="text-[10px] text-slate-400">{desc}</p>
                                            </div>
                                        </div>

                                        {hasExistingDoc && !hasNewFile && (
                                            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <File size={14} className="text-green-500 shrink-0" />
                                                    <span className="text-xs text-slate-600 truncate">{existingFileName}</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveDoc(key)}
                                                    className="p-1 text-red-400 hover:text-red-600 shrink-0"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}

                                        {hasNewFile && (
                                            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200 mb-2">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <File size={14} className="text-green-500 shrink-0" />
                                                    <span className="text-xs text-green-700 truncate font-medium">
                                                        {files[key].name}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setFiles((f) => ({ ...f, [key]: null }))}
                                                    className="p-1 text-red-400 hover:text-red-600 shrink-0"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        )}

                                        <label className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 text-xs font-medium text-slate-500 cursor-pointer transition-all">
                                            <Upload size={13} />
                                            {hasExistingDoc || hasNewFile ? 'Cambiar archivo' : 'Seleccionar archivo'}
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                                className="hidden"
                                                onChange={(e) => handleFileChange(key, e.target.files[0])}
                                            />
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-2 text-center">
                            Formatos: PDF, JPG, PNG, DOC, DOCX · Máximo 10 MB por archivo
                        </p>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-slate-600 flex items-center gap-2 mb-3">
                            <FileText size={15} className="text-violet-500" /> Observaciones
                        </h3>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                            className={`${inputClass} resize-none`}
                            rows={3}
                            placeholder="Notas adicionales sobre el paciente..."
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#6E9EFF] to-[#5b8df5] rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                        >
                            <Save size={16} /> {saving ? 'Guardando...' : patient ? 'Guardar Cambios' : 'Crear Paciente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PatientModal;
