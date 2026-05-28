import React, { useState, useEffect } from 'react';
import { X, FileEdit, Calendar } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import Swal from 'sweetalert2';

export default function CreateSubvencionModal({ isOpen, onClose, fetchSubvenciones, delegaciones, subvencionToEdit }) {
    const { token } = useAuthStore();
    const isEdit = Boolean(subvencionToEdit);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        amount: '',
        delegationId: '',
        status: 'SOLICITADO',
        deadlineDate: '',
        justifiedDate: ''
    });
    const [files, setFiles] = useState([]);

    useEffect(() => {
        if (isOpen) {
            if (isEdit && subvencionToEdit) {
                setFormData({
                    name: subvencionToEdit.name || '',
                    description: subvencionToEdit.description || '',
                    amount: subvencionToEdit.amount || '',
                    delegationId: subvencionToEdit.delegationId || '',
                    status: subvencionToEdit.status || 'SOLICITADO',
                    deadlineDate: subvencionToEdit.deadlineDate ? subvencionToEdit.deadlineDate.split('T')[0] : '',
                    justifiedDate: subvencionToEdit.justifiedDate ? subvencionToEdit.justifiedDate.split('T')[0] : ''
                });
            } else {
                setFormData({
                    name: '', description: '', amount: '', delegationId: '', status: 'SOLICITADO', deadlineDate: '', justifiedDate: ''
                });
                setFiles([]);
            }
        }
    }, [isOpen, isEdit, subvencionToEdit]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const API = '/api/subvenciones';
            const headers = { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
            };

            const data = new FormData();
            Object.keys(formData).forEach(key => {
                data.append(key, formData[key]);
            });
            if (files.length) {
                files.forEach((f) => data.append('documentos', f));
            }

            if (isEdit) {
                // For edit, we might want to still use JSON if no file is changing, 
                // but for simplicity let's use FormData if file is present or just stay consistent.
                // Actually PUT with multipart can be tricky if not handled everywhere.
                // The provided PUT route in backend doesn't use upload.single('documento').
                // Only POST / justifies does.
                // User said "also applies at the time of creation".
                await axios.put(`${API}/${subvencionToEdit.id}`, formData, { 
                    headers: { Authorization: `Bearer ${token}` } 
                });
                Swal.fire({ icon: 'success', title: 'Actualizada', text: 'Subvención actualizada.', timer: 1500 });
            } else {
                await axios.post(API, data, { headers });
                Swal.fire({ icon: 'success', title: 'Creada', text: 'Subvención creada.', timer: 1500 });
            }
            fetchSubvenciones();
            onClose();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Error al guardar la subvención'
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
                            <FileEdit size={24} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {isEdit ? 'EDITAR SUBVENCIÓN' : 'NUEVA SUBVENCIÓN'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <form id="subvencionForm" onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto p-8 space-y-8 flex-1">
                        
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                                Nombre de la Subvención <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text" required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none"
                                placeholder="Ej. Ayuda Ayuntamiento 2026"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descripción</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none min-h-[80px] resize-none"
                                placeholder="Detalles de la subvención..."
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Importe (€)</label>
                                <input
                                    type="number" step="0.01" min="0"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fecha Límite</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.deadlineDate}
                                        onChange={e => setFormData({ ...formData, deadlineDate: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none text-slate-600"
                                    />
                                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Día Justificada (Opcional)</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.justifiedDate}
                                        onChange={e => setFormData({ ...formData, justifiedDate: e.target.value })}
                                        className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all outline-none text-slate-600"
                                    />
                                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Delegación <span className="text-red-400">*</span></label>
                                <select
                                    required
                                    value={formData.delegationId}
                                    onChange={e => setFormData({ ...formData, delegationId: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all cursor-pointer outline-none"
                                >
                                    <option value="">Selecciona delegación</option>
                                    {delegaciones.map(del => (
                                        <option key={del.id} value={del.id}>{del.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estado</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all cursor-pointer outline-none"
                                >
                                    <option value="SOLICITADO">Solicitado</option>
                                    <option value="CONCEDIDO">Concedido</option>
                                    <option value="JUSTIFICADO">Justificado</option>
                                    <option value="EN_ORDEN">En Orden</option>
                                    <option value="EN_FECHA">En Fecha</option>
                                </select>
                            </div>
                        </div>

                        {!isEdit && (
                            <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-300 transition-colors">
                                <label className="block text-sm font-bold text-slate-700 mb-3">Adjuntar documentos (Opcional)</label>
                                <input
                                    type="file"
                                    multiple
                                    onChange={e => setFiles(Array.from(e.target.files || []))}
                                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 transition-all cursor-pointer focus:outline-none"
                                />
                                {files.length > 0 && (
                                    <ul className="mt-3 text-xs text-slate-600 list-disc pl-5 space-y-1">
                                        {files.map((f, idx) => (
                                            <li key={`${f.name}-${idx}`}>{f.name}</li>
                                        ))}
                                    </ul>
                                )}
                                <p className="mt-3 text-xs text-slate-500 leading-relaxed">Puedes subir varios documentos. Si adjuntas alguno, se marcará como justificada automáticamente.</p>
                            </div>
                        )}
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
                            form="subvencionForm"
                            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 transition-all disabled:opacity-50"
                        >
                            {isEdit ? 'Guardar Cambios' : 'Crear Subvención'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
