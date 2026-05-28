import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../../store/authStore';
import Swal from 'sweetalert2';

export default function JustifySubvencionModal({ isOpen, onClose, fetchSubvenciones, subvencion }) {
    const { token } = useAuthStore();
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen || !subvencion) return null;

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async () => {
        if (!files.length) {
            Swal.fire('Atención', 'Selecciona uno o varios archivos para justificar.', 'warning');
            return;
        }

        try {
            setUploading(true);
            const formData = new FormData();
            files.forEach((f) => formData.append('documentos', f));

            await axios.post(`/api/subvenciones/${subvencion.id}/justify`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            Swal.fire({
                icon: 'success',
                title: 'Subvención justificada',
                text: 'Los archivos se han subido y la fecha de justificación se ha guardado automáticamente.',
                timer: 2000
            });
            
            fetchSubvenciones();
            onClose();
        } catch (error) {
            console.error('Upload error:', error);
            Swal.fire('Error', 'No se pudo subir la justificación.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleCancel = () => {
        setFiles([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <CheckCircle size={20} className="text-green-500" />
                        Justificar Subvención
                    </h2>
                    <button onClick={handleCancel} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4 tracking-tight">
                        Estás justificando <strong>{subvencion.name}</strong>. Sube el comprobante y el estado pasará a "Justificado" guardando la fecha actual automáticamente.
                    </p>

                    {/* Dropzone / Upload box */}
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`w-full border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${files.length ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                    >
                        <input 
                            type="file" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                            multiple
                            accept="application/pdf,image/jpeg,image/png,image/jpg"
                        />
                        
                        {files.length > 0 ? (
                            <>
                                <FileText size={40} className="text-green-500 mb-3" />
                                <h3 className="font-semibold text-green-700">{files.length} archivo(s) seleccionado(s)</h3>
                                <ul className="text-xs text-green-700 mt-2 space-y-1 max-h-20 overflow-y-auto w-full">
                                    {files.map((f, idx) => (
                                        <li key={`${f.name}-${idx}`} className="truncate">{f.name}</li>
                                    ))}
                                </ul>
                                <button onClick={(e) => { e.stopPropagation(); setFiles([]); }} className="mt-3 text-xs text-red-500 hover:underline">Quitar selección</button>
                            </>
                        ) : (
                            <>
                                <UploadCloud size={40} className="text-slate-400 mb-3" />
                                <h3 className="font-semibold text-slate-700">Haz clic para buscar un archivo</h3>
                                <p className="text-xs text-slate-500 mt-1">Soporta PDF, PNG, JPG</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button onClick={handleCancel} disabled={uploading} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-xl transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={handleSubmit} disabled={!files.length || uploading} className="px-5 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center gap-2">
                        {uploading ? (
                            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Subiendo...</>
                        ) : (
                            <><CheckCircle size={16} /> Justificar y Guardar</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
