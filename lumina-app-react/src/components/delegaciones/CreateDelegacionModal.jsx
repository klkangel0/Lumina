import React, { useState, useEffect } from 'react';
import { X, Building2 } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import Swal from 'sweetalert2';

export default function CreateDelegacionModal({ isOpen, onClose, fetchDelegaciones, delegacionToEdit }) {
    const { token } = useAuthStore();
    const isEdit = Boolean(delegacionToEdit);

    const [formData, setFormData] = useState({
        name: '',
        shortName: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        color: '#6E9EFF',
        active: true
    });

    useEffect(() => {
        if (isOpen) {
            if (isEdit && delegacionToEdit) {
                setFormData({
                    name: delegacionToEdit.name || '',
                    shortName: delegacionToEdit.shortName || '',
                    address: delegacionToEdit.address || '',
                    city: delegacionToEdit.city || '',
                    phone: delegacionToEdit.phone || '',
                    email: delegacionToEdit.email || '',
                    color: delegacionToEdit.color || '#6E9EFF',
                    active: delegacionToEdit.active !== undefined ? delegacionToEdit.active : true,
                });
            } else {
                setFormData({
                    name: '', shortName: '', address: '', city: '',
                    phone: '', email: '', color: '#6E9EFF', active: true
                });
            }
        }
    }, [isOpen, isEdit, delegacionToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const API = '/api/delegaciones';
            const headers = { Authorization: `Bearer ${token}` };

            if (isEdit) {
                await axios.put(`${API}/${delegacionToEdit.id}`, formData, { headers });
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Delegación actualizada.', timer: 1500 });
            } else {
                await axios.post(API, formData, { headers });
                Swal.fire({ icon: 'success', title: 'Creado', text: 'Delegación creada.', timer: 1500 });
            }
            fetchDelegaciones();
            onClose();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Error al guardar la delegación'
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                className="relative z-10 bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Building2 size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {isEdit ? 'EDITAR DELEGACIÓN' : 'NUEVA DELEGACIÓN'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="delegacionForm" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto p-8 space-y-8 flex-1">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre <span className="text-red-400">*</span></label>
                                <input
                                    type="text" required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none"
                                    placeholder="Ej. Martorell"
                                    disabled={isEdit && delegacionToEdit?.isSystem}
                                />
                                {isEdit && delegacionToEdit?.isSystem && (
                                    <p className="text-[11px] text-amber-600 mt-1.5 font-semibold">El nombre de esta delegación no se puede cambiar por ser del sistema.</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre Corto (Abrev.)</label>
                                <input
                                    type="text" maxLength={10}
                                    value={formData.shortName}
                                    onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none uppercase"
                                    placeholder="Ej. MTR"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Color de etiqueta</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={e => setFormData({ ...formData, color: e.target.value })}
                                        className="h-10 w-12 cursor-pointer rounded-lg border border-slate-200 bg-white p-0.5"
                                    />
                                    <span className="text-sm font-mono font-semibold text-slate-500">{formData.color}</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ciudad / Ubicación</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none"
                                    placeholder="Ej. Martorell, Barcelona"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Dirección completa</label>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none"
                                    placeholder="Ej. Calle Principal 123"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Teléfono</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none"
                                    placeholder="Teléfono de contacto"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none"
                                    placeholder="contacto@assotea.org"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={formData.active}
                                        onChange={e => setFormData({ ...formData, active: e.target.checked })}
                                        className="sr-only"
                                    />
                                    <div className={`block w-10 h-6 rounded-full transition-colors ${formData.active ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${formData.active ? 'translate-x-4' : ''}`}></div>
                                </div>
                                <span className="text-sm font-semibold text-slate-700">
                                    Delegación Activa
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            form="delegacionForm"
                            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all disabled:opacity-50"
                        >
                            {isEdit ? 'Guardar Cambios' : 'Crear Delegación'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
