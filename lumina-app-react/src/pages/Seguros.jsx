import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Shield, Plus, Search, Calendar, Trash2, Edit3, Clock3, CircleAlert } from 'lucide-react';
import Swal from 'sweetalert2';
import useAuthStore from '../store/authStore';
import Button from '../components/Button';
import CreateSeguroModal from '../components/seguros/CreateSeguroModal';

const API = '/api/seguros';

function statusBadge(status) {
    if (status === 'CADUCADO') return 'bg-red-100 text-red-700';
    return 'bg-emerald-100 text-emerald-700';
}

export default function Seguros() {
    const { token } = useAuthStore();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
    const [seguros, setSeguros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);

    const fetchSeguros = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API, {
                headers,
                params: {
                    status: filterStatus || undefined,
                    q: search.trim() || undefined,
                },
            });
            setSeguros(res.data || []);
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los seguros.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSeguros();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus]);

    useEffect(() => {
        const t = setTimeout(fetchSeguros, 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleDelete = async (id) => {
        const confirm = await Swal.fire({
            title: '¿Eliminar seguro?',
            text: 'Esta acción no se puede deshacer.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });
        if (!confirm.isConfirmed) return;
        try {
            await axios.delete(`${API}/${id}`, { headers });
            await fetchSeguros();
            Swal.fire({ icon: 'success', title: 'Eliminado', text: 'Seguro eliminado.', timer: 1500, showConfirmButton: false });
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo eliminar.' });
        }
    };

    return (
        <div className="w-full bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Shield size={26} className="text-blue-600 hidden sm:block" />
                        Seguros
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Control de pólizas vigentes, caducidades e importes.</p>
                </div>
                <Button
                    className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-lumina-blue text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                    onClick={() => { setEditing(null); setModalOpen(true); }}
                >
                    <Plus size={16} className="mr-2" />
                    Nuevo Seguro
                </Button>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-5 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    <div className="flex-1 min-w-0 w-full">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Search size={13} /> Buscador
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre o finalidad..."
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>
                    <div className="w-full lg:w-52">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Clock3 size={13} /> Estado
                        </label>
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        >
                            <option value="">Todos</option>
                            <option value="ACTIVO">Activo</option>
                            <option value="CADUCADO">Caducado</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">Seguro</th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">Finalidad</th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">Vigencia</th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">Importe</th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">Estado</th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Cargando seguros...</td></tr>
                            ) : seguros.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No hay seguros para mostrar.</td></tr>
                            ) : seguros.map((s) => (
                                <tr key={s.id} className="border-b border-slate-100/70 last:border-b-0 hover:bg-blue-50/40">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800">{s.name}</p>
                                        <p className="text-[12px] text-slate-400 mt-0.5">{s.user?.name || 'Sin responsable'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-600 max-w-[320px] truncate" title={s.purpose}>{s.purpose}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm text-slate-600 flex items-center gap-1.5"><Calendar size={13} /> {new Date(s.validFrom).toLocaleDateString()} - {s.validTo ? new Date(s.validTo).toLocaleDateString() : 'Sin fin'}</p>
                                        <p className="text-xs text-slate-400 mt-1">Caduca: {new Date(s.expiryDate).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-semibold text-slate-700">{s.amount ? `${Number(s.amount).toLocaleString('es-ES')} €` : 'N/A'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold tracking-wide ${statusBadge(s.status)}`}>
                                            {s.status}
                                        </span>
                                        {s.status === 'CADUCADO' && <CircleAlert size={14} className="inline ml-1 text-red-500" />}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => { setEditing(s); setModalOpen(true); }}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100"
                                            >
                                                <Edit3 size={14} /> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50 hover:bg-red-100"
                                            >
                                                <Trash2 size={14} /> Eliminar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateSeguroModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={fetchSeguros}
                seguroToEdit={editing}
            />
        </div>
    );
}
