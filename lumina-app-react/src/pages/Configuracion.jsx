import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Settings, Save, AlertCircle, Info } from 'lucide-react';
import Swal from 'sweetalert2';

const API = '/api/sepa-settings';

export default function Configuracion() {
    const { token } = useAuthStore();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        sepaEnabled: false,
        creditorLegalName: '',
        creditorIban: '',
        creditorIdentifier: '',
        bankExtraJson: '',
        memberChoosesPlan: false,
        memberAllowedPlanFrequencies: 'MONTHLY,QUARTERLY,YEARLY',
        defaultPlanTemplateId: '',
        requirePlanConfirmOnApproval: true,
    });

    const load = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API, { headers });
            setForm({
                sepaEnabled: !!res.data.sepaEnabled,
                creditorLegalName: res.data.creditorLegalName || '',
                creditorIban: res.data.creditorIban || '',
                creditorIdentifier: res.data.creditorIdentifier || '',
                bankExtraJson: res.data.bankExtraJson || '',
                memberChoosesPlan: !!res.data.memberChoosesPlan,
                memberAllowedPlanFrequencies: res.data.memberAllowedPlanFrequencies || 'MONTHLY,QUARTERLY,YEARLY',
                defaultPlanTemplateId: res.data.defaultPlanTemplateId != null ? String(res.data.defaultPlanTemplateId) : '',
                requirePlanConfirmOnApproval:
                    res.data.requirePlanConfirmOnApproval === undefined ? true : !!res.data.requirePlanConfirmOnApproval,
            });
        } catch (e) {
            console.error(e);
            const status = e.response?.status;
            const msg = e.response?.data?.message || e.message || 'No se pudo cargar la configuración.';
            Swal.fire({
                icon: 'error',
                title: status === 403 ? 'Sin permiso' : status === 401 ? 'Sesión' : 'Error',
                text:
                    msg +
                    (status === 500
                        ? ' Si acabas de actualizar el servidor, ejecuta en lumina-api: npx prisma db push && npx prisma generate y reinicia la API.'
                        : ''),
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    const handleSave = async (e) => {
        e.preventDefault();
        let bankExtraPayload = form.bankExtraJson.trim();
        if (bankExtraPayload) {
            try {
                JSON.parse(bankExtraPayload);
            } catch {
                bankExtraPayload = form.bankExtraJson;
            }
        } else {
            bankExtraPayload = '';
        }

        setSaving(true);
        try {
            await axios.put(
                API,
                {
                    sepaEnabled: form.sepaEnabled,
                    creditorLegalName: form.creditorLegalName.trim(),
                    creditorIban: form.creditorIban.trim(),
                    creditorIdentifier: form.creditorIdentifier.trim(),
                    bankExtraJson: bankExtraPayload || null,
                    memberChoosesPlan: !!form.memberChoosesPlan,
                    memberAllowedPlanFrequencies: form.memberAllowedPlanFrequencies,
                    defaultPlanTemplateId: form.defaultPlanTemplateId,
                    requirePlanConfirmOnApproval: !!form.requirePlanConfirmOnApproval,
                },
                { headers }
            );
            window.dispatchEvent(new Event('lumina:sepa-settings-changed'));
            Swal.fire({
                icon: 'success',
                title: 'Guardado',
                text: 'La configuración se ha actualizado.',
                timer: 2000,
                showConfirmButton: false,
            });
            load();
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.response?.data?.message || 'No se pudo guardar.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[40vh]">
                <div className="animate-spin w-10 h-10 border-4 border-blue-100 border-t-[#6E9EFF] rounded-full" />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-12">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <Settings className="text-[#6E9EFF]" size={28} />
                    Configuración del sistema
                </h1>
                <p className="text-slate-500 mt-2 text-sm">
                    Ajustes globales de la instalación. Solo administradores de la aplicación pueden editar esta página.
                </p>
            </div>

            <form onSubmit={handleSave} className="space-y-8">
                <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <h2 className="text-lg font-semibold text-slate-800 mb-1">SEPA / domiciliación bancaria</h2>
                    <p className="text-sm text-slate-500 mb-6">
                        Activa cuando la entidad vaya a usar recibos SEPA. Con SEPA desactivado no se exigen datos de acreedor ni
                        mandatos en flujos de socio. La generación de remesas será <strong>manual y bajo demanda</strong> (alguien
                        pulsará «Generar recibo SEPA»); en una fase posterior se añadirá el XML pain.008 y la pantalla de remesas.
                    </p>

                    <label className="flex items-center gap-3 cursor-pointer mb-6">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded border-slate-300 text-[#6E9EFF] focus:ring-[#6E9EFF]"
                            checked={form.sepaEnabled}
                            onChange={(e) => setField('sepaEnabled', e.target.checked)}
                        />
                        <span className="font-medium text-slate-800">SEPA activado para esta instalación</span>
                    </label>

                    {form.sepaEnabled && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex gap-3 mb-6">
                            <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                            <p className="text-sm text-amber-900">
                                Con SEPA activado debes completar nombre legal, IBAN del acreedor e identificador del acreedor
                                (Creditor ID). Son obligatorios para guardar.
                            </p>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Nombre legal del acreedor {form.sepaEnabled && '*'}
                            </label>
                            <input
                                type="text"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                                value={form.creditorLegalName}
                                onChange={(e) => setField('creditorLegalName', e.target.value)}
                                placeholder="Igual que en facturas"
                                autoComplete="organization"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                IBAN del acreedor (cuenta de liquidación) {form.sepaEnabled && '*'}
                            </label>
                            <input
                                type="text"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono tracking-wide"
                                value={form.creditorIban}
                                onChange={(e) => setField('creditorIban', e.target.value)}
                                placeholder="ES00 0000 0000 0000 0000 0000"
                                spellCheck={false}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Identificador del acreedor (Creditor ID) {form.sepaEnabled && '*'}
                            </label>
                            <input
                                type="text"
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                                value={form.creditorIdentifier}
                                onChange={(e) => setField('creditorIdentifier', e.target.value)}
                                placeholder="El que facilita el banco (formato variable)"
                                spellCheck={false}
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Validación flexible; cada banco puede pedir datos extra — puedes usar el campo inferior para
                                apuntes estructurados (JSON).
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                                Datos adicionales del banco (opcional, JSON o texto)
                            </label>
                            <textarea
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono min-h-[88px]"
                                value={form.bankExtraJson}
                                onChange={(e) => setField('bankExtraJson', e.target.value)}
                                placeholder='Ej: {"presentador": "..."}  o notas libres'
                                spellCheck={false}
                            />
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-800 mb-2">Cuotas SEPA (plan de pagos)</h3>
                        <p className="text-xs text-slate-500 mb-4">
                            Define si el socio puede elegir su cuota. Si el socio elige, la selección se confirma al aprobar.
                        </p>

                        <label className="flex items-center gap-3 cursor-pointer mb-4">
                            <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-slate-300 text-[#6E9EFF] focus:ring-[#6E9EFF]"
                                checked={form.memberChoosesPlan}
                                onChange={(e) => setField('memberChoosesPlan', e.target.checked)}
                            />
                            <span className="font-medium text-slate-800">¿El socio elige su cuota?</span>
                        </label>

                        {form.memberChoosesPlan ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Opciones permitidas (CSV)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                                        value={form.memberAllowedPlanFrequencies}
                                        onChange={(e) => setField('memberAllowedPlanFrequencies', e.target.value)}
                                        placeholder="MONTHLY,QUARTERLY,YEARLY"
                                        spellCheck={false}
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Valores: <code>MONTHLY</code>, <code>QUARTERLY</code>, <code>YEARLY</code>. Se mostrarán plantillas activas de esas frecuencias.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Confirmación al aprobar</label>
                                    <label className="flex items-center gap-3 cursor-pointer mt-2">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded border-slate-300 text-[#6E9EFF] focus:ring-[#6E9EFF]"
                                            checked={form.requirePlanConfirmOnApproval}
                                            onChange={(e) => setField('requirePlanConfirmOnApproval', e.target.checked)}
                                        />
                                        <span className="text-sm font-medium text-slate-800">El aprobador debe confirmar la cuota elegida</span>
                                    </label>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 mb-1">Plantilla por defecto (ID)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                                        value={form.defaultPlanTemplateId}
                                        onChange={(e) => setField('defaultPlanTemplateId', e.target.value)}
                                        placeholder="Ej: 1"
                                        spellCheck={false}
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1">
                                        Si se deja vacío, al aprobar al socio se pedirá elegir una plantilla (por defecto se marcará una mensual).
                                    </p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                                    Recomendación: crea plantillas mensuales/trimestrales/anuales en <strong>Recibos SEPA → Plantillas</strong>.
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex gap-3">
                    <Info className="text-slate-400 shrink-0" size={20} />
                    <p className="text-xs text-slate-600">
                        El historial de cambios de estos valores se podrá registrar en una fase posterior; el servidor ya guarda
                        quién actualizó por última vez (<code className="bg-slate-200 px-1 rounded">updatedByUserId</code>).
                        Junta y Junta+ podrán generar recibos cuando implementemos esa función; solo administradores editan esta
                        pantalla.
                    </p>
                </div>

                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6E9EFF] text-white font-medium text-sm hover:bg-[#5a8eef] disabled:opacity-60"
                >
                    <Save size={18} />
                    {saving ? 'Guardando…' : 'Guardar configuración'}
                </button>
            </form>
        </div>
    );
}
