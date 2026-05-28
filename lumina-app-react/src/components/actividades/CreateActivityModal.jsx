import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CalendarCheck, MapPin, Users, Clock, Info, User, Mail, Phone, Building2 } from 'lucide-react';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';

const API_URL = '/api';

const CreateActivityModal = ({ isOpen, onClose, fetchData, activity = null }) => {
    const { token, user } = useAuthStore();

    const [form, setForm] = useState({
        title: '',
        description: '',
        startTime: '',
        endTime: '',
        registrationDeadline: '',
        maxCapacity: '',
        location: '',
        organizerName: '',
        organizerPhone: '',
        organizerEmail: '',
        organizerDelegation: ''
    });

    const [loading, setLoading] = useState(false);
    const [delegations, setDelegations] = useState([]);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        axios
            .get(`${API_URL}/delegaciones`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                if (!cancelled) setDelegations(Array.isArray(res.data) ? res.data : []);
            })
            .catch(() => {
                if (!cancelled) setDelegations([]);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, token]);

    useEffect(() => {
        if (isOpen) {
            if (activity) {
                // Formatting dates for datetime-local input
                const formatForInput = (dateString) => {
                    if (!dateString) return '';
                    const date = new Date(dateString);
                    // Adjust to local timezone string "YYYY-MM-DDTHH:mm"
                    return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                };

                const formatForDateInput = (dateString) => {
                    if (!dateString) return '';
                    return new Date(dateString).toISOString().split('T')[0];
                };

                setForm({
                    title: activity.title || '',
                    description: activity.description || '',
                    startTime: formatForInput(activity.startTime),
                    endTime: formatForInput(activity.endTime),
                    registrationDeadline: formatForDateInput(activity.registrationDeadline),
                    maxCapacity: activity.maxCapacity || '',
                    location: activity.location || '',
                    organizerName: activity.organizerName || '',
                    organizerPhone: activity.organizerPhone || '',
                    organizerEmail: activity.organizerEmail || '',
                    organizerDelegation: activity.organizerDelegation || ''
                });
            } else {
                // If creating completely new, auto-populate the organizer info from the logged-in user
                setForm({
                    title: '',
                    description: '',
                    startTime: '',
                    endTime: '',
                    registrationDeadline: '',
                    maxCapacity: '',
                    location: '',
                    organizerName: user?.name || '',
                    organizerPhone: user?.phone || '',
                    organizerEmail: user?.email || '',
                    organizerDelegation: ''
                });
            }
        }
    }, [isOpen, activity, user]);

    // Tras cargar delegaciones, valor por defecto al crear (primera delegación activa)
    useEffect(() => {
        if (!isOpen || activity || delegations.length === 0) return;
        setForm((prev) => {
            if (prev.organizerDelegation && prev.organizerDelegation.trim()) return prev;
            const active = delegations.filter((d) => d.active !== false);
            const first = (active[0] || delegations[0])?.name;
            return first ? { ...prev, organizerDelegation: first } : prev;
        });
    }, [isOpen, activity, delegations]);

    if (!isOpen) return null;

    const delegationNames = delegations.map((d) => d.name);
    const legacyDelegation =
        form.organizerDelegation &&
        form.organizerDelegation.trim() &&
        !delegationNames.includes(form.organizerDelegation.trim());

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                title: form.title,
                description: form.description || null,
                startTime: new Date(form.startTime).toISOString(),
                endTime: new Date(form.endTime).toISOString(),
                registrationDeadline: form.registrationDeadline ? new Date(form.registrationDeadline).toISOString() : null,
                maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : null,
                location: form.location || null,
                organizerName: form.organizerName || null,
                organizerPhone: form.organizerPhone || null,
                organizerEmail: form.organizerEmail || null,
                organizerDelegation: form.organizerDelegation || null,
            };

            if (activity) {
                await axios.put(`${API_URL}/actividades/${activity.id}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({ icon: 'success', title: 'Actualizada', text: 'Actividad actualizada.' });
            } else {
                await axios.post(`${API_URL}/actividades`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire({ icon: 'success', title: 'Creada', text: 'Actividad registrada.' });
            }

            fetchData();
            onClose();
        } catch (error) {
            console.error('Error saving activity:', error);
            Swal.fire('Error', error.response?.data?.message || 'Hubo un error al guardar la actividad.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

            <div 
                className="relative w-full max-w-3xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-6 flex items-start justify-between shrink-0 bg-gradient-to-br from-indigo-50 to-white border-b border-indigo-100/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                            <CalendarCheck size={28} />
                        </div>
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-500 mb-1 block">
                                {activity ? 'Edición de Evento' : 'Nueva Actividad'}
                            </span>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                                {activity ? 'Modificar Actividad' : 'Formulario de Creación'}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 shadow-sm -mt-2 -mr-2">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 space-y-8">
                        
                        {/* 1. Main Information */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Info size={14} className="text-blue-500" /> Información Principal
                            </h3>
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre de la Actividad *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={form.title}
                                        onChange={e => handleChange('title', e.target.value)}
                                        placeholder="Ej: Taller de Robótica Navideño"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Descripción (Opcional)</label>
                                    <textarea 
                                        rows="3"
                                        value={form.description}
                                        onChange={e => handleChange('description', e.target.value)}
                                        placeholder="Detalles sobre qué se hará en la actividad..."
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium resize-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Ubicación Física</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            value={form.location}
                                            onChange={e => handleChange('location', e.target.value)}
                                            placeholder="Sede central, Salón multiusos, etc."
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                        />
                                        <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Fechas y Aforo */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Clock size={14} className="text-emerald-500" /> Fechas y Aforo
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Inicio de Actividad *</label>
                                    <input 
                                        type="datetime-local" 
                                        required
                                        value={form.startTime}
                                        onChange={e => handleChange('startTime', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fin de Actividad *</label>
                                    <input 
                                        type="datetime-local" 
                                        required
                                        value={form.endTime}
                                        onChange={e => handleChange('endTime', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fecha Límite Inscripciones</label>
                                    <input 
                                        type="date"
                                        value={form.registrationDeadline}
                                        onChange={e => handleChange('registrationDeadline', e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                                        <span>Aforo Máximo</span>
                                        <Users size={12} className="text-slate-400" />
                                    </label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={form.maxCapacity}
                                        onChange={e => handleChange('maxCapacity', e.target.value)}
                                        placeholder="Ej: 20 plazas"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 3. Datos Organizador fijos */}
                        <div className="pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-4">
                                <span className="flex items-center gap-2"><User size={14} className="text-violet-500" /> Contacto del Organizador</span>
                                <span className="text-[10px] bg-violet-100 text-violet-600 px-2 py-0.5 rounded-md font-bold lowercase tracking-normal">visible por socios</span>
                            </h3>
                            
                            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nombre Organizador</label>
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                value={form.organizerName}
                                                onChange={e => handleChange('organizerName', e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-bold"
                                            />
                                            <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Delegación</label>
                                        <div className="relative">
                                            <select
                                                value={legacyDelegation ? form.organizerDelegation : (form.organizerDelegation || '')}
                                                onChange={(e) => handleChange('organizerDelegation', e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-bold cursor-pointer"
                                            >
                                                <option value="">— Selecciona delegación —</option>
                                                {legacyDelegation && (
                                                    <option value={form.organizerDelegation}>
                                                        {form.organizerDelegation} (registro actual)
                                                    </option>
                                                )}
                                                {delegations.map((d) => (
                                                    <option key={d.id} value={d.name}>
                                                        {d.name}
                                                        {d.active === false ? ' (inactiva)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Teléfono</label>
                                        <div className="relative">
                                            <input 
                                                type="tel" 
                                                value={form.organizerPhone}
                                                onChange={e => handleChange('organizerPhone', e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-bold"
                                            />
                                            <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Correo Electrónico</label>
                                        <div className="relative">
                                            <input 
                                                type="email" 
                                                value={form.organizerEmail}
                                                onChange={e => handleChange('organizerEmail', e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-bold"
                                            />
                                            <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-4 text-center italic">Estos datos de contacto se autocompletan con tu usuario, pero puedes sobrescribirlos si la actividad la liderará otra persona o teléfono de delegación.</p>
                            </div>
                        </div>

                    </div>

                    <div className="p-8 pt-4 bg-slate-50 border-t border-slate-200 mt-auto flex flex-col sm:flex-row justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl font-bold text-sm text-slate-500 bg-white border border-slate-200 hover:bg-slate-100 hover:text-slate-700 transition-all text-center"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                    Guardando...
                                </>
                            ) : (
                                activity ? 'Guardar Cambios' : 'Crear Actividad'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateActivityModal;
