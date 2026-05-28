import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Plus, Search, Trash2, Edit3, Eye, Mail, Phone, Building2, RefreshCw, User, Filter } from 'lucide-react';
import Swal from 'sweetalert2';
import CreateProfesionalModal from '../components/profesionales/CreateProfesionalModal';
import ProfesionalProfileModal from '../components/profesionales/ProfesionalProfileModal';
import Button from '../components/Button';
import useAuthStore, { usePermissions } from '../store/authStore';

const API_URL = '/api';

const ProfesionalesExternos = () => {
    const { token } = useAuthStore();
    const { canCreate, canEdit, canDelete } = usePermissions();
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('Todos los tipos');
    const [filterSpecialty, setFilterSpecialty] = useState('Todos los cargos');
    
    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedProfessional, setSelectedProfessional] = useState(null);

    // Dynamic Filter Options
    const [uniqueTypes, setUniqueTypes] = useState([]);
    const [uniqueSpecialties, setUniqueSpecialties] = useState([]);

    // Helpers
    const getInitials = (name, lastName) => {
        if (!name && !lastName) return '??';
        const fl = name ? name.charAt(0).toUpperCase() : '';
        const ll = lastName ? lastName.charAt(0).toUpperCase() : '';
        return fl + ll;
    };

    const avatarColors = [
        'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
        'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-orange-500',
    ];
    
    const getAvatarColor = (name) => {
        if (!name) return avatarColors[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };

    const getCollaborationBadge = (type) => {
        if (!type) return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-slate-500 text-white shadow-sm">OTRO</span>;
        
        const lowerType = type.toLowerCase();
        if (lowerType.includes('consultor')) {
            return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-blue-500 text-white shadow-sm">{type.toUpperCase()}</span>;
        } else if (lowerType.includes('colaborador')) {
            return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-emerald-500 text-white shadow-sm">{type.toUpperCase()}</span>;
        } else if (lowerType.includes('docente') || lowerType.includes('formador')) {
            return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-purple-500 text-white shadow-sm">{type.toUpperCase()}</span>;
        } else if (lowerType.includes('integral')) {
            return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-orange-500 text-white shadow-sm">{type.toUpperCase()}</span>;
        }
        return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-slate-500 text-white shadow-sm">{type.toUpperCase()}</span>;
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/external-professionals`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            setProfessionals(data);
            
            // Extract unique types and specialties for dropdowns
            const types = [...new Set(data.map(p => p.collaborationType))].filter(Boolean);
            const specialties = [...new Set(data.map(p => p.specialty))].filter(Boolean);
            
            setUniqueTypes(types);
            setUniqueSpecialties(specialties);
        } catch (error) {
            console.error('Error fetching external professionals:', error);
            Swal.fire('Error', 'No se pudo cargar la lista de profesionales externos.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name, lastName) => {
        const fullName = `${name} ${lastName}`.trim();
        const result = await Swal.fire({
            title: `¿Eliminar a ${fullName}?`,
            text: "Esta acción borrará irreversiblemente la ficha de este profesional externo.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/external-professionals/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'Ficha del profesional eliminada.',
                });
                fetchData();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar al profesional externo.', 'error');
            }
        }
    };

    const handleResetFilters = () => {
        setSearchTerm('');
        setFilterType('Todos los tipos');
        setFilterSpecialty('Todos los cargos');
    };

    // Filter Logic
    const filteredProfessionals = professionals.filter(p => {
        const matchesSearch = 
            `${p.name} ${p.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.phone || '').toLowerCase().includes(searchTerm.toLowerCase());
            
        const matchesType = filterType === 'Todos los tipos' || p.collaborationType === filterType;
        const matchesSpecialty = filterSpecialty === 'Todos los cargos' || p.specialty === filterSpecialty;

        return matchesSearch && matchesType && matchesSpecialty;
    });

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            
            {/* ===== Page Title ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Briefcase size={26} className="text-blue-600 hidden sm:block" />
                        Profesionales Externos
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Gestiona empresas y profesionales colaboradores</p>
                </div>
                {canCreate('profesionales_externos') && (
                    <Button 
                        className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-blue-500 text-white hover:bg-blue-600 shadow-md hover:shadow-lg transition-all w-full sm:w-auto flex items-center justify-center"
                        onClick={() => { setSelectedProfessional(null); setModalOpen(true); }}
                    >
                        <Plus size={16} className="mr-2" />
                        Añadir Profesional
                    </Button>
                )}
            </div>

            {/* ===== Unified Search & Filter Card ===== */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-5 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    
                    {/* Buscador general */}
                    <div className="flex-1 min-w-0 h-full w-full">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Search size={13} /> Buscador
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por nombre, teléfono, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>

                    {/* Filtro Tipo */}
                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Briefcase size={13} /> Tipo
                        </label>
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="Todos los tipos">Todos los tipos</option>
                            {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    {/* Filtro Cargo */}
                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Building2 size={13} /> Cargo
                        </label>
                        <select
                            value={filterSpecialty}
                            onChange={(e) => setFilterSpecialty(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="Todos los cargos">Todos los cargos</option>
                            {uniqueSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    
                    {/* Botón Restablecer */}
                    <button 
                        onClick={handleResetFilters}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0 w-full lg:w-auto"
                    >
                        <RefreshCw size={14} /> Restablecer filtros
                    </button>
                </div>
            </div>

            {/* ===== Main Table Card ===== */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        {/* ---- Gradient Header ---- */}
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center select-none">
                                    <div className="flex items-center justify-center gap-1.5"><User size={14} /> NOMBRE</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center select-none">
                                    <div className="flex items-center justify-center gap-1.5"><Phone size={14} /> TELÉFONO</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center select-none">
                                    <div className="flex items-center justify-center gap-1.5"><Mail size={14} /> EMAIL</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center select-none">
                                    <div className="flex items-center justify-center gap-1.5"><Briefcase size={14} /> TIPO COLABORACIÓN</div>
                                </th>
                                {(canEdit('profesionales_externos') || canDelete('profesionales_externos')) && (
                                    <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center select-none">
                                        <div className="flex items-center justify-center gap-1.5">ACCIONES</div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">
                                        Cargando profesionales...
                                    </td>
                                </tr>
                            ) : filteredProfessionals.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">
                                        No se encontraron profesionales externos con los filtros actuales.
                                    </td>
                                </tr>
                            ) : (
                                filteredProfessionals.map((prof) => {
                                    const fullName = `${prof.name} ${prof.lastName}`.trim();
                                    return (
                                        <tr key={prof.id} className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default">
                                            {/* NOMBE COLUMN */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="relative shrink-0 flex justify-center">
                                                        <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-[15px] shadow-md ring-2 ring-white ${getAvatarColor(prof.name)} transition-transform duration-200 group-hover:scale-110`}>
                                                            {getInitials(prof.name, prof.lastName)}
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 text-[15px] uppercase leading-tight truncate">
                                                            {fullName}
                                                        </p>
                                                        <p className="text-[12px] text-slate-400 mt-0.5 uppercase tracking-wide">
                                                            {prof.specialty}
                                                        </p>
                                                        {prof.company && (
                                                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                                                <Building2 className="w-3 h-3 text-slate-400" />
                                                                {prof.company}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            
                                            {/* TELEFONO */}
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-[14px] text-slate-600 font-medium tracking-wide">
                                                    {prof.phone || <span className="text-slate-400 italic font-normal text-xs">-</span>}
                                                </span>
                                            </td>

                                            {/* EMAIL */}
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-[14px] text-blue-600 font-medium tracking-wide">
                                                    {prof.email ? prof.email.toLowerCase() : <span className="text-slate-400 italic text-xs font-normal">-</span>}
                                                </span>
                                            </td>

                                            {/* TIPO DE COLABORACION */}
                                            <td className="px-6 py-5 text-center">
                                                {getCollaborationBadge(prof.collaborationType)}
                                            </td>

                                            {/* ACCIONES (TEXT BUTTONS) */}
                                            {(canEdit('profesionales_externos') || canDelete('profesionales_externos')) && (
                                                <td className="px-4 py-5">
                                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                        <button 
                                                            onClick={() => { setSelectedProfessional(prof); setProfileOpen(true); }}
                                                            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                            title="Ver perfil"
                                                        >
                                                            <Eye size={14} /> <span className="hidden md:inline">Ver perfil</span>
                                                        </button>
                                                        
                                                        {canEdit('profesionales_externos') && (
                                                            <button 
                                                                onClick={() => { setSelectedProfessional(prof); setModalOpen(true); }}
                                                                className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-yellow-700 bg-yellow-50/80 hover:bg-yellow-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                                title="Modificar perfil"
                                                            >
                                                                <Edit3 size={14} /> <span className="hidden md:inline">Modificar</span>
                                                            </button>
                                                        )}
                                                        
                                                        {canDelete('profesionales_externos') && (
                                                            <button 
                                                                onClick={() => handleDelete(prof.id, prof.name, prof.lastName)}
                                                                className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50/80 hover:bg-red-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                                title="Eliminar usuario"
                                                            >
                                                                <Trash2 size={14} /> <span className="hidden md:inline">Eliminar</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Creación / Edición */}
            {modalOpen && (
                <CreateProfesionalModal 
                    isOpen={modalOpen} 
                    onClose={() => setModalOpen(false)} 
                    professional={selectedProfessional} 
                    refreshData={fetchData} 
                />
            )}

            {/* Modal de Ver Perfil (Solo Lectura) */}
            {profileOpen && (
                <ProfesionalProfileModal
                    isOpen={profileOpen}
                    onClose={() => setProfileOpen(false)}
                    professional={selectedProfessional}
                />
            )}
        </div>
    );
};

export default ProfesionalesExternos;
