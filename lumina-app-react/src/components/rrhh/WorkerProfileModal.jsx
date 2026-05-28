import React, { useState } from 'react';
import { X, User, MapPin, Mail, Phone, Briefcase, FileText, Download, Building, ExternalLink, Eye } from 'lucide-react';

const WorkerProfileModal = ({ isOpen, onClose, worker }) => {
    const [previewDoc, setPreviewDoc] = useState(null);

    if (!isOpen || !worker) return null;

    // Get initials
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const avatarColors = [
        'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
        'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-orange-500',
    ];
    
    const getAvatarColor = (name) => {
        if (!name) return avatarColors[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };

    const handleDownload = (filePath) => {
        if (!filePath) return;
        window.open(filePath, '_blank');
    };

    const handlePreview = (filePath, label) => {
        if (!filePath) return;
        setPreviewDoc({
            url: filePath,
            label: label
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl mx-2 sm:mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[90vh]">
                
                {/* Header - Dark */}
                <div className="bg-slate-800 px-6 py-4 flex items-center justify-between shrink-0">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2.5">
                        <Briefcase size={20} className="text-blue-300" />
                        Perfil del Trabajador
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 hover:scale-110 hover:rotate-90 text-white transition-all duration-200 shadow-lg"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Banner with avatar */}
                <div className="bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-6 py-6 shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
                    <div className="flex items-center gap-5 relative z-10">
                        <div className={`w-16 h-16 rounded-2xl ${getAvatarColor(worker.name)} flex items-center justify-center text-white font-bold text-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border-2 border-white/40 hover:scale-110 transition-transform duration-300 cursor-default ring-4 ring-white/20`}>
                            {getInitials(worker.name)}
                        </div>
                        <div>
                            <h3 className="text-white font-black text-2xl tracking-tight leading-tight">{worker.name}</h3>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wide border border-white/20 shadow-sm">
                                    {worker.jobPosition === 'Otros' && worker.customJobType ? worker.customJobType : worker.jobPosition}
                                </span>
                                <span className="text-white/80 text-sm font-medium tracking-wide">DNI: {worker.dni}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content - Two Columns Layout */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col lg:flex-row gap-6">
                    
                    {/* Left Column: Details */}
                    <div className="flex-1 space-y-6">
                        
                        {/* Datos de Contacto */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5 text-slate-700">
                                <User size={18} className="text-blue-500" />
                                <h4 className="font-bold text-sm tracking-wide">Datos de Contacto</h4>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                        <Mail size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Correo Electrónico</p>
                                        <p className="text-sm font-medium text-slate-700">{worker.email || <span className="text-slate-400 italic font-normal">No especificado</span>}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                        <MapPin size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Dirección Particular</p>
                                        <p className="text-sm font-medium text-slate-700 leading-snug">{worker.address || <span className="text-slate-400 italic font-normal">No especificada</span>}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Centros Asignados */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5 text-slate-700">
                                <Building size={18} className="text-blue-500" />
                                <h4 className="font-bold text-sm tracking-wide">Centros Asignados</h4>
                            </div>
                            <div className="p-5">
                                <div className="flex flex-wrap gap-2">
                                    {worker.tags && worker.tags.length > 0 ? (
                                        worker.tags.map((tag, idx) => (
                                            <span key={idx} className="bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg border border-blue-100/50 shadow-sm">
                                                {tag}
                                            </span>
                                        ))
                                    ) : (
                                        <span className="text-sm text-slate-400 italic">No hay centros asignados a este trabajador.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Documentation */}
                    <div className="flex-1 lg:max-w-md">
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5 text-slate-700">
                                <FileText size={18} className="text-emerald-500" />
                                <h4 className="font-bold text-sm tracking-wide flex-1">Documentación del Trabajador</h4>
                            </div>
                            
                            <div className="p-5 space-y-4 overflow-y-auto">
                                <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Obligatorios</div>
                                
                                {/* Contrato */}
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${worker.contractFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-bold text-slate-700 truncate">Contrato Laboral</span>
                                        <span className={`text-[11px] font-medium ${worker.contractFile ? 'text-emerald-600' : 'text-slate-400'}`}>{worker.contractFile ? 'Subido correctamente' : 'No subido'}</span>
                                    </div>
                                    {worker.contractFile && (
                                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handlePreview(worker.contractFile, 'Contrato Laboral')} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><Eye size={12} /> Previa</button>
                                            <button onClick={() => handleDownload(worker.contractFile)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1"><Download size={12} /> Bajar</button>
                                        </div>
                                    )}
                                </div>

                                {/* DNI */}
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${worker.dniFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-bold text-slate-700 truncate">DNI / NIE</span>
                                        <span className={`text-[11px] font-medium ${worker.dniFile ? 'text-emerald-600' : 'text-slate-400'}`}>{worker.dniFile ? 'Subido correctamente' : 'No subido'}</span>
                                    </div>
                                    {worker.dniFile && (
                                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handlePreview(worker.dniFile, 'DNI / NIE')} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><Eye size={12} /> Previa</button>
                                            <button onClick={() => handleDownload(worker.dniFile)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1"><Download size={12} /> Bajar</button>
                                        </div>
                                    )}
                                </div>

                                {/* LOPD */}
                                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${worker.lopdFile ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <FileText size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-sm font-bold text-slate-700 truncate">Protección de Datos</span>
                                        <span className={`text-[11px] font-medium ${worker.lopdFile ? 'text-emerald-600' : 'text-slate-400'}`}>{worker.lopdFile ? 'Subido correctamente' : 'No subido'}</span>
                                    </div>
                                    {worker.lopdFile && (
                                        <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handlePreview(worker.lopdFile, 'Protección de Datos')} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><Eye size={12} /> Previa</button>
                                            <button onClick={() => handleDownload(worker.lopdFile)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1"><Download size={12} /> Bajar</button>
                                        </div>
                                    )}
                                </div>

                                {/* Opcionales */}
                                {(worker.extraFile1 || worker.extraFile2 || worker.extraFile3) && (
                                    <>
                                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 mt-6 mb-1">Opcionales</div>
                                        {worker.extraFile1 && (
                                            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="block text-sm font-bold text-slate-700 truncate">Documento Opcional 1</span>
                                                    <span className="text-[11px] font-medium text-blue-600">Subido correctamente</span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handlePreview(worker.extraFile1, 'Opcional 1')} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><Eye size={12} /> Previa</button>
                                                    <button onClick={() => handleDownload(worker.extraFile1)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1"><Download size={12} /> Bajar</button>
                                                </div>
                                            </div>
                                        )}
                                        {worker.extraFile2 && (
                                            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="block text-sm font-bold text-slate-700 truncate">Documento Opcional 2</span>
                                                    <span className="text-[11px] font-medium text-blue-600">Subido correctamente</span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handlePreview(worker.extraFile2, 'Opcional 2')} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><Eye size={12} /> Previa</button>
                                                    <button onClick={() => handleDownload(worker.extraFile2)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1"><Download size={12} /> Bajar</button>
                                                </div>
                                            </div>
                                        )}
                                        {worker.extraFile3 && (
                                            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                                                    <FileText size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="block text-sm font-bold text-slate-700 truncate">Documento Opcional 3</span>
                                                    <span className="text-[11px] font-medium text-blue-600">Subido correctamente</span>
                                                </div>
                                                <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handlePreview(worker.extraFile3, 'Opcional 3')} className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1"><Eye size={12} /> Previa</button>
                                                    <button onClick={() => handleDownload(worker.extraFile3)} className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 hover:bg-slate-200 transition-colors flex items-center gap-1"><Download size={12} /> Bajar</button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl transition-colors shadow-sm"
                    >
                        Cerrar Perfil
                    </button>
                </div>
            </div>

            {/* Document Preview Overlay */}
            {previewDoc && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/95 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200">
                    <div className="bg-slate-800 rounded-2xl w-full h-full max-w-5xl shadow-2xl overflow-hidden flex flex-col border border-slate-700/50">
                        {/* Preview Header */}
                        <div className="px-5 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80 backdrop-blur-sm shadow-sm shrink-0">
                            <div className="flex items-center gap-3">
                                <FileText size={20} className="text-blue-400" />
                                <div>
                                    <h3 className="text-white font-bold tracking-wide">{previewDoc.label}</h3>
                                    <p className="text-xs text-slate-400">Previsualizando documento</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => window.open(previewDoc.url, '_blank')}
                                    className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-semibold text-xs transition-colors flex items-center gap-1.5"
                                >
                                    <ExternalLink size={14} /> Abrir en nueva pestaña
                                </button>
                                <div className="w-px h-6 bg-slate-700 mx-1"></div>
                                <button 
                                    onClick={() => setPreviewDoc(null)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-red-500 text-slate-300 hover:text-white transition-all shadow-sm"
                                    title="Cerrar previsualización"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>
                        {/* Preview Content */}
                        <div className="flex-1 bg-slate-900 overflow-hidden rounded-b-2xl relative">
                            {/* We use an iframe. It works natively for PDFs in most modern browsers. */}
                            <iframe 
                                src={previewDoc.url}
                                className="w-full h-full border-none absolute inset-0 bg-white"
                                title="Previsualización de Documento"
                            />
                        </div>
                    </div>
                </div>
            )}

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

export default WorkerProfileModal;
