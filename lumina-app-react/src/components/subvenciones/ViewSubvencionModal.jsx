import React from 'react';
import { X, FileText, Calendar, Building2, Activity, DownloadCloud, DollarSign } from 'lucide-react';

const ViewSubvencionModal = ({ isOpen, onClose, subvencion }) => {
    if (!isOpen || !subvencion) return null;

    const getStatusStyle = (status) => {
        switch (status) {
            case 'JUSTIFICADO':
            case 'EN_ORDEN':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'CONCEDIDO':
            case 'EN_FECHA':
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'SOLICITADO':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            default:
                return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'No especificada';
        return new Date(dateStr).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
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
                        <FileText size={20} className="text-blue-300" />
                        Detalles de la Subvención
                    </h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 hover:scale-110 hover:rotate-90 text-white transition-all duration-200"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Banner with Title */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-500 px-6 py-8">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl shadow-lg border border-white/30">
                            <FileText size={32} />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-white font-bold text-2xl">{subvencion.name}</h3>
                            <div className="flex items-center gap-3 mt-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusStyle(subvencion.status)} shadow-sm bg-white`}>
                                    {subvencion.status}
                                </span>
                                <span className="flex items-center gap-1.5 text-white/90 text-sm font-medium">
                                    <Building2 size={14} /> {subvencion.delegation?.name || 'Sin delegación'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                    {/* Información Principal */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 hover:border-blue-200">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Activity size={16} className="text-blue-500" />
                                Información General
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <DollarSign size={12} className="text-emerald-500" /> Importe Concedido
                                </p>
                                <p className="text-xl font-bold text-slate-800">
                                    {subvencion.amount ? `${parseFloat(subvencion.amount).toLocaleString('es-ES')} €` : 'No especificado'}
                                </p>
                            </div>
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <Calendar size={12} className="text-blue-400" /> Creada el
                                </p>
                                <p className="text-sm text-slate-700 font-medium">{formatDate(subvencion.createdAt)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 hover:border-blue-200">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm">Descripción</h4>
                        </div>
                        <div className="p-5 bg-white">
                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {subvencion.description || 'Sin descripción adicional.'}
                            </p>
                        </div>
                    </div>

                    {/* Fechas y Justificación */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-blue-100/50 hover:-translate-y-0.5 hover:border-blue-200">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                <Calendar size={16} className="text-indigo-500" />
                                Fechas y Certificación
                            </h4>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Día Límite Justificación</p>
                                <p className="text-sm text-slate-700 font-medium">{formatDate(subvencion.deadlineDate)}</p>
                            </div>
                            <div className="px-5 py-4 transition-colors duration-150 hover:bg-blue-50/40 cursor-default">
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Día Presentado / Justificado</p>
                                <p className={`text-sm font-bold ${subvencion.justifiedDate ? 'text-emerald-600' : 'text-slate-500'}`}>
                                    {subvencion.justifiedDate ? formatDate(subvencion.justifiedDate) : 'Pendiente de justificar'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Documentos */}
                    {(subvencion.attachments?.length > 0 || subvencion.docJustification) && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-center justify-between group hover:bg-emerald-100 transition-all cursor-pointer shadow-sm">
                            <div className="w-full">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="p-3 bg-white rounded-xl text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                                        <DownloadCloud size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Documentación adjunta</p>
                                        <p className="text-xs text-emerald-600">Puedes abrir cada archivo en una pestaña nueva.</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {(subvencion.attachments?.length ? subvencion.attachments : [{ filePath: subvencion.docJustification, fileName: 'Justificación' }]).map((att, idx) => (
                                        <a
                                            key={`${att.filePath}-${idx}`}
                                            href={`${att.filePath}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-emerald-100 text-sm text-emerald-700 hover:bg-emerald-50"
                                        >
                                            <span className="truncate pr-3">{att.fileName || `Documento ${idx + 1}`}</span>
                                            <span className="text-xs font-bold">Abrir</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-200 hover:bg-blue-500 hover:text-white text-slate-700 font-semibold text-sm rounded-lg transition-all duration-200 hover:shadow-md active:scale-95"
                    >
                        Cerrar Detalles
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

export default ViewSubvencionModal;
