import React from 'react';
import { X, User, MapPin, Mail, Phone, Briefcase, Building, CreditCard, Building2, GraduationCap, FileText } from 'lucide-react';

const ProfesionalProfileModal = ({ isOpen, onClose, professional }) => {
    if (!isOpen || !professional) return null;

    const fullName = `${professional.name} ${professional.lastName}`.trim();

    // Get initials
    const getInitials = (name, lastName) => {
        if (!name && !lastName) return '??';
        const fl = name ? name.charAt(0).toUpperCase() : '';
        const ll = lastName ? lastName.charAt(0).toUpperCase() : '';
        return fl + ll;
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
                        Perfil Profesional
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
                        <div className={`w-16 h-16 rounded-2xl ${getAvatarColor(professional.name)} flex items-center justify-center text-white font-bold text-2xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] border-2 border-white/40 hover:scale-110 transition-transform duration-300 cursor-default ring-4 ring-white/20`}>
                            {getInitials(professional.name, professional.lastName)}
                        </div>
                        <div>
                            <h3 className="text-white font-black text-2xl tracking-tight leading-tight uppercase">{fullName}</h3>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wide border border-white/20 shadow-sm">
                                    {professional.specialty}
                                </span>
                                {professional.dni && (
                                    <span className="text-white/80 text-sm font-medium tracking-wide">ID: {professional.dni}</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content - Two Columns Layout */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col lg:flex-row gap-6">
                    
                    {/* Left Column: Contact & Basic Info */}
                    <div className="flex-1 space-y-6">
                        
                        {/* Datos de Contacto */}
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5 text-slate-700">
                                <User size={18} className="text-blue-500" />
                                <h4 className="font-bold text-sm tracking-wide">Datos Principales</h4>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                        <Mail size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Correo Electrónico</p>
                                        <p className="text-sm font-medium text-slate-700">{professional.email || <span className="text-slate-400 italic font-normal">No especificado</span>}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                                        <Phone size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Teléfono Directo</p>
                                        <p className="text-sm font-medium text-slate-700 leading-snug">{professional.phone || <span className="text-slate-400 italic font-normal">No especificado</span>}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
                                        <GraduationCap size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Nº Colegiado</p>
                                        <p className="text-sm font-medium text-slate-700 leading-snug">{professional.collegiateNumber || <span className="text-slate-400 italic font-normal">No aplicable</span>}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Professional Details */}
                    <div className="flex-1 lg:max-w-md space-y-6">
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5 text-slate-700">
                                <Briefcase size={18} className="text-indigo-500" />
                                <h4 className="font-bold text-sm tracking-wide">Acuerdo Comercial</h4>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                                        <Briefcase size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Tipo de Colaboración</p>
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wide">
                                            {professional.collaborationType}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                                        <Building2 size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Empresa / Centro Médico</p>
                                        <p className="text-sm font-bold text-slate-700 uppercase">{professional.company || <span className="text-slate-400 italic font-normal normal-case">Profesional Independiente</span>}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                        <CreditCard size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Honorarios (€/h)</p>
                                        <p className="text-lg font-black text-slate-800">
                                            {professional.hourlyRate ? `${parseFloat(professional.hourlyRate).toFixed(2).replace('.', ',')} €` : <span className="text-slate-400 italic font-normal text-sm">No definidos</span>}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {professional.notes && (
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow w-full">
                                <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2.5 text-slate-700">
                                    <FileText size={18} className="text-amber-500" />
                                    <h4 className="font-bold text-sm tracking-wide">Notas y observaciones</h4>
                                </div>
                                <div className="p-5">
                                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{professional.notes}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-xl transition-colors shadow-sm"
                    >
                        Cerrar Ficha
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

export default ProfesionalProfileModal;
