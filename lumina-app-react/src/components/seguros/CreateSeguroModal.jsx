import React, { useEffect, useState } from 'react';
import { X, Shield, Calendar, Euro } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import Swal from 'sweetalert2';

export default function CreateSeguroModal({ isOpen, onClose, onSaved, seguroToEdit }) {
    const { token } = useAuthStore();
    const isEdit = Boolean(seguroToEdit);
    const [form, setForm] = useState({
        name: '',
        purpose: '',
        validFrom: '',
        validTo: '',
        expiryDate: '',
        amount: '',
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (seguroToEdit) {
            setForm({
                name: seguroToEdit.name || '',
                purpose: seguroToEdit.purpose || '',
                validFrom: seguroToEdit.validFrom ? String(seguroToEdit.validFrom).slice(0, 10) : '',
                validTo: seguroToEdit.validTo ? String(seguroToEdit.validTo).slice(0, 10) : '',
                expiryDate: seguroToEdit.expiryDate ? String(seguroToEdit.expiryDate).slice(0, 10) : '',
                amount: seguroToEdit.amount ?? '',
            });
        } else {
            setForm({ name: '', purpose: '', validFrom: '', validTo: '', expiryDate: '', amount: '' });
        }
    }, [isOpen, seguroToEdit]);

    if (!isOpen) return null;

    const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.purpose || !form.validFrom || !form.expiryDate) {
            Swal.fire({ icon: 'warning', title: 'Campos obligatorios', text: 'Complete los campos requeridos.' });
            return;
        }
        if (new Date(form.expiryDate) < new Date(form.validFrom)) {
            Swal.fire({
                icon: 'warning',
                title: 'Fechas no válidas',
                text: 'La fecha de caducidad no puede ser anterior a la fecha de validez inicial.',
            });
            return;
        }

        try {
            setSaving(true);
            const payload = {
                ...form,
                amount: form.amount === '' ? '' : Number(form.amount),
            };
            const base = '/api/seguros';
            const cfg = { headers: { Authorization: `Bearer ${token}` } };
            if (isEdit) {
                await axios.put(`${base}/${seguroToEdit.id}`, payload, cfg);
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Seguro actualizado.', timer: 1500, showConfirmButton: false });
            } else {
                await axios.post(base, payload, cfg);
                Swal.fire({ icon: 'success', title: 'Creado', text: 'Seguro creado.', timer: 1500, showConfirmButton: false });
            }
            onSaved?.();
            onClose();
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Error', text: error.response?.data?.message || 'No se pudo guardar el seguro.' });
        } finally {
            setSaving(false);
        }
    };

    const input = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div className="relative z-10 bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <Shield size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">{isEdit ? 'EDITAR SEGURO' : 'NUEVO SEGURO'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nombre del seguro *</label>
                        <input className={input} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Ej. Póliza RC General 2026" />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Finalidad del seguro *</label>
                        <textarea className={`${input} min-h-[90px] resize-none`} value={form.purpose} onChange={(e) => setField('purpose', e.target.value)} placeholder="Cobertura, alcance y uso previsto..." />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Validez desde *</label>
                            <div className="relative">
                                <input type="date" className={`${input} pl-9`} value={form.validFrom} onChange={(e) => setField('validFrom', e.target.value)} />
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Validez hasta</label>
                            <div className="relative">
                                <input type="date" className={`${input} pl-9`} value={form.validTo} onChange={(e) => setField('validTo', e.target.value)} />
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Caducidad *</label>
                            <div className="relative">
                                <input type="date" className={`${input} pl-9`} value={form.expiryDate} onChange={(e) => setField('expiryDate', e.target.value)} />
                                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Importe (€)</label>
                        <div className="relative">
                            <input type="number" step="0.01" min="0" className={`${input} pl-9`} value={form.amount} onChange={(e) => setField('amount', e.target.value)} placeholder="0.00" />
                            <Euro size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">
                            Cancelar
                        </button>
                        <button disabled={saving} className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:shadow-lg hover:shadow-blue-600/20 disabled:opacity-50">
                            {saving ? 'Guardando...' : (isEdit ? 'Guardar cambios' : 'Crear seguro')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
