import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Briefcase, Plus, Search, MapPin, Edit3, Trash2, Mail, Phone, FileText, Download, X, Eye } from 'lucide-react';
import Swal from 'sweetalert2';
import WorkerModal from '../components/rrhh/WorkerModal';
import WorkerProfileModal from '../components/rrhh/WorkerProfileModal';
import Button from '../components/Button';
import useAuthStore from '../store/authStore';

const API_URL = '/api';

const RecursosHumanos = () => {
    const { token } = useAuthStore();
    const [workers, setWorkers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedWorker, setSelectedWorker] = useState(null);
    const [profileWorker, setProfileWorker] = useState(null);

    // Sorting State
    const [sortColumn, setSortColumn] = useState('');
    const [sortDirection, setSortDirection] = useState('');

    // --- Helpers (like in Usuarios.jsx) ---
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
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

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/workers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWorkers(res.data);
        } catch (error) {
            console.error('Error fetching workers:', error);
            Swal.fire('Error', 'No se pudo cargar la lista de trabajadores.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        const result = await Swal.fire({
            title: `¿Eliminar a ${name}?`,
            text: "Esta acción borrará también sus documentos subidos (Contrato, DNI, LOPD).",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/workers/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Eliminado',
                    text: 'Ficha del trabajador eliminada.',
                });
                fetchData();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar al trabajador.', 'error');
            }
        }
    };

    const handleDownload = (filePath) => {
        if (!filePath) return;
        // The filePath is stored as `/uploads/workers/filename.pdf`
        window.open(filePath, '_blank');
    };

    const filteredWorkers = workers.filter(w => 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.dni.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.jobPosition.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSort = (column) => {
        if (sortColumn === column) {
            if (sortDirection === 'asc') setSortDirection('desc');
            else if (sortDirection === 'desc') { setSortColumn(''); setSortDirection(''); }
            else setSortDirection('asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const getSortIcon = (column) => {
        if (sortColumn !== column) return <span className="text-blue-200/50">↕</span>;
        return sortDirection === 'asc' ? <span className="text-blue-500 font-bold">↑</span> : <span className="text-blue-500 font-bold">↓</span>;
    };

    let finalWorkers = [...filteredWorkers];
    if (sortColumn && sortDirection) {
        finalWorkers.sort((a, b) => {
            let valA = (a[sortColumn] || '').toLowerCase();
            let valB = (b[sortColumn] || '').toLowerCase();
            
            if (sortColumn === 'jobPosition') {
                valA = a.jobPosition === 'Otros' && a.customJobType ? a.customJobType.toLowerCase() : a.jobPosition.toLowerCase();
                valB = b.jobPosition === 'Otros' && b.customJobType ? b.customJobType.toLowerCase() : b.jobPosition.toLowerCase();
            }

            const cmp = valA.localeCompare(valB, 'es');
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full bg-[#f8fafc] min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            
            {/* ===== Page Title ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl hidden sm:flex">
                            <Briefcase size={28} />
                        </div>
                        Recursos Humanos
                    </h1>
                    <p className="text-slate-500 text-sm mt-2 sm:ml-14 font-medium">Gestiona la plantilla, la documentación obligatoria y las asignaciones.</p>
                </div>
                
                <Button 
                    className="shrink-0 font-bold px-5 py-3 rounded-2xl text-sm bg-[#6E9EFF] text-white hover:bg-blue-600 shadow-xl shadow-blue-200 transition-all w-full sm:w-auto"
                    onClick={() => { setSelectedWorker(null); setModalOpen(true); }}
                >
                    <Plus size={18} className="mr-2" />
                    Nuevo Trabajador
                </Button>
            </div>

            {/* ===== Buscador ===== */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-5 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex-1 min-w-0 w-full">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Search size={13} /> Buscador
                        </label>
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Buscar por nombre, DNI o cargo..." 
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== Tabla Principal ===== */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1.5"><Briefcase size={14} /> Trabajador {getSortIcon('name')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('email')}>
                                    <div className="flex items-center gap-1.5"><Search size={14} /> Contacto {getSortIcon('email')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('jobPosition')}>
                                    Cargo / Rol {getSortIcon('jobPosition')}
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 cursor-pointer select-none hover:bg-blue-100/60 transition-colors">
                                    Centros Asignados
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Acciones</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">Cargando trabajadores...</td></tr>
                            ) : finalWorkers.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-16 text-center">
                                        <Briefcase size={40} className="mx-auto text-slate-200 mb-3" />
                                        <p className="text-slate-500 font-medium">No se han encontrado trabajadores registrados.</p>
                                    </td>
                                </tr>
                            ) : (
                                finalWorkers.map((worker) => (
                                    <tr key={worker.id} className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default">
                                        
                                        {/* Nombre y DNI */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="relative shrink-0">
                                                    <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-[15px] shadow-md ring-2 ring-white ${getAvatarColor(worker.name)} transition-transform duration-200 group-hover:scale-110`}>
                                                        {getInitials(worker.name)}
                                                    </div>
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-[15px] uppercase leading-tight truncate">{worker.name}</p>
                                                    <p className="text-[12px] text-slate-400 mt-0.5">{worker.dni}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contacto */}
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5 min-w-[180px]">
                                                {worker.email && (
                                                    <div className="flex items-center text-[13px] text-blue-600 font-medium tracking-wide gap-1.5">
                                                        <Mail size={12} className="text-blue-400" />
                                                        <span className="truncate">{worker.email.toUpperCase()}</span>
                                                    </div>
                                                )}
                                                {worker.address && (
                                                    <div className="flex items-center text-slate-500 text-[12px] gap-1.5 mt-0.5">
                                                        <MapPin size={12} className="text-slate-400" />
                                                        <span className="truncate max-w-[200px]" title={worker.address}>{worker.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Puesto */}
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-red-500 text-white shadow-sm uppercase">
                                                {worker.jobPosition === 'Otros' && worker.customJobType 
                                                    ? worker.customJobType 
                                                    : worker.jobPosition}
                                            </span>
                                        </td>

                                        {/* Etiquetas Centros */}
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                                                {worker.tags && worker.tags.length > 0 ? (
                                                    worker.tags.map((tag, idx) => (
                                                        <span key={idx} className="bg-slate-100 text-slate-600 text-[10px] uppercase font-bold px-2.5 py-1 rounded border border-slate-200/60 shadow-sm">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Sin asignar</span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                <button 
                                                    onClick={() => setProfileWorker(worker)}
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Ver perfil y documentos"
                                                >
                                                    <Eye size={14} /> <span className="hidden md:inline">Ver perfil</span>
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedWorker(worker); setModalOpen(true); }}
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-yellow-700 bg-yellow-50/80 hover:bg-yellow-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Modificar perfil"
                                                >
                                                    <Edit3 size={14} /> <span className="hidden md:inline">Modificar perfil</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(worker.id, worker.name)}
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50/80 hover:bg-red-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Eliminar usuario"
                                                >
                                                    <Trash2 size={14} /> <span className="hidden md:inline">Eliminar usuario</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <WorkerModal 
                isOpen={modalOpen} 
                onClose={() => { setModalOpen(false); setSelectedWorker(null); }} 
                fetchData={fetchData} 
                worker={selectedWorker} 
            />

            <WorkerProfileModal
                isOpen={!!profileWorker}
                onClose={() => setProfileWorker(null)}
                worker={profileWorker}
            />
            
        </div>
    );
};

export default RecursosHumanos;
