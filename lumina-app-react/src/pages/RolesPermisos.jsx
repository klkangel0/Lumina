import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Search, Filter, Plus, Eye, Edit3, Trash2, Shield, Users, CheckCircle2, Tag } from 'lucide-react';
import Button from '../components/Button';
import ViewPermissionsModal from '../components/roles/ViewPermissionsModal';
import EditRoleModal from '../components/roles/EditRoleModal';
import CreateRoleModal from '../components/roles/CreateRoleModal';
import Swal from 'sweetalert2';

const RolesPermisos = () => {
    const { token } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [roles, setRoles] = useState([]);
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    // View modal
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [viewRole, setViewRole] = useState(null);
    const [viewPerms, setViewPerms] = useState([]);

    // Edit modal
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editRole, setEditRole] = useState(null);
    const [editPerms, setEditPerms] = useState([]);

    // Create modal
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Auto-open create modal if ?crear=true
    useEffect(() => {
        if (searchParams.get('crear') === 'true') {
            setIsCreateOpen(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    const API = '/api/roles';
    const headers = { Authorization: `Bearer ${token}` };

    const fetchRoles = async () => {
        try {
            setLoading(true);
            const [rolesRes, modulesRes] = await Promise.all([
                axios.get(API, { headers }),
                axios.get(`${API}/modulos`, { headers }),
            ]);
            setRoles(rolesRes.data);
            setModules(modulesRes.data);
        } catch (error) {
            console.error('Error al cargar roles:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── View permissions ──
    const handleView = async (role) => {
        try {
            const res = await axios.get(`${API}/${role.id}/permisos`, { headers });
            setViewRole(role);
            setViewPerms(res.data);
            setIsViewOpen(true);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };

    // ── Edit role ──
    const handleOpenEdit = async (role) => {
        try {
            const res = await axios.get(`${API}/${role.id}/permisos`, { headers });
            setEditRole(role);
            setEditPerms(res.data);
            setIsEditOpen(true);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        }
    };

    const handleSaveEdit = async (data) => {
        try {
            await axios.put(`${API}/${editRole.id}`, data, { headers });
            setIsEditOpen(false);
            Swal.fire({
                icon: 'success',
                title: '¡Actualizado!',
                text: 'Rol actualizado correctamente.',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
            });
            fetchRoles();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'No se pudo actualizar el rol.',
                confirmButtonColor: '#6E9EFF',
            });
        }
    };

    // ── Create role ──
    const handleSaveCreate = async (data) => {
        try {
            await axios.post(API, data, { headers });
            setIsCreateOpen(false);
            Swal.fire({
                icon: 'success',
                title: '¡Creado!',
                text: 'Rol creado correctamente.',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
            });
            fetchRoles();
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'No se pudo crear el rol.',
                confirmButtonColor: '#6E9EFF',
            });
        }
    };

    // ── Delete role ──
    const handleDelete = async (role) => {
        if (role.isSystem) {
            Swal.fire({
                icon: 'warning',
                title: 'Acción no permitida',
                text: 'No se puede eliminar un rol del sistema.',
                confirmButtonColor: '#6E9EFF',
            });
            return;
        }

        const result = await Swal.fire({
            icon: 'warning',
            title: '¿Eliminar rol?',
            html: `<p style="color: #64748b; font-size: 0.9375rem;">Vas a eliminar permanentemente el rol <strong>"${role.displayName}"</strong>. Esta acción no se puede deshacer.</p>`,
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#e5e7eb',
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`${API}/${role.id}`, { headers });
                Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: `El rol "${role.displayName}" ha sido eliminado.`,
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                });
                fetchRoles();
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: error.response?.data?.message || 'No se pudo eliminar el rol.',
                    confirmButtonColor: '#6E9EFF',
                });
            }
        }
    };

    // ── Filtering ──
    const filteredRoles = roles.filter(role => {
        const searchLower = search.toLowerCase();
        const matchesSearch =
            (role.displayName || '').toLowerCase().includes(searchLower) ||
            (role.description || '').toLowerCase().includes(searchLower) ||
            (role.name || '').toLowerCase().includes(searchLower);
        const matchesStatus = statusFilter === '' || (statusFilter === '1' ? role.active : !role.active);
        const matchesType = typeFilter === '' || (typeFilter === '1' ? role.isSystem : !role.isSystem);
        return matchesSearch && matchesStatus && matchesType;
    });

    // ── Helpers ──
    const getAvatarBg = (role) => role.color || '#6c757d';

    return (
        <div className="w-full bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {/* ===== Page Title ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Shield size={26} className="text-blue-600 hidden sm:block" />
                        Roles y Permisos
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Gestiona roles de usuario y sus permisos de acceso al sistema</p>
                </div>
                <Button
                    className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-lumina-blue text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto"
                    onClick={() => setIsCreateOpen(true)}
                >
                    <Plus size={16} className="mr-2" />
                    Dar de alta un nuevo rol
                </Button>
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
                                placeholder="Buscar por nombre, descripción..."
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>

                    {/* Estado */}
                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <CheckCircle2 size={13} /> Estado
                        </label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todos los estados</option>
                            <option value="1">Activo</option>
                            <option value="0">Inactivo</option>
                        </select>
                    </div>

                    {/* Tipo */}
                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Tag size={13} /> Tipo
                        </label>
                        <select
                            value={typeFilter}
                            onChange={e => setTypeFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todos los tipos</option>
                            <option value="1">Sistema</option>
                            <option value="0">Personalizado</option>
                        </select>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); }}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <Filter size={14} /> Restablecer filtros
                    </button>
                </div>
            </div>

            {/* ===== Roles Table ===== */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-left">
                                    <div className="flex items-center gap-1.5"><Shield size={14} /> Rol</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5"><Users size={14} /> Usuarios</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5"><CheckCircle2 size={14} /> Módulos con acceso</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Acciones</div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-14 text-center text-slate-400 text-base">Cargando roles...</td></tr>
                            ) : filteredRoles.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-14 text-center text-slate-400 text-base">No se encontraron roles.</td></tr>
                            ) : (
                                filteredRoles.map(role => (
                                    <tr
                                        key={role.id}
                                        className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default"
                                    >
                                        {/* ROL */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className="flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-[15px] shadow-md ring-2 ring-white transition-transform duration-200 group-hover:scale-110 shrink-0"
                                                    style={{ backgroundColor: getAvatarBg(role) }}
                                                >
                                                    {role.displayName?.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <p className="font-bold text-slate-800 text-[15px] leading-tight">{role.displayName}</p>
                                                        {role.isSystem ? (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 whitespace-nowrap">
                                                                <Shield size={9} className="mr-0.5" /> Sistema
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 whitespace-nowrap">
                                                                Personalizado
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[12px] text-slate-400 mt-0.5 line-clamp-1">{role.description || '—'}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* USUARIOS */}
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-blue-50 text-blue-600">
                                                <Users size={13} /> {role.totalUsers} usuarios
                                            </span>
                                        </td>

                                        {/* MÓDULOS CON ACCESO */}
                                        <td className="px-6 py-5 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold bg-emerald-50 text-emerald-600">
                                                <CheckCircle2 size={13} /> {role.totalModules} módulos
                                            </span>
                                        </td>

                                        {/* ACCIONES */}
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                <button
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    onClick={() => handleView(role)}
                                                >
                                                    <Eye size={14} /> <span className="hidden md:inline">Visualizar</span>
                                                </button>
                                                {role.name !== 'admin' && (
                                                    <button
                                                        className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-yellow-700 bg-yellow-50/80 hover:bg-yellow-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                        onClick={() => handleOpenEdit(role)}
                                                    >
                                                        <Edit3 size={14} /> <span className="hidden md:inline">Modificar permisos</span>
                                                    </button>
                                                )}
                                                {!role.isSystem && (
                                                    <button
                                                        className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50/80 hover:bg-red-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                        onClick={() => handleDelete(role)}
                                                    >
                                                        <Trash2 size={14} /> <span className="hidden md:inline">Eliminar</span>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ===== Modals ===== */}
            <ViewPermissionsModal
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                role={viewRole}
                permissions={viewPerms}
                modules={modules}
            />
            <EditRoleModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                role={editRole}
                permissions={editPerms}
                modules={modules}
                onSave={handleSaveEdit}
            />
            <CreateRoleModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                modules={modules}
                onSave={handleSaveCreate}
            />
        </div>
    );
};

export default RolesPermisos;
