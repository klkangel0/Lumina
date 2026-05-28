import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, User, Briefcase, ChevronDown, Plus, Save, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';

const API_URL = '/api';

export default function CreateProfesionalModal({ isOpen, onClose, professional, refreshData }) {
    const { token } = useAuthStore();
    const isEdit = !!professional;

    const [formData, setFormData] = useState({
        name: '',
        lastName: '',
        dni: '',
        collegiateNumber: '',
        specialty: '',
        collaborationType: '',
        hourlyRate: '',
        company: '',
        email: '',
        phone: '',
        notes: ''
    });

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (professional) {
            setFormData({
                name: professional.name || '',
                lastName: professional.lastName || '',
                dni: professional.dni || '',
                collegiateNumber: professional.collegiateNumber || '',
                specialty: professional.specialty || '',
                collaborationType: professional.collaborationType || '',
                hourlyRate: professional.hourlyRate || '',
                company: professional.company || '',
                email: professional.email || '',
                phone: professional.phone || '',
                notes: professional.notes || ''
            });
        } else {
            setFormData({
                name: '',
                lastName: '',
                dni: '',
                collegiateNumber: '',
                specialty: '',
                collaborationType: '',
                hourlyRate: '',
                company: '',
                email: '',
                phone: '',
                notes: ''
            });
        }
    }, [professional, isOpen]);

    if (!isOpen) return null;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Basic Validation
        if (!formData.name.trim() || !formData.lastName.trim() || !formData.specialty.trim() || !formData.collaborationType.trim()) {
            return Swal.fire('Error', 'Los campos Nombre, Apellidos, Especialidad y Tipo de Colaboración son obligatorios.', 'error');
        }

        const submitData = {
            ...formData,
            hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        };

        try {
            setLoading(true);
            if (isEdit) {
                await axios.put(`${API_URL}/external-professionals/${professional.id}`, submitData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Éxito', 'Profesional actualizado correctamente.', 'success');
            } else {
                await axios.post(`${API_URL}/external-professionals`, submitData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Swal.fire('Éxito', 'Profesional externo creado correctamente.', 'success');
            }
            refreshData();
            onClose();
        } catch (error) {
            console.error("Submit error:", error);
            Swal.fire('Error', error.response?.data?.message || 'Error al guardar el profesional externo.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
            <div className="bg-white rounded-[24px] w-full max-w-3xl shadow-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                
                {/* Header (Mismo estilo que "NUEVO EQUIPO") */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-500 font-bold flex items-center justify-center shrink-0">
                            <Plus size={20} strokeWidth={2.5} />
                        </div>
                        <h2 className="text-slate-800 font-black tracking-wide uppercase text-[15px]">
                            {isEdit ? 'MODIFICAR PROFESIONAL' : 'NUEVO PROFESIONAL'}
                        </h2>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} strokeWidth={2} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-white p-6 sm:p-8 space-y-8">
                    
                    {/* ===== SECCIÓN: INFORMACIÓN PRINCIPAL ===== */}
                    <div>
                        <div className="flex items-center gap-2.5 mb-6">
                            <Briefcase className="text-blue-600 w-5 h-5" />
                            <h3 className="font-bold text-slate-800 text-[14px]">Información Principal</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                            {/* Nombres y Apellidos */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    NOMBRE <span className="text-blue-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Ej: Laura"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    APELLIDOS <span className="text-blue-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="lastName"
                                    placeholder="Ej: García López"
                                    value={formData.lastName}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                    required
                                />
                            </div>

                            {/* Identificación */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    DNI / NIE
                                </label>
                                <input
                                    type="text"
                                    name="dni"
                                    placeholder="Ej: 12345678A"
                                    value={formData.dni}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    NÚMERO COLEGIADO
                                </label>
                                <input
                                    type="text"
                                    name="collegiateNumber"
                                    placeholder="Ej: COL12345"
                                    value={formData.collegiateNumber}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                />
                            </div>
                            
                            {/* Contacto */}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    TELÉFONO
                                </label>
                                <input
                                    type="text"
                                    name="phone"
                                    placeholder="Ej: 600123456"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    CORREO ELECTRÓNICO
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Ej: correo@ejemplo.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-100 my-2"></div>

                    {/* ===== SECCIÓN: ACUERDO PROFESIONAL ===== */}
                    <div>
                        <div className="flex items-center gap-2.5 mb-6">
                            <User className="text-blue-600 w-5 h-5" />
                            <h3 className="font-bold text-slate-800 text-[14px]">Acuerdo Profesional</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                            {/* Especialidad & Tipo */}
                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    ESPECIALIDAD <span className="text-blue-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="specialty"
                                    placeholder="Ej: Psicología Infantil"
                                    value={formData.specialty}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    TIPO DE COLABORACIÓN <span className="text-blue-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        name="collaborationType"
                                        value={formData.collaborationType}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm appearance-none pr-10"
                                        required
                                    >
                                        <option value="" disabled>Seleccionar...</option>
                                        <option value="Consultor">Consultor</option>
                                        <option value="Colaborador Externo">Colaborador Externo</option>
                                        <option value="Servicios Integrales">Servicios Integrales</option>
                                        <option value="Docente/Formador">Docente/Formador</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    TARIFA POR HORA (€)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="hourlyRate"
                                    placeholder="Ej: 50.00"
                                    value={formData.hourlyRate}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                    EMPRESA O CENTRO MÉDICO
                                </label>
                                <input
                                    type="text"
                                    name="company"
                                    placeholder="Dejar en blanco si es independiente..."
                                    value={formData.company}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <FileText className="text-slate-500 w-4 h-4" />
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        NOTAS / OBSERVACIONES
                                    </label>
                                </div>
                                <textarea
                                    name="notes"
                                    rows={4}
                                    placeholder="Condiciones del acuerdo, disponibilidad, particularidades contractuales…"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-slate-700 shadow-sm resize-y min-h-[100px]"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Buttons (Mismo estilo que "NUEVO EQUIPO") */}
                <div className="px-6 py-5 bg-white border-t border-slate-100 flex gap-4 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        CANCELAR
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="flex-1 py-3 bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Save size={16} />
                                {isEdit ? 'GUARDAR CAMBIOS' : 'CREAR PROFESIONAL'}
                            </>
                        )}
                    </button>
                </div>
            </div>
            {/* Animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-fadeIn { animation: fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}</style>
        </div>
    );
}
