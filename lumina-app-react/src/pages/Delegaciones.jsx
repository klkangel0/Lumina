import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Building2, Plus, Edit3, Trash2, MapPin, Phone, Mail, Search, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';
import CreateDelegacionModal from '../components/delegaciones/CreateDelegacionModal';

export default function Delegaciones() {
    const { token } = useAuthStore();
    const [delegaciones, setDelegaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [delegacionToEdit, setDelegacionToEdit] = useState(null);

    const API = '/api/delegaciones';
    const headers = { Authorization: `Bearer ${token}` };

    const fetchDelegaciones = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API, { headers });
            setDelegaciones(res.data);
        } catch (error) {
            console.error('Error fetching delegaciones:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar las delegaciones.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDelegaciones();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDelete = async (id, isSystem) => {
        if (isSystem) {
            Swal.fire({ icon: 'warning', title: 'Acción no permitida', text: 'Las delegaciones del sistema no pueden eliminarse, sólo desactivarse.' });
            return;
        }

        const res = await Swal.fire({
            title: '¿Eliminar delegación?',
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
                await axios.delete(`${API}/${id}`, { headers });
                fetchDelegaciones();
                Swal.fire('Eliminado', 'La delegación ha sido eliminada.', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar. Verifique que no tenga elementos relacionados.', 'error');
            }
        }
    };

    const handleCreate = () => {
        setDelegacionToEdit(null);
        setModalOpen(true);
    };

    const handleEdit = (delegacion) => {
        setDelegacionToEdit(delegacion);
        setModalOpen(true);
    };

    const filteredDelegaciones = delegaciones.filter(d => 
        (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.city || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Building2 size={26} className="text-blue-500" />
                        Delegaciones
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 sm:ml-10">
                        Gestiona las diferentes sedes y centros de Assotea.
                    </p>
                </div>
                <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                >
                    <Plus size={18} /> Nueva Delegación
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar delegaciones por nombre o ciudad..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                        />
                    </div>
                </div>

                {/* Grid */}
                <div className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : filteredDelegaciones.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                            <h3 className="text-lg font-medium text-slate-900">No se encontraron delegaciones</h3>
                            <p className="text-slate-500 mt-1">Prueba con otros términos de búsqueda.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredDelegaciones.map(del => (
                                <div key={del.id} className="relative bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(del)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                            <Edit3 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(del.id, del.isSystem)} 
                                            className={`p-1.5 rounded-lg transition-colors \${del.isSystem ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                            title={del.isSystem ? 'Delegación del sistema, no se puede eliminar' : 'Eliminar'}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Card Header */}
                                    <div className="flex items-start gap-4 mb-4 pr-16">
                                        <div 
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 font-bold shadow-inner"
                                            style={{ backgroundColor: del.color || '#6E9EFF' }}
                                        >
                                            {del.shortName || del.name.substring(0, 3).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight">{del.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${del.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {del.active ? 'Activa' : 'Inactiva'}
                                                </span>
                                                {del.isSystem && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                                        Sistema
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Details list */}
                                    <ul className="space-y-2.5 text-sm text-slate-600 border-t border-slate-100 pt-4">
                                        {(del.city || del.address) ? (
                                            <li className="flex items-start gap-2.5">
                                                <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                                                <span className="leading-tight">{del.address ? `${del.address}, ` : ''}{del.city || 'Sin ciudad'}</span>
                                            </li>
                                        ) : (
                                            <li className="flex items-start gap-2.5 text-slate-400">
                                                <MapPin size={16} className="mt-0.5 shrink-0" />
                                                <span>Ubicación no especificada</span>
                                            </li>
                                        )}

                                        {del.phone && (
                                            <li className="flex items-center gap-2.5">
                                                <Phone size={16} className="text-slate-400 shrink-0" />
                                                <span>{del.phone}</span>
                                            </li>
                                        )}

                                        {del.email && (
                                            <li className="flex items-center gap-2.5">
                                                <Mail size={16} className="text-slate-400 shrink-0" />
                                                <a href={`mailto:${del.email}`} className="text-blue-600 hover:underline">{del.email}</a>
                                            </li>
                                        )}
                                        
                                        {!del.phone && !del.email && (
                                            <li className="flex items-start gap-2.5 text-slate-400">
                                                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                                                <span>No hay datos de contacto vinculados a esta delegación.</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <CreateDelegacionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                fetchDelegaciones={fetchDelegaciones}
                delegacionToEdit={delegacionToEdit}
            />
        </div>
    );
}
