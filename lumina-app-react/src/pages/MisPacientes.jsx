import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Heart, UserPlus, Edit3, Trash2, Eye, Cake, GraduationCap, AlertCircle, Loader2, Search, Activity, Building2, MapPin, Filter } from 'lucide-react';
import useAuthStore from '../store/authStore';
import PatientModal from '../components/socios/PatientModal';
import PatientDetailModal from '../components/socios/PatientDetailModal';
import Swal from 'sweetalert2';
import { MUNICIPIOS_DELEGACION, MUNICIPIOS_RESTO_ALFABETICO } from '../data/baixLlobregatMunicipios';

const API = process.env.REACT_APP_API_URL || '/api';

const MisPacientes = () => {
    const { token } = useAuthStore();
    const [patients, setPatients] = useState([]);
    const [socioInfo, setSocioInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDelegationId, setFilterDelegationId] = useState('');
    const [filterMunicipio, setFilterMunicipio] = useState('');

    // Modals
    const [patientModalOpen, setPatientModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [viewingPatient, setViewingPatient] = useState(null);

    const [delegaciones, setDelegaciones] = useState([]);

    const fetchMyPatients = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${API}/pacientes/me`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPatients(res.data.patients || []);
            setSocioInfo(res.data.socio || null);
        } catch (err) {
            console.error('Error fetching my patients:', err);
            if (err.response?.status === 403) {
                setError('Tu cuenta no tiene un perfil de socio vinculado. Contacta con el administrador.');
            } else {
                setError('Error al cargar tus pacientes. Inténtalo de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axios.get(`${API}/delegaciones`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!cancelled) setDelegaciones((res.data || []).filter((d) => d.active !== false));
            } catch {
                if (!cancelled) setDelegaciones([]);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    useEffect(() => { fetchMyPatients(); }, [fetchMyPatients]);

    const filteredPatients = patients.filter((p) => {
        if (filterDelegationId) {
            const did = String(p.delegationId ?? '');
            if (did !== filterDelegationId) return false;
        }
        if (filterMunicipio && (p.municipio || '') !== filterMunicipio) return false;
        const term = searchTerm.toLowerCase();
        if (!term) return true;
        return (
            `${p.name} ${p.lastName}`.toLowerCase().includes(term) ||
            p.patientCode?.toLowerCase().includes(term) ||
            (p.school || '').toLowerCase().includes(term) ||
            (p.address || '').toLowerCase().includes(term) ||
            (p.municipio || '').toLowerCase().includes(term) ||
            (p.delegation?.name || '').toLowerCase().includes(term)
        );
    });

    // CRUD handlers
    const handleSavePatient = async (formData) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (editingPatient) {
                await axios.put(`${API}/pacientes/${editingPatient.id}`, formData, config);
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Paciente actualizado correctamente.', timer: 1800, showConfirmButton: false });
            } else {
                formData.append('socioId', socioInfo.id);
                await axios.post(`${API}/pacientes`, formData, config);
                Swal.fire({ icon: 'success', title: 'Creado', text: 'Paciente añadido correctamente.', timer: 1800, showConfirmButton: false });
            }
            setPatientModalOpen(false);
            setEditingPatient(null);
            fetchMyPatients();
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message || 'Error al guardar el paciente.' });
        }
    };

    const handleDeletePatient = async (patient) => {
        const result = await Swal.fire({
            title: '¿Eliminar paciente?',
            html: `Se eliminará a <strong>${patient.name} ${patient.lastName}</strong> de forma permanente.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API}/pacientes/${patient.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Paciente eliminado correctamente.', timer: 1500, showConfirmButton: false });
                fetchMyPatients();
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'Error al eliminar el paciente.' });
            }
        }
    };

    // Helpers
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

    const autismBadge = (degree) => {
        const labels = { grado1: 'Grado 1', grado2: 'Grado 2', grado3: 'Grado 3', diagnostico_pendiente: 'Pendiente' };
        const colors = { grado1: 'bg-green-50 text-green-700 border-green-200', grado2: 'bg-amber-50 text-amber-700 border-amber-200', grado3: 'bg-red-50 text-red-700 border-red-200', diagnostico_pendiente: 'bg-slate-50 text-slate-600 border-slate-200' };
        return degree ? (
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${colors[degree] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                <Activity size={11} /> {labels[degree] || degree}
            </span>
        ) : null;
    };

    // Loading state
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-[#6E9EFF] animate-spin" />
                <p className="text-slate-400 font-medium">Cargando tus pacientes...</p>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                </div>
                <p className="text-slate-600 font-medium text-center max-w-md">{error}</p>
                <button onClick={fetchMyPatients} className="px-5 py-2.5 bg-[#6E9EFF] text-white rounded-xl font-semibold text-sm hover:bg-[#5a8ae6] transition-colors">
                    Reintentar
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <Heart className="text-rose-500" size={28} />
                            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Mis Pacientes</h1>
                        </div>
                        <p className="text-slate-400 text-sm ml-[40px]">
                            Gestiona los datos de tus pacientes de forma sencilla
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingPatient(null); setPatientModalOpen(true); }}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#6E9EFF] to-[#5b8df5] text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 self-start sm:self-auto"
                    >
                        <UserPlus size={18} />
                        Añadir paciente
                    </button>
                </div>
            </div>

            {/* Search bar (only show if there are patients) */}
            {patients.length > 0 && (
                <div className="mb-6 space-y-4">
                    <div className="relative w-full">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por nombre, código, centro, dirección, municipio…"
                            className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]/30 focus:border-[#6E9EFF] transition-all"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-end">
                        <div className="w-full sm:w-52">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Building2 size={12} /> Delegación paciente
                            </label>
                            <select
                                value={filterDelegationId}
                                onChange={(e) => setFilterDelegationId(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-[#6E9EFF]/25 outline-none"
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
                                value={filterMunicipio}
                                onChange={(e) => setFilterMunicipio(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:ring-2 focus:ring-[#6E9EFF]/25 outline-none"
                            >
                                <option value="">Todos</option>
                                <optgroup label="Delegaciones">
                                    {MUNICIPIOS_DELEGACION.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="Resto Baix Llobregat">
                                    {MUNICIPIOS_RESTO_ALFABETICO.map((m) => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => { setSearchTerm(''); setFilterDelegationId(''); setFilterMunicipio(''); }}
                            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200 inline-flex items-center gap-2 self-start sm:self-auto"
                        >
                            <Filter size={14} /> Limpiar filtros
                        </button>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {patients.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                    <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-5">
                        <Heart className="w-10 h-10 text-rose-300" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-700 mb-2">Aún no tienes pacientes registrados</h3>
                    <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                        Al registrar un paciente deberás indicar su dirección y delegación. La información quedará disponible para el equipo de la asociación.
                    </p>
                    <button
                        onClick={() => { setEditingPatient(null); setPatientModalOpen(true); }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#6E9EFF] to-[#5b8df5] text-white rounded-xl font-semibold text-sm shadow-md hover:shadow-lg hover:scale-[1.02] transition-all"
                    >
                        <UserPlus size={18} />
                        Añadir mi primer paciente
                    </button>
                </div>
            )}

            {/* Patient cards grid */}
            {filteredPatients.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredPatients.map(patient => {
                        const age = calcAge(patient.birthDate);
                        return (
                            <div key={patient.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-300 overflow-hidden group">
                                {/* Card header with gradient stripe */}
                                <div className="h-2 bg-gradient-to-r from-[#6E9EFF] to-[#8b5cf6]" />

                                <div className="p-5">
                                    {/* Avatar + Name */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div
                                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-sm shrink-0"
                                            style={{ backgroundColor: getAvatarColor(patient.name + patient.lastName) }}
                                        >
                                            {getInitials(patient.name, patient.lastName)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-bold text-slate-800 truncate">{patient.name} {patient.lastName}</h3>
                                            <p className="text-xs text-slate-400 font-medium mt-0.5">{patient.patientCode}</p>
                                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                                {age !== null && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                                        <Cake size={11} /> {age} años
                                                    </span>
                                                )}
                                                {autismBadge(patient.autismDegree)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Info pills */}
                                    <div className="space-y-2 mb-4">
                                        {patient.school && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <GraduationCap size={14} className="text-emerald-500 shrink-0" />
                                                <span className="truncate">{patient.school}{patient.schoolYear ? ` — ${patient.schoolYear}` : ''}</span>
                                            </div>
                                        )}
                                        {patient.delegation?.name && (
                                            <div className="flex items-center gap-2 text-sm text-blue-600">
                                                <Building2 size={14} className="shrink-0" />
                                                <span className="truncate font-medium">{patient.delegation.name}</span>
                                            </div>
                                        )}
                                        {patient.municipio && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <MapPin size={14} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{patient.municipio}</span>
                                            </div>
                                        )}
                                        {patient.address && (
                                            <p className="text-xs text-slate-500 line-clamp-2">{patient.address}</p>
                                        )}
                                        {patient.birthDate && (
                                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                                <Cake size={14} className="text-violet-400 shrink-0" />
                                                <span>{new Date(patient.birthDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                                        <button
                                            onClick={() => { setViewingPatient(patient); setDetailModalOpen(true); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                        >
                                            <Eye size={15} /> Ver detalle
                                        </button>
                                        <button
                                            onClick={() => { setEditingPatient(patient); setPatientModalOpen(true); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                                        >
                                            <Edit3 size={15} /> Editar
                                        </button>
                                        <button
                                            onClick={() => handleDeletePatient(patient)}
                                            className="p-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* No filter results */}
            {patients.length > 0 && filteredPatients.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                    <Search className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">
                        {searchTerm
                            ? <>No hay pacientes que coincidan con &quot;<span className="text-slate-700">{searchTerm}</span>&quot;</>
                            : 'Ningún paciente coincide con los filtros seleccionados'}
                    </p>
                    <button
                        type="button"
                        onClick={() => { setSearchTerm(''); setFilterDelegationId(''); setFilterMunicipio(''); }}
                        className="mt-3 text-sm text-[#6E9EFF] font-semibold hover:underline"
                    >
                        Limpiar búsqueda y filtros
                    </button>
                </div>
            )}

            {/* Patient Modals */}
            <PatientModal
                isOpen={patientModalOpen}
                onClose={() => { setPatientModalOpen(false); setEditingPatient(null); }}
                onSave={handleSavePatient}
                patient={editingPatient}
                socioName={socioInfo ? `${socioInfo.name} ${socioInfo.lastName}` : ''}
                defaultDelegationId={socioInfo?.delegationId ?? null}
                delegaciones={delegaciones}
            />
            <PatientDetailModal
                isOpen={detailModalOpen}
                onClose={() => { setDetailModalOpen(false); setViewingPatient(null); }}
                patient={viewingPatient}
                socioName={socioInfo ? `${socioInfo.name} ${socioInfo.lastName}` : ''}
            />
        </div>
    );
};

export default MisPacientes;
