import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { 
    FileText, Plus, Edit3, Trash2, Calendar, FileBadge, 
    CheckCircle, DownloadCloud, Clock, Search, Filter,
    Building2, Activity,
    ChevronUp, ChevronDown, ChevronsUpDown, Eye
} from 'lucide-react';
import Swal from 'sweetalert2';
import CreateSubvencionModal from '../components/subvenciones/CreateSubvencionModal';
import JustifySubvencionModal from '../components/subvenciones/JustifySubvencionModal';
import ViewSubvencionModal from '../components/subvenciones/ViewSubvencionModal';
import Button from '../components/Button';

export default function Subvenciones() {
    const { token } = useAuthStore();
    const [subvenciones, setSubvenciones] = useState([]);
    const [delegaciones, setDelegaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Filters
    const [search, setSearch] = useState('');
    const [filterDelegation, setFilterDelegation] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    
    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [justifyModalOpen, setJustifyModalOpen] = useState(false);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [selectedSubvencion, setSelectedSubvencion] = useState(null);

    // Sort state: column name and direction (asc/desc/null)
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState(null);

    // 3-state sort toggle: null → asc → desc → null
    const handleSort = (column) => {
        if (sortColumn !== column) {
            setSortColumn(column);
            setSortDirection('asc');
        } else if (sortDirection === 'asc') {
            setSortDirection('desc');
        } else {
            setSortColumn(null);
            setSortDirection(null);
        }
    };

    const getSortIcon = (column) => {
        if (sortColumn !== column) return <ChevronsUpDown size={14} className="opacity-40" />;
        if (sortDirection === 'asc') return <ChevronUp size={14} />;
        return <ChevronDown size={14} />;
    };

    const API_SUBV = '/api/subvenciones';
    const API_DEL = '/api/delegaciones';
    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = async () => {
        try {
            setLoading(true);
            const [subRes, delRes] = await Promise.all([
                axios.get(API_SUBV, { 
                    headers, 
                    params: { 
                        delegationId: filterDelegation || undefined,
                        status: filterStatus || undefined
                    } 
                }),
                axios.get(API_DEL, { headers })
            ]);
            setSubvenciones(subRes.data);
            setDelegaciones(delRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las subvenciones.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterDelegation, filterStatus]);

    const handleDelete = async (id) => {
        const res = await Swal.fire({
            title: '¿Eliminar subvención?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#94a3b8',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (res.isConfirmed) {
            try {
                await axios.delete(`${API_SUBV}/${id}`, { headers });
                fetchData();
                Swal.fire('Eliminada', 'La subvención ha sido eliminada.', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar.', 'error');
            }
        }
    };

    const handleOpenCreate = () => {
        setSelectedSubvencion(null);
        setCreateModalOpen(true);
    };

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'SOLICITADO': return <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5"><Clock size={12}/> SOLICITADO</span>;
            case 'CONCEDIDO': return <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5"><CheckCircle size={12}/> CONCEDIDO</span>;
            case 'JUSTIFICADO': return <span className="bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5"><FileBadge size={12}/> JUSTIFICADO</span>;
            case 'EN_ORDEN': return <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5"><CheckCircle size={12}/> EN ORDEN</span>;
            case 'EN_FECHA': return <span className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide flex items-center gap-1.5"><Calendar size={12}/> EN FECHA</span>;
            default: return <span className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide">{status}</span>;
        }
    };

    // Filter by text search on frontend (API handles the other ones)
    const filteredSubvenciones = subvenciones.filter(sub => {
        const s = search.toLowerCase();
        return (sub.name || '').toLowerCase().includes(s) || 
               (sub.description || '').toLowerCase().includes(s);
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
        filteredSubvenciones.sort((a, b) => {
            if (sortColumn === 'amount') {
                const valA = parseFloat(a.amount) || 0;
                const valB = parseFloat(b.amount) || 0;
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            } else if (sortColumn === 'deadlineDate') {
                const valA = new Date(a.deadlineDate || 0).getTime();
                const valB = new Date(b.deadlineDate || 0).getTime();
                return sortDirection === 'asc' ? valA - valB : valB - valA;
            } else {
                let valA = '';
                let valB = '';
                if (sortColumn === 'name') {
                    valA = (a.name || '').toLowerCase();
                    valB = (b.name || '').toLowerCase();
                } else if (sortColumn === 'delegation') {
                    valA = (a.delegation?.name || '').toLowerCase();
                    valB = (b.delegation?.name || '').toLowerCase();
                } else if (sortColumn === 'status') {
                    valA = (a.status || '').toLowerCase();
                    valB = (b.status || '').toLowerCase();
                }
                const cmp = valA.localeCompare(valB, 'es');
                return sortDirection === 'asc' ? cmp : -cmp;
            }
        });
    }

    return (
        <div className="w-full bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {/* ===== Page Title (like Usuarios) ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <FileText size={26} className="text-blue-600 hidden sm:block" />
                        Subvenciones
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Gestiona y justifica las subvenciones de cada delegación.</p>
                </div>
                <Button className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-lumina-blue text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto" onClick={handleOpenCreate}>
                    <Plus size={16} className="mr-2" />
                    Nueva Subvención
                </Button>
            </div>

            {/* ===== Search & Filters Bar (like Usuarios) ===== */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-5 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    {/* Search Text */}
                    <div className="flex-1 min-w-0 w-full">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Search size={13} /> Buscador
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre o descripción..."
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>

                    {/* Filter by Delegation */}
                    <div className="w-full lg:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Filter size={13} /> Filtrar por Delegación
                        </label>
                        <select
                            value={filterDelegation}
                            onChange={(e) => setFilterDelegation(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todas las delegaciones</option>
                            {delegaciones.map(del => (
                                <option key={del.id} value={del.id}>{del.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter by Status */}
                    <div className="w-full lg:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Activity size={13} /> Estado
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todos los estados</option>
                            <option value="SOLICITADO">Solicitado</option>
                            <option value="CONCEDIDO">Concedido</option>
                            <option value="JUSTIFICADO">Justificado</option>
                            <option value="EN_ORDEN">En Orden</option>
                            <option value="EN_FECHA">En Fecha</option>
                        </select>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={() => { setSearch(''); setFilterDelegation(''); setFilterStatus(''); }}
                        className="w-full lg:w-auto px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center justify-center gap-1.5 shrink-0"
                    >
                        <Filter size={14} /> Restablecer filtros
                    </button>
                </div>
            </div>

            {/* Apple-style Table (like Usuarios) */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        {/* ---- Gradient Header ---- */}
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1.5"><FileText size={14} /> Detalles de Subvención {getSortIcon('name')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('delegation')}>
                                    <div className="flex items-center gap-1.5"><Building2 size={14} /> Delegación {getSortIcon('delegation')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center gap-1.5">Importe {getSortIcon('amount')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('status')}>
                                    <div className="flex items-center justify-center gap-1.5">Estado {getSortIcon('status')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('deadlineDate')}>
                                    <div className="flex items-center gap-1.5"><Calendar size={14} /> Fechas Clave {getSortIcon('deadlineDate')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Acciones</div>
                                </th>
                            </tr>
                        </thead>

                        {/* ---- Table Body ---- */}
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-14 text-center text-slate-400 text-base">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                        <p className="mt-3">Cargando subvenciones...</p>
                                    </td>
                                </tr>
                            ) : filteredSubvenciones.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-14 text-center text-slate-400 text-base">
                                        No se encontraron subvenciones con los filtros actuales.
                                    </td>
                                </tr>
                            ) : filteredSubvenciones.map(sub => {
                                // Deadline Warning Logic (Less than 30 days away and not justified)
                                const isUrgent = sub.deadlineDate && !['JUSTIFICADO', 'EN_ORDEN'].includes(sub.status) &&
                                    (new Date(sub.deadlineDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24) <= 31;

                                return (
                                    <tr 
                                        key={sub.id} 
                                        className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default"
                                    >
                                        {/* -- Detalle -- */}
                                        <td className="px-6 py-5">
                                            <p className="font-bold text-slate-800 text-[15px] uppercase leading-tight truncate">{sub.name}</p>
                                            <p className="text-[12px] text-slate-400 mt-0.5 max-w-[250px] truncate" title={sub.description}>
                                                {sub.description || 'Sin descripción'}
                                            </p>
                                        </td>

                                        {/* -- Delegacion -- */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: sub.delegation?.color || '#cbd5e1' }}></div>
                                                <span className="text-[13px] font-semibold text-slate-700">{sub.delegation?.name || 'Desconocida'}</span>
                                            </div>
                                        </td>

                                        {/* -- Importe -- */}
                                        <td className="px-6 py-5">
                                            <span className="text-[14px] font-bold text-slate-700">
                                                {sub.amount ? `${parseFloat(sub.amount).toLocaleString('es-ES')} €` : 'N/A'}
                                            </span>
                                        </td>

                                        {/* -- Estado Badge -- */}
                                        <td className="px-6 py-5 text-center">
                                            <div className="inline-block">
                                                <StatusBadge status={sub.status} />
                                            </div>
                                        </td>

                                        {/* -- Fechas -- */}
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5 min-w-[140px]">
                                                {sub.deadlineDate ? (
                                                    <p className={`text-[12px] font-semibold flex items-center gap-1.5 ${isUrgent ? 'text-red-500' : 'text-slate-500'}`}>
                                                        <Calendar size={13} />
                                                        Límite: {new Date(sub.deadlineDate).toLocaleDateString()}
                                                    </p>
                                                ) : <p className="text-[12px] text-slate-400">—</p>}

                                                {sub.justifiedDate ? (
                                                    <p className="text-[12px] font-semibold text-green-500 flex items-center gap-1.5">
                                                        <CheckCircle size={13} />
                                                        Justif: {new Date(sub.justifiedDate).toLocaleDateString()}
                                                    </p>
                                                ) : null}
                                            </div>
                                        </td>

                                        {/* -- Acciones -- */}
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                {/* View Details */}
                                                <button
                                                    onClick={() => { setSelectedSubvencion(sub); setViewModalOpen(true); }}
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-600 bg-slate-50/80 hover:bg-slate-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Ver detalles"
                                                >
                                                    <Eye size={14} /> <span className="hidden xl:inline">Ver</span>
                                                </button>
                                                
                                                {/* Download */}
                                                {(sub.attachments?.length > 0 || sub.docJustification) && (
                                                    <a 
                                                        href={`${(sub.attachments?.[0]?.filePath || sub.docJustification)}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        title="Ver documentación"
                                                        className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold text-purple-600 bg-purple-50/80 hover:bg-purple-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    >
                                                        <DownloadCloud size={14} /> <span className="hidden xl:inline">Ver docs</span>
                                                    </a>
                                                )}

                                                {/* Justify / Upload Button */}
                                                {!sub.justifiedDate && (
                                                    <button 
                                                        onClick={() => { setSelectedSubvencion(sub); setJustifyModalOpen(true); }}
                                                        className="relative inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold text-green-600 bg-green-50/80 hover:bg-green-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                        title="Justificar Subvención"
                                                    >
                                                        <FileBadge size={14} /> <span className="hidden xl:inline">Justificar</span>
                                                        {isUrgent && <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full animate-ping"></span>}
                                                    </button>
                                                )}
                                                
                                                <button 
                                                    onClick={() => { setSelectedSubvencion(sub); setCreateModalOpen(true); }} 
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Editar subvención"
                                                >
                                                    <Edit3 size={14} /> <span className="hidden xl:inline">Editar</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleDelete(sub.id)} 
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50/80 hover:bg-red-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Eliminar subvención"
                                                >
                                                    <Trash2 size={14} /> <span className="hidden xl:inline">Eliminar</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateSubvencionModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                fetchSubvenciones={fetchData}
                delegaciones={delegaciones}
                subvencionToEdit={selectedSubvencion}
            />

            <ViewSubvencionModal
                isOpen={viewModalOpen}
                onClose={() => setViewModalOpen(false)}
                subvencion={selectedSubvencion}
            />

            <JustifySubvencionModal
                isOpen={justifyModalOpen}
                onClose={() => setJustifyModalOpen(false)}
                fetchSubvenciones={fetchData}
                subvencion={selectedSubvencion}
            />
        </div>
    );
}
