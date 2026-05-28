import React from 'react';
import { X, Shield, Users, Palette, Tag, CheckCircle2, XCircle } from 'lucide-react';

const ViewPermissionsModal = ({ isOpen, onClose, role, permissions, modules }) => {
    if (!isOpen || !role) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal */}
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-modalIn"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
                    <h2 className="text-white text-lg font-bold flex items-center gap-2">
                        <Shield size={20} />
                        Permisos de {role.displayName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Role Info */}
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-start gap-4">
                        <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0"
                            style={{ backgroundColor: role.color }}
                        >
                            {role.displayName?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-slate-800">{role.displayName}</h3>
                                {role.isSystem ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                        <Shield size={10} className="mr-1" /> Sistema
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                        <Tag size={10} className="mr-1" /> Personalizado
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 mb-3">{role.description || 'Sin descripción'}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                <span className="flex items-center gap-1.5">
                                    <Users size={13} className="text-blue-500" />
                                    <strong>{role.totalUsers}</strong> usuarios
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <Palette size={13} className="text-purple-500" />
                                    <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: role.color }} />
                                    {role.color}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permissions Matrix */}
                <div className="overflow-auto max-h-[50vh] px-6 py-4">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-left">Módulo</th>
                                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Ver</th>
                                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Crear</th>
                                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Modificar</th>
                                <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Eliminar</th>
                            </tr>
                        </thead>
                        <tbody>
                            {modules.map(mod => {
                                const perm = permissions.find(p => p.moduleId === mod.id) || {};
                                return (
                                    <tr key={mod.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-semibold text-slate-700">{mod.displayName}</span>
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {perm.canView ? <CheckCircle2 size={18} className="mx-auto text-green-500" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {perm.canCreate ? <CheckCircle2 size={18} className="mx-auto text-green-500" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {perm.canEdit ? <CheckCircle2 size={18} className="mx-auto text-green-500" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                                        </td>
                                        <td className="px-3 py-3 text-center">
                                            {perm.canDelete ? <CheckCircle2 size={18} className="mx-auto text-green-500" /> : <XCircle size={18} className="mx-auto text-slate-300" />}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                    >
                        Cerrar
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
                .animate-modalIn { animation: modalIn 0.25s ease-out; }
            `}</style>
        </div>
    );
};

export default ViewPermissionsModal;
