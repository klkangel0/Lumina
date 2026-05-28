import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { ClipboardList, Save, Loader2, ChevronLeft, Check, PencilLine } from 'lucide-react';
import Swal from 'sweetalert2';
import { MUNICIPIOS_DELEGACION, MUNICIPIOS_RESTO_ALFABETICO } from '../data/baixLlobregatMunicipios';
import {
    INFANT_HEADER,
    ADOLESCENT_HEADER,
    INFANT_QUESTIONS,
    ADOLESCENT_QUESTIONS,
    PART3_SERVICES,
    AFTERNOON_OPTIONS,
} from '../data/formularioAltaData';
import {
    part1FieldErrors,
    part2AnswersComplete,
    part3FormComplete,
} from '../utils/formularioAltaValidation';

const API = '/api';

const emptyPart1 = () => ({
    patientName: '',
    patientFirstSurname: '',
    patientSecondSurname: '',
    patientAge: '',
    parentMotherName: '',
    parentFatherName: '',
    municipio: '',
    delegationId: '',
    phone: '',
    email: '',
    teaDiagnosis: '',
    teaLevel: '',
});

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition focus:bg-white focus:border-[#6E9EFF] focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]/25';

const TEA_LEVEL_LABEL = {
    nivel1: 'Nivel 1',
    nivel2: 'Nivel 2',
    nivel3: 'Nivel 3',
    no_se: 'No lo sé',
};

export default function FormularioAltaSocio() {
    const navigate = useNavigate();
    const { token, user } = useAuthStore();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [delegations, setDelegations] = useState([]);
    const [part1, setPart1] = useState(emptyPart1);
    const [part2Answers, setPart2Answers] = useState({});
    const [part3, setPart3] = useState({
        services: [],
        morningAvail: '',
        afternoonStart: '',
        saturdayMorning: '',
    });
    const [completeness, setCompleteness] = useState(null);
    const [editingForm, setEditingForm] = useState(false);
    const [step, setStep] = useState(1);
    const stepInitializedRef = useRef(false);

    const ageNum = useMemo(() => {
        const n = parseInt(String(part1.patientAge), 10);
        return Number.isFinite(n) ? n : null;
    }, [part1.patientAge]);

    const variant = ageNum !== null && ageNum <= 12 ? 'infant' : ageNum >= 13 && ageNum <= 18 ? 'adolescent' : null;

    const loadQuestionnaire = useCallback(
        async (opts = {}) => {
            if (opts.resetStepInit) stepInitializedRef.current = false;
            setLoading(true);
            try {
                const [qRes, delRes] = await Promise.all([
                    axios.get(`${API}/socios/me/questionnaire`, { headers }),
                    axios.get(`${API}/delegaciones`, { headers }),
                ]);
                setDelegations(delRes.data || []);
                setCompleteness(qRes.data?.completeness ?? null);
                const p1 = qRes.data?.questionnaire?.part1;
                if (p1 && typeof p1 === 'object') {
                    setPart1({
                        ...emptyPart1(),
                        ...p1,
                        patientName: p1.patientName ?? '',
                        patientFirstSurname: p1.patientFirstSurname ?? '',
                        patientSecondSurname: p1.patientSecondSurname ?? '',
                        parentMotherName: p1.parentMotherName ?? '',
                        parentFatherName: p1.parentFatherName ?? '',
                        delegationId: p1.delegationId != null ? String(p1.delegationId) : '',
                        patientAge: p1.patientAge != null ? String(p1.patientAge) : '',
                    });
                } else if (qRes.data?.socio) {
                    const s = qRes.data.socio;
                    setPart1((prev) => ({
                        ...prev,
                        phone: s.phone || prev.phone,
                        email: s.email || prev.email,
                        municipio: s.municipio || prev.municipio,
                        delegationId: s.delegationId != null ? String(s.delegationId) : prev.delegationId,
                    }));
                }
                const p2 = qRes.data?.questionnaire?.part2;
                if (p2?.answers) setPart2Answers(p2.answers);
                else setPart2Answers({});
                const p3 = qRes.data?.questionnaire?.part3;
                if (p3 && typeof p3 === 'object') {
                    setPart3({
                        services: Array.isArray(p3.services) ? p3.services : [],
                        morningAvail: p3.morningAvail || '',
                        afternoonStart: p3.afternoonStart || '',
                        saturdayMorning: p3.saturdayMorning || '',
                    });
                } else {
                    setPart3({
                        services: [],
                        morningAvail: '',
                        afternoonStart: '',
                        saturdayMorning: '',
                    });
                }
            } catch (e) {
                console.error(e);
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cargar el formulario.' });
            } finally {
                setLoading(false);
            }
        },
        [headers]
    );

    useEffect(() => {
        loadQuestionnaire();
    }, [loadQuestionnaire]);

    useEffect(() => {
        if (loading) return;
        if (stepInitializedRef.current) return;
        stepInitializedRef.current = true;

        const p1e = part1FieldErrors(part1);
        const an = parseInt(String(part1.patientAge), 10);
        const v = Number.isFinite(an) && an <= 12 ? 'infant' : Number.isFinite(an) && an >= 13 && an <= 18 ? 'adolescent' : null;

        if (p1e.length > 0 || !v) {
            setStep(1);
            return;
        }
        if (!part2AnswersComplete(v, part2Answers)) {
            setStep(2);
            return;
        }
        if (v === 'adolescent' && !part3FormComplete(part3)) {
            setStep(3);
            return;
        }
        setStep(v === 'adolescent' ? 3 : 2);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al terminar la carga inicial
    }, [loading]);

    const setP1 = (k, v) => setPart1((p) => ({ ...p, [k]: v }));

    const toggleService = (id) => {
        setPart3((p) => ({
            ...p,
            services: p.services.includes(id) ? p.services.filter((x) => x !== id) : [...p.services, id],
        }));
    };

    const buildP1Payload = () => ({
        ...part1,
        patientAge: part1.patientAge === '' ? '' : parseInt(String(part1.patientAge), 10),
        delegationId: part1.delegationId === '' ? '' : parseInt(String(part1.delegationId), 10),
    });

    const persist = async (body) => {
        const res = await axios.put(`${API}/socios/me/questionnaire`, body, { headers });
        setCompleteness(res.data?.completeness || null);
        return res;
    };

    const showFinalSuccessAndRedirect = async (res) => {
        if (!res?.data?.completeness?.ok) return;
        await Swal.fire({
            icon: 'success',
            title: '¡Has completado el formulario de alta!',
            html: `
                <p style="margin-bottom:12px;text-align:left">Los datos de tu solicitud se han guardado correctamente y están <strong>pendientes de validación</strong> por la junta.</p>
                <p style="font-size:14px;text-align:left;margin-bottom:8px">Para agilizar la revisión de tu caso, te recomendamos:</p>
                <ul style="font-size:14px;text-align:left;padding-left:1.25rem;margin:0">
                    <li style="margin-bottom:6px">Entrar en <strong>Mis documentos</strong>, revisar lo que falte y subir cualquier archivo pendiente.</li>
                    <li>Completar tu información personal en <strong>Mi perfil</strong>.</li>
                </ul>
                <p style="font-size:13px;text-align:left;margin-top:12px;color:#64748b">Después te llevarmos a la lista de espera, donde podrás ver el estado de tu solicitud.</p>
            `,
            confirmButtonText: 'Ir a la lista de espera',
            confirmButtonColor: '#6E9EFF',
            width: 520,
        });
        navigate('/lista-espera');
    };

    const handleSaveStep1 = async () => {
        const err = part1FieldErrors(part1);
        if (err.length > 0) {
            await Swal.fire({
                icon: 'warning',
                title: 'Revisa la parte 1',
                html: `<ul class="text-left text-sm">${err.map((x) => `<li>${x}</li>`).join('')}</ul>`,
                confirmButtonColor: '#6E9EFF',
            });
            return false;
        }
        if (!variant) {
            await Swal.fire({
                icon: 'warning',
                title: 'Edad no válida',
                text: 'Indica una edad entre 1 y 18 años para continuar al cuestionario.',
                confirmButtonColor: '#6E9EFF',
            });
            return false;
        }
        setSaving(true);
        try {
            await persist({ part1: buildP1Payload() });
            setStep(2);
            await Swal.fire({
                icon: 'success',
                title: 'Parte 1 guardada',
                text: 'Continúa con el cuestionario.',
                timer: 1800,
                showConfirmButton: false,
            });
            return true;
        } catch (e) {
            const msg = e.response?.data?.message || 'No se pudo guardar.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSaveStep2 = async (isLastForInfant) => {
        if (!variant) return false;
        if (!part2AnswersComplete(variant, part2Answers)) {
            await Swal.fire({
                icon: 'warning',
                title: 'Cuestionario incompleto',
                text: 'Responde todas las preguntas antes de continuar.',
                confirmButtonColor: '#6E9EFF',
            });
            return false;
        }
        setSaving(true);
        try {
            const p1payload = buildP1Payload();
            if (isLastForInfant) {
                const res = await persist({
                    part1: p1payload,
                    part2: { variant, answers: part2Answers },
                    part3: { services: [], morningAvail: '', afternoonStart: '', saturdayMorning: '' },
                });
                if (res.data?.completeness?.ok) {
                    await showFinalSuccessAndRedirect(res);
                } else {
                    const miss = res.data?.completeness?.missingSections || [];
                    await Swal.fire({
                        icon: 'info',
                        title: 'Guardado',
                        html:
                            miss.length > 0
                                ? `<p>Aún faltan:</p><ul class="text-left">${miss.map((s) => `<li>${s}</li>`).join('')}</ul>`
                                : 'Progreso guardado.',
                        confirmButtonColor: '#6E9EFF',
                    });
                }
            } else {
                await persist({
                    part1: p1payload,
                    part2: { variant, answers: part2Answers },
                });
                setStep(3);
                await Swal.fire({
                    icon: 'success',
                    title: 'Parte 2 guardada',
                    text: 'Último paso: servicios y disponibilidad.',
                    timer: 1800,
                    showConfirmButton: false,
                });
            }
            return true;
        } catch (e) {
            const msg = e.response?.data?.message || 'No se pudo guardar.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleSaveStep3 = async () => {
        if (!part3FormComplete(part3)) {
            await Swal.fire({
                icon: 'warning',
                title: 'Apartado incompleto',
                text: 'Selecciona al menos un servicio y completa disponibilidad mañanas, tardes y sábados.',
                confirmButtonColor: '#6E9EFF',
            });
            return;
        }
        setSaving(true);
        try {
            const res = await persist({
                part1: buildP1Payload(),
                part2: { variant: 'adolescent', answers: part2Answers },
                part3: { ...part3 },
            });
            setCompleteness(res.data?.completeness || null);
            if (res.data?.completeness?.ok) {
                await showFinalSuccessAndRedirect(res);
            } else {
                const miss = res.data?.completeness?.missingSections || [];
                await Swal.fire({
                    icon: 'info',
                    title: 'Guardado',
                    html:
                        miss.length > 0
                            ? `<p>Aún faltan:</p><ul class="text-left">${miss.map((s) => `<li>${s}</li>`).join('')}</ul>`
                            : 'Progreso guardado.',
                    confirmButtonColor: '#6E9EFF',
                });
            }
        } catch (e) {
            const msg = e.response?.data?.message || 'No se pudo guardar.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } finally {
            setSaving(false);
        }
    };

    if (user?.role && user.role !== 'SOCIO') {
        return <Navigate to="/" replace />;
    }
    if (user?.role === 'SOCIO' && user?.socioStatus && user.socioStatus !== 'PENDING') {
        return <Navigate to="/mis-pacientes" replace />;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh] text-slate-500 gap-2">
                <Loader2 className="animate-spin" size={24} /> Cargando formulario…
            </div>
        );
    }

    const formularioCompleto = !!completeness?.ok;
    const summaryVariant =
        ageNum !== null && ageNum <= 12
            ? 'infant'
            : ageNum !== null && ageNum >= 13 && ageNum <= 18
              ? 'adolescent'
              : null;

    if (formularioCompleto && summaryVariant && !editingForm) {
        const delegationName =
            delegations.find((d) => String(d.id) === String(part1.delegationId))?.name ?? '—';
        const summaryQuestions =
            summaryVariant === 'infant' ? INFANT_QUESTIONS : ADOLESCENT_QUESTIONS;
        const afternoonLabel =
            AFTERNOON_OPTIONS.find((o) => o.value === part3.afternoonStart)?.label ?? (part3.afternoonStart || '—');

        const row = (label, value) => (
            <div key={label} className="py-3 border-b border-slate-100 last:border-0">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{value || '—'}</p>
            </div>
        );

        return (
            <div className="w-full max-w-6xl mx-auto px-4 sm:px-5 md:px-8 lg:px-10 pb-32">
                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6E9EFF] to-indigo-500 text-white shadow-lg shadow-blue-500/20">
                            <ClipboardList size={24} />
                        </span>
                        Formulario de alta como socio
                    </h1>
                    <p className="mt-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 inline-block">
                        Formulario completo — pendiente de validación por la junta.
                    </p>
                </div>

                <section className="rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/40 ring-1 ring-slate-100 p-6 sm:p-8">
                    <h2 className="text-sm font-bold text-[#6E9EFF] uppercase tracking-widest mb-1">Resumen de tu solicitud</h2>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        Aquí tienes los datos que enviaste. Si necesitas corregir algo, pulsa <strong>Editar formulario</strong> y
                        vuelve a guardar cada paso.
                    </p>

                    <div className="space-y-8">
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Datos de contacto y paciente
                            </p>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4">
                                {row('Nombre del paciente', part1.patientName)}
                                {row('Primer apellido', part1.patientFirstSurname)}
                                {row('Segundo apellido', part1.patientSecondSurname)}
                                {row('Edad', part1.patientAge ? `${part1.patientAge} años` : '')}
                                {row('Madre / tutora', part1.parentMotherName)}
                                {row('Padre / tutor', part1.parentFatherName)}
                                {row('Municipio', part1.municipio)}
                                {row('Delegación', delegationName)}
                                {row('Teléfono', part1.phone)}
                                {row('Correo electrónico', part1.email)}
                                {row(
                                    'Diagnóstico TEA',
                                    part1.teaDiagnosis === 'si' ? 'Sí' : part1.teaDiagnosis === 'no' ? 'No' : ''
                                )}
                                {part1.teaDiagnosis === 'si' &&
                                    row('Grado TEA', TEA_LEVEL_LABEL[part1.teaLevel] || part1.teaLevel || '—')}
                            </div>
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                Cuestionario ({summaryVariant === 'infant' ? 'infantil' : 'adolescente'})
                            </p>
                            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 max-h-[50vh] overflow-y-auto">
                                {summaryQuestions.map((q) => (
                                    <div key={q.id} className="py-4 border-b border-slate-100 last:border-0">
                                        <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">{q.block}</p>
                                        <p className="text-sm font-medium text-slate-900">{q.text}</p>
                                        <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                                            {part2Answers[String(q.id)] || '—'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {summaryVariant === 'adolescent' && (
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                    Servicios y disponibilidad
                                </p>
                                <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4">
                                    {row(
                                        'Servicios solicitados',
                                        part3.services?.length
                                            ? PART3_SERVICES.filter((s) => part3.services.includes(s.id))
                                                  .map((s) => s.label)
                                                  .join(' · ')
                                            : ''
                                    )}
                                    {row('Mañanas (9:00–14:00)', part3.morningAvail === 'si' ? 'Sí' : part3.morningAvail === 'no' ? 'No' : '')}
                                    {row('Tardes', afternoonLabel)}
                                    {row(
                                        'Sábados por la mañana',
                                        part3.saturdayMorning === 'si' ? 'Sí' : part3.saturdayMorning === 'no' ? 'No' : ''
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-slate-100 pt-6">
                        <p className="text-sm text-slate-600">
                            Para agilizar la validación: revisa{' '}
                            <Link to="/mis-documentos" className="font-semibold text-[#6E9EFF] hover:underline">
                                Mis documentos
                            </Link>{' '}
                            y{' '}
                            <Link to="/mi-perfil" className="font-semibold text-[#6E9EFF] hover:underline">
                                Mi perfil
                            </Link>
                            .
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setEditingForm(true);
                                setStep(1);
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#6E9EFF] to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:opacity-95"
                        >
                            <PencilLine size={20} />
                            Editar formulario
                        </button>
                    </div>
                </section>
            </div>
        );
    }

    const questions = variant === 'infant' ? INFANT_QUESTIONS : variant === 'adolescent' ? ADOLESCENT_QUESTIONS : [];

    const stepLabels =
        variant === 'adolescent'
            ? ['Datos de contacto', 'Cuestionario', 'Servicios y disponibilidad']
            : variant === 'infant'
              ? ['Datos de contacto', 'Cuestionario']
              : ['Datos de contacto'];

    return (
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-5 md:px-8 lg:px-10 pb-32">
            {editingForm && formularioCompleto && (
                <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-sm text-amber-950">
                        <strong>Modo edición.</strong> Los cambios se aplican al guardar en cada paso. Si terminas de nuevo el
                        último paso, se mostrará el mensaje de envío y podrás volver a la lista de espera.
                    </p>
                    <button
                        type="button"
                        className="shrink-0 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-50"
                        onClick={async () => {
                            const r = await Swal.fire({
                                icon: 'question',
                                title: '¿Volver al resumen?',
                                text: 'Se descartarán los cambios que no hayas guardado en el servidor.',
                                showCancelButton: true,
                                confirmButtonText: 'Sí, descartar',
                                cancelButtonText: 'Seguir editando',
                                confirmButtonColor: '#6E9EFF',
                            });
                            if (r.isConfirmed) {
                                await loadQuestionnaire({ resetStepInit: true });
                                setEditingForm(false);
                            }
                        }}
                    >
                        Volver al resumen
                    </button>
                </div>
            )}
            <div className="mb-6 md:mb-8">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center gap-3 tracking-tight">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6E9EFF] to-indigo-500 text-white shadow-lg shadow-blue-500/20">
                        <ClipboardList size={24} />
                    </span>
                    Formulario de alta como socio
                </h1>
                <p className="text-slate-600 mt-3 text-sm md:text-base max-w-3xl leading-relaxed">
                    Completa los pasos en orden: primero los datos de contacto; después el cuestionario según la edad del paciente
                    {variant === 'adolescent' ? '; y por último los servicios.' : '.'}
                </p>
                {completeness?.ok && (
                    <p className="mt-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2 inline-block">
                        Formulario completo — pendiente de validación.
                    </p>
                )}
            </div>

            {/* Indicador de pasos */}
            <div className="mb-8 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
                {stepLabels.map((label, idx) => {
                    const n = idx + 1;
                    const active = step === n;
                    const done = step > n;
                    const hidden = variant === 'infant' && n === 3;
                    if (hidden) return null;
                    return (
                        <React.Fragment key={n}>
                            {idx > 0 && (
                                <div
                                    className={`hidden sm:block h-0.5 w-8 md:w-14 rounded ${done || active ? 'bg-[#6E9EFF]' : 'bg-slate-200'}`}
                                />
                            )}
                            <div
                                className={`flex items-center gap-2 rounded-2xl border px-3 py-2 md:px-4 md:py-2.5 transition ${
                                    active
                                        ? 'border-[#6E9EFF] bg-blue-50/90 shadow-sm'
                                        : done
                                          ? 'border-emerald-200 bg-emerald-50/60'
                                          : 'border-slate-200 bg-slate-50/80 text-slate-400'
                                }`}
                            >
                                <span
                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                        active
                                            ? 'bg-[#6E9EFF] text-white'
                                            : done
                                              ? 'bg-emerald-500 text-white'
                                              : 'bg-slate-200 text-slate-500'
                                    }`}
                                >
                                    {done ? <Check size={16} strokeWidth={3} /> : n}
                                </span>
                                <span
                                    className={`text-[11px] md:text-xs font-bold uppercase tracking-wide max-w-[140px] md:max-w-[200px] leading-tight ${
                                        active ? 'text-blue-900' : done ? 'text-emerald-900' : 'text-slate-500'
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Parte 1 */}
            {step === 1 && (
                <section className="rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/40 ring-1 ring-slate-100 p-6 sm:p-8 mb-6">
                    <h2 className="text-sm font-bold text-[#6E9EFF] uppercase tracking-widest mb-1">Paso 1 — Datos de contacto</h2>
                    <p className="text-xs text-slate-500 mb-6">
                        Los datos del menor y de los tutores se revisan con la solicitud. No podrás rellenar el cuestionario hasta
                        completar y guardar este paso.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                        <div className="sm:col-span-2 border-b border-slate-100 pb-6">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                                Datos del paciente (hijo/a beneficiario)
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nombre *</label>
                                    <input
                                        className={inputClass}
                                        value={part1.patientName}
                                        onChange={(e) => setP1('patientName', e.target.value)}
                                        autoComplete="given-name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Primer apellido *</label>
                                    <input
                                        className={inputClass}
                                        value={part1.patientFirstSurname}
                                        onChange={(e) => setP1('patientFirstSurname', e.target.value)}
                                        autoComplete="family-name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Segundo apellido *</label>
                                    <input
                                        className={inputClass}
                                        placeholder="Si no tiene, escriba —"
                                        value={part1.patientSecondSurname}
                                        onChange={(e) => setP1('patientSecondSurname', e.target.value)}
                                    />
                                </div>
                                <div className="sm:col-span-3 sm:max-w-[220px]">
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Edad del paciente * (1–18)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={18}
                                        className={inputClass}
                                        value={part1.patientAge}
                                        onChange={(e) => setP1('patientAge', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="sm:col-span-2 border-b border-slate-100 pb-6">
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                                Tutores (madre / padre o equivalente)
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        Nombre y apellidos de la madre *
                                    </label>
                                    <input
                                        className={inputClass}
                                        value={part1.parentMotherName}
                                        onChange={(e) => setP1('parentMotherName', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                        Nombre y apellidos del padre *
                                    </label>
                                    <input
                                        className={inputClass}
                                        value={part1.parentFatherName}
                                        onChange={(e) => setP1('parentFatherName', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Municipio *</label>
                            <select
                                className={inputClass}
                                value={part1.municipio}
                                onChange={(e) => setP1('municipio', e.target.value)}
                            >
                                <option value="">Selecciona…</option>
                                <optgroup label="── Con delegación Assotea ──">
                                    {MUNICIPIOS_DELEGACION.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </optgroup>
                                <optgroup label="── Resto Baix Llobregat ──">
                                    {MUNICIPIOS_RESTO_ALFABETICO.map((m) => (
                                        <option key={m} value={m}>
                                            {m}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                Delegación donde desea ser atendido/a *
                            </label>
                            <select
                                className={inputClass}
                                value={part1.delegationId}
                                onChange={(e) => setP1('delegationId', e.target.value)}
                            >
                                <option value="">Selecciona…</option>
                                {delegations.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Teléfono de contacto *</label>
                            <input
                                type="tel"
                                className={inputClass}
                                value={part1.phone}
                                onChange={(e) => setP1('phone', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Correo electrónico *</label>
                            <input
                                type="email"
                                className={inputClass}
                                value={part1.email}
                                onChange={(e) => setP1('email', e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-2">¿Su hijo/a tiene diagnóstico de TEA? *</label>
                            <div className="flex gap-6">
                                {['si', 'no'].map((v) => (
                                    <label key={v} className="flex items-center gap-2 text-sm cursor-pointer font-medium text-slate-700">
                                        <input
                                            type="radio"
                                            name="tea"
                                            checked={part1.teaDiagnosis === v}
                                            onChange={() => setP1('teaDiagnosis', v)}
                                            className="text-[#6E9EFF] focus:ring-[#6E9EFF]"
                                        />
                                        {v === 'si' ? 'Sí' : 'No'}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {part1.teaDiagnosis === 'si' && (
                            <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-2">Grado / nivel TEA *</label>
                                <div className="flex flex-wrap gap-3">
                                    {[
                                        ['nivel1', 'Nivel 1'],
                                        ['nivel2', 'Nivel 2'],
                                        ['nivel3', 'Nivel 3'],
                                        ['no_se', 'No lo sé'],
                                    ].map(([val, lab]) => (
                                        <label key={val} className="flex items-center gap-2 text-sm cursor-pointer">
                                            <input
                                                type="radio"
                                                name="teaLevel"
                                                checked={part1.teaLevel === val}
                                                onChange={() => setP1('teaLevel', val)}
                                                className="text-[#6E9EFF]"
                                            />
                                            {lab}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleSaveStep1}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6E9EFF] to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Guardar y continuar
                        </button>
                    </div>
                </section>
            )}

            {/* Parte 2 */}
            {step === 2 && variant && (
                <section className="rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/40 ring-1 ring-slate-100 p-6 sm:p-8 mb-6">
                    <h2 className="text-sm font-bold text-[#6E9EFF] uppercase tracking-widest mb-2">
                        Paso 2 — Cuestionario ({variant === 'infant' ? 'infantil' : 'adolescente'})
                    </h2>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed border-l-4 border-[#6E9EFF] pl-4 bg-slate-50/80 py-3 pr-3 rounded-r-lg">
                        {variant === 'infant' ? INFANT_HEADER : ADOLESCENT_HEADER}
                    </p>
                    <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                        {questions.map((q) => (
                            <div key={q.id} className="pb-6 border-b border-slate-100 last:border-0">
                                <p className="text-[11px] font-bold text-slate-400 uppercase mb-1">{q.block}</p>
                                <p className="text-sm font-medium text-slate-900 mb-3">{q.text} *</p>
                                {q.type === 'text' ? (
                                    <textarea
                                        className={`${inputClass} min-h-[100px] resize-y`}
                                        value={part2Answers[String(q.id)] || ''}
                                        onChange={(e) =>
                                            setPart2Answers((a) => ({
                                                ...a,
                                                [String(q.id)]: e.target.value,
                                            }))
                                        }
                                    />
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {q.options.map((opt) => (
                                            <label
                                                key={opt}
                                                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition ${
                                                    part2Answers[String(q.id)] === opt
                                                        ? 'border-[#6E9EFF] bg-blue-50 text-blue-900 font-medium'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                }`}
                                            >
                                                <input
                                                    type="radio"
                                                    name={`q-${q.id}`}
                                                    checked={part2Answers[String(q.id)] === opt}
                                                    onChange={() =>
                                                        setPart2Answers((a) => ({
                                                            ...a,
                                                            [String(q.id)]: opt,
                                                        }))
                                                    }
                                                    className="text-[#6E9EFF]"
                                                />
                                                {opt}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-6">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => setStep(1)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <ChevronLeft size={20} /> Volver atrás
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleSaveStep2(variant === 'infant')}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6E9EFF] to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : variant === 'infant' ? (
                                <Save size={20} />
                            ) : (
                                <Save size={20} />
                            )}
                            {variant === 'infant' ? 'Guardar y finalizar' : 'Guardar y continuar'}
                        </button>
                    </div>
                </section>
            )}

            {/* Parte 3 — solo adolescente */}
            {step === 3 && variant === 'adolescent' && (
                <section className="rounded-2xl border border-slate-200/90 bg-white shadow-md shadow-slate-200/40 ring-1 ring-slate-100 p-6 sm:p-8 mb-6">
                    <h2 className="text-sm font-bold text-[#6E9EFF] uppercase tracking-widest mb-2">
                        Paso 3 — Servicios y disponibilidad
                    </h2>
                    <p className="text-sm text-slate-600 mb-6">Último paso del formulario de alta.</p>
                    <p className="text-sm font-semibold text-slate-800 mb-3">Servicios solicitados * (puede marcar varios)</p>
                    <div className="space-y-3 mb-8">
                        {PART3_SERVICES.map((s) => (
                            <label
                                key={s.id}
                                className="flex items-start gap-3 text-sm cursor-pointer rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={part3.services.includes(s.id)}
                                    onChange={() => toggleService(s.id)}
                                    className="mt-0.5 rounded text-[#6E9EFF]"
                                />
                                {s.label}
                            </label>
                        ))}
                    </div>
                    <div className="space-y-6">
                        <div>
                            <p className="text-sm font-semibold text-slate-800 mb-2">Disponibilidad mañanas (9:00–14:00) *</p>
                            <div className="flex gap-6">
                                {['si', 'no'].map((v) => (
                                    <label key={v} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="morning"
                                            checked={part3.morningAvail === v}
                                            onChange={() => setPart3((p) => ({ ...p, morningAvail: v }))}
                                            className="text-[#6E9EFF]"
                                        />
                                        {v === 'si' ? 'Sí' : 'No'}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800 mb-2">Disponibilidad tardes *</p>
                            <div className="flex flex-col gap-2">
                                {AFTERNOON_OPTIONS.map((o) => (
                                    <label key={o.value} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="afternoon"
                                            checked={part3.afternoonStart === o.value}
                                            onChange={() => setPart3((p) => ({ ...p, afternoonStart: o.value }))}
                                            className="text-[#6E9EFF]"
                                        />
                                        {o.label}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800 mb-2">Disponibilidad sábados por la mañana *</p>
                            <div className="flex gap-6">
                                {['si', 'no'].map((v) => (
                                    <label key={v} className="flex items-center gap-2 text-sm">
                                        <input
                                            type="radio"
                                            name="sat"
                                            checked={part3.saturdayMorning === v}
                                            onChange={() => setPart3((p) => ({ ...p, saturdayMorning: v }))}
                                            className="text-[#6E9EFF]"
                                        />
                                        {v === 'si' ? 'Sí' : 'No'}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-slate-100 pt-6">
                        <button
                            type="button"
                            disabled={saving}
                            onClick={() => setStep(2)}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <ChevronLeft size={20} /> Volver atrás
                        </button>
                        <button
                            type="button"
                            disabled={saving}
                            onClick={handleSaveStep3}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6E9EFF] to-indigo-500 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                            Guardar y finalizar
                        </button>
                    </div>
                </section>
            )}
        </div>
    );
}
