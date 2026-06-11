import React, { useState, useEffect } from 'react';
import { X, User, Lock, Shield, Phone } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import Swal from 'sweetalert2';

const UserModal = ({ isOpen, onClose, userToEdit, onSave }) => {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [roles, setRoles] = useState([]);

    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        phone: '',
        role: 'WORKER',
        appRoleId: '',
        password: '',
    });

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                name: userToEdit.name || '',
                username: userToEdit.username || '',
                email: userToEdit.email || '',
                phone: userToEdit.phone || '',
                role: userToEdit.role || 'WORKER',
                appRoleId: userToEdit.appRoleId || '',
                password: '', // Leave blank unless editing
            });
        } else {
            setFormData({
                name: '',
                username: '',
                email: '',
                phone: '',
                role: 'WORKER',
                appRoleId: '',
                password: '',
            });
        }
        setError('');
    }, [userToEdit, isOpen]);

    useEffect(() => {
        const fetchRoles = async () => {
            if (!isOpen) return;
            try {
                const res = await axios.get('/api/roles', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRoles(res.data);
            } catch (err) {
                console.error("Error fetching roles", err);
            }
        };
        fetchRoles();
    }, [isOpen, token]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (e) => {
        const val = e.target.value;
        if (val === 'ADMIN_SYSTEM') {
            setFormData({ ...formData, role: 'ADMIN', appRoleId: '' });
        } else {
            setFormData({ ...formData, role: 'WORKER', appRoleId: val });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            if (userToEdit) {
                // Update
                const res = await axios.put(`/api/usuarios/${userToEdit.id}`, formData, config);
                onSave(res.data.user, 'update');
            } else {
                // Create
                const res = await axios.post('/api/usuarios', formData, config);
                onSave(res.data.user, 'create');
            }
            onClose();

            // SweetAlert2 success - matching legacy PHP style
            Swal.fire({
                icon: 'success',
                title: '¡Éxito!',
                text: userToEdit ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                },
            });
        } catch (err) {
            const errorMsg = err.response?.data?.message || 'Error al guardar el usuario.';
            setError(errorMsg);

            // SweetAlert2 error
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMsg,
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#6E9EFF',
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                className="relative z-10 bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Shield size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {userToEdit ? 'Modificar Usuario' : 'NUEVO USUARIO'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="user-form" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto p-8 space-y-8 flex-1">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-medium">
                                {error}
                            </div>
                        )}

                        {/* Seccion: Datos Personales */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <User size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-slate-700">Datos Personales</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Nombre Completo <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Ej: Ángel Motos"
                                        required
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seccion: Datos de Contacto */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <Phone size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-slate-700">Datos de Contacto</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Email Profesional
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        autoComplete="off"
                                        placeholder="correo@assotea.cat"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="+34 600..."
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Seccion: Datos de Acceso */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                                <Lock size={18} strokeWidth={2.5} />
                                <h3 className="text-sm font-bold text-slate-700">Datos de Acceso</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Nombre de Usuario <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="Identificador para login"
                                        required
                                        autoComplete="off"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        Rol de Sistema <span className="text-red-400">*</span>
                                    </label>
                                    <select
                                        name="appRoleId"
                                        value={formData.role === 'ADMIN' ? 'ADMIN_SYSTEM' : formData.appRoleId || ''}
                                        onChange={handleRoleChange}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all cursor-pointer"
                                        required
                                    >
                                        <option value="" disabled>-- Selecciona un Rol --</option>
                                        <option value="ADMIN_SYSTEM">Administrador de Sistema (Total)</option>
                                        {roles.map(r => (
                                            <option key={r.id} value={r.id}>{r.displayName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                        {userToEdit ? 'Nueva Contraseña (dejar en blanco para no cambiar)' : 'Contraseña Inicial *'}
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        required={!userToEdit}
                                        autoComplete="new-password"
                                        minLength={6}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Footer */}
                    <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 sticky bottom-0">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            CANCELAR
                        </button>
                        <button
                            type="submit"
                            form="user-form"
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'GUARDANDO...' : userToEdit ? 'GUARDAR CAMBIOS' : 'CREAR USUARIO'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;
