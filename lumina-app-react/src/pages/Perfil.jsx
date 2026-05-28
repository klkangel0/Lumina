import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { User, Mail, Phone, Camera, Save, Lock, Eye, EyeOff, CheckCircle, Shield, Calendar, Edit3, X, IdCard, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';

const Perfil = () => {
    const { token, user: authUser, login } = useAuthStore();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [editForm, setEditForm] = useState({ name: '', email: '', phone: '' });
    const [socioForm, setSocioForm] = useState({
        name: '',
        lastName: '',
        dni: '',
        address: '',
        postalCode: '',
    });
    const fileInputRef = useRef(null);

    const isPendingPostulador = profile?.role === 'SOCIO' && profile?.socio?.status === 'PENDING';

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(res.data);
            setEditForm({ name: res.data.name, email: res.data.email || '', phone: res.data.phone || '' });
            const s = res.data.socio;
            if (s) {
                setSocioForm({
                    name: s.name || '',
                    lastName: s.lastName || '',
                    dni: s.dni || '',
                    address: s.address || '',
                    postalCode: s.postalCode || '',
                });
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchProfile(); }, []);

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validate type and size
        if (!file.type.startsWith('image/')) {
            return Swal.fire({ icon: 'error', title: 'Formato no válido', text: 'Solo se permiten imágenes (JPG, PNG, GIF).', confirmButtonColor: '#6E9EFF' });
        }
        if (file.size > 2 * 1024 * 1024) {
            return Swal.fire({ icon: 'error', title: 'Archivo demasiado grande', text: 'La imagen no puede superar los 2 MB.', confirmButtonColor: '#6E9EFF' });
        }

        // Convert to base64
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const res = await axios.put('/api/profile', { ...editForm, avatar: reader.result }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfile(res.data.user);
                Swal.fire({ icon: 'success', title: '¡Foto actualizada!', showConfirmButton: false, timer: 1500, timerProgressBar: true });
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo actualizar la foto.', confirmButtonColor: '#6E9EFF' });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        if (!editForm.name.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Campo obligatorio', text: 'El nombre no puede estar vacío.', confirmButtonColor: '#6E9EFF' });
        }
        if (!editForm.email?.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Campo obligatorio', text: 'El correo electrónico es obligatorio.', confirmButtonColor: '#6E9EFF' });
        }
        if (!editForm.phone?.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Campo obligatorio', text: 'El teléfono es obligatorio.', confirmButtonColor: '#6E9EFF' });
        }

        const payload = { ...editForm };
        if (isPendingPostulador) {
            const lnParts = socioForm.lastName.trim().split(/\s+/).filter(Boolean);
            if (!socioForm.name.trim()) {
                return Swal.fire({ icon: 'warning', title: 'Ficha incompleta', text: 'Indica tu nombre de pila.', confirmButtonColor: '#6E9EFF' });
            }
            if (lnParts.length < 2) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Ficha incompleta',
                    text: 'Escribe tu primer y segundo apellido en el campo de apellidos.',
                    confirmButtonColor: '#6E9EFF',
                });
            }
            if (!socioForm.dni.trim() || !socioForm.address.trim() || !socioForm.postalCode.trim()) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'Ficha incompleta',
                    text: 'Completa DNI/NIE, dirección y código postal.',
                    confirmButtonColor: '#6E9EFF',
                });
            }
            payload.socio = {
                name: socioForm.name.trim(),
                lastName: socioForm.lastName.trim(),
                dni: socioForm.dni.trim(),
                address: socioForm.address.trim(),
                postalCode: socioForm.postalCode.trim(),
            };
        }

        setSaving(true);
        try {
            const res = await axios.put('/api/profile', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProfile(res.data.user);
            setEditing(false);
            // Update the auth store with the new name
            login({ ...authUser, name: res.data.user.name }, token);
            Swal.fire({ icon: 'success', title: '¡Perfil actualizado!', showConfirmButton: false, timer: 1500, timerProgressBar: true });
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al guardar los cambios.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#6E9EFF' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (!passwordForm.currentPassword) {
            return Swal.fire({ icon: 'warning', title: 'Requerido', text: 'Introduce tu contraseña actual.', confirmButtonColor: '#6E9EFF' });
        }
        if (passwordForm.newPassword.length < 6) {
            return Swal.fire({ icon: 'warning', title: 'Contraseña corta', text: 'La nueva contraseña debe tener al menos 6 caracteres.', confirmButtonColor: '#6E9EFF' });
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return Swal.fire({ icon: 'warning', title: 'No coinciden', text: 'Las contraseñas no coinciden.', confirmButtonColor: '#6E9EFF' });
        }

        try {
            await axios.put('/api/profile/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            }, { headers: { Authorization: `Bearer ${token}` } });

            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordSection(false);
            Swal.fire({ icon: 'success', title: '¡Contraseña cambiada!', text: 'Tu contraseña se ha actualizado correctamente.', showConfirmButton: false, timer: 2000, timerProgressBar: true });
        } catch (err) {
            const msg = err.response?.data?.message || 'Error al cambiar la contraseña.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#6E9EFF' });
        }
    };

    const getRoleLabel = () => {
        if (profile?.appRole) return profile.appRole.displayName;
        switch (profile?.role) {
            case 'ADMIN': return 'Administrador';
            case 'SOCIO': return 'Socio';
            default: return 'Usuario';
        }
    };

    const getRoleColor = () => {
        if (profile?.appRole) return profile.appRole.color;
        switch (profile?.role) {
            case 'ADMIN': return '#dc3545';
            case 'SOCIO': return '#28a745';
            default: return '#6c757d';
        }
    };

    const getInitials = () => {
        if (!profile?.name) return 'U';
        const parts = profile.name.split(' ').filter(Boolean);
        return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0][0].toUpperCase();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full" />
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Profile Hero Card */}
            <div className="relative bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-6">
                {/* Gradient Banner */}
                <div className="h-44 bg-gradient-to-br from-[#6E9EFF] via-[#5b8df5] to-[#8b5cf6] relative">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoMnY0aC0yem0tNiA2aC00djJoNHYtMnptMC02aC00djJoNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
                </div>

                {/* Avatar + Info Area */}
                <div className="px-6 sm:px-8 pb-6">
                    <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-18">
                        {/* Avatar */}
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-gradient-to-br from-[#6E9EFF] to-[#8b5cf6] flex items-center justify-center">
                                {profile?.avatar ? (
                                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-white text-4xl font-bold">{getInitials()}</span>
                                )}
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute -bottom-1 -right-1 w-9 h-9 bg-white rounded-xl shadow-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-[#6E9EFF] hover:border-[#6E9EFF] transition-all group-hover:scale-110"
                            >
                                <Camera size={16} />
                            </button>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                        </div>

                        {/* Name + Role */}
                        <div className="flex-1 text-center sm:text-left pb-1">
                            <h1 className="text-2xl font-bold text-slate-800">{profile?.name}</h1>
                            <div className="flex items-center justify-center sm:justify-start gap-2 mt-1.5">
                                <span className="text-sm text-slate-400">@{profile?.username}</span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white tracking-wide" style={{ backgroundColor: getRoleColor() }}>
                                    {getRoleLabel()}
                                </span>
                            </div>
                        </div>

                        {/* Edit Button */}
                        <div className="flex gap-2">
                            {editing ? (
                                <>
                                    <button onClick={() => {
                                        setEditing(false);
                                        setEditForm({ name: profile.name, email: profile.email || '', phone: profile.phone || '' });
                                        const s = profile.socio;
                                        if (s) {
                                            setSocioForm({
                                                name: s.name || '',
                                                lastName: s.lastName || '',
                                                dni: s.dni || '',
                                                address: s.address || '',
                                                postalCode: s.postalCode || '',
                                            });
                                        }
                                    }}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                                        <X size={16} /> Cancelar
                                    </button>
                                    <button onClick={handleSaveProfile} disabled={saving}
                                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#6E9EFF] to-[#5b8df5] rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50">
                                        <Save size={16} /> {saving ? 'Guardando...' : 'Guardar'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setEditing(true)}
                                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#6E9EFF] to-[#5b8df5] rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
                                    <Edit3 size={16} /> Editar perfil
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column — Details */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Personal Info Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                                <User size={18} className="text-[#6E9EFF]" /> Información Personal
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Name */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0">Nombre completo</label>
                                {editing ? (
                                    <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" />
                                ) : (
                                    <p className="text-sm font-medium text-slate-700">{profile?.name || '—'}</p>
                                )}
                            </div>
                            {/* Email */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0 flex items-center gap-1.5"><Mail size={13} /> Email</label>
                                {editing ? (
                                    <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" placeholder="email@ejemplo.com" />
                                ) : (
                                    <p className="text-sm font-medium text-slate-700">{profile?.email || <span className="text-slate-300 italic">no especificado</span>}</p>
                                )}
                            </div>
                            {/* Phone */}
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider w-32 shrink-0 flex items-center gap-1.5"><Phone size={13} /> Teléfono</label>
                                {editing ? (
                                    <input type="tel" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all" placeholder="612345678" />
                                ) : (
                                    <p className="text-sm font-medium text-slate-700">{profile?.phone || <span className="text-slate-300 italic">no especificado</span>}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {isPendingPostulador && (
                        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 overflow-hidden ring-1 ring-amber-100/80">
                            <div className="px-6 py-4 border-b border-amber-100/80 bg-amber-50/40">
                                <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                                    <IdCard size={18} className="text-amber-600" /> Ficha del tutor / solicitante
                                </h2>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    Obligatorio para pasar a <strong>pendiente de aprobación</strong> en la lista de espera. Debe coincidir con la validación del servidor (dos
                                    apellidos, DNI, dirección y código postal).
                                </p>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Nombre de pila *</label>
                                        {editing ? (
                                            <input
                                                type="text"
                                                value={socioForm.name}
                                                onChange={(e) => setSocioForm((f) => ({ ...f, name: e.target.value }))}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                                placeholder="Ej. María"
                                            />
                                        ) : (
                                            <p className="text-sm font-medium text-slate-700">{socioForm.name || '—'}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                            Primer y segundo apellido *
                                        </label>
                                        {editing ? (
                                            <input
                                                type="text"
                                                value={socioForm.lastName}
                                                onChange={(e) => setSocioForm((f) => ({ ...f, lastName: e.target.value }))}
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                                placeholder="Ej. García López"
                                            />
                                        ) : (
                                            <p className="text-sm font-medium text-slate-700">{socioForm.lastName || '—'}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <IdCard size={13} /> DNI / NIE *
                                    </label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={socioForm.dni}
                                            onChange={(e) => setSocioForm((f) => ({ ...f, dni: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-slate-700">{socioForm.dni || '—'}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                                        <MapPin size={13} /> Dirección completa *
                                    </label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={socioForm.address}
                                            onChange={(e) => setSocioForm((f) => ({ ...f, address: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-slate-700">{socioForm.address || '—'}</p>
                                    )}
                                </div>
                                <div className="sm:max-w-xs">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Código postal *</label>
                                    {editing ? (
                                        <input
                                            type="text"
                                            value={socioForm.postalCode}
                                            onChange={(e) => setSocioForm((f) => ({ ...f, postalCode: e.target.value }))}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                                        />
                                    ) : (
                                        <p className="text-sm font-medium text-slate-700">{socioForm.postalCode || '—'}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Change Password Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <button
                            onClick={() => setShowPasswordSection(!showPasswordSection)}
                            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                        >
                            <h2 className="text-base font-bold text-slate-700 flex items-center gap-2">
                                <Lock size={18} className="text-amber-500" /> Cambiar Contraseña
                            </h2>
                            <div className={`w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center transition-transform duration-200 ${showPasswordSection ? 'rotate-180' : ''}`}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 4.5L6 7.5L9 4.5" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            </div>
                        </button>

                        <div className="overflow-hidden transition-all duration-300 ease-in-out" style={{ maxHeight: showPasswordSection ? '400px' : '0px' }}>
                            <div className="px-6 pb-6 space-y-4 border-t border-slate-100 pt-4">
                                {/* Current Password */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña actual</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrent ? 'text' : 'password'}
                                            value={passwordForm.currentPassword}
                                            onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                                            placeholder="••••••••"
                                            className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                        />
                                        <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                {/* New Password */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
                                        <div className="relative">
                                            <input
                                                type={showNew ? 'text' : 'password'}
                                                value={passwordForm.newPassword}
                                                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                                placeholder="Mínimo 6 caracteres"
                                                className="w-full px-4 py-2.5 pr-10 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                            />
                                            <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirmar contraseña</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                            placeholder="Repite la contraseña"
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                        />
                                    </div>
                                </div>
                                <button onClick={handleChangePassword}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all">
                                    <Lock size={16} /> Actualizar contraseña
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column — Stats / Info */}
                <div className="space-y-6">
                    {/* Account Info Card */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Shield size={16} className="text-[#6E9EFF]" /> Información de Cuenta
                        </h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="w-9 h-9 rounded-lg bg-blue-100 text-[#6E9EFF] flex items-center justify-center"><User size={16} /></div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Usuario</p>
                                    <p className="text-sm font-bold text-slate-700">@{profile?.username}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-500 flex items-center justify-center"><Shield size={16} /></div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Rol</p>
                                    <p className="text-sm font-bold" style={{ color: getRoleColor() }}>{getRoleLabel()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-500 flex items-center justify-center"><Calendar size={16} /></div>
                                <div>
                                    <p className="text-[11px] font-semibold text-slate-400 uppercase">Miembro desde</p>
                                    <p className="text-sm font-bold text-slate-700">
                                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Status Card */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                                <CheckCircle size={20} />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-emerald-800">Cuenta activa</p>
                                <p className="text-xs text-emerald-600">Tu cuenta funciona correctamente</p>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-emerald-200/50">
                            <p className="text-[11px] text-emerald-500 font-medium">Última actualización: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('es-ES') : 'hoy'}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Perfil;
