import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    X, Monitor, Printer, Phone, Tablet, Boxes, 
    MapPin, Home, Building2, User, Search, Calendar, Save,
    Edit3, Plus, RotateCcw
} from 'lucide-react';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';

const API_URL = '/api';

const EQUIP_TYPES = {
    'ADMINISTRATIVO': [
        { label: 'Impresora', icon: Printer },
        { label: 'Teléfono', icon: Phone },
        { label: 'Ordenador', icon: Monitor },
        { label: 'Ventilador', icon: Boxes },
    ],
    'INTERVENCION': [
        { label: 'Tablet', icon: Tablet },
        { label: 'Colchoneta', icon: Boxes },
        { label: 'Manualidades', icon: Boxes },
        { label: 'Otros', icon: Boxes },
    ]
};

const STATUS_OPTIONS = [
    { value: 'DISPONIBLE', label: 'Disponible' },
    { value: 'EN_USO', label: 'En Uso' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento' },
    { value: 'BAJA', label: 'Baja' },
];

const InventarioModal = ({ isOpen, onClose, onSave, item, delegations }) => {
    const { token } = useAuthStore();
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        group: 'ADMINISTRATIVO',
        serialNumber: '',
        delegationId: '',
        assignmentType: 'SEDE',
        socioId: null,
        locationDetail: '',
        status: 'DISPONIBLE',
        deliveryDate: '',
        description: ''
    });

    const [socioQuery, setSocioQuery] = useState('');
    const [socioResults, setSocioResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedSocio, setSelectedSocio] = useState(null);

    useEffect(() => {
        if (item) {
            setFormData({
                ...item,
                delegationId: item.delegationId || '',
                socioId: item.socioId || null,
                deliveryDate: item.deliveryDate ? new Date(item.deliveryDate).toISOString().split('T')[0] : '',
            });
            setSelectedSocio(item.socio || null);
            setSocioQuery(item.socio ? `${item.socio.name} ${item.socio.lastName}` : '');
        } else {
            setFormData({
                name: '',
                type: '',
                group: 'ADMINISTRATIVO',
                serialNumber: '',
                delegationId: '',
                assignmentType: 'SEDE',
                socioId: null,
                locationDetail: '',
                status: 'DISPONIBLE',
                deliveryDate: '',
                description: ''
            });
            setSelectedSocio(null);
            setSocioQuery('');
        }
    }, [item, isOpen]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (socioQuery && socioQuery.length > 2 && !selectedSocio) {
                searchSocios();
            } else {
                setSocioResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [socioQuery, selectedSocio]);

    const searchSocios = async () => {
        try {
            setIsSearching(true);
            const res = await axios.get(`${API_URL}/socios`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const allActiveSocios = res.data.filter(s => s.status === 'ACTIVE');
            const q = socioQuery.toLowerCase();
            const filtered = allActiveSocios.filter(s => 
                s.name.toLowerCase().includes(q) || 
                s.lastName.toLowerCase().includes(q) || 
                (s.dni && s.dni.toLowerCase().includes(q)) ||
                (s.memberCode && s.memberCode.toLowerCase().includes(q))
            );
            setSocioResults(filtered);
        } catch (error) {
            console.error('Error searching socios:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSocioSelect = (socio) => {
        setSelectedSocio(socio);
        setSocioQuery(`${socio.name} ${socio.lastName}`);
        setFormData(prev => ({ 
            ...prev, 
            socioId: socio.id,
            locationDetail: socio.address || ''
        }));
        setSocioResults([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (item) {
                await axios.put(`${API_URL}/inventario/${item.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_URL}/inventario`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            Swal.fire('Guardado', 'El artículo se ha guardado correctamente', 'success');
            onSave();
        } catch (error) {
            console.error('Error saving item:', error);
            Swal.fire('Error', 'No se pudo guardar el artículo', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                            {item ? <Edit3 size={20} /> : <Plus size={24} />}
                        </div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {item ? 'Editar Equipo' : 'NUEVO EQUIPO'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="overflow-y-auto p-8 space-y-8 flex-1">
                    {/* Sección: Datos Básicos */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-blue-600 mb-2">
                            <Monitor size={18} strokeWidth={2.5} />
                            <h3 className="text-sm font-bold text-slate-700">Información Principal</h3>
                        </div>
                        
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Nombre del Equipo *</label>
                            <input 
                                required
                                type="text"
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                placeholder="Ej: Portátil HP ProBook..."
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Tipo de Equipo *</label>
                                <select 
                                    required
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    value={formData.type}
                                    onChange={(e) => {
                                        const type = e.target.value;
                                        let group = 'ADMINISTRATIVO';
                                        if (EQUIP_TYPES['INTERVENCION'].some(t => t.label === type)) {
                                            group = 'INTERVENCION';
                                        }
                                        setFormData({...formData, type, group});
                                    }}
                                >
                                    <option value="">Seleccionar...</option>
                                    <optgroup label="Equipos de uso administrativo">
                                        {EQUIP_TYPES['ADMINISTRATIVO'].map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                    </optgroup>
                                    <optgroup label="Equipamiento de intervención">
                                        {EQUIP_TYPES['INTERVENCION'].map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Número de Serie</label>
                                <input 
                                    type="text"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    placeholder="S/N..."
                                    value={formData.serialNumber}
                                    onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
                                />
                            </div>
                        </div>
                    </div>

                    <hr className="border-slate-100" />

                    {/* Sección: Ubicación y Asignación */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-indigo-600 mb-2">
                            <MapPin size={18} strokeWidth={2.5} />
                            <h3 className="text-sm font-bold text-slate-700">Ubicación y Asignación</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Delegación Responsable *</label>
                                <select 
                                    required
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    value={formData.delegationId}
                                    onChange={(e) => setFormData({...formData, delegationId: e.target.value})}
                                >
                                    <option value="">Seleccionar delegación...</option>
                                    {delegations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Tipo de Asignación *</label>
                                <div className="flex gap-2 p-1.5 bg-slate-50 rounded-2xl h-[54px]">
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, assignmentType: 'SEDE', socioId: null})}
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${formData.assignmentType === 'SEDE' ? 'bg-white text-blue-600 shadow-sm border-2 border-blue-500/10' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <Building2 size={16} /> En Sede
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({...formData, assignmentType: 'DOMICILIO'})}
                                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all ${formData.assignmentType === 'DOMICILIO' ? 'bg-white text-violet-600 shadow-sm border-2 border-violet-500/10' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >
                                        <Home size={16} /> Domicilio Socio
                                    </button>
                                </div>
                            </div>
                        </div>

                        {formData.assignmentType === 'DOMICILIO' && (
                            <div className="space-y-1.5 relative border-2 border-violet-100 p-6 rounded-3xl bg-violet-50/20 animate-in slide-in-from-top-4 duration-300">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600">
                                        <User size={16} />
                                    </div>
                                    <label className="text-[11px] font-black text-violet-600 uppercase tracking-wider">Buscar Socio (Nombre o DNI) *</label>
                                </div>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        className="w-full px-4 py-3.5 bg-white border-2 border-transparent focus:border-violet-500/20 rounded-2xl text-slate-700 font-bold transition-all outline-none"
                                        placeholder="Escribe para buscar..."
                                        value={socioQuery}
                                        onChange={(e) => {
                                            setSocioQuery(e.target.value);
                                            if (selectedSocio) {
                                                setSelectedSocio(null);
                                                setFormData({...formData, socioId: null});
                                            }
                                        }}
                                    />
                                    {isSearching && <div className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-violet-400"><RotateCcw size={16} /></div>}
                                </div>
                                {socioResults.length > 0 && (
                                    <div className="mt-3 bg-white rounded-2xl shadow-sm border border-violet-100 overflow-hidden max-h-[148px] overflow-y-auto animate-in slide-in-from-top-2">
                                        {socioResults.map(s => (
                                            <div 
                                                key={s.id} 
                                                onClick={() => handleSocioSelect(s)}
                                                className="p-4 hover:bg-violet-50 cursor-pointer flex items-center gap-3 transition-colors border-b last:border-0"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black text-xs">
                                                    {s.name[0]}{s.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">{s.name} {s.lastName}</p>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">{s.dni || s.memberCode}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.assignmentType === 'SEDE' && (
                            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Detalle de Ubicación (Planta, Sala, etc.)</label>
                                <input 
                                    type="text"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    placeholder="Ej: Planta 2, Despacho Dirección"
                                    value={formData.locationDetail}
                                    onChange={(e) => setFormData({...formData, locationDetail: e.target.value})}
                                />
                            </div>
                        )}
                    </div>

                    <hr className="border-slate-100" />

                    {/* Sección: Estado y Observaciones */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-emerald-600 mb-2">
                            <Calendar size={18} strokeWidth={2.5} />
                            <h3 className="text-sm font-bold text-slate-700">Seguimiento y Estado</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Estado *</label>
                                <select 
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    value={formData.status}
                                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                                >
                                    {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Fecha de Entrega</label>
                                <input 
                                    type="date"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                                    value={formData.deliveryDate}
                                    onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Descripción / Observaciones</label>
                            <textarea 
                                rows="3"
                                className="w-full px-4 py-3.5 bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl text-slate-700 font-medium transition-all outline-none resize-none"
                                placeholder="Información adicional sobre el equipo..."
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            ></textarea>
                        </div>
                    </div>
                </form>

                {/* Footer Buttons */}
                <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 px-8 py-4 bg-white text-slate-600 font-black rounded-2xl border-2 border-slate-200 hover:bg-slate-50 transition-all uppercase text-xs tracking-widest"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="flex-1 bg-gradient-to-r from-[#6E9EFF] to-[#5b8df5] text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        <span>Guardar Equipo</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InventarioModal;
