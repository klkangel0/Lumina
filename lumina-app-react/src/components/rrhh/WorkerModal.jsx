import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Briefcase, User, MapPin, Mail, FileText, Upload, CheckSquare, Settings, ChevronDown } from 'lucide-react';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';

const API_URL = '/api';

const DEFAULT_DELEGATIONS = [
    'Martorell', 
    'Abrera', 
    'Olesa', 
    'Sant Andreu de la Barca', 
    'Assotea Central'
];

const JOB_POSITIONS = [
    'Psicólogo',
    'Logopeda',
    'Terapeuta ocupacional',
    'Asistente social',
    'Administrativa',
    'Otros'
];

const WorkerModal = ({ isOpen, onClose, fetchData, worker = null }) => {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    const [form, setForm] = useState({
        name: '',
        dni: '',
        email: '',
        address: '',
        jobPosition: 'Psicólogo',
        customJobType: '',
    });

    // Tag Selections logic
    const [selectedTags, setSelectedTags] = useState([]);
    const [hasOtherTag, setHasOtherTag] = useState(false);
    const [customTag, setCustomTag] = useState('');

    // File Upload logic
    const [files, setFiles] = useState({
        contractFile: null,
        lopdFile: null,
        dniFile: null,
        extraFile1: null,
        extraFile2: null,
        extraFile3: null
    });

    useEffect(() => {
        if (isOpen) {
            if (worker) {
                setForm({
                    name: worker.name || '',
                    dni: worker.dni || '',
                    email: worker.email || '',
                    address: worker.address || '',
                    jobPosition: worker.jobPosition || 'Psicólogo',
                    customJobType: worker.customJobType || '',
                });
                
                // Parse Tags
                if (worker.tags && worker.tags.length > 0) {
                    const presetTags = worker.tags.filter(t => DEFAULT_DELEGATIONS.includes(t));
                    const otherTags = worker.tags.filter(t => !DEFAULT_DELEGATIONS.includes(t));
                    
                    setSelectedTags(presetTags);
                    if (otherTags.length > 0) {
                        setHasOtherTag(true);
                        setCustomTag(otherTags[0]); // assume simple custom tag tracking
                    } else {
                        setHasOtherTag(false);
                        setCustomTag('');
                    }
                } else {
                    setSelectedTags([]);
                    setHasOtherTag(false);
                    setCustomTag('');
                }

                // Reset file selections when editing (backend keeps old ones if null)
                setFiles({ contractFile: null, lopdFile: null, dniFile: null, extraFile1: null, extraFile2: null, extraFile3: null });
                
            } else {
                setForm({
                    name: '', dni: '', email: '', address: '',
                    jobPosition: 'Psicólogo', customJobType: ''
                });
                setSelectedTags([]);
                setHasOtherTag(false);
                setCustomTag('');
                setFiles({ contractFile: null, lopdFile: null, dniFile: null, extraFile1: null, extraFile2: null, extraFile3: null });
            }
        }
    }, [isOpen, worker]);

    if (!isOpen) return null;

    const handleTagChange = (tag) => {
        setSelectedTags(prev => 
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const handleFileChange = (e, fieldName) => {
        if (e.target.files && e.target.files[0]) {
            setFiles(prev => ({ ...prev, [fieldName]: e.target.files[0] }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Build Final Tags Array
            let finalTags = [...selectedTags];
            if (hasOtherTag && customTag.trim() !== '') {
                finalTags.push(customTag.trim());
            }

            // Using FormData because of File Uploads
            const formData = new FormData();
            formData.append('name', form.name);
            formData.append('dni', form.dni);
            formData.append('email', form.email);
            formData.append('address', form.address);
            formData.append('jobPosition', form.jobPosition);
            if(form.jobPosition === 'Otros') formData.append('customJobType', form.customJobType);
            formData.append('tags', JSON.stringify(finalTags));

            // Append Files (if newly attached)
            if (files.contractFile) formData.append('contractFile', files.contractFile);
            if (files.lopdFile) formData.append('lopdFile', files.lopdFile);
            if (files.dniFile) formData.append('dniFile', files.dniFile);
            if (files.extraFile1) formData.append('extraFile1', files.extraFile1);
            if (files.extraFile2) formData.append('extraFile2', files.extraFile2);
            if (files.extraFile3) formData.append('extraFile3', files.extraFile3);

            if (!form.email?.trim() || !form.address?.trim()) {
                Swal.fire('Atención', 'El correo electrónico y la dirección particular son obligatorios.', 'warning');
                setLoading(false);
                return;
            }

            // Mandatory files check for NEW workers
            if (!worker) {
                if (!files.contractFile || !files.lopdFile || !files.dniFile) {
                    Swal.fire('Atención', 'Al crear trabajador, los 3 documentos (Contrato, DNI, LOPD) son obligatorios.', 'warning');
                    setLoading(false);
                    return;
                }
            } else {
                const hasDni = files.dniFile || worker.dniFile;
                const hasContract = files.contractFile || worker.contractFile;
                const hasLopd = files.lopdFile || worker.lopdFile;
                if (!hasDni || !hasContract || !hasLopd) {
                    Swal.fire('Atención', 'La ficha debe conservar o volver a adjuntar DNI, Contrato y LOPD.', 'warning');
                    setLoading(false);
                    return;
                }
            }

            if (worker) {
                await axios.put(`${API_URL}/workers/${worker.id}`, formData, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                Swal.fire({ icon: 'success', title: 'Actualizado', text: 'Ficha del empleado actualizada correctamente.' });
            } else {
                await axios.post(`${API_URL}/workers`, formData, {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                });
                Swal.fire({ icon: 'success', title: 'Creado', text: 'Empleado registrado en Recursos Humanos.' });
            }

            fetchData();
            onClose();
        } catch (error) {
            console.error('Error saving worker:', error);
            Swal.fire('Error', error.response?.data?.message || 'Hubo un error guardando el trabajador.', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

            <div 
                className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 pt-8 pb-6 flex items-start justify-between shrink-0 bg-gradient-to-br from-blue-50 to-white border-b border-blue-100/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[#6E9EFF] text-white flex items-center justify-center shadow-lg shadow-blue-200">
                            <Briefcase size={28} />
                        </div>
                        <div>
                            <span className="text-[11px] font-black uppercase tracking-widest text-blue-500 mb-1 block">
                                {worker ? 'Edición de Plantilla' : 'Alta de Nuevo Empleado'}
                            </span>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
                                {worker ? 'Ficha del Trabajador' : 'Formulario RRHH'}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 shadow-sm -mt-2 -mr-2">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 space-y-8">
                        
                        {/* 1. MAIN INFORMATION */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <User size={14} className="text-blue-500" /> Datos Personales
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nombre Completo *</label>
                                    <input 
                                        type="text" required
                                        value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">DNI / NIE *</label>
                                    <input 
                                        type="text" required
                                        value={form.dni} onChange={e => setForm({...form, dni: e.target.value})}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico *</label>
                                    <div className="relative">
                                        <input 
                                            type="email" required
                                            value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-medium"
                                        />
                                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dirección Particular *</label>
                                    <div className="relative">
                                        <input 
                                            type="text" required
                                            value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-medium"
                                        />
                                        <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. JOB POSITION & DELEGATIONS */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                <Settings size={14} className="text-indigo-500" /> Clasificación y Sedes
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                
                                {/* Cargo */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Cargo del Empleado *</label>
                                    <div className="relative mb-3">
                                        <select 
                                            value={form.jobPosition}
                                            onChange={e => setForm({...form, jobPosition: e.target.value})}
                                            className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all font-medium appearance-none cursor-pointer"
                                        >
                                            {JOB_POSITIONS.map(job => (
                                                <option key={job} value={job}>{job}</option>
                                            ))}
                                        </select>
                                        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                    {form.jobPosition === 'Otros' && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <input 
                                                type="text" required placeholder="Especificar otro cargo..."
                                                value={form.customJobType} onChange={e => setForm({...form, customJobType: e.target.value})}
                                                className="w-full px-4 py-3 bg-indigo-50/50 border border-indigo-200 rounded-xl text-sm text-indigo-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all font-medium"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Delegaciones Etiquetas */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Sedes / Etiquetas de Asignación</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DEFAULT_DELEGATIONS.map(tag => {
                                            const isSelected = selectedTags.includes(tag);
                                            return (
                                                <button
                                                    key={tag} type="button" onClick={() => handleTagChange(tag)}
                                                    className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all ${
                                                        isSelected 
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                                        : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {tag}
                                                </button>
                                            );
                                        })}
                                        
                                        {/* "Otros" manual checkbox/button */}
                                        <div className={`flex flex-col xl:flex-row items-start xl:items-center gap-2 p-1.5 rounded-xl border transition-all ${hasOtherTag ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-slate-200'}`}>
                                            <button
                                                type="button" onClick={() => setHasOtherTag(!hasOtherTag)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                                    hasOtherTag 
                                                    ? 'bg-[#6E9EFF] text-white shadow-sm' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                                }`}
                                            >
                                                Otro centro...
                                            </button>
                                            {hasOtherTag && (
                                                <input 
                                                    type="text" placeholder="Nombre del centro..." required
                                                    value={customTag} onChange={e => setCustomTag(e.target.value)}
                                                    className="w-full xl:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-blue-400 transition-all font-medium"
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* 3. DOCUMENTOS FILE UPLOADS */}
                        <div className="space-y-4 pt-6 border-t border-slate-100">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-4">
                                <span className="flex items-center gap-2"><CheckSquare size={14} className="text-emerald-500" /> Documentación Obligatoria</span>
                                {!worker && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-md font-bold uppercase">Formato PDF/IMG</span>}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* DNI */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 relative group overflow-hidden">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">1. DNI Escaneado *</label>
                                        {worker?.dniFile && !files.dniFile && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Subido</span>}
                                    </div>
                                    <label className="flex flex-col items-center justify-center p-4 h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-300 transition-all">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Upload size={18} />
                                            <span className="text-[11px] font-medium text-center px-2">
                                                {files.dniFile ? files.dniFile.name : 'Click para examinar...'}
                                            </span>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, 'dniFile')} />
                                    </label>
                                </div>

                                {/* Contrato */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 relative group overflow-hidden">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">2. Contrato *</label>
                                        {worker?.contractFile && !files.contractFile && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Subido</span>}
                                    </div>
                                    <label className="flex flex-col items-center justify-center p-4 h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-300 transition-all">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <FileText size={18} />
                                            <span className="text-[11px] font-medium text-center px-2">
                                                {files.contractFile ? files.contractFile.name : 'Click para examinar...'}
                                            </span>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, 'contractFile')} />
                                    </label>
                                </div>

                                {/* LOPD */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 relative group overflow-hidden">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">3. Prot. Datos (LOPD) *</label>
                                        {worker?.lopdFile && !files.lopdFile && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Subido</span>}
                                    </div>
                                    <label className="flex flex-col items-center justify-center p-4 h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-300 transition-all">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <FileText size={18} />
                                            <span className="text-[11px] font-medium text-center px-2">
                                                {files.lopdFile ? files.lopdFile.name : 'Click para examinar...'}
                                            </span>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, 'lopdFile')} />
                                    </label>
                                </div>
                            </div>

                            {/* Optional Documents */}
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center justify-between mb-4 mt-8 pt-6 border-t border-slate-100">
                                <span className="flex items-center gap-2"><FileText size={14} className="text-slate-400" /> Documentación Opcional</span>
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Extra 1 */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 relative group overflow-hidden">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Doc. Opcional 1</label>
                                        {worker?.extraFile1 && !files.extraFile1 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Subido</span>}
                                    </div>
                                    <label className="flex flex-col items-center justify-center p-4 h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-300 transition-all">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Upload size={18} />
                                            <span className="text-[11px] font-medium text-center px-2">
                                                {files.extraFile1 ? files.extraFile1.name : 'Añadir PDF/IMG'}
                                            </span>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, 'extraFile1')} />
                                    </label>
                                </div>
                                {/* Extra 2 */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 relative group overflow-hidden">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Doc. Opcional 2</label>
                                        {worker?.extraFile2 && !files.extraFile2 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Subido</span>}
                                    </div>
                                    <label className="flex flex-col items-center justify-center p-4 h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-300 transition-all">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Upload size={18} />
                                            <span className="text-[11px] font-medium text-center px-2">
                                                {files.extraFile2 ? files.extraFile2.name : 'Añadir PDF/IMG'}
                                            </span>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, 'extraFile2')} />
                                    </label>
                                </div>
                                {/* Extra 3 */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 relative group overflow-hidden">
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Doc. Opcional 3</label>
                                        {worker?.extraFile3 && !files.extraFile3 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded">Subido</span>}
                                    </div>
                                    <label className="flex flex-col items-center justify-center p-4 h-24 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-white hover:bg-slate-50 hover:border-blue-300 transition-all">
                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                            <Upload size={18} />
                                            <span className="text-[11px] font-medium text-center px-2">
                                                {files.extraFile3 ? files.extraFile3.name : 'Añadir PDF/IMG'}
                                            </span>
                                        </div>
                                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={(e) => handleFileChange(e, 'extraFile3')} />
                                    </label>
                                </div>
                            </div>
                            
                            {worker && <p className="text-xs text-slate-400 text-center italic mt-2">Al editar, subir un documento nuevo reemplazará el archivo guardado actualmente.</p>}
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
                            className="px-8 py-3 rounded-xl font-bold text-sm text-white bg-[#6E9EFF] hover:bg-blue-600 shadow-md shadow-blue-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                                    Procesando archivos...
                                </>
                            ) : (
                                worker ? 'Guardar Cambios' : 'Registrar Trabajador'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkerModal;

