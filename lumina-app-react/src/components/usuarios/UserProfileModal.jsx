import React from 'react';
import { X, User, Mail, Phone, Smartphone, CreditCard, Shield } from 'lucide-react';

const UserProfileModal = ({ isOpen, onClose, user }) => {
    if (!isOpen || !user) return null;

    // Get initials
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // Role label
    const getRoleLabel = (role) => {
        switch (role) {
            case 'ADMIN': return 'Administrador del Sistema';
            case 'WORKER': return 'Usuario';
            default: return role || 'Sin rol asignado';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl mx-2 sm:mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
                {/* Header - Dark */}
                <div className="bg-slate-800 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2.5">
                        <User size={20} className="text-blue-300" />
                        Perfil del Usuario
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 hover:scale-110 hover:rotate-90 text-white transition-all duration-200"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Banner with avatar */}
                <div className="bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-6 py-6">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl shadow-lg border border-white/30 hover:scale-110 hover:bg-white/30 transition-all duration-300 cursor-default">
                            {getInitials(user.name || user.username)}
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-xl">{user.name || user.username}</h3>
                            <p className="text-white/80 text-sm mt-0.5">{getRoleLabel(user.role)}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Información Personal */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 hover:border-blue-200">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <CreditCard size={16} className="text-blue-500" />
                                Información Personal
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Shield size={12} className="text-blue-400" /> DNI/NIE
                                </p>
                                <p className="text-sm text-slate-600">{user.dni || 'No especificado'}</p>
                            </div>
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <User size={12} className="text-blue-400" /> Nombre Completo
                                </p>
                                <p className="text-sm text-slate-700 font-medium">{user.name || user.username}</p>
                            </div>
                        </div>
                    </div>

                    {/* Datos de Contacto */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 hover:border-blue-200">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Mail size={16} className="text-blue-500" />
                                Datos de Contacto
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Mail size={12} className="text-blue-400" /> Email
                                </p>
                                <p className="text-sm text-blue-600 font-medium">{user.email || 'No especificado'}</p>
                            </div>
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Phone size={12} className="text-blue-400" /> Teléfono Principal
                                </p>
                                <p className="text-sm text-slate-600">{user.phone || 'No especificado'}</p>
                            </div>
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Smartphone size={12} className="text-blue-400" /> Teléfono Secundario
                                </p>
                                <p className="text-sm text-slate-600">{user.phone2 || 'No especificado'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Información del Sistema */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 hover:border-blue-200">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Shield size={16} className="text-blue-500" />
                                Información del Sistema
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nombre de usuario</p>
                                <p className="text-sm text-slate-700 font-mono">{user.username}</p>
                            </div>
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Rol asignado</p>
                                <p className="text-sm text-slate-700">{getRoleLabel(user.role)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-200 hover:bg-blue-500 hover:text-white text-slate-700 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-md active:scale-95"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-scaleIn { animation: scaleIn 0.25s ease-out; }
            `}</style>
        </div>
    );
};

export default UserProfileModal;
