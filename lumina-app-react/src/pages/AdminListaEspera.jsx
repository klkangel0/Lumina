import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import {
    Search, Filter, Eye, Users, Phone, Mail,
    ChevronDown, ChevronUp, Cake, Heart, School, CheckCircle, MessageCircle
} from 'lucide-react';
import Button from '../components/Button';
import Swal from 'sweetalert2';
import PatientDetailModal from '../components/socios/PatientDetailModal';
import SocioDetailModal from '../components/socios/SocioDetailModal';

const AdminListaEspera = () => {
    const { token } = useAuthStore();
    const [socios, setSocios] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [expandedSocio, setExpandedSocio] = useState(null);

    // Socio Detail modal state
    const [socioDetailModalOpen, setSocioDetailModalOpen] = useState(false);
    const [viewingSocio, setViewingSocio] = useState(null);

    // Patient detail modal state
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [viewingPatient, setViewingPatient] = useState(null);
    const [viewingSocioName, setViewingSocioName] = useState('');

    const API = '/api/socios/pending';
    const APPROVE_API = '/api/socios';
    const headers = { Authorization: `Bearer ${token}` };

    const fetchSocios = async () => {
        try {
            setLoading(true);
            const res = await axios.get(API, { headers });
            setSocios(res.data);
        } catch (error) {
            console.error('Error al cargar socios:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSocios();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Helpers ──
    const avatarColors = ['#dc3545', '#6E9EFF', '#FF9500', '#28a745', '#9c27b0', '#e91e63', '#00bcd4', '#ff5722'];
    const getAvatarColor = (name) => {
        let hash = 0;
        for (let i = 0; i < (name || '').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };
    const getInitials = (name, lastName) => {
        return ((name?.charAt(0) || '') + (lastName?.charAt(0) || '')).toUpperCase();
    };

    const calcAge = (birthDate) => {
        if (!birthDate) return null;
        const birth = new Date(birthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
        return age;
    };

    const togglePatients = (socioId) => {
        setExpandedSocio(expandedSocio === socioId ? null : socioId);
    };

    const openViewSocio = (socio) => {
        setViewingSocio(socio);
        setSocioDetailModalOpen(true);
    };

    const handleApproveSocio = async (socio) => {
        if (!socio.questionnaireComplete) {
            const miss = socio.questionnaireMissingSections || [];
            await Swal.fire({
                icon: 'warning',
                title: 'Formulario de alta incompleto',
                html:
                    miss.length > 0
                        ? `<p class="text-sm text-slate-600 mb-2">El postulador debe terminar el formulario antes de poder aprobarse.</p><ul class="text-left text-sm">${miss.map((s) => `<li>❌ ${s}</li>`).join('')}</ul>`
                        : '<p class="text-sm">El postulador aún no ha completado el formulario de alta.</p>',
                confirmButtonColor: '#6E9EFF',
            });
            return;
        }
        // Cargar configuración SEPA pública para decidir si hay que mostrar selección de plan
        let sepaPublic = { data: { sepaEnabled: false, memberChoosesPlan: false } };
        try {
            sepaPublic = await axios.get('/api/sepa-settings/public');
        } catch {
            sepaPublic = { data: { sepaEnabled: false, memberChoosesPlan: false } };
        }

        const shouldChoosePlan =
            sepaPublic.data?.sepaEnabled &&
            (sepaPublic.data?.memberChoosesPlan || !sepaPublic.data?.defaultPlanTemplateId);

        // Si no hay que elegir plan, aprobar como antes
        if (!shouldChoosePlan) {
            const result = await Swal.fire({
                title: '¿Aprobar solicitud?',
                html: `¿Deseas aprobar el registro de <strong>${socio.name} ${socio.lastName}</strong>? Tendrá acceso a la plataforma.`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#6c757d',
                confirmButtonText: 'Sí, aprobar',
                cancelButtonText: 'Cancelar',
            });
            if (!result.isConfirmed) return;

            try {
                await axios.patch(
                    `${APPROVE_API}/${socio.id}/status`,
                    { status: 'ACTIVE' },
                    { headers }
                );
                Swal.fire({
                    icon: 'success',
                    title: 'Aprobado',
                    text: 'El socio ha sido validado correctamente.',
                    timer: 2000,
                    confirmButtonColor: '#10b981',
                });
                fetchSocios();
            } catch (error) {
                const d = error.response?.data;
                if (d?.missingSections?.length) {
                    await Swal.fire({
                        icon: 'error',
                        title: d.message || 'No se puede aprobar',
                        html: `<ul class="text-left text-sm" style="margin:0;padding-left:1.2em">${d.missingSections.map((s) => `<li>❌ ${s}</li>`).join('')}</ul>`,
                        confirmButtonColor: '#6E9EFF',
                    });
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: d?.message || 'No se pudo aprobar la solicitud.' });
                }
            }
            return;
        }

        // Modal de selección de plan (cards)
        let templates = [];
        try {
            const tr = await axios.get('/api/sepa-recibos/templates/public');
            templates = Array.isArray(tr.data?.templates) ? tr.data.templates : [];
        } catch {
            templates = [];
        }
        if (!templates.length) {
            return Swal.fire({
                icon: 'warning',
                title: 'Sin plantillas',
                text: 'No hay plantillas disponibles. Crea plantillas en Recibos SEPA → Plantillas.',
                confirmButtonColor: '#6E9EFF',
            });
        }

        // Selección por defecto: lo que eligió el socio (si existe), si no mensual, si no primera
        const proposed = socio?.sepaProposedTemplateId != null ? Number(socio.sepaProposedTemplateId) : null;
        const monthly = templates.find((t) => t.frequency === 'MONTHLY');
        const defaultId = proposed || sepaPublic.data?.defaultPlanTemplateId || monthly?.id || templates[0].id;

        const decideLaterCard = `
<button type="button" class="sepa-plan-card group w-full text-left rounded-2xl border border-dashed border-slate-300 bg-white p-4 hover:bg-slate-50 transition-colors" data-id="">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span class="inline-block h-2.5 w-2.5 rounded-full bg-slate-300 group-[.is-selected]:bg-[#6E9EFF]"></span>
        <div class="font-extrabold text-slate-900">Decidir más adelante</div>
      </div>
      <div class="mt-2 text-sm text-slate-600 leading-relaxed">
        Aprueba el socio sin asignar una cuota todavía. Podrás configurarla después desde la ficha del socio.
      </div>
    </div>
    <div class="shrink-0 font-extrabold text-slate-400">—</div>
  </div>
</button>`;

        const cardsHtml = templates
            .map((t) => {
                const freqLabel =
                    t.frequency === 'MONTHLY' ? 'Mensual' : t.frequency === 'QUARTERLY' ? 'Trimestral' : t.frequency === 'YEARLY' ? 'Anual' : t.frequency;
                const euros = ((Number(t.amountCents || 0) / 100).toFixed(2)).replace('.', ',') + ' €';
                return `
<button type="button" class="sepa-plan-card group w-full text-left rounded-2xl border border-slate-200 bg-white p-4 hover:bg-slate-50 transition-colors" data-id="${t.id}">
  <div class="flex items-start justify-between gap-4">
    <div class="min-w-0">
      <div class="flex items-center gap-2">
        <span class="inline-block h-2.5 w-2.5 rounded-full bg-slate-300 group-[.is-selected]:bg-[#6E9EFF]"></span>
        <div class="font-extrabold text-slate-900 truncate">${t.name}</div>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        <span class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-700">${freqLabel}</span>
        <span class="truncate max-w-[420px]">${t.concept || ''}</span>
      </div>
    </div>
    <div class="shrink-0 font-extrabold text-slate-900">${euros}</div>
  </div>
</button>`;
            })
            .join('<div class="h-2"></div>');

        const approveRes = await Swal.fire({
            title: 'Selecciona la cuota',
            html: `
<div class="text-left text-slate-600 text-sm leading-relaxed mb-3">
  Apruebas a <strong class="text-slate-900">${socio.name} ${socio.lastName}</strong>. Elige la plantilla (plan de pago) y confirma.
</div>
<div id="sepa-plan-grid" class="flex flex-col gap-2 max-h-[46vh] overflow-auto pr-1">
  ${decideLaterCard}
  <div class="h-2"></div>
  ${cardsHtml}
</div>
<div class="text-left mt-4">
  <label class="block text-xs font-semibold text-slate-500 mb-1">Próxima fecha de cargo</label>
  <input id="sepa-next-charge" type="date" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]" />
  <p id="sepa-next-charge-hint" class="text-[11px] text-slate-400 mt-1">Opcional si decides más adelante.</p>
</div>`,
            icon: 'question',
            showCancelButton: true,
            buttonsStyling: false,
            customClass: {
                popup: 'rounded-2xl',
                title: 'text-slate-900 font-extrabold',
                htmlContainer: 'p-0 m-0',
                confirmButton:
                    'inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700',
                cancelButton:
                    'inline-flex items-center justify-center rounded-xl bg-slate-200 px-5 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-300',
                actions: 'gap-2',
            },
            confirmButtonText: 'Confirmar y aprobar',
            cancelButtonText: 'Cancelar',
            didOpen: () => {
                const grid = document.getElementById('sepa-plan-grid');
                const input = document.getElementById('sepa-next-charge');
                const hint = document.getElementById('sepa-next-charge-hint');
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                input.value = `${yyyy}-${mm}-${dd}`;
                grid.dataset.selectedId = String(defaultId);

                const applySelection = () => {
                    const selected = String(grid.dataset.selectedId || '');
                    grid.querySelectorAll('.sepa-plan-card').forEach((b) => {
                        const sel = String(b.dataset.id || '') === selected;
                        b.classList.toggle('is-selected', sel);
                        b.classList.toggle('ring-2', sel);
                        b.classList.toggle('ring-[#6E9EFF]', sel);
                        b.classList.toggle('border-[#6E9EFF]', sel);
                        b.classList.toggle('bg-indigo-50/40', sel);
                    });
                    const decideLater = !selected;
                    if (decideLater) {
                        input.disabled = true;
                        input.value = '';
                        if (hint) hint.textContent = 'No se asignará cuota ahora. Podrás configurarla después.';
                    } else {
                        input.disabled = false;
                        if (!input.value) input.value = `${yyyy}-${mm}-${dd}`;
                        if (hint) hint.textContent = 'Recomendado: hoy o próximos días.';
                    }
                };

                applySelection();

                grid.querySelectorAll('.sepa-plan-card').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        grid.dataset.selectedId = btn.dataset.id;
                        applySelection();
                    });
                });
            },
            preConfirm: () => {
                const grid = document.getElementById('sepa-plan-grid');
                const input = document.getElementById('sepa-next-charge');
                const selectedId = grid?.dataset?.selectedId;
                const dateVal = input?.value;
                // Si decide más adelante (selectedId vacío), permitimos aprobar sin plan ni fecha
                if (!selectedId) {
                    return { selectedId: null, dateVal: null };
                }
                if (!dateVal) {
                    Swal.showValidationMessage('Indica la próxima fecha de cargo.');
                    return false;
                }
                return { selectedId, dateVal };
            },
        });

        if (!approveRes.isConfirmed) return;
        try {
            await axios.patch(
                `${APPROVE_API}/${socio.id}/status`,
                {
                    status: 'ACTIVE',
                    sepaPlanTemplateId: approveRes.value.selectedId,
                    sepaPlanNextChargeAt: approveRes.value.dateVal,
                },
                { headers }
            );
            Swal.fire({
                icon: 'success',
                title: 'Aprobado',
                text: 'El socio ha sido validado correctamente.',
                timer: 2000,
                confirmButtonColor: '#10b981',
            });
            fetchSocios();
        } catch (error) {
            const d = error.response?.data;
            Swal.fire({ icon: 'error', title: 'Error', text: d?.message || 'No se pudo aprobar la solicitud.' });
        }
    };

    const handleContactSocio = async (socio) => {
        if (socio.contactedAt) {
            const date = new Date(socio.contactedAt).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
            Swal.fire({
                icon: 'info',
                title: 'Contacto Realizado',
                text: `Se contactó a ${socio.name} el ${date}`,
                confirmButtonColor: '#6E9EFF'
            });
            return;
        }

        const result = await Swal.fire({
            title: '¿Marcar como contactado?',
            html: `¿Confirmas que has contactado a <strong>${socio.name} ${socio.lastName}</strong>? Se guardará la fecha y hora actual.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, confirmar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await axios.patch(`${API}/${socio.id}/contacted`.replace('/pending', ''), {}, { headers });
                Swal.fire({ icon: 'success', title: 'Registrado', text: 'Se ha guardado el registro de contacto.', timer: 2000, confirmButtonColor: '#10b981' });
                fetchSocios();
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el registro.' });
            }
        }
    };

    // ── Patient Detail ──
    const openViewPatient = (patient, socio) => {
        setViewingPatient(patient);
        setViewingSocioName(`${socio.name} ${socio.lastName}`);
        setDetailModalOpen(true);
    };

    // ── Filtering ──
    const filteredSocios = socios.filter(socio => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
            (socio.name || '').toLowerCase().includes(searchLower) ||
            (socio.lastName || '').toLowerCase().includes(searchLower) ||
            (socio.memberCode || '').toLowerCase().includes(searchLower) ||
            (socio.email || '').toLowerCase().includes(searchLower) ||
            (socio.phone || '').toLowerCase().includes(searchLower) ||
            (socio.dni || '').toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === '' || socio.status === statusFilter;
        const matchesType = typeFilter === '' ||
            (typeFilter === 'CON_PACIENTES' ? (socio.patients?.length > 0) : (socio.patients?.length === 0));
        return matchesSearch && matchesStatus && matchesType;
    });

    // ── Slide Animation Component ──
    const SlideDown = ({ isOpen, children }) => {
        const contentRef = useRef(null);
        const [height, setHeight] = useState(0);

        useEffect(() => {
            if (isOpen && contentRef.current) {
                setHeight(contentRef.current.scrollHeight);
            } else {
                setHeight(0);
            }
        }, [isOpen, children]);

        return (
            <tr>
                <td colSpan="5" className="p-0 border-0">
                    <div
                        className="overflow-hidden transition-all duration-400 ease-in-out"
                        style={{
                            maxHeight: isOpen ? `${height + 20}px` : '0px',
                            opacity: isOpen ? 1 : 0,
                        }}
                    >
                        <div ref={contentRef}>
                            {children}
                        </div>
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="w-full bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {/* ===== Page Title ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Users size={26} className="text-blue-600 hidden sm:block" />
                        Lista de Espera
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Revisa y aprueba las solicitudes de nuevos socios ({socios.length})</p>
                </div>
            </div>

            {/* ===== Search & Filters Bar ===== */}
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] border border-slate-100 p-5 mb-6">
                <div className="flex flex-col lg:flex-row gap-4 items-end">
                    {/* Search */}
                    <div className="flex-1 min-w-0">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Search size={13} /> Buscador
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, código, teléfono, email..."
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>

                    {/* Tipo de Socio */}
                    <div className="w-full sm:w-52">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Users size={13} /> Tipo de Socio
                        </label>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todos los tipos</option>
                            <option value="CON_PACIENTES">Con pacientes</option>
                            <option value="SIN_PACIENTES">Sin pacientes</option>
                        </select>
                    </div>

                    {/* Estado */}
                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Eye size={13} /> Estado
                        </label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todos los estados</option>
                            <option value="ACTIVE">Activo</option>
                            <option value="INACTIVE">Inactivo</option>
                            <option value="PENDING">Pendiente</option>
                        </select>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <Filter size={14} /> Limpiar
                    </button>
                </div>
            </div>

            {/* ===== Socios Table ===== */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">
                                    <div className="flex items-center gap-1.5"><Users size={14} /> Socio</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">
                                    <div className="flex items-center gap-1.5"><Phone size={14} /> Contacto</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5"><Heart size={14} /> Pacientes</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Estado del trámite</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Acciones</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">Cargando socios...</td></tr>
                            ) : filteredSocios.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-14 text-center text-slate-400 text-base">No se encontraron socios.</td></tr>
                            ) : (
                                filteredSocios.map(socio => (
                                    <React.Fragment key={socio.id}>
                                        {/* Socio Row */}
                                        <tr className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default">
                                            {/* SOCIO */}
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div
                                                        className="flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-[14px] shadow-md ring-2 ring-white transition-transform duration-200 group-hover:scale-110 shrink-0"
                                                        style={{ backgroundColor: getAvatarColor(socio.name + socio.lastName) }}
                                                    >
                                                        {getInitials(socio.name, socio.lastName)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-slate-800 text-[15px] leading-tight uppercase">{socio.name} {socio.lastName}</p>
                                                        <p className="text-[12px] text-slate-400 mt-0.5">{socio.memberCode}</p>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* CONTACTO */}
                                            <td className="px-6 py-5">
                                                <div className="space-y-1">
                                                    {socio.phone && (
                                                        <p className="flex items-center gap-1.5 text-sm text-slate-600">
                                                            <Phone size={13} className="text-blue-400 shrink-0" /> {socio.phone}
                                                        </p>
                                                    )}
                                                    {socio.email && (
                                                        <p className="flex items-center gap-1.5 text-sm text-slate-500">
                                                            <Mail size={13} className="text-slate-400 shrink-0" /> {socio.email}
                                                        </p>
                                                    )}
                                                    {!socio.phone && !socio.email && (
                                                        <p className="text-sm text-slate-300">Sin datos</p>
                                                    )}
                                                </div>
                                            </td>

                                            {/* PACIENTES — Always show button */}
                                            <td className="px-6 py-5 text-center">
                                                <button
                                                    onClick={() => togglePatients(socio.id)}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-bold transition-all duration-200 ${expandedSocio === socio.id
                                                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                        }`}
                                                >
                                                    <Heart size={14} />
                                                    {socio.patients?.length > 0
                                                        ? `Ver pacientes (${socio.patients.length})`
                                                        : 'Pacientes'
                                                    }
                                                    {expandedSocio === socio.id
                                                        ? <ChevronUp size={14} />
                                                        : <ChevronDown size={14} />
                                                    }
                                                </button>
                                            </td>

                                            {/* Estado del trámite: formulario + validación */}
                                            <td className="px-6 py-5 text-center">
                                                {!socio.questionnaireComplete ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200/80" title="Aún faltan datos en el formulario de alta">
                                                        Pendiente de formulario
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200/80" title="Formulario completo: puede aprobar el alta">
                                                        Listo para aprobar
                                                    </span>
                                                )}
                                            </td>

                                            {/* ACCIONES */}
                                            <td className="px-4 py-5">
                                                <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                    <button onClick={() => openViewSocio(socio)} className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap">
                                                        <Eye size={14} /> <span className="hidden lg:inline">Ver detalle</span>
                                                    </button>
                                                    
                                                    <button 
                                                        onClick={() => handleContactSocio(socio)} 
                                                        className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold transition-all duration-150 active:scale-95 whitespace-nowrap ${
                                                            socio.contactedAt 
                                                                ? 'text-indigo-600 bg-indigo-50/80 hover:bg-indigo-100 hover:shadow' 
                                                                : 'text-amber-600 bg-amber-50/80 hover:bg-amber-100 hover:shadow'
                                                        }`}
                                                    >
                                                        <MessageCircle size={14} /> 
                                                        <span className="hidden lg:inline">
                                                            {socio.contactedAt ? 'Contactado' : 'Contactar'}
                                                        </span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={!socio.questionnaireComplete}
                                                        title={!socio.questionnaireComplete ? 'El postulador debe completar el formulario de alta antes de aprobar' : 'Aprobar alta como socio'}
                                                        onClick={() => handleApproveSocio(socio)}
                                                        className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold whitespace-nowrap transition-all duration-150 ${
                                                            socio.questionnaireComplete
                                                                ? 'text-white bg-green-500 hover:bg-green-600 hover:shadow active:scale-95'
                                                                : 'text-slate-400 bg-slate-200 cursor-not-allowed opacity-80'
                                                        }`}
                                                    >
                                                        <CheckCircle size={14} /> <span className="hidden lg:inline">Aprobar Socio</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Patients Section — Slide Down Animation */}
                                        <SlideDown isOpen={expandedSocio === socio.id}>
                                            <div className="bg-gradient-to-b from-slate-50 to-white px-6 py-5 border-t border-blue-100">
                                                {/* Header */}
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                                        <Heart size={16} className="text-rose-500" />
                                                        PACIENTES DE {socio.name.toUpperCase()} ({socio.patients?.length || 0})
                                                    </h4>
                                                </div>

                                                {/* Patient Cards */}
                                                {socio.patients?.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                                        {socio.patients.map(patient => {
                                                            const age = calcAge(patient.birthDate);
                                                            return (
                                                                <div
                                                                    key={patient.id}
                                                                    className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200/50 transition-all group/card"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        <div
                                                                            className="flex items-center justify-center w-11 h-11 rounded-full text-white font-bold text-[13px] shadow-sm shrink-0 transition-transform group-hover/card:scale-110"
                                                                            style={{ backgroundColor: getAvatarColor(patient.name + patient.lastName) }}
                                                                        >
                                                                            {getInitials(patient.name, patient.lastName)}
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-sm font-bold text-slate-700 truncate uppercase">{patient.name} {patient.lastName}</p>
                                                                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                                                {age !== null && (
                                                                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                                                        <Cake size={11} /> {age} años
                                                                                    </span>
                                                                                )}
                                                                                {patient.autismDegree && (
                                                                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600">
                                                                                        {patient.autismDegree === 'grado1' ? 'Grado 1' : patient.autismDegree === 'grado2' ? 'Grado 2' : patient.autismDegree === 'grado3' ? 'Grado 3' : 'Pendiente'}
                                                                                    </span>
                                                                                )}
                                                                                {patient.school && (
                                                                                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                                                                                        <School size={11} /> {patient.school}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-slate-100">
                                                                        <button onClick={() => openViewPatient(patient, socio)} className="p-1.5 rounded-md text-blue-500 hover:bg-blue-50 transition-colors" title="Ver detalle">
                                                                            <Eye size={14} />
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 bg-white rounded-xl border border-dashed border-slate-200">
                                                        <Heart size={28} className="mx-auto text-slate-200 mb-2" />
                                                        <p className="text-sm text-slate-400">Este socio no tiene pacientes registrados</p>
                                                    </div>
                                                )}
                                            </div>
                                        </SlideDown>
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Socio Detail Modal */}
            <SocioDetailModal
                isOpen={socioDetailModalOpen}
                onClose={() => setSocioDetailModalOpen(false)}
                socio={viewingSocio}
            />

            {/* Patient Detail Modal (View Only) */}
            <PatientDetailModal
                isOpen={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                patient={viewingPatient}
                socioName={viewingSocioName}
            />
        </div>
    );
};

export default AdminListaEspera;
