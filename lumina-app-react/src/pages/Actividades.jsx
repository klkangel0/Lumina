import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    CalendarCheck, Plus, Search, Filter, RotateCcw, 
    Calendar, Users, MapPin, Edit3, Trash2, 
    Clock, Mail, Phone, Building2, User, CheckCircle
} from 'lucide-react';
import Swal from 'sweetalert2';
import CreateActivityModal from '../components/actividades/CreateActivityModal';
import ActivityDetailModal from '../components/actividades/ActivityDetailModal';
import ActivityEnrolledModal from '../components/actividades/ActivityEnrolledModal';
import Button from '../components/Button';
import useAuthStore from '../store/authStore';

const API_URL = '/api';

const Actividades = () => {
    const { token, user } = useAuthStore();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: '', status: 'Todas' });
    
    // Modals
    const [modalOpen, setModalOpen] = useState(false);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [enrolledModalOpen, setEnrolledModalOpen] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null);
    const [selectedEnrolledId, setSelectedEnrolledId] = useState(null);

    useEffect(() => {
        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_URL}/actividades`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setActivities(res.data);
        } catch (error) {
            console.error('Error fetching activities:', error);
            Swal.fire('Error', 'No se pudieron cargar las actividades', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción eliminará la actividad y todas sus inscripciones.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API_URL}/actividades/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Eliminada', 'La actividad ha sido eliminada.', 'success');
                fetchData();
            } catch (error) {
                Swal.fire('Error', 'No se pudo eliminar la actividad', 'error');
            }
        }
    };

    const handleEnroll = async (id, payload = {}) => {
        const { patientIds = [], guestChildrenUnder18 = 0, guestAdults18Plus = 0 } = payload;
        try {
            await axios.post(
                `${API_URL}/actividades/${id}/enroll`,
                { patientIds, guestChildrenUnder18, guestAdults18Plus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            Swal.fire('¡Inscrito!', 'Te has apuntado a la actividad correctamente', 'success');
            fetchData();
        } catch (error) {
            Swal.fire('Error', error.response?.data?.message || 'No se pudo realizar la inscripción', 'error');
            throw error;
        }
    };

    const handleUnenroll = async (id) => {
        const result = await Swal.fire({
            title: '¿Cancelar inscripción?',
            text: "¿Estás seguro de que deseas desapuntarte de esta actividad?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, cancelar',
            cancelButtonText: 'Volver'
        });

        if (result.isConfirmed) {
            try {
                await axios.post(`${API_URL}/actividades/${id}/unenroll`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Cancelada', 'Has cancelado tu inscripción.', 'info');
                fetchData();
            } catch (error) {
                Swal.fire('Error', error.response?.data?.message || 'No se pudo cancelar la inscripción', 'error');
            }
        }
    };

    const getActivityStatus = (activity) => {
        const now = new Date();
        const start = new Date(activity.startTime);
        const end = new Date(activity.endTime);
        const deadline = activity.registrationDeadline ? new Date(activity.registrationDeadline) : null;

        if (now > end) {
            return { label: 'Finalizada', color: 'bg-slate-100 text-slate-600 border-slate-200', active: false };
        } else if (now >= start && now <= end) {
            return { label: 'En Curso', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', active: true };
        } else if (deadline && now > deadline) {
            return { label: 'Inscripción Cerrada', color: 'bg-amber-100 text-amber-700 border-amber-200', active: true };
        } else {
            return { label: 'Próxima', color: 'bg-blue-100 text-blue-700 border-blue-200', active: true };
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        return new Date(dateString).toLocaleDateString('es-ES', options);
    };

    const filteredActivities = activities.filter(activity => {
        const matchesSearch = !filters.search || 
            activity.title.toLowerCase().includes(filters.search.toLowerCase()) ||
            (activity.location && activity.location.toLowerCase().includes(filters.search.toLowerCase())) ||
            (activity.organizerName && activity.organizerName.toLowerCase().includes(filters.search.toLowerCase()));

        if (!matchesSearch) return false;

        const statusInfo = getActivityStatus(activity);
        if (filters.status === 'Próximas') return statusInfo.label === 'Próxima';
        if (filters.status === 'En Curso') return statusInfo.label === 'En Curso';
        if (filters.status === 'Finalizadas') return statusInfo.label === 'Finalizada';
        
        return true;
    });

    if (!token) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full bg-slate-50 min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {/* ===== Page Title ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                        <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-2xl hidden sm:flex">
                            <CalendarCheck size={28} />
                        </div>
                        Gestión de Actividades
                    </h1>
                    <p className="text-slate-500 text-sm mt-2 sm:ml-14 font-medium">Crea y administra eventos, talleres y sesiones para los socios.</p>
                </div>
                
                {/* Admin/Junta Only Button */}
                {user?.role !== 'SOCIO' && (
                    <Button 
                        className="shrink-0 font-bold px-5 py-3 rounded-2xl text-sm bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all w-full sm:w-auto"
                        onClick={() => { setSelectedActivity(null); setModalOpen(true); }}
                    >
                        <Plus size={18} className="mr-2" />
                        Crear Nueva Actividad
                    </Button>
                )}
            </div>

            {/* ===== Search & Filters Bar ===== */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-5 mb-8">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    {/* Search */}
                    <div className="flex-1 w-full min-w-0">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Search size={14} /> Buscar
                        </label>
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Buscar por título, ubicación u organizador..."
                                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                value={filters.search}
                                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                            />
                            <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div className="w-full md:w-56">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Filter size={14} /> Filtro de Estado
                        </label>
                        <select 
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium appearance-none cursor-pointer"
                            value={filters.status}
                            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                        >
                            <option value="Todas">Todas las Actividades</option>
                            <option value="Próximas">Solo Próximas</option>
                            <option value="En Curso">En Curso</option>
                            <option value="Finalizadas">Finalizadas</option>
                        </select>
                    </div>

                    {/* Reset */}
                    <button 
                        onClick={() => setFilters({ search: '', status: 'Todas' })}
                        className="w-full md:w-auto px-5 py-3 text-sm font-bold text-slate-500 bg-white hover:bg-slate-50 hover:text-slate-700 border border-slate-200 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                    >
                        <RotateCcw size={16} /> Limpiar
                    </button>
                    
                </div>
            </div>

            {/* ===== Activities Grid ===== */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-dashed border-slate-300 p-16 text-center shadow-sm">
                    <CalendarCheck size={48} className="mx-auto text-slate-300 mb-4" />
                    <h3 className="text-lg font-bold text-slate-700 mb-1">No hay actividades</h3>
                    <p className="text-slate-500 text-sm">Prueba a cambiar los filtros o crea una nueva actividad.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredActivities.map(activity => {
                        const status = getActivityStatus(activity);
                        const enrolledCount = (activity._count?.socios || 0) + (activity._count?.patients || 0);
                        const isFull = activity.maxCapacity && enrolledCount >= activity.maxCapacity;

                        return (
                            <div 
                                key={activity.id} 
                                onClick={() => {
                                    if (user?.role !== 'SOCIO') {
                                        setSelectedEnrolledId(activity.id);
                                        setEnrolledModalOpen(true);
                                    }
                                }}
                                className={`bg-white rounded-[2rem] p-6 shadow-sm border border-slate-200/60 transition-all duration-300 group flex flex-col ${user?.role !== 'SOCIO' ? 'cursor-pointer hover:shadow-xl hover:border-indigo-200' : 'hover:shadow-xl hover:border-indigo-200'}`}
                            >
                                
                                {/* Header / Status Banner */}
                                <div className="flex justify-between items-start mb-5">
                                    <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider border ${status.color}`}>
                                        {status.label}
                                    </span>
                                    
                                    {user?.role !== 'SOCIO' && (
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setSelectedActivity(activity); setModalOpen(true); }}
                                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 flex items-center justify-center transition-colors border border-slate-200"
                                                title="Editar actividad"
                                            >
                                                <Edit3 size={14} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(activity.id); }}
                                                className="w-8 h-8 rounded-full bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors border border-slate-200"
                                                title="Eliminar actividad"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Title & Main Info */}
                                <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight group-hover:text-indigo-600 transition-colors">
                                    {activity.title}
                                </h3>
                                
                                <div className="space-y-2.5 mb-6">
                                    <div className="flex items-start gap-2.5 text-slate-600 text-sm">
                                        <Calendar size={16} className="mt-0.5 text-slate-400 shrink-0" />
                                        <div>
                                            <p className="font-semibold text-slate-700">{formatDateTime(activity.startTime)}</p>
                                            <p className="text-xs text-slate-500">Hasta {formatDateTime(activity.endTime)}</p>
                                        </div>
                                    </div>
                                    
                                    {activity.location && (
                                        <div className="flex items-center gap-2.5 text-slate-600 text-sm">
                                            <MapPin size={16} className="text-slate-400 shrink-0" />
                                            <span className="font-medium truncate">{activity.location}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Conditionally hide Organizer for SOCIO to simplify */}
                                {user?.role !== 'SOCIO' && (
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 mb-6">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Organiza</p>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                                                {activity.organizerName ? activity.organizerName.charAt(0).toUpperCase() : <User size={14} />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-700 text-sm truncate">{activity.organizerName || 'Organización'}</p>
                                                <div className="flex items-center gap-1 mt-0.5 text-slate-500 text-xs">
                                                    <Building2 size={10} />
                                                    <span className="truncate">{activity.organizerDelegation || 'General'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        {(activity.organizerPhone || activity.organizerEmail) && (
                                            <div className="flex gap-3 mt-3 pt-3 border-t border-slate-200/60 text-xs text-slate-500 font-medium">
                                                {activity.organizerPhone && <span className="flex items-center gap-1.5"><Phone size={12} /> {activity.organizerPhone}</span>}
                                                {activity.organizerEmail && <span className="flex items-center gap-1.5 truncate"><Mail size={12} /> {activity.organizerEmail}</span>}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mt-auto"></div>

                                {/* Footer Stats */}
                                <div className={`flex items-center justify-between pt-4 border-t border-slate-100 ${user?.role === 'SOCIO' ? 'mb-4' : ''}`}>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${isFull ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <p className={`text-sm font-black ${isFull ? 'text-rose-600' : 'text-slate-700'}`}>
                                                {enrolledCount} {activity.maxCapacity ? `/ ${activity.maxCapacity}` : 'Total'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Plazas (titulares + pacientes)</p>
                                        </div>
                                    </div>

                                    {activity.registrationDeadline && (
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-700">
                                                {new Date(activity.registrationDeadline).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1 justify-end">
                                                <Clock size={10} /> Cierre Inscrip.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Socio Action Button */}
                                {user?.role === 'SOCIO' && (
                                    <div className="mt-2 text-center">
                                        {activity.isEnrolled ? (
                                            <div className="w-full py-2.5 mb-2 bg-emerald-50/50 text-emerald-600 font-bold text-xs uppercase tracking-wide rounded-xl flex items-center justify-center gap-1.5 border border-emerald-100">
                                                <CheckCircle size={16} /> Estás apuntado a esta actividad
                                            </div>
                                        ) : null}
                                        
                                        <button 
                                            onClick={() => { setSelectedActivity(activity); setDetailModalOpen(true); }}
                                            className="w-full py-3 bg-white text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-bold text-sm uppercase tracking-wide rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-200 shadow-sm"
                                        >
                                            Ver más detalles
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <CreateActivityModal 
                isOpen={modalOpen} 
                onClose={() => { setModalOpen(false); setSelectedActivity(null); }} 
                fetchData={fetchData} 
                activity={selectedActivity} 
            />

            {/* Socio Detail Modal */}
            {selectedActivity && user?.role === 'SOCIO' && (
                <ActivityDetailModal 
                    isOpen={detailModalOpen}
                    onClose={() => { setDetailModalOpen(false); setSelectedActivity(null); }}
                    activity={selectedActivity}
                    isFull={(selectedActivity._count?.socios || 0) + (selectedActivity._count?.patients || 0) >= (selectedActivity.maxCapacity || Infinity)}
                    status={getActivityStatus(selectedActivity)}
                    isEnrolled={selectedActivity.isEnrolled}
                    myEnrollment={selectedActivity.myEnrollment}
                    token={token}
                    onEnroll={handleEnroll}
                    onUnenroll={handleUnenroll}
                />
            )}
            {/* Enrolled Socios Admin Modal */}
            {user?.role !== 'SOCIO' && (
                <ActivityEnrolledModal 
                    isOpen={enrolledModalOpen}
                    onClose={() => { setEnrolledModalOpen(false); setSelectedEnrolledId(null); }}
                    activityId={selectedEnrolledId}
                />
            )}
        </div>
    );
};

export default Actividades;
