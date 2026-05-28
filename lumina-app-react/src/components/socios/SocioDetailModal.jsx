import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Phone, MessageSquare, Heart, Download, FileStack, Eye, ListChecks, ReceiptText, BadgeCheck, BadgeX, CalendarClock } from 'lucide-react';
import axios from 'axios';
import Swal from 'sweetalert2';
import useAuthStore from '../../store/authStore';
import { downloadSociosCsv } from '../../utils/sociosCsv';
import { SOCIO_DOCS } from '../../data/documentSlots';
import {
    INFANT_QUESTIONS,
    ADOLESCENT_QUESTIONS,
    PART3_SERVICES,
    AFTERNOON_OPTIONS,
} from '../../data/formularioAltaData';
import {
    DocumentPreviewOverlay,
    absoluteDocumentUrl,
    downloadDocument,
    filenameFromDocumentPath,
} from './DocumentPreviewOverlay';

const TEA_LEVEL_LABEL = {
    nivel1: 'Nivel 1',
    nivel2: 'Nivel 2',
    nivel3: 'Nivel 3',
    no_se: 'No lo sé',
};

const SocioDetailModal = ({ isOpen, onClose, socio }) => {
    const [docPreview, setDocPreview] = useState(null);
    const [fullFormOpen, setFullFormOpen] = useState(false);
    const [sepaEnabled, setSepaEnabled] = useState(false);
    const [genOpen, setGenOpen] = useState(false);
    const [receiptTemplates, setReceiptTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [planTemplates, setPlanTemplates] = useState([]);
    const [planLoading, setPlanLoading] = useState(false);
    const [planSaving, setPlanSaving] = useState(false);
    const [planEdit, setPlanEdit] = useState({
        templateId: '',
        nextChargeAt: '',
    });
    const [genForm, setGenForm] = useState({
        preset: 'custom',
        amount: '',
        concept: 'Cuota socio',
        requestedCollectionDate: '',
    });

    const { token, user } = useAuthStore();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);
    const canGenerateSepaReceipt =
        user?.role === 'ADMIN' || ['admin', 'junta', 'junta_plus'].includes(user?.appRoleName || '');

    const receiptPresets = useMemo(() => {
        const list = (receiptTemplates || []).map((t) => ({
            id: `tpl:${t.id}`,
            label: t.name,
            amount: ((Number(t.amountCents || 0) / 100).toFixed(2)).replace('.', ','),
            concept: t.concept || '',
            frequency: t.frequency || 'ONE_OFF',
        }));
        // Siempre dejar "Personalizado" al final
        return [
            ...list.sort((a, b) => {
                // MONTHLY primero
                if (a.frequency !== b.frequency) return a.frequency === 'MONTHLY' ? -1 : 1;
                return a.label.localeCompare(b.label, 'es');
            }),
            { id: 'custom', label: 'Personalizado', amount: '', concept: '', frequency: 'ONE_OFF' },
        ];
    }, [receiptTemplates]);

    useEffect(() => {
        if (!genOpen) return;
        let mounted = true;
        if (!token) return;
        setTemplatesLoading(true);
        axios
            .get('/api/sepa-recibos/templates', { headers })
            .then((r) => {
                if (!mounted) return;
                setReceiptTemplates(Array.isArray(r.data?.templates) ? r.data.templates : []);
            })
            .catch(() => {
                if (!mounted) return;
                setReceiptTemplates([]);
            })
            .finally(() => {
                if (!mounted) return;
                setTemplatesLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [genOpen, token, headers]);

    useEffect(() => {
        if (!isOpen) {
            setDocPreview(null);
            setFullFormOpen(false);
            setGenOpen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;
        axios
            .get('/api/sepa-settings/public')
            .then((r) => {
                if (!mounted) return;
                setSepaEnabled(!!r.data?.sepaEnabled);
            })
            .catch(() => {
                if (!mounted) return;
                setSepaEnabled(false);
            });
        return () => {
            mounted = false;
        };
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const on = () => {
            axios
                .get('/api/sepa-settings/public')
                .then((r) => setSepaEnabled(!!r.data?.sepaEnabled))
                .catch(() => setSepaEnabled(false));
        };
        window.addEventListener('lumina:sepa-settings-changed', on);
        return () => window.removeEventListener('lumina:sepa-settings-changed', on);
    }, [isOpen]);

    useEffect(() => {
        if (!sepaEnabled) setGenOpen(false);
    }, [sepaEnabled]);

    useEffect(() => {
        if (!isOpen || !token || !sepaEnabled) {
            if (!sepaEnabled) {
                setPlanTemplates([]);
            }
            return;
        }
        let mounted = true;
        setPlanLoading(true);
        axios
            .get('/api/sepa-recibos/templates', { headers })
            .then((r) => {
                if (!mounted) return;
                const rows = Array.isArray(r.data?.templates) ? r.data.templates : [];
                setPlanTemplates(rows.filter((t) => ['MONTHLY', 'QUARTERLY', 'YEARLY'].includes(t.frequency)));
            })
            .catch(() => {
                if (!mounted) return;
                setPlanTemplates([]);
            })
            .finally(() => {
                if (!mounted) return;
                setPlanLoading(false);
            });
        return () => {
            mounted = false;
        };
    }, [isOpen, token, headers, sepaEnabled]);

    useEffect(() => {
        if (!docPreview) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setDocPreview(null);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [docPreview]);

    useEffect(() => {
        if (!fullFormOpen) return;
        const onKey = (e) => {
            if (e.key === 'Escape') setFullFormOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [fullFormOpen]);

    const handleCsv = () => {
        if (!socio) return;
        const safeCode = (socio.memberCode || 'socio').replace(/[^\w-]+/g, '_');
        downloadSociosCsv([socio], `socio_${safeCode}`);
    };
    const formatDate = (dateString) => {
        if (!dateString) return '—';
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric'
        });
    };

    const formatDateInput = (dateString) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (Number.isNaN(d.getTime())) return '';
        return d.toISOString().slice(0, 10);
    };

    useEffect(() => {
        if (!isOpen || !socio) return;
        setPlanEdit({
            templateId: socio.sepaMonthlyTemplateId != null ? String(socio.sepaMonthlyTemplateId) : '',
            nextChargeAt: formatDateInput(socio.sepaMonthlyNextChargeAt),
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, socio?.id, socio?.sepaMonthlyTemplateId, socio?.sepaMonthlyNextChargeAt]);

    if (!isOpen || !socio) return null;

    const socioDocCount = SOCIO_DOCS.filter((d) => socio[d.id]).length;

    const p1 = socio.questionnaire?.part1;
    const p2 = socio.questionnaire?.part2;
    const p3 = socio.questionnaire?.part3;
    const patientAgeNum = p1?.patientAge != null && p1.patientAge !== '' ? parseInt(String(p1.patientAge), 10) : null;
    const ageVariant =
        Number.isFinite(patientAgeNum) && patientAgeNum <= 12
            ? 'infant'
            : Number.isFinite(patientAgeNum) && patientAgeNum >= 13
              ? 'adolescent'
              : null;
    const questionnaireVariant = p2?.variant === 'infant' || p2?.variant === 'adolescent' ? p2.variant : ageVariant;
    const questionnaireQuestions =
        questionnaireVariant === 'infant'
            ? INFANT_QUESTIONS
            : questionnaireVariant === 'adolescent'
              ? ADOLESCENT_QUESTIONS
              : [];
    const questionnaireAnswers = p2?.answers && typeof p2.answers === 'object' ? p2.answers : {};
    const p1DelegationLabel =
        socio.delegation && String(socio.delegation.id) === String(p1?.delegationId)
            ? socio.delegation.name
            : p1?.delegationId != null && p1.delegationId !== ''
              ? `Delegación #${p1.delegationId}`
              : '—';

    const savePlan = async () => {
        if (!sepaEnabled) {
            return Swal.fire({ icon: 'info', title: 'SEPA desactivado', text: 'Activa SEPA en Configuración para editar el plan.' });
        }
        try {
            setPlanSaving(true);
            await axios.put(
                `/api/socios/${socio.id}`,
                {
                    name: socio.name,
                    lastName: socio.lastName,
                    sepaMonthlyTemplateId: planEdit.templateId || null,
                    sepaMonthlyNextChargeAt: planEdit.templateId ? (planEdit.nextChargeAt || null) : null,
                },
                { headers }
            );
            Swal.fire({ icon: 'success', title: 'Guardado', text: 'Plan actualizado.', timer: 1600, showConfirmButton: false });
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo guardar.' });
        } finally {
            setPlanSaving(false);
        }
    };

    const openGenerate = () => {
        if (!canGenerateSepaReceipt || !sepaEnabled) return;
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const defaultDate = `${yyyy}-${mm}-${dd}`;
        setGenForm({
            preset: 'custom',
            amount: '',
            concept: 'Cuota socio',
            requestedCollectionDate: defaultDate,
        });
        setGenOpen(true);
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        try {
            if (!sepaEnabled) {
                return Swal.fire({
                    icon: 'warning',
                    title: 'SEPA desactivado',
                    text: 'Activa SEPA en Configuración del sistema antes de generar recibos.',
                });
            }
            const amount = String(genForm.amount || '').trim();
            const concept = String(genForm.concept || '').trim();
            if (!amount) {
                return Swal.fire({ icon: 'warning', title: 'Importe', text: 'Indica un importe.' });
            }
            if (!concept) {
                return Swal.fire({ icon: 'warning', title: 'Concepto', text: 'Indica un concepto.' });
            }

            const payload = {
                socioId: socio.id,
                amount,
                concept,
                requestedCollectionDate: genForm.requestedCollectionDate || null,
            };
            const res = await axios.post('/api/sepa-recibos', payload, { headers });
            setGenOpen(false);
            return Swal.fire({
                icon: 'success',
                title: 'Recibo creado',
                text: res.data?.message || 'Recibo SEPA creado.',
                confirmButtonColor: '#6E9EFF',
            });
        } catch (err) {
            console.error(err);
            return Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'No se pudo generar el recibo.',
                confirmButtonColor: '#6E9EFF',
            });
        }
    };

    const genderLabel = (g) => {
        if (!g) return '—';
        const map = {
            masculino: 'Masculino', femenino: 'Femenino', no_binario: 'No binario', otro: 'Otro', prefiero_no_decir: 'Prefiero no decir',
            H: 'Hombre', M: 'Mujer', O: 'Otro',
        };
        return map[g] || g;
    };

    return (
        <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>

                {/* Header Profile Banner */}
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-5 sm:px-6 relative shrink-0">
                    <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors">
                        <X size={18} />
                    </button>

                    <div className="flex flex-row items-center gap-4 pr-10">
                        <div className="w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem] rounded-xl bg-white shadow-md flex items-center justify-center text-2xl sm:text-3xl font-black text-blue-600 border-2 border-white/40 shrink-0">
                            {(socio.name?.[0] || '')}{(socio.lastName?.[0] || '')}
                        </div>
                        <div className="text-left min-w-0 flex-1">
                            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">{socio.name} {socio.lastName}</h2>
                            <p className="text-blue-100 font-medium text-sm mt-1">{socio.memberCode}</p>
                            <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${socio.status === 'ACTIVE' ? 'bg-green-400 text-green-900' : socio.status === 'INACTIVE' ? 'bg-red-400 text-red-900' : 'bg-yellow-400 text-yellow-900'}`}>
                                {socio.status === 'ACTIVE' ? 'Activo' : socio.status === 'INACTIVE' ? 'Inactivo' : 'Pendiente'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-5 overflow-y-auto space-y-4 bg-slate-50/60 flex-1">

                    {/* Grid Info — dos columnas iguales para evitar huecos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Datos Personales */}
                        <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <User size={14} className="text-emerald-500 shrink-0" /> Datos personales
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                {socio.status !== 'PENDING' && (
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">DNI / identificación</p>
                                        <p className="text-sm font-semibold text-slate-800 leading-normal">{socio.dni || '—'}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Fecha de {socio.status === 'PENDING' ? 'solicitud' : 'alta'}</p>
                                    <p className="text-sm font-semibold text-slate-800 leading-normal">{formatDate(socio.createdAt)}</p>
                                </div>
                                {socio.status === 'PENDING' && (
                                    <div className={`p-3 rounded-lg border sm:col-span-2 ${socio.contactedAt ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-amber-50/50 border-amber-100/50'}`}>
                                        <p className={`text-xs font-bold mb-1 ${socio.contactedAt ? 'text-indigo-600' : 'text-amber-600'}`}>
                                            Estado de contacto
                                        </p>
                                        <p className={`text-sm font-semibold leading-snug ${socio.contactedAt ? 'text-indigo-800' : 'text-amber-800'}`}>
                                            {socio.contactedAt 
                                                ? `Sí, contactado el ${new Date(socio.contactedAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}` 
                                                : 'No ha sido contactado todavía'}
                                        </p>
                                    </div>
                                )}

                                {socio.status !== 'PENDING' && (
                                    <>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium mb-1">Género</p>
                                            <p className="text-sm font-semibold text-slate-800 capitalize leading-normal">
                                                {genderLabel(socio.gender)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-medium mb-1">Pronombres</p>
                                            <p className="text-sm font-semibold text-slate-800 leading-normal">
                                                {socio.pronouns === 'otro' && socio.customPronouns
                                                    ? socio.customPronouns
                                                    : ({ el: 'Él / él', ella: 'Ella / ella', elle: 'Elle / elle', otro: 'Otro' }[socio.pronouns] || socio.customPronouns || socio.pronouns || '—')}
                                            </p>
                                        </div>
                                    </>
                                )}
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Usuario del sistema</p>
                                    <p className="text-sm font-semibold text-blue-600 leading-normal break-all">{socio.user?.username || '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Datos de Contacto */}
                        <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Phone size={14} className="text-blue-500 shrink-0" /> Contacto
                            </h3>
                            <div className="grid grid-cols-1 gap-y-3">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Correo electrónico</p>
                                    <p className="text-sm font-semibold text-slate-800 break-all leading-normal">{socio.email || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Teléfono principal</p>
                                    <p className="text-sm font-semibold text-slate-800 leading-normal">{socio.phone || '—'}</p>
                                </div>
                                {socio.municipio && (
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">Municipio (Baix Llobregat)</p>
                                        <p className="text-sm font-semibold text-slate-800 leading-normal">{socio.municipio}</p>
                                    </div>
                                )}
                                {socio.delegation && (
                                    <div>
                                        <p className="text-xs text-slate-500 font-medium mb-1">Delegación</p>
                                        <p className="text-sm font-semibold text-slate-800 leading-normal">{socio.delegation.name}</p>
                                    </div>
                                )}
                                {socio.address && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <p className="text-xs text-slate-500 font-medium mb-1">Dirección</p>
                                        <p className="text-sm font-semibold text-slate-800 leading-normal">{socio.address}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {socio.status === 'ACTIVE' && sepaEnabled && (
                        <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">SEPA / domiciliación</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">IBAN</p>
                                    <p className="font-mono font-semibold text-slate-800 break-all">{socio.iban || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">UMR (mandato)</p>
                                    <p className="font-mono font-semibold text-slate-800 break-all">{socio.sepaMandateUm || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Firma del mandato</p>
                                    <p className="font-semibold text-slate-800">
                                        {socio.sepaMandateSignedAt ? formatDate(socio.sepaMandateSignedAt) : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">Cuota / plan</p>
                                    <p className="font-semibold text-slate-800">
                                        {socio.sepaMonthlyTemplate?.name || (socio.sepaMonthlyTemplateId ? `Plantilla #${socio.sepaMonthlyTemplateId}` : '—')}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 font-medium mb-1">PDF mandato</p>
                                    <p className="font-semibold text-slate-800">{socio.docSepa ? 'Sí' : 'No'}</p>
                                </div>
                            </div>
                            {canGenerateSepaReceipt && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Editar plan de pago</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Plantilla</label>
                                            <select
                                                value={planEdit.templateId}
                                                onChange={(e) => setPlanEdit((p) => ({ ...p, templateId: e.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                                disabled={planLoading || planSaving}
                                            >
                                                <option value="">Decidir más adelante</option>
                                                {planTemplates.map((t) => (
                                                    <option key={t.id} value={String(t.id)}>
                                                        {t.frequency === 'MONTHLY'
                                                            ? `Mensual · ${t.name}`
                                                            : t.frequency === 'QUARTERLY'
                                                              ? `Trimestral · ${t.name}`
                                                              : `Anual · ${t.name}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 mb-1">Próximo cargo</label>
                                            <input
                                                type="date"
                                                value={planEdit.nextChargeAt}
                                                onChange={(e) => setPlanEdit((p) => ({ ...p, nextChargeAt: e.target.value }))}
                                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                                disabled={!planEdit.templateId || planSaving}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-3">
                                        <button
                                            type="button"
                                            onClick={savePlan}
                                            disabled={planSaving}
                                            className="inline-flex items-center gap-2 rounded-xl bg-[#6E9EFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a86ff] disabled:opacity-60"
                                        >
                                            Guardar plan
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {genOpen && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4" onClick={() => setGenOpen(false)}>
                            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                            <div
                                className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-5"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800">Generar recibo SEPA</h3>
                                        <p className="text-sm text-slate-500 mt-1">Se creará un recibo en estado <span className="font-semibold">Borrador</span> (fase 2).</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setGenOpen(false)}
                                        className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                                        aria-label="Cerrar"
                                    >
                                        <X size={18} className="text-slate-700" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                    <div className="lg:col-span-2">
                                        <form onSubmit={handleGenerate} className="space-y-4">
                                            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2">
                                                        <ReceiptText size={18} className="text-indigo-600" />
                                                        <div className="font-bold text-slate-800">Plantilla</div>
                                                    </div>
                                                    <div className={`text-xs font-bold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${sepaEnabled ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                                        {sepaEnabled ? <BadgeCheck size={14} /> : <BadgeX size={14} />}
                                                        {sepaEnabled ? 'SEPA activado' : 'SEPA desactivado'}
                                                    </div>
                                                </div>
                                                <div className="mt-3">
                                                    <select
                                                        value={genForm.preset}
                                                        onChange={(e) => {
                                                            const id = e.target.value;
                                                            const p = receiptPresets.find((x) => x.id === id);
                                                            setGenForm((f) => ({
                                                                ...f,
                                                                preset: id,
                                                                amount: id === 'custom' ? f.amount : (p?.amount || ''),
                                                                concept: id === 'custom' ? f.concept : (p?.concept || ''),
                                                            }));
                                                        }}
                                                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                                    >
                                                        {templatesLoading && (
                                                            <option value="custom">Cargando plantillas…</option>
                                                        )}
                                                        {!templatesLoading && receiptPresets.map((p) => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.frequency === 'MONTHLY' && p.id !== 'custom' ? `Mensual · ${p.label}` : p.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-slate-500 mt-2">
                                                        Consejo: usa una plantilla para reducir errores. Puedes cambiar a “Personalizado” si lo necesitas.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Importe (€)</label>
                                                    <input
                                                        value={genForm.amount}
                                                        onChange={(e) => setGenForm((f) => ({ ...f, amount: e.target.value, preset: 'custom' }))}
                                                        placeholder="10,00"
                                                        inputMode="decimal"
                                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Fecha de cargo</label>
                                                    <div className="relative">
                                                        <input
                                                            type="date"
                                                            value={genForm.requestedCollectionDate}
                                                            onChange={(e) => setGenForm((f) => ({ ...f, requestedCollectionDate: e.target.value }))}
                                                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                                        />
                                                        <CalendarClock size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 mt-1">Recomendado: hoy o próximos días.</p>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto</label>
                                                <input
                                                    value={genForm.concept}
                                                    onChange={(e) => setGenForm((f) => ({ ...f, concept: e.target.value, preset: 'custom' }))}
                                                    placeholder="Cuota socio mensual"
                                                    maxLength={140}
                                                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                                />
                                                <div className="text-[11px] text-slate-400 mt-1">{(genForm.concept || '').length}/140</div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 pt-1">
                                                <button
                                                    type="button"
                                                    onClick={() => setGenOpen(false)}
                                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="rounded-xl bg-[#6E9EFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a86ff] disabled:opacity-60 disabled:cursor-not-allowed"
                                                    disabled={!sepaEnabled}
                                                >
                                                    Crear recibo (borrador)
                                                </button>
                                            </div>
                                        </form>
                                    </div>

                                    <div className="lg:col-span-1">
                                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                                Resumen del mandato
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <div className="text-xs text-slate-500 font-medium mb-1">Socio</div>
                                                    <div className="font-semibold text-slate-800">{socio.name} {socio.lastName}</div>
                                                    <div className="text-xs text-slate-500 font-mono">{socio.memberCode}</div>
                                                </div>
                                                <div className="pt-2 border-t border-slate-100">
                                                    <div className="text-xs text-slate-500 font-medium mb-1">IBAN</div>
                                                    <div className="font-mono font-semibold text-slate-800 break-all">{socio.iban || '—'}</div>
                                                </div>
                                                <div className="pt-2 border-t border-slate-100">
                                                    <div className="text-xs text-slate-500 font-medium mb-1">UMR</div>
                                                    <div className="font-mono font-semibold text-slate-800 break-all">{socio.sepaMandateUm || '—'}</div>
                                                </div>
                                                <div className="pt-2 border-t border-slate-100">
                                                    <div className="text-xs text-slate-500 font-medium mb-1">Firma</div>
                                                    <div className="font-semibold text-slate-800">{socio.sepaMandateSignedAt ? formatDate(socio.sepaMandateSignedAt) : '—'}</div>
                                                </div>
                                                <div className="pt-2 border-t border-slate-100">
                                                    <div className="text-xs text-slate-500 font-medium mb-1">PDF mandato</div>
                                                    <div className="font-semibold text-slate-800">{socio.docSepa ? 'Sí' : 'No'}</div>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-3">
                                                Si falta algún dato, el servidor no permitirá crear el recibo.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {socio.questionnaire && (
                        <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <ListChecks size={14} className="text-indigo-500 shrink-0" /> Formulario de alta
                            </h3>
                            <button
                                type="button"
                                onClick={() => setFullFormOpen(true)}
                                disabled={!p1}
                                className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50/90 px-4 py-2.5 text-sm font-semibold text-indigo-900 hover:bg-indigo-100 transition-colors disabled:pointer-events-none disabled:opacity-45"
                            >
                                <ListChecks size={18} className="text-indigo-600 shrink-0" aria-hidden />
                                Ver respuestas del formulario de alta
                            </button>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                {p1
                                    ? 'Incluye parte 1 (datos de contacto y paciente), cuestionario y, si aplica, servicios.'
                                    : 'Aún no hay datos de solicitud guardados.'}
                            </p>
                        </div>
                    )}

                    {/* Documentación del tutor (Mis documentos — solo socio; hijos/as en ver detalles del paciente) */}
                    <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                            <FileStack size={14} className="text-violet-500 shrink-0" /> Documentación del socio / tutor
                        </h3>
                        <p className="text-xs text-slate-500 mb-3">
                            Solo archivos del tutor en <strong className="text-slate-600">Mis documentos</strong>. Para cada hijo/a, abre{' '}
                            <strong>Ver detalles</strong> sobre su ficha.
                        </p>
                        {socioDocCount === 0 ? (
                            <p className="text-sm text-slate-500">
                                Aún no hay documentos del tutor. Pueden subirse desde la cuenta del socio en Mis documentos.
                            </p>
                        ) : (
                            <div>
                                <p className="text-xs font-semibold text-slate-600 mb-2">
                                    {socioDocCount}/{SOCIO_DOCS.length} archivos
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {SOCIO_DOCS.map((doc) => {
                                        const path = socio[doc.id];
                                        if (!path) return null;
                                        const url = absoluteDocumentUrl(path);
                                        return (
                                            <div
                                                key={doc.id}
                                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-violet-200 bg-violet-50/80"
                                            >
                                                <span className="text-base leading-none" aria-hidden>{doc.icon}</span>
                                                <span className="text-sm font-semibold text-slate-800">{doc.label}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setDocPreview({ title: `${doc.label} · tutor/a`, url })}
                                                    className="p-1 rounded-md text-violet-600 hover:bg-violet-100 transition-colors"
                                                    title="Ver documento"
                                                    aria-label={`Ver ${doc.label}`}
                                                >
                                                    <Eye size={16} aria-hidden />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        downloadDocument(url, filenameFromDocumentPath(path))
                                                    }
                                                    className="p-1 rounded-md text-violet-600 hover:bg-violet-100 transition-colors"
                                                    title="Descargar documento"
                                                    aria-label={`Descargar ${doc.label}`}
                                                >
                                                    <Download size={16} aria-hidden />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pacientes Asociados */}
                    <div className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Heart size={14} className="text-rose-500 shrink-0" /> Pacientes asociados ({socio.patients?.length || 0})
                        </h3>
                        {socio.patients && socio.patients.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {socio.patients.map(patient => (
                                    <div key={patient.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/80">
                                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                                            {(patient.name?.[0] || '')}{(patient.lastName?.[0] || '')}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-slate-800 leading-snug truncate">{patient.name} {patient.lastName}</p>
                                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{patient.patientCode}</p>
                                            {(patient.delegation?.name || patient.municipio || patient.address) && (
                                                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                                    {[patient.delegation?.name, patient.municipio, patient.address].filter(Boolean).join(' · ')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <p className="text-sm text-slate-500">No hay pacientes asociados.</p>
                            </div>
                        )}
                    </div>

                    {/* Observaciones */}
                    {socio.notes && (
                        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <MessageSquare size={14} /> Observaciones internas
                            </h3>
                            <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed">
                                {socio.notes}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end pt-1 gap-2">
                        {canGenerateSepaReceipt && sepaEnabled && (
                            <button
                                type="button"
                                onClick={openGenerate}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold border shadow-sm transition-colors border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-100"
                            >
                                <ReceiptText size={18} className="text-indigo-600" />
                                Generar recibo SEPA
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleCsv}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold text-white bg-[#6E9EFF] hover:opacity-95 shadow-md"
                        >
                            <Download size={18} /> Descargar CSV
                        </button>
                    </div>

                </div>
            </div>
        </div>

        {fullFormOpen && p1 && (
            <div
                className="fixed inset-0 bg-black/55 backdrop-blur-[2px] flex items-center justify-center z-[60] p-3 sm:p-6"
                onClick={() => setFullFormOpen(false)}
                role="presentation"
            >
                <div
                    className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200/80"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="socio-alta-form-title"
                >
                    <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
                        <div className="min-w-0">
                            <h2 id="socio-alta-form-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <ListChecks size={20} className="text-indigo-600 shrink-0" />
                                Formulario de alta — respuestas completas
                            </h2>
                            <p className="text-xs text-slate-500 mt-1">
                                {socio.memberCode} · {socio.name} {socio.lastName}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFullFormOpen(false)}
                            className="shrink-0 w-9 h-9 rounded-full bg-slate-200/80 hover:bg-slate-300/90 text-slate-700 flex items-center justify-center transition-colors"
                            aria-label="Cerrar"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    <div className="overflow-y-auto p-5 sm:p-6 space-y-8 text-left">
                        <section>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                Parte 1 — Datos del paciente y contacto
                            </h3>
                            <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Paciente</p>
                                    <p className="font-semibold text-slate-900">
                                        {[p1.patientName, p1.patientFirstSurname, p1.patientSecondSurname].filter(Boolean).join(' ') ||
                                            p1.patientFullName ||
                                            '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Edad</p>
                                    <p className="text-slate-800">{p1.patientAge != null && p1.patientAge !== '' ? `${p1.patientAge} años` : '—'}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Madre / tutora</p>
                                    <p className="text-slate-800">{p1.parentMotherName || '—'}</p>
                                </div>
                                <div className="sm:col-span-2">
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Padre / tutor</p>
                                    <p className="text-slate-800">{p1.parentFatherName || p1.parentsFullName || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Municipio</p>
                                    <p className="text-slate-800">{p1.municipio || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Delegación solicitada</p>
                                    <p className="text-slate-800">{p1DelegationLabel}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Teléfono (formulario)</p>
                                    <p className="text-slate-800">{p1.phone || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Correo (formulario)</p>
                                    <p className="text-slate-800 break-all">{p1.email || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500 font-medium mb-0.5">Diagnóstico TEA</p>
                                    <p className="text-slate-800">
                                        {p1.teaDiagnosis === 'si' ? 'Sí' : p1.teaDiagnosis === 'no' ? 'No' : '—'}
                                    </p>
                                </div>
                                {p1.teaDiagnosis === 'si' && (
                                    <div>
                                        <p className="text-[11px] text-slate-500 font-medium mb-0.5">Nivel TEA</p>
                                        <p className="text-slate-800">{TEA_LEVEL_LABEL[p1.teaLevel] || p1.teaLevel || '—'}</p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                Parte 2 — Cuestionario (
                                {questionnaireVariant === 'infant'
                                    ? 'infantil'
                                    : questionnaireVariant === 'adolescent'
                                      ? 'adolescente'
                                      : 'sin variantes / pendiente'}
                                )
                            </h3>
                            {questionnaireQuestions.length === 0 ? (
                                <p className="text-sm text-slate-500 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-4">
                                    No hay cuestionario guardado o la edad no permite determinar el tipo (1–12 infantil, 13–18
                                    adolescente).
                                </p>
                            ) : (
                                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-1 border border-slate-100 rounded-lg bg-white">
                                    {questionnaireQuestions.map((q) => (
                                        <div key={q.id} className="p-4 border-b border-slate-100 last:border-0">
                                            <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">{q.block}</p>
                                            <p className="text-sm font-medium text-slate-900">{q.text}</p>
                                            <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                                                {questionnaireAnswers[String(q.id)] || (
                                                    <span className="text-slate-400 italic">Sin respuesta</span>
                                                )}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {questionnaireVariant === 'adolescent' && (
                            <section>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    Parte 3 — Servicios y disponibilidad
                                </h3>
                                {!p3 || typeof p3 !== 'object' ? (
                                    <p className="text-sm text-slate-500">No hay datos de servicios guardados.</p>
                                ) : (
                                    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 space-y-3 text-sm">
                                        <div>
                                            <p className="text-[11px] text-slate-500 font-medium mb-1">Servicios solicitados</p>
                                            <p className="text-slate-800">
                                                {Array.isArray(p3.services) && p3.services.length > 0
                                                    ? PART3_SERVICES.filter((s) => p3.services.includes(s.id))
                                                          .map((s) => s.label)
                                                          .join(' · ')
                                                    : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500 font-medium mb-1">Mañanas (9:00–14:00)</p>
                                            <p className="text-slate-800">
                                                {p3.morningAvail === 'si' ? 'Sí' : p3.morningAvail === 'no' ? 'No' : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500 font-medium mb-1">Tardes</p>
                                            <p className="text-slate-800">
                                                {AFTERNOON_OPTIONS.find((o) => o.value === p3.afternoonStart)?.label ||
                                                    p3.afternoonStart ||
                                                    '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[11px] text-slate-500 font-medium mb-1">Sábados por la mañana</p>
                                            <p className="text-slate-800">
                                                {p3.saturdayMorning === 'si' ? 'Sí' : p3.saturdayMorning === 'no' ? 'No' : '—'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </div>
            </div>
        )}

        <DocumentPreviewOverlay preview={docPreview} onClose={() => setDocPreview(null)} />
        </>
    );
};

export default SocioDetailModal;
