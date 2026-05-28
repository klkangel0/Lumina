import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, User, Heart, Eye, X } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { SOCIO_DOCS, PATIENT_DOCS } from '../data/documentSlots';

const API_BASE = '';

// ─── Main Component ──────────────────────────────────────────────
const MisDocumentos = () => {
    const { token } = useAuthStore();
    const [activeTab, setActiveTab] = useState('socio');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [uploadingField, setUploadingField] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axios.get(`${API_BASE}/api/documents/my-data`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching documents:", err);
            setError('No se pudieron cargar tus documentos. Inténtalo de nuevo.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Auto-hide success message
    useEffect(() => {
        if (successMsg) {
            const timer = setTimeout(() => setSuccessMsg(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [successMsg]);

    const handleUpload = async (event, entityType, entityId, field) => {
        const file = event.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert("⚠️ El archivo es demasiado grande. El límite es 10 MB.");
            return;
        }

        const formData = new FormData();
        formData.append('document', file);
        setUploadingField(`${entityType}-${entityId}-${field}`);

        try {
            const url = entityType === 'socio'
                ? `${API_BASE}/api/documents/socio/${field}`
                : `${API_BASE}/api/documents/patient/${entityId}/${field}`;

            await axios.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${token}` }
            });

            setSuccessMsg(`✅ "${file.name}" subido correctamente.`);
            await fetchData();
            event.target.value = null;
        } catch (err) {
            console.error("Upload error:", err);
            alert("❌ Error al subir el documento. Por favor, inténtelo de nuevo.");
        } finally {
            setUploadingField(null);
        }
    };

    // ─── Loading State ───────────────────────────────────────────
    if (loading && !data) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6E9EFF' }} />
                    <p style={{ marginTop: '16px', color: '#64748b', fontSize: '16px' }}>Cargando tus documentos...</p>
                </div>
            </div>
        );
    }

    // ─── Error State ─────────────────────────────────────────────
    if (error && !data) {
        return (
            <div style={{ padding: '32px', maxWidth: '600px', margin: '40px auto' }}>
                <div style={{
                    background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px',
                    padding: '24px', display: 'flex', alignItems: 'center', gap: '16px'
                }}>
                    <AlertCircle size={28} color="#ef4444" />
                    <div>
                        <p style={{ color: '#b91c1c', fontWeight: 600, fontSize: '16px' }}>{error}</p>
                        <button onClick={fetchData} style={{
                            marginTop: '12px', background: '#ef4444', color: 'white', border: 'none',
                            padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px'
                        }}>Reintentar</button>
                    </div>
                </div>
            </div>
        );
    }

    const socio = data?.socio;
    const patients = socio?.patients || [];
    const totalSocioDocs = SOCIO_DOCS.filter(d => socio?.[d.id]).length;
    const totalPatientDocs = patients.reduce((sum, p) => sum + PATIENT_DOCS.filter(d => p[d.id]).length, 0);

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            {/* ─── Success toast ─── */}
            {successMsg && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
                    background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '12px',
                    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.08)', animation: 'fadeIn 0.3s ease'
                }}>
                    <CheckCircle size={20} color="#059669" />
                    <span style={{ color: '#065f46', fontWeight: 600, fontSize: '14px' }}>{successMsg}</span>
                    <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <X size={16} color="#6b7280" />
                    </button>
                </div>
            )}

            {/* ─── Header ─── */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
                    <FileText size={28} color="#6E9EFF" />
                    Mis Documentos
                </h1>
                <p style={{ color: '#64748b', marginTop: '8px', fontSize: '15px', lineHeight: '1.5' }}>
                    Sube aquí toda la documentación necesaria para completar tu expediente.
                    Puedes subir archivos PDF, imágenes (JPG, PNG) o documentos Word.
                </p>

                {/* Pending banner */}
                {socio?.status === 'PENDING' && (
                    <div style={{
                        marginTop: '16px', background: 'linear-gradient(135deg, #fef3c7, #fffbeb)',
                        border: '1px solid #fde68a', borderRadius: '14px', padding: '16px 20px',
                        display: 'flex', alignItems: 'flex-start', gap: '12px'
                    }}>
                        <AlertCircle size={22} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
                        <div>
                            <p style={{ fontWeight: 700, color: '#92400e', margin: 0, fontSize: '15px' }}>
                                Tu cuenta está pendiente de validación
                            </p>
                            <p style={{ color: '#a16207', margin: '4px 0 0', fontSize: '14px' }}>
                                Subir los documentos ayudará a agilizar la aprobación de tu solicitud.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ─── Tab Navigation ─── */}
            <div style={{
                display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '14px',
                padding: '4px', marginBottom: '24px', flexWrap: 'wrap'
            }}>
                <TabButton
                    active={activeTab === 'socio'}
                    onClick={() => setActiveTab('socio')}
                    icon={<User size={18} />}
                    label="Mis documentos"
                    badge={`${totalSocioDocs}/${SOCIO_DOCS.length}`}
                />
                <TabButton
                    active={activeTab === 'pacientes'}
                    onClick={() => setActiveTab('pacientes')}
                    icon={<Heart size={18} />}
                    label="Docs. de mis hijos/as"
                    badge={
                        patients.length === 0
                            ? 'Sin paciente'
                            : `${totalPatientDocs}/${patients.length * PATIENT_DOCS.length}`
                    }
                />
            </div>

            {/* ─── Content ─── */}
            <div style={{
                background: 'white', borderRadius: '20px', padding: '28px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0'
            }}>
                {activeTab === 'socio' && socio && (
                    <div>
                        <SectionTitle title="Documentos del Tutor/a" subtitle={`${socio.name} ${socio.lastName}`} />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: '16px' }}>
                            {SOCIO_DOCS.map(doc => (
                                <DocCard
                                    key={doc.id}
                                    doc={doc}
                                    fileUrl={socio[doc.id]}
                                    isUploading={uploadingField === `socio-${socio.id}-${doc.id}`}
                                    onUpload={(e) => handleUpload(e, 'socio', socio.id, doc.id)}
                                    inputId={`socio-${socio.id}-${doc.id}`}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'pacientes' && (
                    <div>
                        {patients.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <Heart size={48} color="#cbd5e1" />
                                <p style={{ color: '#94a3b8', fontSize: '16px', marginTop: '16px' }}>
                                    No tienes hijos/pacientes registrados todavía.
                                </p>
                            </div>
                        ) : (
                            patients.map(patient => (
                                <div key={patient.id} style={{ marginBottom: '32px' }}>
                                    <SectionTitle
                                        title={`${patient.name} ${patient.lastName}`}
                                        subtitle="Documentos del paciente"
                                        avatar={`${patient.name.charAt(0)}${patient.lastName.charAt(0)}`}
                                    />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 380px), 1fr))', gap: '16px' }}>
                                        {PATIENT_DOCS.map(doc => (
                                            <DocCard
                                                key={`${patient.id}-${doc.id}`}
                                                doc={doc}
                                                fileUrl={patient[doc.id]}
                                                isUploading={uploadingField === `patient-${patient.id}-${doc.id}`}
                                                onUpload={(e) => handleUpload(e, 'patient', patient.id, doc.id)}
                                                inputId={`patient-${patient.id}-${doc.id}`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Inline animations */}
            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

// ─── Tab Button ──────────────────────────────────────────────────
const TabButton = ({ active, onClick, icon, label, badge }) => (
    <button
        onClick={onClick}
        style={{
            flex: '1 1 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px 20px', borderRadius: '12px', border: 'none',
            fontWeight: 700, fontSize: '14px', cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: active ? 'white' : 'transparent',
            color: active ? '#3b82f6' : '#64748b',
            boxShadow: active ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            minWidth: '140px',
        }}
    >
        {icon}
        <span>{label}</span>
        <span style={{
            background: active ? '#eff6ff' : '#e2e8f0',
            color: active ? '#3b82f6' : '#64748b',
            padding: '2px 8px', borderRadius: '20px', fontSize: '12px', fontWeight: 800
        }}>
            {badge}
        </span>
    </button>
);

// ─── Section Title ───────────────────────────────────────────────
const SectionTitle = ({ title, subtitle, avatar }) => (
    <div style={{
        display: 'flex', alignItems: 'center', gap: '14px',
        marginBottom: '20px', paddingBottom: '14px', borderBottom: '2px solid #f1f5f9'
    }}>
        {avatar && (
            <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6E9EFF, #818cf8)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '15px', flexShrink: 0
            }}>
                {avatar}
            </div>
        )}
        <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{title}</h2>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#94a3b8' }}>{subtitle}</p>
        </div>
    </div>
);

// ─── Document Card ───────────────────────────────────────────────
const DocCard = ({ doc, fileUrl, isUploading, onUpload, inputId }) => {
    const hasFile = !!fileUrl;

    return (
        <div style={{
            borderRadius: '16px', padding: '20px',
            border: hasFile ? '2px solid #a7f3d0' : '2px dashed #cbd5e1',
            background: hasFile ? 'linear-gradient(135deg, #ecfdf5, #f0fdf4)' : '#fafbfc',
            transition: 'all 0.2s ease',
            display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
            {/* Top row: icon + label */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                <span style={{ fontSize: '28px', lineHeight: 1 }}>{doc.icon}</span>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                        {doc.label}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                        {doc.description}
                    </p>
                </div>
                {hasFile && (
                    <div style={{
                        background: '#d1fae5', borderRadius: '50%', padding: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}>
                        <CheckCircle size={18} color="#059669" />
                    </div>
                )}
            </div>

            {/* Status + actions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                {hasFile && (
                    <a
                        href={`${API_BASE}${fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            fontSize: '13px', color: '#3b82f6', fontWeight: 600,
                            textDecoration: 'none', padding: '6px 14px',
                            background: '#eff6ff', borderRadius: '8px',
                        }}
                    >
                        <Eye size={14} /> Ver documento
                    </a>
                )}

                <input
                    type="file"
                    id={inputId}
                    style={{ display: 'none' }}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={onUpload}
                    disabled={isUploading}
                    aria-label={`Subir ${doc.label}`}
                />
                <label
                    htmlFor={inputId}
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById(inputId)?.click(); }}
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', fontWeight: 700, cursor: isUploading ? 'not-allowed' : 'pointer',
                        padding: '8px 16px', borderRadius: '10px',
                        transition: 'all 0.2s ease',
                        background: isUploading ? '#f1f5f9' : hasFile ? 'white' : 'linear-gradient(135deg, #6E9EFF, #818cf8)',
                        color: isUploading ? '#94a3b8' : hasFile ? '#475569' : 'white',
                        border: hasFile ? '1px solid #e2e8f0' : 'none',
                        boxShadow: isUploading ? 'none' : '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                >
                    {isUploading ? (
                        <>
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                            Subiendo...
                        </>
                    ) : (
                        <>
                            <Upload size={14} />
                            {hasFile ? 'Cambiar archivo' : 'Subir archivo'}
                        </>
                    )}
                </label>
            </div>
        </div>
    );
};

export default MisDocumentos;
