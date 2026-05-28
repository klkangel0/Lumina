import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Plus, Search, Filter, RotateCcw, Boxes, Monitor, 
    Printer, Phone, Tablet, Home, Building2, 
    MoreVertical, Edit3, Trash2, Eye, MapPin, User, ChevronUp, ChevronDown
} from 'lucide-react';
import Swal from 'sweetalert2';
import InventarioModal from '../components/inventario/InventarioModal';
import InventarioDetailModal from '../components/inventario/InventarioDetailModal';
import Button from '../components/Button';
import useAuthStore, { usePermissions } from '../store/authStore';

const API_URL = '/api';

const EQUIP_TYPES = [
    { label: 'Impresora', icon: Printer, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Teléfono', icon: Phone, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { label: 'Ordenador', icon: Monitor, color: 'text-violet-500', bg: 'bg-violet-50' },
    { label: 'Tablet', icon: Tablet, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Otros', icon: Boxes, color: 'text-slate-500', bg: 'bg-slate-50' },
];

const STATUS_CONFIG = {
    DISPONIBLE: { label: 'Disponible', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    EN_USO: { label: 'En uso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    MANTENIMIENTO: { label: 'Mantenimiento', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
    BAJA: { label: 'Baja', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
};

const Inventario = () => {
    const { token } = useAuthStore();
    const { canCreate, canEdit, canDelete, canView } = usePermissions();
    const [items, setItems] = useState([]);
    const [delegations, setDelegations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', type: 'Todos los tipos', status: 'Todos los estados', delegationId: 'TODAS' });
    const [sort, setSort] = useState({ key: 'createdAt', dir: 'desc' });
    
    // Modales
    const [modalOpen, setModalOpen] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    useEffect(() => {
        if (token) {
            fetchData();
            fetchDelegations();
        }
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/inventario`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setItems(res.data);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            Swal.fire('Error', 'No se pudo cargar el inventario', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchDelegations = async () => {
        try {
            const res = await axios.get(`${API_URL}/delegaciones`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDelegations(res.data);
        } catch (error) {
            console.error('Error fetching delegations:', error);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/inventario/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Eliminado', 'El artículo ha sido eliminado.', 'success');
                fetchData();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar el artículo', 'error');
            }
        }
    };

    const toggleSort = (key) => {
        setSort(prev => ({
            key,
            dir: prev.key === key ? (prev.dir === 'asc' ? 'desc' : 'asc') : 'asc'
        }));
    };

    const filteredItems = items
        .filter(item => {
            const matchSearch = !filters.search || 
                item.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                (item.serialNumber && item.serialNumber.toLowerCase().includes(filters.search.toLowerCase())) ||
                item.type.toLowerCase().includes(filters.search.toLowerCase());
            
            const matchType = filters.type === 'Todos los tipos' || item.type === filters.type;
            const matchStatus = filters.status === 'Todos los estados' || item.status === filters.status;
            const matchDelegation = filters.delegationId === 'TODAS' || item.delegationId === parseInt(filters.delegationId);
            
            return matchSearch && matchType && matchStatus && matchDelegation;
        })
        .sort((a, b) => {
            let valA = a[sort.key];
            let valB = b[sort.key];
            if (sort.key === 'delegation') {
                valA = a.delegation?.name || '';
                valB = b.delegation?.name || '';
            }
            if (valA < valB) return sort.dir === 'asc' ? -1 : 1;
            if (valA > valB) return sort.dir === 'asc' ? 1 : -1;
            return 0;
        });

    const getIconForType = (type) => {
        const config = EQUIP_TYPES.find(t => t.label.toLowerCase() === type.toLowerCase()) || EQUIP_TYPES[4];
        return config;
    };

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
                        <Boxes size={26} className="text-blue-600 hidden sm:block" />
                        Inventario
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Gestión de equipos, material y asignaciones</p>
                </div>
                {canCreate('inventario') && (
                    <Button className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-lumina-blue text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto" onClick={() => { setSelectedItem(null); setModalOpen(true); }}>
                        <Plus size={16} className="mr-2" />
                        Dar de alta un nuevo equipo
                    </Button>
                )}
            </div>

            {/* ===== Search & Filters Bar ===== */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-5 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    {/* Search */}
                    <div className="flex-1 min-w-0">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Search size={13} /> Buscador
                        </label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Buscar por nombre, tipo, serie..."
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>

                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Filter size={13} /> Tipo
                        </label>
                        <select 
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                            value={filters.type}
                            onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}
                        >
                            <option>Todos los tipos</option>
                            {EQUIP_TYPES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                        </select>
                    </div>

                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Filter size={13} /> Estado
                        </label>
                        <select 
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                        >
                            <option>Todos los estados</option>
                            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                        </select>
                    </div>

                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Building2 size={13} /> Delegación
                        </label>
                        <select 
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                            value={filters.delegationId}
                            onChange={(e) => setFilters(f => ({ ...f, delegationId: e.target.value }))}
                        >
                            <option value="TODAS">TODAS</option>
                            {delegations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    {/* Reset */}
                    <button 
                        onClick={() => setFilters({ search: '', type: 'Todos los tipos', status: 'Todos los estados', delegationId: 'TODAS' })}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <RotateCcw size={14} /> Restablecer
                    </button>
                    
                </div>
            </div>

            {/* Apple-style Table */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th onClick={() => toggleSort('type')} className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors">
                                    <div className="flex items-center justify-center gap-1.5"><Filter size={14} /> TIPO {sort.key === 'type' ? (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-0"><ChevronUp size={14} /></span>}</div>
                                </th>
                                <th onClick={() => toggleSort('name')} className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors">
                                    <div className="flex items-center justify-center gap-1.5"><Boxes size={14} /> NOMBRE {sort.key === 'name' ? (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-0"><ChevronUp size={14} /></span>}</div>
                                </th>
                                <th onClick={() => toggleSort('delegation')} className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors">
                                    <div className="flex items-center justify-center gap-1.5"><Building2 size={14} /> DELEGACIÓN/UBICACIÓN {sort.key === 'delegation' ? (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-0"><ChevronUp size={14} /></span>}</div>
                                </th>
                                <th onClick={() => toggleSort('status')} className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors">
                                    <div className="flex items-center justify-center gap-1.5"><Filter size={14} /> ESTADO {sort.key === 'status' ? (sort.dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <span className="opacity-0"><ChevronUp size={14} /></span>}</div>
                                </th>
                                {(canEdit('inventario') || canDelete('inventario')) && (
                                    <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                        <div className="flex items-center justify-center gap-1.5">ACCIONES</div>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100/70 text-slate-600">
                            {filteredItems.length > 0 ? filteredItems.map((item) => {
                                const typeInfo = getIconForType(item.type);
                                const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.DISPONIBLE;
                                const Icon = typeInfo.icon;
                                
                                return (
                                    <tr key={item.id} className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default">
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide ${typeInfo.bg} ${typeInfo.color} shadow-sm border border-transparent group-hover:border-current/10 transition-all uppercase`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className={`flex items-center justify-center w-12 h-12 rounded-full font-bold shadow-md ring-2 ring-white ${typeInfo.bg} ${typeInfo.color} transition-transform duration-200 group-hover:scale-110`}>
                                                    <Icon size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-[15px] uppercase leading-tight truncate">{item.name}</p>
                                                    {item.serialNumber && <p className="text-[12px] text-slate-400 mt-0.5 tracking-wider uppercase font-medium">S/N: {item.serialNumber}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                                    <MapPin size={14} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-[14px] text-slate-700">
                                                        {item.delegation?.name || 'NO ASIGNADA'}
                                                    </p>
                                                    {item.assignmentType === 'DOMICILIO' && (
                                                        <span className="inline-flex mt-0.5 items-center gap-1 text-violet-600 px-2 py-0.5 rounded-md text-[10px] bg-violet-50 font-bold uppercase ring-1 ring-violet-200/50">
                                                            <Home size={10} /> Domicilio
                                                        </span>
                                                    )}
                                                    {item.socio && (
                                                        <div className="flex items-center gap-1.5 mt-0.5 text-slate-400">
                                                            <User size={12} />
                                                            <p className="text-[11px] font-medium">{item.socio.name} {item.socio.lastName}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wide shadow-sm ${statusInfo.bg} ${statusInfo.color} border ${statusInfo.border}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.color.replace('text', 'bg')}`} />
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        {(canEdit('inventario') || canDelete('inventario') || canView('inventario')) && (
                                            <td className="px-4 py-5 text-center">
                                                <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                    {canView('inventario') && (
                                                        <button
                                                            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                            title="Visualizar"
                                                            onClick={() => { setSelectedItem(item); setDetailOpen(true); }}
                                                        >
                                                            <Eye size={14} /> <span className="hidden xl:inline">Visualizar</span>
                                                        </button>
                                                    )}
                                                    {canEdit('inventario') && (
                                                        <button
                                                            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-yellow-700 bg-yellow-50/80 hover:bg-yellow-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                            title="Modificar"
                                                            onClick={() => { setSelectedItem(item); setModalOpen(true); }}
                                                        >
                                                            <Edit3 size={14} /> <span className="hidden xl:inline">Modificar</span>
                                                        </button>
                                                    )}
                                                    {canDelete('inventario') && (
                                                        <button
                                                            className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50/80 hover:bg-red-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                            title="Eliminar"
                                                            onClick={() => handleDelete(item.id)}
                                                        >
                                                            <Trash2 size={14} /> <span className="hidden xl:inline">Eliminar</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">
                                        No se encontraron artículos. Prueba a ajustar los filtros o registrar uno nuevo.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modales */}
            <InventarioModal 
                isOpen={modalOpen} 
                onClose={() => { setModalOpen(false); setSelectedItem(null); }}
                onSave={() => { setModalOpen(false); fetchData(); }}
                item={selectedItem}
                delegations={delegations}
            />
            
            <InventarioDetailModal 
                isOpen={detailOpen}
                onClose={() => { setDetailOpen(false); setSelectedItem(null); }}
                item={selectedItem}
            />
        </div>
    );
};

export default Inventario;
