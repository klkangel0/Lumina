import React, { useState, useEffect } from 'react';
import { X, Shield, Plus } from 'lucide-react';

const CreateRoleModal = ({ isOpen, onClose, modules, onSave }) => {
    const [name, setName] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#6E9EFF');
    const [active, setActive] = useState(true);
    const [perms, setPerms] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName('');
            setDisplayName('');
            setDescription('');
            setColor('#6E9EFF');
            setActive(true);
            const permMap = {};
            modules.forEach(mod => {
                permMap[mod.id] = { canView: false, canCreate: false, canEdit: false, canDelete: false };
            });
            setPerms(permMap);
        }
    }, [isOpen, modules]);

    const togglePerm = (moduleId, field) => {
        setPerms(prev => ({
            ...prev,
            [moduleId]: {
                ...prev[moduleId],
                [field]: !prev[moduleId]?.[field],
            }
        }));
    };

    const toggleAll = (moduleId, checked) => {
        setPerms(prev => ({
            ...prev,
            [moduleId]: { canView: checked, canCreate: checked, canEdit: checked, canDelete: checked },
        }));
    };

    const isAllChecked = (moduleId) => {
        const p = perms[moduleId];
        return p && p.canView && p.canCreate && p.canEdit && p.canDelete;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const permissionsArray = modules.map(mod => ({
            moduleId: mod.id,
            ...(perms[mod.id] || { canView: false, canCreate: false, canEdit: false, canDelete: false }),
        }));

        try {
            await onSave({ name, displayName, description, color, active, permissions: permissionsArray });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-modalIn"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
                    <h2 className="text-white text-lg font-bold flex items-center gap-2">
                        <Plus size={20} />
                        Crear Nuevo Rol
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-red-500 text-white flex items-center justify-center transition-colors">
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="overflow-auto max-h-[calc(90vh-160px)]">
                        {/* Form Fields */}
                        <div className="px-6 py-5 border-b border-slate-100 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre interno</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
                                        required
                                        placeholder="ej: coordinador_area"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">Solo letras minúsculas y guiones bajos</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre a mostrar</label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={e => setDisplayName(e.target.value)}
                                        required
                                        placeholder="ej: Coordinador de Área"
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={2}
                                    placeholder="Descripción del rol y sus responsabilidades..."
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Color del rol</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={e => setColor(e.target.value.toUpperCase())}
                                            className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                                        />
                                        <input
                                            type="text"
                                            value={color}
                                            onChange={e => setColor(e.target.value)}
                                            maxLength={7}
                                            className="w-28 px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                        />
                                        <div className="w-8 h-8 rounded-full shadow-inner border border-white ring-1 ring-slate-200" style={{ backgroundColor: color }} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                                    <select
                                        value={active ? '1' : '0'}
                                        onChange={e => setActive(e.target.value === '1')}
                                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    >
                                        <option value="1">Activo</option>
                                        <option value="0">Inactivo</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Permissions Matrix */}
                        <div className="px-6 py-4">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <Shield size={16} className="text-blue-500" />
                                Asignar Permisos
                            </h3>

                            <table className="w-full">
                                <thead>
                                    <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                        <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-left">Módulo</th>
                                        <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Ver</th>
                                        <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Crear</th>
                                        <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Modificar</th>
                                        <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Eliminar</th>
                                        <th className="px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-blue-500 text-center">Todos</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {modules.map(mod => (
                                        <tr key={mod.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-semibold text-slate-700">{mod.displayName}</span>
                                            </td>
                                            {['canView', 'canCreate', 'canEdit', 'canDelete'].map(field => (
                                                <td key={field} className="px-3 py-3 text-center">
                                                    <label className="inline-flex items-center justify-center cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={perms[mod.id]?.[field] || false}
                                                            onChange={() => togglePerm(mod.id, field)}
                                                            className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 cursor-pointer"
                                                        />
                                                    </label>
                                                </td>
                                            ))}
                                            <td className="px-3 py-3 text-center">
                                                <label className="inline-flex items-center justify-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isAllChecked(mod.id)}
                                                        onChange={e => toggleAll(mod.id, e.target.checked)}
                                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30 cursor-pointer"
                                                    />
                                                </label>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Creando...' : 'Crear rol'}
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                @keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(10px); } to { opacity:1; transform:scale(1) translateY(0); } }
                .animate-modalIn { animation: modalIn 0.25s ease-out; }
            `}</style>
        </div>
    );
};

export default CreateRoleModal;
