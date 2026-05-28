import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { X, Users, Search, Baby, UserCircle2 } from 'lucide-react';
import useAuthStore from '../../store/authStore';

const API_URL = '/api';

const ActivityEnrolledModal = ({ isOpen, onClose, activityId }) => {
    const { token } = useAuthStore();
    const [activity, setActivity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen && activityId) {
            fetchDetails();
        } else {
            setActivity(null);
            setSearch('');
        }
    }, [isOpen, activityId]);

    const fetchDetails = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/actividades/${activityId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActivity(res.data);
        } catch (error) {
            console.error('Error fetching enrolled details:', error);
        } finally {
            setLoading(false);
        }
    };

    const grouped = useMemo(() => {
        if (!activity) return [];
        const socios = activity.socios || [];
        const patients = activity.patients || [];
        const details = activity.enrollmentDetails || [];
        return socios.map((socio) => {
            const detail = details.find((d) => d.socioId === socio.id);
            const pats = patients.filter((p) => p.socioId === socio.id);
            return {
                socio,
                patients: pats,
                guestChildrenUnder18: detail?.guestChildrenUnder18 ?? 0,
                guestAdults18Plus: detail?.guestAdults18Plus ?? 0
            };
        });
    }, [activity]);

    const aforoPlazas = activity
        ? (activity.socios?.length || 0) + (activity.patients?.length || 0)
        : 0;

    const filtered = useMemo(() => {
        const term = search.toLowerCase().trim();
        if (!term) return grouped;
        return grouped.filter((g) => {
            const s = `${g.socio.name} ${g.socio.lastName || ''} ${g.socio.dni || ''} ${g.socio.memberCode || ''}`.toLowerCase();
            const pMatch = g.patients.some((p) =>
                `${p.name} ${p.lastName || ''} ${p.patientCode || ''}`.toLowerCase().includes(term)
            );
            return s.includes(term) || pMatch;
        });
    }, [grouped, search]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 leading-tight">
                                Inscripciones
                            </h2>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                {activity?.title || 'Cargando actividad...'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition-colors shrink-0 shadow-sm"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col flex-1 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
                        </div>
                    ) : (
                        <>
                            <div className="p-4 sm:p-6 border-b border-slate-100 bg-white shrink-0">
                                <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm font-bold text-slate-600">
                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg w-fit">
                                            {grouped.length} titular(es)
                                        </span>
                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg w-fit">
                                            {aforoPlazas} plazas de aforo (titulares + pacientes)
                                        </span>
                                        {activity?.maxCapacity && (
                                            <span className="text-slate-400 font-medium">/ {activity.maxCapacity} máx.</span>
                                        )}
                                    </div>
                                    <div className="relative w-full sm:w-64 shrink-0">
                                        <input
                                            type="text"
                                            placeholder="Buscar titular o paciente…"
                                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-colors"
                                            value={search}
                                            onChange={(e) => setSearch(e.target.value)}
                                        />
                                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                                    Los contadores de invitados (menores / adultos) son informativos y <strong>no</strong> suman al aforo.
                                </p>
                            </div>

                            <div className="overflow-y-auto custom-scrollbar p-4 sm:p-6 flex-1 bg-slate-50">
                                {filtered.length > 0 ? (
                                    <div className="space-y-4">
                                        {filtered.map((g) => (
                                            <div
                                                key={g.socio.id}
                                                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm"
                                            >
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg shrink-0 shadow-inner">
                                                        {g.socio.name.charAt(0).toUpperCase()}
                                                        {(g.socio.lastName || '').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-slate-800 text-sm">
                                                            {g.socio.name} {g.socio.lastName || ''}
                                                        </p>
                                                        <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                                                            Socio titular
                                                        </span>
                                                        <p className="text-xs text-slate-500 mt-1">
                                                            {g.socio.memberCode || g.socio.dni || '—'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-sky-50 text-sky-800 px-2.5 py-1 rounded-lg border border-sky-100">
                                                        <Baby size={14} />
                                                        {g.guestChildrenUnder18} menor(es) invitado(s)
                                                    </span>
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-900 px-2.5 py-1 rounded-lg border border-amber-100">
                                                        <UserCircle2 size={14} />
                                                        {g.guestAdults18Plus} adulto(s) invitado(s)
                                                    </span>
                                                </div>

                                                <div className="border-t border-slate-100 pt-3">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                                        Pacientes en aforo ({g.patients.length})
                                                    </p>
                                                    {g.patients.length === 0 ? (
                                                        <p className="text-xs text-slate-500 italic">Solo asiste el titular (1 plaza).</p>
                                                    ) : (
                                                        <ul className="space-y-2">
                                                            {g.patients.map((p) => (
                                                                <li
                                                                    key={p.id}
                                                                    className="flex items-center gap-2 text-sm text-slate-700 bg-fuchsia-50/50 rounded-xl px-3 py-2 border border-fuchsia-100/80"
                                                                >
                                                                    <span className="text-[10px] font-black uppercase text-fuchsia-600">Paciente</span>
                                                                    <span className="font-semibold">
                                                                        {p.name} {p.lastName || ''}
                                                                    </span>
                                                                    <span className="text-xs text-slate-500 truncate">{p.patientCode}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 px-4">
                                        <Users size={32} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-sm font-medium text-slate-500">
                                            {search ? 'No hay resultados para la búsqueda.' : 'Todavía no hay inscripciones.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityEnrolledModal;
