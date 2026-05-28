import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import {
    Search, Filter, Plus, Eye, Edit3, Trash2, Users, Phone, Mail,
    ChevronDown, ChevronUp, Cake, UserPlus, Heart, School, Download, Building2, MapPin
} from 'lucide-react';
import { MUNICIPIOS_DELEGACION, MUNICIPIOS_RESTO_ALFABETICO } from '../data/baixLlobregatMunicipios';
import { downloadSociosCsv } from '../utils/sociosCsv';
import Button from '../components/Button';
import Swal from 'sweetalert2';
import CreateSocioModal from '../components/socios/CreateSocioModal';
import PatientModal from '../components/socios/PatientModal';
import PatientDetailModal from '../components/socios/PatientDetailModal';
import SocioDetailModal from '../components/socios/SocioDetailModal';
import ChildrenFiltersModal from '../components/socios/ChildrenFiltersModal';

const Socios = () => {
    const { token } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [socios, setSocios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [delegationFilter, setDelegationFilter] = useState('');
    const [municipioFilter, setMunicipioFilter] = useState('');
    const [expandedSocio, setExpandedSocio] = useState(null);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editingSocio, setEditingSocio] = useState(null);

    // Socio Detail modal state
    const [socioDetailModalOpen, setSocioDetailModalOpen] = useState(false);
    const [viewingSocio, setViewingSocio] = useState(null);

    // Patient modal state
    const [patientModalOpen, setPatientModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState(null);
    const [patientSocio, setPatientSocio] = useState(null);

    // Patient detail modal state
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [viewingPatient, setViewingPatient] = useState(null);
    const [viewingSocioName, setViewingSocioName] = useState('');

    const [delegaciones, setDelegaciones] = useState([]);
    const [childrenFiltersOpen, setChildrenFiltersOpen] = useState(false);

    // Auto-open create modal if ?crear=true
    useEffect(() => {
        if (searchParams.get('crear') === 'true') {
            setCreateModalOpen(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    const API = '/api/socios';
    const PATIENT_API = '/api/pacientes';
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await axios.get('/api/delegaciones', { headers });
                if (!cancelled) setDelegaciones((res.data || []).filter((d) => d.active !== false));
            } catch {
                if (!cancelled) setDelegaciones([]);
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const fetchSocios = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API, { headers });
            setSocios(res.data);
        } catch (error) {
            console.error('Error al cargar socios:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSocios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Helpers ──
    const avatarColors = ['#dc3545', '#6E9EFF', '#FF9500', '#28a745', '#9c27b0', '#e91e63', '#00bcd4', '#ff5722'];
    const getAvatarColor = (name) => {
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };
    const getInitials = (name, lastName) => {
        return ((name?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase();
    };

    const calcAge = (birthDate) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const togglePatients = (socioId) => {
        setExpandedSocio(expandedSocio === socioId ? null : socioId);
    };

    // ── Socio CRUD ──
    const openEditSocio = (socio) => {
        setEditingSocio(socio);
        setCreateModalOpen(true);
    };

    const openViewSocio = (socio) => {
        setViewingSocio(socio);
        setSocioDetailModalOpen(true);
    };

    const handleSaveSocio = async (payload, id) => {
        try {
            let res;
            if (id) {
                // Editing existing
                res = await axios.put(`${API}/${id}`, payload, { headers });
                Swal.fire({
                    icon: 'success',
                    title: '¡Socio actualizado!',
                    text: 'Los datos del socio han sido guardados.',
                    confirmButtonColor: '#10b981',
                    timer: 3000,
                });
            } else {
                // Creating new
                res = await axios.post(API, payload, { headers });
                Swal.fire({
                    icon: 'success',
                    title: '¡Socio creado!',
                    html: `El socio ha sido registrado correctamente.<br>Código asignado: <strong>${res.data.memberCode}</strong>`,
                    confirmButtonColor: '#10b981',
                    timer: 4000,
                });
            }
            setCreateModalOpen(false);
            setEditingSocio(null);
            fetchSocios();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'No se pudo guardar el socio',
                confirmButtonColor: '#6E9EFF',
            });
        }
    };

    const handleDeleteSocio = async (socio) => {
        const result = await Swal.fire({
            title: '¿Eliminar socio?',
            html: `Se eliminará a <strong>${socio.name} ${socio.lastName}</strong> y todos sus pacientes.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${API}/${socio.id}`, { headers });
                Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Socio eliminado correctamente.', timer: 2000, confirmButtonColor: '#10b981' });
                fetchSocios();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el socio.' });
            }
        }
    };

    // ── Patient CRUD ──
    const openCreatePatient = (socio) => {
        setEditingPatient(null);
        setPatientSocio(socio);
        setPatientModalOpen(true);
    };

    const openEditPatient = (patient, socio) => {
        setEditingPatient(patient);
        setPatientSocio(socio);
        setPatientModalOpen(true);
    };

    const openViewPatient = (patient, socio) => {
        setViewingPatient(patient);
        setViewingSocioName(`${socio.name} ${socio.lastName}`);
        setDetailModalOpen(true);
    };

    const handleSavePatient = async (formData) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (editingPatient) {
                await axios.put(`${PATIENT_API}/${editingPatient.id}`, formData, config);
                Swal.fire({ icon: 'success', title: '¡Paciente actualizado!', showConfirmButton: false, timer: 1500, timerProgressBar: true });
            } else {
                formData.append('socioId', patientSocio.id);
                await axios.post(PATIENT_API, formData, config);
                Swal.fire({ icon: 'success', title: '¡Paciente creado!', showConfirmButton: false, timer: 1500, timerProgressBar: true });
            }
            setPatientModalOpen(false);
            setEditingPatient(null);
            setPatientSocio(null);
            fetchSocios();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo guardar el paciente.', confirmButtonColor: '#6E9EFF' });
        }
    };

    const handleDeletePatient = async (patient) => {
        const result = await Swal.fire({
            title: '¿Eliminar paciente?',
            html: `Se eliminará a <strong>${patient.name} ${patient.lastName}</strong>.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });
        if (result.isConfirmed) {
            try {
                await axios.delete(`${PATIENT_API}/${patient.id}`, { headers });
                Swal.fire({ icon: 'success', title: 'Eliminado', showConfirmButton: false, timer: 1200 });
                fetchSocios();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar.' });
            }
        }
    };

    // ── Filtering ──
    const filteredSocios = socios.filter(socio => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
            (socio.name || '').toLowerCase().includes(searchLower) ||
            (socio.lastName || '').toLowerCase().includes(searchLower) ||
            (socio.memberCode || '').toLowerCase().includes(searchLower) ||
            (socio.email || '').toLowerCase().includes(searchLower) ||
            (socio.phone || '').toLowerCase().includes(searchLower) ||
            (socio.dni || '').toLowerCase().includes(searchLower);
        const matchesType = typeFilter === '' ||
            (typeFilter === 'CON_PACIENTES' ? (socio.patients?.length > 0) : (socio.patients?.length === 0));
        const matchesDelegation =
            delegationFilter === '' || String(socio.delegationId ?? '') === delegationFilter;
        const matchesMunicipio =
            municipioFilter === '' || (socio.municipio || '') === municipioFilter;
        return matchesSearch && matchesType && matchesDelegation && matchesMunicipio;
    });

    const handleExportCsv = () => {
        if (!filteredSocios.length) {
            Swal.fire({ icon: 'info', title: 'Sin datos', text: 'No hay socios que exportar con los filtros actuales.', confirmButtonColor: '#6E9EFF' });
            return;
        }
        downloadSociosCsv(filteredSocios, 'socios_lumina');
    };

    // ── Slide Animation Component ──
    const SlideDown = ({ isOpen, children }) => {
        const contentRef = useRef(null);
        const [height, setHeight] = useState(0);

        useEffect(() => {
            if (isOpen && contentRef.current) {
                setHeight(contentRef.current.scrollHeight);
            } else {
                setHeight(0);
            }
        }, [isOpen, children]);

        return (
            <tr>
                <td colSpan="5" className="p-0 border-0">
                    <div
                        className="overflow-hidden transition-all duration-400 ease-in-out"
                        style={{
                            maxHeight: isOpen ? `${height + 20}px` : '0px',
                            opacity: isOpen ? 1 : 0,
                        }}
                    >
                        <div ref={contentRef}>
                            {children}
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="w-full bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {/* ===== Page Title ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Users size={26} className="text-blue-600 hidden sm:block" />
                        Gestión de Socios
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Administra todos los socios registrados en la plataforma</p>
                </div>
                <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto sm:pr-6 shrink-0">
                    <button
                        type="button"
                        onClick={handleExportCsv}
                        className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-white border-2 border-slate-200 text-slate-700 hover:border-[#6E9EFF] hover:text-[#6E9EFF] shadow-sm transition-all w-full sm:w-auto inline-flex items-center justify-center gap-2"
                    >
                        <Download size={16} />
                        Exportar CSV
                    </button>
                    <Button onClick={() => setCreateModalOpen(true)} className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-lumina-blue text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto">
                        <Plus size={16} className="mr-2" />
                        Nuevo Socio
                    </Button>
                </div>
            </div>

            {/* ===== Search & Filters Bar ===== */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-5 mb-6 space-y-4">
                <div className="w-full">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Search size={13} /> Buscador
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre, código, teléfono, email, DNI..."
                            className="w-full pl-4 pr-11 py-3 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                        <Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-end">
                    {/* Tipo de Socio */}
                    <div className="w-full sm:w-44 lg:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Users size={13} /> Tipo de Socio
                        </label>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todos los tipos</option>
                            <option value="CON_PACIENTES">Con pacientes</option>
                            <option value="SIN_PACIENTES">Sin pacientes</option>
                        </select>
                    </div>

                    {/* Delegación */}
                    <div className="w-full sm:w-44 lg:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Building2 size={13} /> Delegación
                        </label>
                        <select
                            value={delegationFilter}
                            onChange={(e) => setDelegationFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todas</option>
                            {delegaciones.map((d) => (
                                <option key={d.id} value={String(d.id)}>
                                    {d.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Municipio */}
                    <div className="w-full sm:w-44 lg:w-52">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <MapPin size={13} /> Municipio
                        </label>
                        <select
                            value={municipioFilter}
                            onChange={(e) => setMunicipioFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
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

                    {/* Reset + Filtrar pacientes */}
                    <div className="flex flex-wrap gap-2 shrink-0 items-end">
                        <button
                            type="button"
                            onClick={() => {
                                setSearch('');
                                setTypeFilter('');
                                setDelegationFilter('');
                                setMunicipioFilter('');
                            }}
                            className="px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center gap-1.5"
                        >
                            <Filter size={14} /> Limpiar
                        </button>
                        <button
                            type="button"
                            onClick={() => setChildrenFiltersOpen(true)}
                            className="px-4 py-2.5 text-sm font-semibold text-violet-800 bg-violet-50 hover:bg-violet-100 border-2 border-violet-200 rounded-lg transition-all flex items-center gap-1.5"
                        >
                            <Search size={14} /> Filtrar pacientes
                        </button>
                    </div>
                </div>
            </div>

            {/* ===== Socios Table ===== */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">
                                    <div className="flex items-center gap-1.5"><Users size={14} /> Socio</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">
                                    <div className="flex items-center gap-1.5"><Phone size={14} /> Contacto</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5"><Heart size={14} /> Pacientes</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Tipo / Estado</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Acciones</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">Cargando socios...</td></tr>
                            ) : filteredSocios.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">No se encontraron socios.</td></tr>
                            ) : (
                                filteredSocios.map(socio => (
                                    <React.Fragment key={socio.id}>
                                        {/* Socio Row */}
                                        <tr className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default">
                                            {/* SOCIO */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-[14px] shadow-md ring-2 ring-white transition-transform duration-200 group-hover:scale-110 shrink-0"
                                                        style={{ backgroundColor: getAvatarColor(socio.name + socio.lastName) }}
                                                    >
                                                        {getInitials(socio.name, socio.lastName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 text-[15px] leading-tight uppercase">{socio.name} {socio.lastName}</p>
                                                        <p className="text-[12px] text-slate-400 mt-0.5">{socio.memberCode}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* CONTACTO */}
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    {socio.phone && (
                                                        <p className="flex items-center gap-1.5 text-sm text-slate-600">
                                                            <Phone size={13} className="text-blue-400 shrink-0" /> {socio.phone}
                                                        </p>
                                                    )}
                                                    {socio.email && (
                                                        <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                                            <Mail size={13} className="text-slate-400 shrink-0" /> {socio.email}
                                                        </p>
                                                    )}
                                                    {!socio.phone && !socio.email && (
                                                        <p className="text-sm text-slate-300">Sin datos</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* PACIENTES — Always show button */}
                                            <td className="px-6 py-5 text-center">
                                                <button
                                                    onClick={() => togglePatients(socio.id)}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all duration-200 ${expandedSocio === socio.id
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                        }`}
                                                >
                                                    <Heart size={14} />
                                                    {socio.patients?.length > 0
                                                        ? `Ver pacientes (${socio.patients.length})`
                                                        : 'Pacientes'
                                                    }
                                                    {expandedSocio === socio.id
                                                        ? <ChevronUp size={14} />
                                                        : <ChevronDown size={14} />
                                                    }
                                                </button>
                                            </td>

                                            {/* TIPO / ESTADO */}
                                            <td className="px-6 py-5 text-center">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${socio.status === 'ACTIVE'
                                                    ? 'bg-green-100 text-green-700'
                                                    : socio.status === 'INACTIVE'
                                                        ? 'bg-red-100 text-red-600'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {socio.status === 'ACTIVE' ? 'Activo'
                                                        : socio.status === 'INACTIVE' ? 'Inactivo'
                                                            : 'Pendiente'}
                                                </span>
                                            </td>

                                            {/* ACCIONES */}
                                            <td className="px-4 py-5">
                                                <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                    <button onClick={() => openViewSocio(socio)} className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap">
                                                        <Eye size={14} /> <span className="hidden lg:inline">Ver detalle</span>
                                                    </button>
                                                    <button onClick={() => openEditSocio(socio)} className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-yellow-700 bg-yellow-50/80 hover:bg-yellow-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap">
                                                        <Edit3 size={14} /> <span className="hidden lg:inline">Editar</span>
                                                    </button>
                                                    <button onClick={() => handleDeleteSocio(socio)} className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50/80 hover:bg-red-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap">
                                                        <Trash2 size={14} /> <span className="hidden lg:inline">Eliminar</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Patients Section — Slide Down Animation */}
                                        <SlideDown isOpen={expandedSocio === socio.id}>
                                            <div className="bg-gradient-to-b from-slate-50 to-white px-6 py-5 border-t border-blue-100">
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                        <Heart size={16} className="text-rose-500" />
                                                        PACIENTES DE {socio.name.toUpperCase()} ({socio.patients?.length || 0})
                                                    </h4>
                                                    <button
                                                        onClick={() => openCreatePatient(socio)}
                                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 transition-all active:scale-95 font-bold text-sm"
                                                    >
                                                        <UserPlus size={14} /> Agregar paciente
                                                    </button>
                                                </div>

                                                {/* Patient Cards */}
                                                {socio.patients?.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                        {socio.patients.map(patient => {
                                                            const age = calcAge(patient.birthDate);
                                                            return (
                                                                <div
                                                                    key={patient.id}
                                                                    className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all group/card"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div
                                                                            className="flex items-center justify-center w-11 h-11 rounded-full text-white font-bold text-[13px] shadow-sm shrink-0 transition-transform group-hover/card:scale-110"
                                                                            style={{ backgroundColor: getAvatarColor(patient.name + patient.lastName) }}
                                                                        >
                                                                            {getInitials(patient.name, patient.lastName)}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-bold text-slate-700 truncate uppercase">{patient.name} {patient.lastName}</p>
                                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                                {age !== null && (
                                                                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                                                        <Cake size={11} /> {age} años
                                                                                    </span>
                                                                                )}
                                                                                {patient.autismDegree && (
                                                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                                                                                        {patient.autismDegree === 'grado1' ? 'Grado 1' : patient.autismDegree === 'grado2' ? 'Grado 2' : patient.autismDegree === 'grado3' ? 'Grado 3' : 'Pendiente'}
                                                                                    </span>
                                                                                )}
                                                                                {patient.school && (
                                                                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                                                        <School size={11} /> {patient.school}
                                                                                    </span>
                                                                                )}
                                                                                {patient.delegation?.name && (
                                                                                    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded truncate max-w-full">
                                                                                        {patient.delegation.shortName || patient.delegation.name}
                                                                                    </span>
                                                                                )}
                                                                                {patient.municipio && (
                                                                                    <span className="text-[10px] text-slate-500 truncate">{patient.municipio}</span>
                                                                                )}
                                                                            </div>
                                                                            {patient.address && (
                                                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{patient.address}</p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-slate-100">
                                                                        <button onClick={() => openViewPatient(patient, socio)} className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors" title="Ver detalle">
                                                                            <Eye size={14} />
                                                                        </button>
                                                                        <button onClick={() => openEditPatient(patient, socio)} className="p-1.5 rounded-md text-yellow-600 hover:bg-yellow-50 transition-colors" title="Editar">
                                                                            <Edit3 size={14} />
                                                                        </button>
                                                                        <button onClick={() => handleDeletePatient(patient)} className="p-1.5 rounded-md text-red-500 hover:bg-red-50 transition-colors" title="Eliminar">
                                                                            <Trash2 size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                                                        <Heart size={28} className="mx-auto text-slate-200 mb-2" />
                                                        <p className="text-sm text-slate-400">Este socio no tiene pacientes registrados</p>
                                                        <button
                                                            onClick={() => openCreatePatient(socio)}
                                                            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[12px] font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-all"
                                                        >
                                                            <UserPlus size={14} /> Crear primer paciente
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </SlideDown>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create / Edit Socio Modal */}
            <CreateSocioModal
                isOpen={createModalOpen}
                onClose={() => {
                    setCreateModalOpen(false);
                    setEditingSocio(null);
                }}
                onSave={handleSaveSocio}
                socio={editingSocio}
            />

            {/* Socio Detail Modal */}
            <SocioDetailModal
                isOpen={socioDetailModalOpen}
                onClose={() => setSocioDetailModalOpen(false)}
                socio={viewingSocio}
            />

            {/* Patient Modal (Create / Edit) */}
            <PatientModal
                isOpen={patientModalOpen}
                onClose={() => {
                    setPatientModalOpen(false);
                    setEditingPatient(null);
                    setPatientSocio(null);
                }}
                onSave={handleSavePatient}
                patient={editingPatient}
                socioName={patientSocio ? `${patientSocio.name} ${patientSocio.lastName}` : ''}
                defaultDelegationId={patientSocio?.delegationId ?? null}
                delegaciones={delegaciones}
            />

            {/* Patient Detail Modal (View Only) */}
            <PatientDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                patient={viewingPatient}
                socioName={viewingSocioName}
            />

            <ChildrenFiltersModal
                isOpen={childrenFiltersOpen}
                onClose={() => setChildrenFiltersOpen(false)}
                token={token}
                delegaciones={delegaciones}
                onViewPatient={(patient, socioNameStr) => {
                    setViewingPatient(patient);
                    setViewingSocioName(socioNameStr);
                    setDetailModalOpen(true);
                    setChildrenFiltersOpen(false);
                }}
                onEditPatient={(patient, socio) => {
                    setEditingPatient(patient);
                    setPatientSocio(socio);
                    setPatientModalOpen(true);
                    setChildrenFiltersOpen(false);
                }}
            />
        </div>
    );
};

export default Socios;
