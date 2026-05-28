import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Search, Filter, Eye, Edit3, Cake, School, Building2, MapPin, Loader2 } from 'lucide-react';
import { MUNICIPIOS_DELEGACION, MUNICIPIOS_RESTO_ALFABETICO } from '../../data/baixLlobregatMunicipios';

const PATIENT_API = '/api/pacientes';
const SEARCH_DEBOUNCE_MS = 280;

export default function ChildrenFiltersModal({
    isOpen,
    onClose,
    token,
    delegaciones,
    onViewPatient,
    onEditPatient,
}) {
    const [delegationId, setDelegationId] = useState('');
    const [municipio, setMunicipio] = useState('');
    const [q, setQ] = useState('');
    const [debouncedQ, setDebouncedQ] = useState('');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setQ('');
            setDelegationId('');
            setMunicipio('');
            setDebouncedQ('');
            setItems([]);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return undefined;
        const tid = setTimeout(() => setDebouncedQ(String(q).trim()), q.trim() ? SEARCH_DEBOUNCE_MS : 0);
        return () => clearTimeout(tid);
    }, [q, isOpen]);

    useEffect(() => {
        if (!isOpen || !token) return undefined;
        let cancelled = false;
        const run = async () => {
            setLoading(true);
            try {
                const params = new URLSearchParams();
                if (delegationId) params.set('delegationId', delegationId);
                if (municipio) params.set('municipio', municipio);
                if (debouncedQ) params.set('q', debouncedQ);
                const res = await axios.get(`${PATIENT_API}/browse?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!cancelled) setItems(res.data?.items || []);
            } catch (e) {
                if (!cancelled) {
                    console.error(e);
                    setItems([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        run();
        return () => {
            cancelled = true;
        };
    }, [isOpen, token, delegationId, municipio, debouncedQ]);

    if (!isOpen) return null;

    const avatarColors = ['#dc3545', '#6E9EFF', '#FF9500', '#28a745', '#9c27b0', '#e91e63', '#00bcd4', '#ff5722'];
    const getAvatarColor = (name) => {
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };
    const getInitials = (name, lastName) => ((name?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase();

    const calcAge = (birthDate) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const socioDisplayName = (s) => (s ? `${s.name} ${s.lastName} (${s.memberCode})` : '');

    const toSocioShape = (row) =>
        row.socio
            ? {
                  id: row.socio.id,
                  name: row.socio.name,
                  lastName: row.socio.lastName,
                  memberCode: row.socio.memberCode,
                  delegationId: row.socio.delegationId,
                  delegation: row.socio.delegation,
                  patients: [],
              }
            : null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col min-h-0 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
            >
                <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0 bg-gradient-to-r from-slate-50 to-blue-50/40">
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                            <Search className="text-[#6E9EFF]" size={22} />
                            Filtrar pacientes
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 max-w-xl">
                            Solo pacientes (no tutores). La búsqueda se actualiza al escribir; delegación y municipio al instante. Las tarjetas coinciden con la vista al expandir «Ver pacientes».
                        </p>
                    </div>
                    <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                        <X size={22} />
                    </button>
                </div>

                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 lg:items-end shrink-0 bg-white">
                    <div className="flex-1 min-w-0">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">Búsqueda</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
                            <input
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                placeholder="Nombre, código, tutor, dirección…"
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 outline-none"
                            />
                        </div>
                    </div>
                    <div className="w-full sm:w-52">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Building2 size={12} /> Delegación paciente
                        </label>
                        <select
                            value={delegationId}
                            onChange={(e) => setDelegationId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/25 outline-none"
                        >
                            <option value="">Todas</option>
                            {delegaciones.map((d) => (
                                <option key={d.id} value={String(d.id)}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full sm:w-56">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <MapPin size={12} /> Municipio
                        </label>
                        <select
                            value={municipio}
                            onChange={(e) => setMunicipio(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-blue-500/25 outline-none"
                        >
                            <option value="">Todos</option>
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
                    <div className="shrink-0 flex items-end">
                        <button
                            type="button"
                            onClick={() => {
                                setDelegationId('');
                                setMunicipio('');
                                setQ('');
                            }}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 inline-flex items-center gap-1.5 h-[42px]"
                        >
                            <Filter size={14} /> Limpiar
                        </button>
                    </div>
                </div>

                <div className="min-h-0 h-[min(40rem,calc(92vh-13rem))] overflow-y-auto overscroll-contain p-4 sm:p-5 bg-slate-50/80">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center min-h-[12rem] gap-3 text-slate-400">
                            <Loader2 className="animate-spin" size={32} />
                            <p className="text-sm font-medium">Cargando pacientes…</p>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex items-center justify-center min-h-[12rem]">
                            <p className="text-center text-slate-500 text-sm">No hay pacientes con estos filtros.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {items.map((patient) => {
                                const age = calcAge(patient.birthDate);
                                const s = patient.socio;
                                return (
                                    <div
                                        key={patient.id}
                                        className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all"
                                    >
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 truncate" title={socioDisplayName(s)}>
                                            Tutor: {socioDisplayName(s)}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="flex items-center justify-center w-11 h-11 rounded-full text-white font-bold text-[13px] shadow-sm shrink-0"
                                                style={{ backgroundColor: getAvatarColor(patient.name + patient.lastName) }}
                                            >
                                                {getInitials(patient.name, patient.lastName)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-slate-700 truncate uppercase">
                                                    {patient.name} {patient.lastName}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                    {age !== null && (
                                                        <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                            <Cake size={11} /> {age} años
                                                        </span>
                                                    )}
                                                    {patient.autismDegree && (
                                                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                                                            {patient.autismDegree === 'grado1'
                                                                ? 'Grado 1'
                                                                : patient.autismDegree === 'grado2'
                                                                  ? 'Grado 2'
                                                                  : patient.autismDegree === 'grado3'
                                                                    ? 'Grado 3'
                                                                    : 'Pendiente'}
                                                        </span>
                                                    )}
                                                </div>
                                                {patient.delegation?.name && (
                                                    <p className="text-[10px] text-blue-600 font-semibold mt-1 truncate flex items-center gap-1">
                                                        <Building2 size={10} /> {patient.delegation.name}
                                                    </p>
                                                )}
                                                {patient.municipio && (
                                                    <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                                                        <MapPin size={10} /> {patient.municipio}
                                                    </p>
                                                )}
                                                {patient.school && (
                                                    <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                                        <School size={11} /> {patient.school}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => onViewPatient(patient, socioDisplayName(s))}
                                                className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors"
                                                title="Ver detalle"
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onEditPatient(patient, toSocioShape(patient))}
                                                className="p-1.5 rounded-md text-yellow-600 hover:bg-yellow-50 transition-colors"
                                                title="Editar"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
