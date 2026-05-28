import React, { useState, useEffect } from 'react';
import { X, User, Heart, School, FileText, Cake, AlertTriangle, Calendar, Activity, FileStack, Eye, Download, MapPin, Building2 } from 'lucide-react';
import { PATIENT_DOCS } from '../../data/documentSlots';
import {
    DocumentPreviewOverlay,
    absoluteDocumentUrl,
    downloadDocument,
    filenameFromDocumentPath,
} from './DocumentPreviewOverlay';

const PatientDetailModal = ({ isOpen, onClose, patient, socioName }) => {
    const [docPreview, setDocPreview] = useState(null);

    useEffect(() => {
        if (!isOpen) setDocPreview(null);
    }, [isOpen]);

    useEffect(() => {
        if (!docPreview) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setDocPreview(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [docPreview]);

    if (!isOpen || !patient) return null;

    const patientDocCount = PATIENT_DOCS.filter((d) => patient[d.id]).length;

    const calcAge = (birthDate) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const avatarColors = ['#dc3545', '#6E9EFF', '#FF9500', '#28a745', '#9c27b0', '#e91e63', '#00bcd4', '#ff5722'];
    const getAvatarColor = (name) => {
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };
    const getInitials = (name, lastName) => ((name?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase();

    const age = calcAge(patient.birthDate);
    const genderLabel = { masculino: 'Masculino', femenino: 'Femenino', otro: 'Otro' };
    const autismLabel = {
        grado1: 'Grado 1 — Necesita apoyo',
        grado2: 'Grado 2 — Necesita apoyo notable',
        grado3: 'Grado 3 — Necesita apoyo muy notable',
        diagnostico_pendiente: 'Diagnóstico pendiente',
    };
    const relationshipLabel = {
        padre: 'Padre',
        madre: 'Madre',
        tutor: 'Tutor/a Legal',
        hermano: 'Hermano/a',
        abuelo: 'Abuelo/a',
        otro: 'Otro familiar / allegado'
    };

    const InfoField = ({ label, value, icon: Icon }) => (
        <div className="flex-1 min-w-[140px]">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                {Icon && <Icon size={12} />} {label}
            </p>
            <p className="text-sm font-medium text-slate-700">{value || <span className="text-slate-300 italic">No especificado</span>}</p>
        </div>
    );

    return (
        <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

                {/* Gradient Banner + Avatar + Name */}
                <div className="relative">
                    {/* Gradient header */}
                    <div className="h-24 bg-gradient-to-br from-[#6E9EFF] via-[#5b8df5] to-[#8b5cf6] rounded-t-2xl relative">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoMnY0aC0yem0tNiA2aC00djJoNHYtMnptMC02aC00djJoNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30 rounded-t-2xl" />
                        <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors z-10">
                            <X size={18} />
                        </button>
                        {/* Avatar sits inside the banner, bottom-left */}
                        <div className="absolute bottom-0 left-8 translate-y-1/2 z-10">
                            <div
                                className="w-[72px] h-[72px] rounded-2xl border-4 border-white shadow-lg flex items-center justify-center text-white text-2xl font-bold"
                                style={{ backgroundColor: getAvatarColor(patient.name + patient.lastName) }}
                            >
                                {getInitials(patient.name, patient.lastName)}
                            </div>
                        </div>
                    </div>
                    {/* Name row — offset left to clear avatar */}
                    <div className="pt-2 pb-4 px-8 pl-[120px]">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">{patient.name} {patient.lastName}</h2>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="text-[12px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{patient.patientCode}</span>
                            {age !== null && (
                                <span className="inline-flex items-center gap-1 text-[12px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                                    <Cake size={12} /> {age} años
                                </span>
                            )}
                            {patient.autismDegree && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-violet-600 bg-violet-50 px-2.5 py-0.5 rounded-md border border-violet-100">
                                    {patient.autismDegree === 'grado1' ? 'Grado 1' : patient.autismDegree === 'grado2' ? 'Grado 2' : patient.autismDegree === 'grado3' ? 'Grado 3' : 'Pendiente'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content - Grid Layout */}
                <div className="px-8 pb-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* Columna Izquierda */}
                        <div className="space-y-4">
                            {/* Información Personal */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden h-full">
                                <div className="px-5 py-2.5 border-b border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <User size={15} className="text-[#6E9EFF]" /> Información Personal
                                    </h3>
                                </div>
                                <div className="px-5 py-3 grid grid-cols-2 gap-y-3 gap-x-4">
                                    <InfoField label="Nombre completo" value={`${patient.name} ${patient.lastName}`} icon={User} />
                                    <InfoField label="Fecha de nacimiento" value={patient.birthDate ? new Date(patient.birthDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : null} icon={Calendar} />
                                    <InfoField label="Edad" value={age !== null ? `${age} años` : null} icon={Cake} />
                                    <InfoField label="Género" value={genderLabel[patient.gender] || patient.gender} />
                                    <InfoField label="Relación" value={relationshipLabel[patient.relationship] || patient.relationship} icon={Heart} />
                                    <InfoField
                                        label="Delegación (paciente)"
                                        value={patient.delegation?.name || (patient.delegationId == null ? 'Sin asignar' : null)}
                                        icon={Building2}
                                    />
                                    <InfoField label="Municipio" value={patient.municipio} icon={MapPin} />
                                    <div className="col-span-2">
                                        <InfoField label="Dirección" value={patient.address} icon={MapPin} />
                                    </div>
                                    {socioName && (
                                        <div className="col-span-2">
                                            <InfoField label="Socio / Tutor" value={socioName} icon={User} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-5">
                            {/* Información Clínica */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                                <div className="px-5 py-3 border-b border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Heart size={15} className="text-rose-500" /> Información Clínica
                                    </h3>
                                </div>
                                <div className="px-5 py-4 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoField label="Grado de autismo" value={autismLabel[patient.autismDegree] || patient.autismDegree} icon={Activity} />
                                        <InfoField label="% Discapacidad" value={patient.disabilityPct !== null && patient.disabilityPct !== undefined ? `${patient.disabilityPct}%` : null} />
                                    </div>
                                    {patient.specialNeeds && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Necesidades Especiales</p>
                                            <div className="bg-blue-50/50 rounded-lg px-4 py-2 text-sm text-slate-600 leading-relaxed border border-blue-100/50">
                                                {patient.specialNeeds}
                                            </div>
                                        </div>
                                    )}
                                    {patient.allergies && (
                                        <div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                <AlertTriangle size={12} className="text-amber-500" /> Alergias
                                            </p>
                                            <div className="bg-amber-50/50 rounded-lg px-4 py-2 text-sm text-slate-600 leading-relaxed border border-amber-100/50">
                                                {patient.allergies}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Fila Inferior (Educación y Notas ocupan todo el ancho o se dividen) */}
                        <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-5">
                            {/* Educación */}
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden h-full">
                                <div className="px-5 py-3 border-b border-slate-100">
                                    <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <School size={15} className="text-emerald-500" /> Educación
                                    </h3>
                                </div>
                                <div className="px-5 py-4 grid grid-cols-2 gap-4">
                                    <InfoField label="Centro escolar" value={patient.school} icon={School} />
                                    <InfoField label="Curso" value={patient.schoolYear} />
                                </div>
                            </div>

                            {/* Observaciones (Si hay, si no, un espacio vacío o el registro ocupa 2 col) */}
                            {patient.notes ? (
                                <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden h-full">
                                    <div className="px-5 py-3 border-b border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <FileText size={15} className="text-violet-500" /> Observaciones
                                        </h3>
                                    </div>
                                    <div className="px-5 py-4">
                                        <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm text-slate-600 leading-relaxed">
                                            {patient.notes}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-5 flex items-center">
                                    <div className="flex items-center gap-3">
                                        <Calendar size={20} className="text-emerald-500" />
                                        <div>
                                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Registrado el</p>
                                            <p className="text-base font-semibold text-emerald-800">
                                                {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Fecha de registro (Si hubo notas, va abajo; si no, ya se mostró a la derecha) */}
                        {patient.notes && (
                            <div className="lg:col-span-2 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 p-4">
                                <div className="flex items-center gap-2">
                                    <Calendar size={16} className="text-emerald-500" />
                                    <div>
                                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Registrado el</p>
                                        <p className="text-sm font-semibold text-emerald-800">
                                            {patient.createdAt ? new Date(patient.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Documentación aportada (Mis documentos — este paciente) */}
                        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                    <FileStack size={15} className="text-violet-500" /> Documentación aportada
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Archivos subidos en <strong className="text-slate-600">Mis documentos → Docs. de mis hijos/as</strong>
                                    {patientDocCount > 0 && (
                                        <span className="text-slate-400"> · {patientDocCount}/{PATIENT_DOCS.length}</span>
                                    )}
                                </p>
                            </div>
                            <div className="px-5 py-4">
                                {patientDocCount === 0 ? (
                                    <p className="text-sm text-slate-500">Aún no hay documentos subidos para este paciente.</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {PATIENT_DOCS.map((doc) => {
                                            const path = patient[doc.id];
                                            if (!path) return null;
                                            const url = absoluteDocumentUrl(path);
                                            return (
                                                <div
                                                    key={doc.id}
                                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50/80"
                                                >
                                                    <span className="text-base leading-none" aria-hidden>{doc.icon}</span>
                                                    <span className="text-sm font-semibold text-slate-800">{doc.label}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setDocPreview({
                                                                title: `${doc.label} · ${patient.name} ${patient.lastName}`,
                                                                url,
                                                            })
                                                        }
                                                        className="p-1 rounded-md text-violet-600 hover:bg-violet-100 transition-colors"
                                                        title="Ver documento"
                                                        aria-label={`Ver ${doc.label}`}
                                                    >
                                                        <Eye size={16} aria-hidden />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            downloadDocument(url, filenameFromDocumentPath(path))
                                                        }
                                                        className="p-1 rounded-md text-violet-600 hover:bg-violet-100 transition-colors"
                                                        title="Descargar documento"
                                                        aria-label={`Descargar ${doc.label}`}
                                                    >
                                                        <Download size={16} aria-hidden />
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button onClick={onClose}
                        className="px-6 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
        <DocumentPreviewOverlay preview={docPreview} onClose={() => setDocPreview(null)} />
        </>
    );
};

export default PatientDetailModal;
