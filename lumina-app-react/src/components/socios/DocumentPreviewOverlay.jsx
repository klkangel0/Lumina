import React from 'react';
import { X, ExternalLink, Download } from 'lucide-react';

export const API_FILE_ORIGIN = '';

export function absoluteDocumentUrl(path) {
    if (!path || typeof path !== 'string') return '';
    const p = path.trim();
    if (!p) return '';
    if (/^https?:\/\//i.test(p)) return p;
    return `${API_FILE_ORIGIN}${p.startsWith('/') ? p : `/${p}`}`;
}

export function documentPreviewKind(url) {
    const u = url.toLowerCase().split('?')[0];
    if (/\.(png|jpe?g|gif|webp|bmp)$/i.test(u)) return 'image';
    if (/\.pdf$/i.test(u)) return 'pdf';
    return 'other';
}

export function filenameFromDocumentPath(path) {
    if (!path || typeof path !== 'string') return 'documento';
    const parts = path.split('/').filter(Boolean);
    return parts[parts.length - 1] || 'documento';
}

/** Descarga un archivo servido en /uploads (misma origen que la app). */
export function downloadDocument(url, filename) {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'documento';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

export function DocumentPreviewOverlay({ preview, onClose }) {
    if (!preview?.url) return null;
    const kind = documentPreviewKind(preview.url);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
            role="presentation"
        >
            <div
                className="relative bg-slate-900 rounded-xl shadow-2xl max-w-[min(96vw,56rem)] w-full max-h-[90vh] flex flex-col border border-slate-600/50"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
                    <h4 className="text-sm font-bold text-white truncate pr-2">{preview.title}</h4>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() =>
                                downloadDocument(
                                    preview.url,
                                    filenameFromDocumentPath(preview.url) || preview.title
                                )
                            }
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200"
                        >
                            <Download size={14} /> Descargar
                        </button>
                        <a
                            href={preview.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 hover:text-sky-200"
                        >
                            <ExternalLink size={14} /> Abrir en pestaña
                        </a>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700"
                            aria-label="Cerrar vista previa"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto p-3 bg-slate-950/80">
                    {kind === 'image' && (
                        <div className="flex justify-center items-start min-h-[200px]">
                            <img src={preview.url} alt={preview.title} className="max-w-full max-h-[min(78vh,820px)] object-contain rounded-lg" />
                        </div>
                    )}
                    {kind === 'pdf' && (
                        <iframe title={preview.title} src={preview.url} className="w-full h-[min(78vh,820px)] rounded-lg bg-white border-0" />
                    )}
                    {kind === 'other' && (
                        <div className="text-center py-12 px-4">
                            <p className="text-sm text-slate-300 mb-4">
                                Vista previa no disponible para este tipo de archivo (por ejemplo Word). Puedes abrirlo en una pestaña nueva.
                            </p>
                            <a
                                href={preview.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#6E9EFF] text-white text-sm font-bold hover:opacity-95"
                            >
                                <ExternalLink size={16} /> Descargar / ver archivo
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
