import React from 'react';
import { 
    X, Monitor, MapPin, Calendar, FileText, 
    Hash, User, Home, Building2, Package,
    Clock, Tag, ClipboardList
} from 'lucide-react';

const STATUS_CONFIG = {
    DISPONIBLE: { label: 'Disponible', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    EN_USO: { label: 'En uso', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
    MANTENIMIENTO: { label: 'Mantenimiento', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
    BAJA: { label: 'Baja', color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
};

const InventarioDetailModal = ({ isOpen, onClose, item }) => {
    if (!isOpen || !item) return null;

    const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.DISPONIBLE;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                {/* Decorative Header */}
                <div className="h-2 bg-gradient-to-r from-blue-400 via-indigo-500 to-violet-500" />
                
                <div className="px-8 pt-8 pb-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-800 shadow-inner border border-slate-100">
                            <Monitor size={28} />
                        </div>
                        <div>
                            <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black mb-1 uppercase tracking-widest ${statusInfo.bg} ${statusInfo.color}`}>
                                {statusInfo.label}
                            </span>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">{item.name}</h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 -mt-2 -mr-2">
                        <X size={24} />
                    </button>
                </div>

                <div className="px-8 pb-8 space-y-6 overflow-y-auto">
                    {/* Main Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <Tag size={14} className="group-hover:text-blue-500 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Tipo de Equipo</span>
                            </div>
                            <p className="font-black text-slate-700 text-sm group-hover:text-slate-900 uppercase tracking-tight">{item.type}</p>
                        </div>
                        <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100 group hover:border-blue-200 transition-all">
                            <div className="flex items-center gap-2 mb-2 text-slate-400">
                                <Hash size={14} className="group-hover:text-blue-500 transition-colors" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Número de Serie</span>
                            </div>
                            <p className="font-black text-slate-700 text-sm group-hover:text-slate-900 tracking-wider font-mono">{item.serialNumber || 'No especificado'}</p>
                        </div>
                    </div>

                    {/* Assignment details */}
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors pointer-events-none">
                            {item.assignmentType === 'DOMICILIO' ? <Home size={120} /> : <Building2 size={120} />}
                        </div>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-6 opacity-60">
                                <MapPin size={16} />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Ubicación y Asignación</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0 shadow-lg">
                                        <Building2 size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-wider">Delegación Responsable</p>
                                        <p className="text-lg font-black">{item.delegation?.name || 'Assotea Central'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg ${item.assignmentType === 'DOMICILIO' ? 'bg-violet-500' : 'bg-blue-500'}`}>
                                        {item.assignmentType === 'DOMICILIO' ? <Home size={20} /> : <Package size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-wider">Tipo de Asignación</p>
                                        <p className="text-lg font-black">{item.assignmentType === 'DOMICILIO' ? 'En Domicilio de Socio' : 'En Sede'}</p>
                                        {item.locationDetail && <p className="text-sm text-white/60 font-medium mt-1 italic">"{item.locationDetail}"</p>}
                                    </div>
                                </div>

                                {item.socio && (
                                    <div className="flex items-start gap-4 pt-3 border-t border-white/10 animate-in fade-in duration-500">
                                        <div className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg font-black text-[10px]">
                                            {item.socio.name[0]}{item.socio.lastName[0]}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-wider">Socio Beneficiario</p>
                                            <p className="text-lg font-black">{item.socio.name} {item.socio.lastName}</p>
                                            <p className="text-[10px] font-bold text-white/60 tracking-widest">{item.socio.memberCode}</p>
                                            {item.socio.address && (
                                                <div className="mt-2 text-xs font-medium text-white/80 flex items-start gap-1">
                                                    <MapPin size={12} className="mt-0.5 shrink-0 text-white/50" />
                                                    <span className="leading-snug">{item.socio.address}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline/Notes */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1 p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Calendar size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Fecha Entrega</span>
                                </div>
                                <p className="font-black text-slate-700 text-sm italic">
                                    {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Sin fecha'}
                                </p>
                            </div>
                            <div className="flex-1 p-5 bg-slate-50/50 rounded-3xl border border-slate-100">
                                <div className="flex items-center gap-2 mb-2 text-slate-400">
                                    <Clock size={14} />
                                    <span className="text-[10px] font-black uppercase tracking-wider">Registrado</span>
                                </div>
                                <p className="font-bold text-slate-500 text-sm">
                                    {new Date(item.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                            <div className="flex items-center gap-2 mb-3 text-slate-400">
                                <ClipboardList size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Descripción y Notas</span>
                            </div>
                            <p className="text-sm text-slate-600 font-medium leading-relaxed bg-white/50 p-4 rounded-2xl border border-slate-100">
                                {item.description || 'No hay observaciones adicionales para este equipo.'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50/50">
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-white text-slate-500 font-black rounded-2xl border-2 border-slate-200 hover:bg-slate-50 active:scale-95 transition-all text-xs tracking-[0.2em] uppercase shadow-sm"
                    >
                        Cerrar Vista
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventarioDetailModal;
