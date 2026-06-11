import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import useAuthStore, { usePermissions } from '../store/authStore';
import {
    Bell,
    Inbox,
    Send,
    History,
    Loader2,
    AlertCircle,
    CheckCircle2,
    UserSearch,
    ChevronRight,
    Megaphone,
} from 'lucide-react';
import Swal from 'sweetalert2';

const API = '/api';

const DELIVERY_OPTIONS = [
    {
        value: 'single_user',
        label: 'Un usuario concreto',
        hint: 'Busque por nombre, usuario, correo o código de socio. Útil para mensajes individuales.',
    },
    {
        value: 'socios_activos',
        label: 'Todos los socios dados de alta',
        hint: 'Usuarios con ficha de socio activa (ya aprobados por administración).',
    },
    {
        value: 'postuladores',
        label: 'Personas en lista de espera',
        hint: 'Postulantes pendientes de validación por la junta.',
    },
    {
        value: 'personal_interno',
        label: 'Equipo con acceso al panel de gestión',
        hint: 'Cuentas de administración y personal interno (no incluye socios ni postulantes).',
    },
    {
        value: 'cuentas_administrador',
        label: 'Solo perfiles Administrador del sistema',
        hint: 'Usuarios con rol de plataforma «ADMIN» (ámbito técnico / máximo nivel).',
    },
    {
        value: 'rol_aplicacion',
        label: 'Por rol de aplicación',
        hint: 'Dirigido a quienes tengan asignado un rol concreto (p. ej. Junta, RR. HH.).',
    },
];

export default function Avisos() {
    const { token } = useAuthStore();
    const { isAdmin, isSocio, canCreate, canEdit } = usePermissions();
    const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

    const canManage = isAdmin || (canCreate('notificaciones') && canEdit('notificaciones'));

    const [tab, setTab] = useState('inbox');
    const [loadingInbox, setLoadingInbox] = useState(true);
    const [inbox, setInbox] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [expandedId, setExpandedId] = useState(null);

    const [sent, setSent] = useState([]);
    const [loadingSent, setLoadingSent] = useState(false);

    const [roles, setRoles] = useState([]);
    const [searchQ, setSearchQ] = useState('');
    const [searchHits, setSearchHits] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [importance, setImportance] = useState('NORMAL');
    const [deliveryType, setDeliveryType] = useState('socios_activos');
    const [appRoleId, setAppRoleId] = useState('');
    const [sending, setSending] = useState(false);

    const loadInbox = useCallback(async () => {
        setLoadingInbox(true);
        try {
            const [a, b] = await Promise.all([
                axios.get(`${API}/notifications/me`, { headers }),
                axios.get(`${API}/notifications/me/unread-count`, { headers }),
            ]);
            setInbox(a.data?.items || []);
            setUnreadCount(b.data?.count ?? 0);
        } catch (e) {
            console.error(e);
            const detail =
                e.response?.data?.message ||
                (e.code === 'ERR_NETWORK' ? 'No hay conexión con el servidor API.' : null);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: detail || 'No se pudo cargar la bandeja de avisos.',
            });
        } finally {
            setLoadingInbox(false);
        }
    }, [headers]);

    const loadSent = useCallback(async () => {
        if (!canManage) return;
        setLoadingSent(true);
        try {
            const res = await axios.get(`${API}/notifications/sent`, { headers });
            setSent(res.data || []);
        } catch (e) {
            console.error(e);
            const detail =
                e.response?.data?.message ||
                (e.code === 'ERR_NETWORK' ? 'No hay conexión con el servidor API.' : null);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: detail || 'No se pudo cargar el historial enviado.',
            });
        } finally {
            setLoadingSent(false);
        }
    }, [headers, canManage]);

    const loadRoles = useCallback(async () => {
        if (!canManage) return;
        try {
            const res = await axios.get(`${API}/notifications/roles-for-targeting`, { headers });
            setRoles(res.data || []);
        } catch (e) {
            console.error(e);
        }
    }, [headers, canManage]);

    useEffect(() => {
        loadInbox();
    }, [loadInbox]);

    useEffect(() => {
        if (tab === 'sent' && canManage) loadSent();
    }, [tab, canManage, loadSent]);

    useEffect(() => {
        if (canManage && deliveryType === 'rol_aplicacion' && roles.length === 0) loadRoles();
    }, [canManage, deliveryType, roles.length, loadRoles]);

    useEffect(() => {
        if (!canManage || deliveryType !== 'single_user') return;
        const q = searchQ.trim();
        if (q.length < 2) {
            setSearchHits([]);
            return;
        }
        const t = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await axios.get(`${API}/notifications/search-users`, { headers, params: { q } });
                setSearchHits(res.data || []);
            } catch (e) {
                console.error(e);
                setSearchHits([]);
            } finally {
                setSearchLoading(false);
            }
        }, 320);
        return () => clearTimeout(t);
    }, [searchQ, deliveryType, canManage, headers]);

    const markRead = async (notificationId) => {
        try {
            await axios.patch(`${API}/notifications/me/${notificationId}/read`, {}, { headers });
            loadInbox();
        } catch (e) {
            console.error(e);
        }
    };

    const handleOpenItem = (item) => {
        const id = item.notification.id;
        setExpandedId(expandedId === id ? null : id);
        if (!item.readAt) markRead(id);
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Falta el asunto', text: 'Escribe un asunto para el aviso.' });
        }
        if (!body.trim()) {
            return Swal.fire({ icon: 'warning', title: 'Falta el mensaje', text: 'Escribe el contenido del aviso.' });
        }

        const delivery = { type: deliveryType };
        if (deliveryType === 'single_user') {
            if (!selectedUser?.id) {
                return Swal.fire({ icon: 'warning', title: 'Selecciona destinatario', text: 'Busca y elige una persona de la lista.' });
            }
            delivery.userId = selectedUser.id;
        }
        if (deliveryType === 'rol_aplicacion') {
            if (!appRoleId) {
                return Swal.fire({ icon: 'warning', title: 'Elige un rol', text: 'Selecciona el rol de aplicación destinatario.' });
            }
            delivery.appRoleId = parseInt(appRoleId, 10);
        }

        const confirm = await Swal.fire({
            icon: 'question',
            title: '¿Enviar este aviso?',
            html: `<p class="text-sm text-slate-600 text-left">El mensaje se entregará según el alcance elegido. Esta acción no se puede deshacer.</p>`,
            showCancelButton: true,
            confirmButtonText: 'Enviar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#6E9EFF',
        });
        if (!confirm.isConfirmed) return;

        setSending(true);
        try {
            await axios.post(
                `${API}/notifications`,
                { title: title.trim(), body: body.trim(), importance, delivery },
                { headers }
            );
            await Swal.fire({
                icon: 'success',
                title: 'Aviso enviado',
                text: 'Los destinatarios lo verán en su bandeja de avisos.',
                confirmButtonColor: '#6E9EFF',
            });
            setTitle('');
            setBody('');
            setImportance('NORMAL');
            setDeliveryType('socios_activos');
            setSelectedUser(null);
            setSearchQ('');
            setAppRoleId('');
            setTab('sent');
            loadSent();
        } catch (err) {
            const msg = err.response?.data?.message || 'No se pudo enviar.';
            Swal.fire({ icon: 'error', title: 'Error', text: msg });
        } finally {
            setSending(false);
        }
    };

    const currentDelivery = DELIVERY_OPTIONS.find((d) => d.value === deliveryType);

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6E9EFF] to-indigo-500 text-white shadow-lg shadow-blue-500/20">
                            <Bell size={22} />
                        </span>
                        Avisos
                    </h1>
                    <p className="text-slate-600 mt-2 text-sm max-w-xl">
                        {isSocio
                            ? 'Comunicaciones oficiales del centro. Los avisos nuevos se marcan automáticamente al abrirlos.'
                            : 'Comunicaciones internas. Si tienes permiso de redacción, puedes enviar avisos a colectivos concretos o a una persona.'}
                    </p>
                </div>
                {!loadingInbox && unreadCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 text-amber-900 text-xs font-bold px-3 py-1.5 border border-amber-200 self-start">
                        {unreadCount} sin leer
                    </span>
                )}
            </div>

            <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-1">
                <button
                    type="button"
                    onClick={() => setTab('inbox')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                        tab === 'inbox' ? 'bg-[#6E9EFF] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                    <Inbox size={18} /> Recibidos
                </button>
                {canManage && (
                    <>
                        <button
                            type="button"
                            onClick={() => setTab('compose')}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                                tab === 'compose' ? 'bg-[#6E9EFF] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <Megaphone size={18} /> Nueva comunicación
                        </button>
                        <button
                            type="button"
                            onClick={() => setTab('sent')}
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                                tab === 'sent' ? 'bg-[#6E9EFF] text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            <History size={18} /> Enviados
                        </button>
                    </>
                )}
            </div>

            {tab === 'inbox' && (
                <div className="space-y-3">
                    {loadingInbox ? (
                        <div className="flex justify-center py-16 text-slate-500 gap-2">
                            <Loader2 className="animate-spin" size={22} /> Cargando…
                        </div>
                    ) : inbox.length === 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
                            <CheckCircle2 className="mx-auto text-emerald-500 mb-3" size={36} />
                            <p className="font-medium text-slate-700">No tienes avisos nuevos.</p>
                            <p className="text-sm mt-1">Cuando reciba comunicaciones aparecerán aquí.</p>
                        </div>
                    ) : (
                        inbox.map((item) => {
                            const n = item.notification;
                            const open = expandedId === n.id;
                            return (
                                <div
                                    key={item.receiptId}
                                    className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition ${
                                        item.readAt ? 'border-slate-200' : 'border-[#6E9EFF]/40 ring-1 ring-[#6E9EFF]/15'
                                    }`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => handleOpenItem(item)}
                                        className="w-full text-left px-5 py-4 flex items-start gap-3 hover:bg-slate-50/80"
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {n.importance === 'ALTA' ? (
                                                <AlertCircle className="text-amber-500" size={20} />
                                            ) : (
                                                <Bell className="text-[#6E9EFF]" size={20} />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-slate-900">{n.title}</span>
                                                {!item.readAt && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                                        Nuevo
                                                    </span>
                                                )}
                                                {n.importance === 'ALTA' && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                                                        Prioridad alta
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {n.author?.name || n.author?.username || 'Equipo'} ·{' '}
                                                {new Date(n.createdAt).toLocaleString('es-ES', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'short',
                                                })}
                                            </p>
                                        </div>
                                        <ChevronRight
                                            className={`shrink-0 text-slate-400 transition ${open ? 'rotate-90' : ''}`}
                                            size={20}
                                        />
                                    </button>
                                    {open && (
                                        <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                                            <div className="mt-4 text-sm text-slate-800 whitespace-pre-wrap leading-relaxed pl-9">
                                                {n.body}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {tab === 'compose' && canManage && (
                <form onSubmit={handleSend} className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8 space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Asunto</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            maxLength={200}
                            placeholder="Resuma el contenido en una línea"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]/30 focus:border-[#6E9EFF]"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Mensaje</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={10}
                            maxLength={12000}
                            placeholder="Escribe el contenido del aviso…"
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]/30 focus:border-[#6E9EFF] resize-y min-h-[160px]"
                        />
                        <p className="text-xs text-slate-400 mt-1">{body.length} / 12.000</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Importancia</label>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="radio"
                                    name="imp"
                                    checked={importance === 'NORMAL'}
                                    onChange={() => setImportance('NORMAL')}
                                    className="text-[#6E9EFF]"
                                />
                                Normal
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="radio"
                                    name="imp"
                                    checked={importance === 'ALTA'}
                                    onChange={() => setImportance('ALTA')}
                                    className="text-[#6E9EFF]"
                                />
                                Alta visibilidad (urgente o muy relevante)
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Destinatarios</label>
                        <select
                            value={deliveryType}
                            onChange={(e) => {
                                setDeliveryType(e.target.value);
                                setSelectedUser(null);
                                setSearchQ('');
                                setSearchHits([]);
                            }}
                            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#6E9EFF]/30 focus:border-[#6E9EFF]"
                        >
                            {DELIVERY_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                        {currentDelivery && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{currentDelivery.hint}</p>}
                    </div>

                    {deliveryType === 'single_user' && (
                        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-3">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wide">
                                <UserSearch size={14} /> Búsqueda de persona
                            </label>
                            <input
                                type="search"
                                value={searchQ}
                                onChange={(e) => setSearchQ(e.target.value)}
                                placeholder="Mínimo 2 caracteres: nombre, usuario, email, código SOC-…"
                                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                            />
                            {searchLoading && <p className="text-xs text-slate-500">Buscando…</p>}
                            {selectedUser && (
                                <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm">
                                    <span>
                                        <strong>{selectedUser.name}</strong> · @{selectedUser.username}
                                        {selectedUser.socio?.memberCode && (
                                            <span className="text-slate-600"> · {selectedUser.socio.memberCode}</span>
                                        )}
                                    </span>
                                    <button type="button" className="text-xs font-semibold text-red-600" onClick={() => setSelectedUser(null)}>
                                        Quitar
                                    </button>
                                </div>
                            )}
                            {!selectedUser && searchHits.length > 0 && (
                                <ul className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                                    {searchHits.map((u) => (
                                        <li key={u.id}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedUser(u)}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-blue-50/80"
                                            >
                                                <span className="font-semibold text-slate-800">{u.name}</span>
                                                <span className="text-slate-500"> @{u.username}</span>
                                                {u.email && <span className="block text-xs text-slate-400">{u.email}</span>}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    {deliveryType === 'rol_aplicacion' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Rol de aplicación</label>
                            <select
                                value={appRoleId}
                                onChange={(e) => setAppRoleId(e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
                            >
                                <option value="">Seleccione…</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.displayName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={sending}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#6E9EFF] to-indigo-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:opacity-95 disabled:opacity-50"
                        >
                            {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                            Enviar comunicación
                        </button>
                    </div>
                </form>
            )}

            {tab === 'sent' && canManage && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {loadingSent ? (
                        <div className="flex justify-center py-16 text-slate-500 gap-2">
                            <Loader2 className="animate-spin" size={22} /> Cargando…
                        </div>
                    ) : sent.length === 0 ? (
                        <p className="p-8 text-center text-slate-500 text-sm">Aún no has enviado ninguna comunicación.</p>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {sent.map((row) => (
                                <li key={row.id} className="px-5 py-4">
                                    <p className="font-semibold text-slate-900">{row.title}</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {row.audienceSummary} · {row.recipientCount} destinatario
                                        {row.recipientCount !== 1 ? 's' : ''}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {new Date(row.createdAt).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
