import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import useAuthStore from '../store/authStore';
import { ReceiptText, RefreshCw, Settings2, History, CalendarClock, Plus, Pencil, Trash2, BadgeCheck, BadgeX } from 'lucide-react';

const STATUS_LABEL = {
    DRAFT: 'Borrador',
    GENERATED: 'Generado',
    CANCELLED: 'Cancelado',
};

function formatEuros(amountCents) {
    if (amountCents == null) return '—';
    const v = Number(amountCents);
    if (!Number.isFinite(v)) return '—';
    return (v / 100).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function formatDate(dateString) {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RecibosSepa() {
    const { token } = useAuthStore();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [section, setSection] = useState('periodic'); // periodic | templates | history

    // Periodic dues
    const [loadingPeriodic, setLoadingPeriodic] = useState(true);
    const [periodicSocios, setPeriodicSocios] = useState([]);

    // Templates
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [templates, setTemplates] = useState([]);
    const [tplModalOpen, setTplModalOpen] = useState(false);
    const [tplSaving, setTplSaving] = useState(false);
    const [tplForm, setTplForm] = useState({
        id: null,
        name: '',
        frequency: 'MONTHLY',
        amount: '',
        concept: '',
    });

    // History
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyTab, setHistoryTab] = useState('drafts'); // drafts | other
    const [historyRows, setHistoryRows] = useState([]);

    const loadPeriodic = async () => {
        try {
            setLoadingPeriodic(true);
            const res = await axios.get('/api/sepa-recibos/monthly-due?take=500', { headers });
            setPeriodicSocios(Array.isArray(res.data?.socios) ? res.data.socios : []);
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e.response?.data?.message || 'No se pudieron cargar las cuotas periódicas.',
                confirmButtonColor: '#6E9EFF',
            });
        } finally {
            setLoadingPeriodic(false);
        }
    };

    const loadTemplates = async () => {
        try {
            setLoadingTemplates(true);
            const res = await axios.get('/api/sepa-recibos/templates', { headers });
            setTemplates(Array.isArray(res.data?.templates) ? res.data.templates : []);
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e.response?.data?.message || 'No se pudieron cargar las plantillas.',
                confirmButtonColor: '#6E9EFF',
            });
        } finally {
            setLoadingTemplates(false);
        }
    };

    const loadHistory = async () => {
        try {
            setLoadingHistory(true);
            const qs = new URLSearchParams();
            qs.set('take', '200');
            if (historyTab === 'drafts') qs.set('status', 'DRAFT');
            if (historyTab === 'other') qs.set('notDraft', '1');
            const res = await axios.get(`/api/sepa-recibos?${qs.toString()}`, { headers });
            setHistoryRows(Array.isArray(res.data?.receipts) ? res.data.receipts : []);
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e.response?.data?.message || 'No se pudo cargar el historial.',
                confirmButtonColor: '#6E9EFF',
            });
        } finally {
            setLoadingHistory(false);
        }
    };

    const downloadPain008 = async (from, to) => {
        const qs = new URLSearchParams();
        qs.set('from', from);
        qs.set('to', to);
        const res = await axios.get(`/api/sepa-recibos/export/pain008?${qs.toString()}`, {
            headers,
            responseType: 'blob',
        });
        const blob = new Blob([res.data], { type: 'application/xml;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const contentDisposition = res.headers?.['content-disposition'] || '';
        const m = /filename="([^"]+)"/i.exec(contentDisposition);
        a.download = m?.[1] || `pain008_${from}_${to}.xml`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const openExportPain008 = async () => {
        const today = new Date();
        const to = today.toISOString().slice(0, 10);
        const from = to;
        const result = await Swal.fire({
            title: 'Exportar SEPA (pain.008)',
            html: `
                <div class="text-left space-y-3">
                    <div class="text-xs text-slate-600">
                        Se exportarán recibos <b>GENERATED</b> cuya <b>fecha de cargo</b> esté dentro del rango.
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Desde</label>
                            <input id="sepa-from" type="date" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value="${from}">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-slate-500 mb-1">Hasta</label>
                            <input id="sepa-to" type="date" class="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value="${to}">
                        </div>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Descargar XML',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6E9EFF',
            focusConfirm: false,
            preConfirm: () => {
                const f = document.getElementById('sepa-from')?.value;
                const t = document.getElementById('sepa-to')?.value;
                if (!f || !t) {
                    Swal.showValidationMessage('Indica el rango de fechas.');
                    return null;
                }
                if (f > t) {
                    Swal.showValidationMessage('El rango no es válido (desde > hasta).');
                    return null;
                }
                return { f, t };
            },
        });
        if (!result.isConfirmed || !result.value) return;
        try {
            await downloadPain008(result.value.f, result.value.t);
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e.response?.data?.message || 'No se pudo exportar el XML.',
                confirmButtonColor: '#6E9EFF',
            });
        }
    };

    const changeReceiptStatus = async (receiptId, nextStatus) => {
        try {
            await axios.put(
                `/api/sepa-recibos/${encodeURIComponent(String(receiptId))}/status`,
                { status: nextStatus },
                { headers }
            );
            await loadHistory();
            Swal.fire({
                icon: 'success',
                title: nextStatus === 'GENERATED' ? 'Recibo confirmado' : 'Recibo cancelado',
                timer: 1400,
                showConfirmButton: false,
            });
        } catch (e) {
            console.error(e);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e.response?.data?.message || 'No se pudo cambiar el estado del recibo.',
                confirmButtonColor: '#6E9EFF',
            });
        }
    };

    const confirmDraftReceipt = async (r) => {
        const result = await Swal.fire({
            icon: 'question',
            title: 'Confirmar recibo',
            text: 'Se marcará como “Generado” y dejará de ser borrador.',
            showCancelButton: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6E9EFF',
        });
        if (!result.isConfirmed) return;
        return changeReceiptStatus(r.id, 'GENERATED');
    };

    const cancelDraftReceipt = async (r) => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Cancelar recibo',
            text: 'Se marcará como “Cancelado”.',
            showCancelButton: true,
            confirmButtonText: 'Cancelar recibo',
            cancelButtonText: 'Volver',
            confirmButtonColor: '#ef4444',
        });
        if (!result.isConfirmed) return;
        return changeReceiptStatus(r.id, 'CANCELLED');
    };

    useEffect(() => {
        if (section === 'periodic') loadPeriodic();
        if (section === 'templates') loadTemplates();
        if (section === 'history') loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section, historyTab]);

    const openCreateTemplate = () => {
        setTplForm({ id: null, name: '', frequency: 'MONTHLY', amount: '', concept: '' });
        setTplModalOpen(true);
    };

    const openEditTemplate = (t) => {
        setTplForm({
            id: t.id,
            name: t.name || '',
            frequency: t.frequency || 'ONE_OFF',
            amount: ((t.amountCents || 0) / 100).toFixed(2).replace('.', ','),
            concept: t.concept || '',
        });
        setTplModalOpen(true);
    };

    const saveTemplate = async (e) => {
        e.preventDefault();
        try {
            setTplSaving(true);
            const payload = {
                name: String(tplForm.name || '').trim(),
                frequency: tplForm.frequency,
                amount: String(tplForm.amount || '').trim(),
                concept: String(tplForm.concept || '').trim(),
            };
            if (!payload.name) return Swal.fire({ icon: 'warning', title: 'Nombre', text: 'Indica un nombre.' });
            if (!payload.amount) return Swal.fire({ icon: 'warning', title: 'Importe', text: 'Indica un importe.' });
            if (!payload.concept) return Swal.fire({ icon: 'warning', title: 'Concepto', text: 'Indica un concepto.' });

            if (tplForm.id) {
                await axios.put(`/api/sepa-recibos/templates/${tplForm.id}`, payload, { headers });
            } else {
                await axios.post('/api/sepa-recibos/templates', payload, { headers });
            }
            setTplModalOpen(false);
            await loadTemplates();
            return Swal.fire({ icon: 'success', title: 'Guardado', text: 'Plantilla guardada.', confirmButtonColor: '#6E9EFF' });
        } catch (e2) {
            console.error(e2);
            return Swal.fire({
                icon: 'error',
                title: 'Error',
                text: e2.response?.data?.message || 'No se pudo guardar la plantilla.',
                confirmButtonColor: '#6E9EFF',
            });
        } finally {
            setTplSaving(false);
        }
    };

    const deactivateTemplate = async (t) => {
        const confirm = await Swal.fire({
            icon: 'warning',
            title: 'Desactivar plantilla',
            text: `¿Desactivar "${t.name}"?`,
            showCancelButton: true,
            confirmButtonText: 'Desactivar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6E9EFF',
        });
        if (!confirm.isConfirmed) return;
        try {
            await axios.delete(`/api/sepa-recibos/templates/${t.id}`, { headers });
            await loadTemplates();
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo desactivar.' });
        }
    };

    const generateMonthlyReceipt = async (socio) => {
        const confirm = await Swal.fire({
            icon: 'question',
            title: 'Generar recibo',
            text: `Se creará un borrador para ${socio.memberCode}.`,
            showCancelButton: true,
            confirmButtonText: 'Crear borrador',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6E9EFF',
        });
        if (!confirm.isConfirmed) return;
        try {
            await axios.post(`/api/sepa-recibos/monthly-due/${socio.id}/generate`, {}, { headers });
            await loadPeriodic();
            if (section === 'history') await loadHistory();
            Swal.fire({ icon: 'success', title: 'Creado', text: 'Recibo periódico creado.', confirmButtonColor: '#6E9EFF' });
        } catch (e) {
            console.error(e);
            Swal.fire({ icon: 'error', title: 'Error', text: e.response?.data?.message || 'No se pudo generar.' });
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <ReceiptText className="text-[#6E9EFF]" size={28} />
                        Recibos SEPA
                    </h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        Gestión manual de cuotas y recibos. La exportación XML (pain.008) se hará en una fase posterior.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => {
                        if (section === 'periodic') return loadPeriodic();
                        if (section === 'templates') return loadTemplates();
                        return loadHistory();
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                    <RefreshCw size={16} className="text-slate-500" />
                    Recargar
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-2 mb-4 flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setSection('periodic')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                        section === 'periodic' ? 'bg-[#6E9EFF] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <CalendarClock size={16} />
                    Cuotas periódicas
                </button>
                <button
                    type="button"
                    onClick={() => setSection('templates')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                        section === 'templates' ? 'bg-[#6E9EFF] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <Settings2 size={16} />
                    Plantillas
                </button>
                <button
                    type="button"
                    onClick={() => setSection('history')}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                        section === 'history' ? 'bg-[#6E9EFF] text-white' : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                >
                    <History size={16} />
                    Historial
                </button>
            </div>

            {section === 'periodic' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
                        <div className="text-sm text-slate-600">
                            Ordenado por <span className="font-semibold">próxima fecha de cargo</span> (más cerca primero).
                        </div>
                        <div className="text-sm text-slate-500">{loadingPeriodic ? 'Cargando…' : `${periodicSocios.length} socio(s)`}</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-left text-slate-600">
                                    <th className="px-4 py-3 font-semibold">Socio</th>
                                    <th className="px-4 py-3 font-semibold">Plantilla</th>
                                    <th className="px-4 py-3 font-semibold">Próximo cargo</th>
                                    <th className="px-4 py-3 font-semibold">Último recibo</th>
                                    <th className="px-4 py-3 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loadingPeriodic && periodicSocios.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                            No hay socios con cuota periódica configurada.
                                        </td>
                                    </tr>
                                )}
                                {periodicSocios.map((s) => (
                                    (() => {
                                        const last = Array.isArray(s.sepaReceipts) && s.sepaReceipts.length ? s.sepaReceipts[0] : null;
                                        const statusLabel = last?.status ? (STATUS_LABEL[last.status] || last.status) : null;
                                        return (
                                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800">{s.name} {s.lastName}</div>
                                            <div className="text-xs text-slate-500 font-mono">{s.memberCode}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800">{s.sepaMonthlyTemplate?.name || '—'}</div>
                                            <div className="text-xs text-slate-500">{formatEuros(s.sepaMonthlyTemplate?.amountCents)}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{formatDate(s.sepaMonthlyNextChargeAt)}</td>
                                        <td className="px-4 py-3">
                                            {last ? (
                                                <div className="space-y-0.5">
                                                    <div className="text-slate-700">{formatDate(last.createdAt)}</div>
                                                    <div className="text-xs">
                                                        <span
                                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 font-bold ${
                                                                last.status === 'DRAFT'
                                                                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                                    : last.status === 'GENERATED'
                                                                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                                      : 'border-slate-200 bg-slate-50 text-slate-600'
                                                            }`}
                                                        >
                                                            {statusLabel}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => generateMonthlyReceipt(s)}
                                                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700"
                                            >
                                                <ReceiptText size={16} />
                                                Generar recibo
                                            </button>
                                        </td>
                                    </tr>
                                        );
                                    })()
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {section === 'templates' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
                        <div>
                            <div className="font-semibold text-slate-800">Mini configuración de plantillas</div>
                            <div className="text-sm text-slate-500">Crea plantillas para reutilizarlas al generar recibos (y para cuotas mensuales).</div>
                        </div>
                        <button
                            type="button"
                            onClick={openCreateTemplate}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#6E9EFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a86ff]"
                        >
                            <Plus size={16} />
                            Nueva plantilla
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-left text-slate-600">
                                    <th className="px-4 py-3 font-semibold">Nombre</th>
                                    <th className="px-4 py-3 font-semibold">Frecuencia</th>
                                    <th className="px-4 py-3 font-semibold">Importe</th>
                                    <th className="px-4 py-3 font-semibold">Concepto</th>
                                    <th className="px-4 py-3 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loadingTemplates && templates.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                                            No hay plantillas todavía.
                                        </td>
                                    </tr>
                                )}
                                {templates.map((t) => (
                                    <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                        <td className="px-4 py-3 font-semibold text-slate-800">{t.name}</td>
                                        <td className="px-4 py-3 text-slate-700">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold">
                                                {t.frequency === 'MONTHLY' ? <BadgeCheck size={14} className="text-emerald-600" /> : <BadgeX size={14} className="text-slate-500" />}
                                                {t.frequency === 'MONTHLY' ? 'Mensual' : 'Puntual'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700 font-semibold">{formatEuros(t.amountCents)}</td>
                                        <td className="px-4 py-3 text-slate-700 max-w-[420px]">
                                            <div className="truncate" title={t.concept || ''}>{t.concept || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditTemplate(t)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                                >
                                                    <Pencil size={14} />
                                                    Editar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deactivateTemplate(t)}
                                                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100"
                                                >
                                                    <Trash2 size={14} />
                                                    Desactivar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {section === 'history' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-700">Vista</span>
                            <select
                                value={historyTab}
                                onChange={(e) => setHistoryTab(e.target.value)}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                            >
                                <option value="drafts">Borradores</option>
                                <option value="other">No borradores</option>
                            </select>
                            </div>
                            {historyTab === 'other' && (
                                <button
                                    type="button"
                                    onClick={openExportPain008}
                                    className="inline-flex items-center justify-center rounded-xl bg-[#6E9EFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a86ff]"
                                >
                                    Exportar pain.008 (XML)
                                </button>
                            )}
                        </div>
                        <div className="text-sm text-slate-500">{loadingHistory ? 'Cargando…' : `${historyRows.length} recibo(s)`}</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr className="text-left text-slate-600">
                                    <th className="px-4 py-3 font-semibold">Socio</th>
                                    <th className="px-4 py-3 font-semibold">Importe</th>
                                    <th className="px-4 py-3 font-semibold">Concepto</th>
                                    <th className="px-4 py-3 font-semibold">Fecha cargo</th>
                                    <th className="px-4 py-3 font-semibold">Estado</th>
                                    <th className="px-4 py-3 font-semibold">Creado</th>
                                    <th className="px-4 py-3 font-semibold">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!loadingHistory && historyRows.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                                            No hay recibos para mostrar.
                                        </td>
                                    </tr>
                                )}
                                {historyRows.map((r) => (
                                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/40">
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-800">{r.socio ? `${r.socio.name} ${r.socio.lastName}` : '—'}</div>
                                            <div className="text-xs text-slate-500 font-mono">{r.socio?.memberCode || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-800">{formatEuros(r.amountCents)}</td>
                                        <td className="px-4 py-3 text-slate-700 max-w-[420px]">
                                            <div className="truncate" title={r.concept || ''}>{r.concept || '—'}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{formatDate(r.requestedCollectionDate)}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold border border-slate-200 bg-slate-50 text-slate-700">
                                                {STATUS_LABEL[r.status] || r.status || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{formatDate(r.createdAt)}</td>
                                        <td className="px-4 py-3">
                                            {historyTab === 'drafts' ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => confirmDraftReceipt(r)}
                                                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                                                    >
                                                        Confirmar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => cancelDraftReceipt(r)}
                                                        className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tplModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4" onClick={() => setTplModalOpen(false)}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
                    <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">{tplForm.id ? 'Editar plantilla' : 'Nueva plantilla'}</h3>
                                <p className="text-sm text-slate-500 mt-1">Define nombre, importe, concepto y si es mensual.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTplModalOpen(false)}
                                className="w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center"
                                aria-label="Cerrar"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={saveTemplate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nombre</label>
                                    <input
                                        value={tplForm.name}
                                        onChange={(e) => setTplForm((f) => ({ ...f, name: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Frecuencia</label>
                                    <select
                                        value={tplForm.frequency}
                                        onChange={(e) => setTplForm((f) => ({ ...f, frequency: e.target.value }))}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                    >
                                        <option value="MONTHLY">Mensual</option>
                                        <option value="QUARTERLY">Trimestral</option>
                                        <option value="YEARLY">Anual</option>
                                        <option value="ONE_OFF">Puntual</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Importe (€)</label>
                                    <input
                                        value={tplForm.amount}
                                        onChange={(e) => setTplForm((f) => ({ ...f, amount: e.target.value }))}
                                        placeholder="10,00"
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Concepto</label>
                                    <input
                                        value={tplForm.concept}
                                        onChange={(e) => setTplForm((f) => ({ ...f, concept: e.target.value }))}
                                        maxLength={140}
                                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]"
                                    />
                                    <div className="text-[11px] text-slate-400 mt-1">{(tplForm.concept || '').length}/140</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setTplModalOpen(false)}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                    disabled={tplSaving}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-[#6E9EFF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5a86ff] disabled:opacity-60"
                                    disabled={tplSaving}
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

