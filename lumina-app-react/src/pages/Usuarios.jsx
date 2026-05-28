import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { Search, Filter, Plus, Eye, Edit3, Trash2, Shield, User, Users, CheckCircle2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import UserModal from '../components/usuarios/UserModal';
import UserProfileModal from '../components/usuarios/UserProfileModal';
import Swal from 'sweetalert2';

const Usuarios = () => {
    const { token, user: currentUser } = useAuthStore();
    const [searchParams, setSearchParams] = useSearchParams();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Sort state: column name and direction (asc/desc/null)
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [profileUser, setProfileUser] = useState(null);

    // Auto-open create modal if ?crear=true
    useEffect(() => {
        if (searchParams.get('crear') === 'true') {
            setSelectedUser(null);
            setIsModalOpen(true);
            setSearchParams({}, { replace: true });
        }
    }, [searchParams]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await axios.get('/api/usuarios', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (userId, username) => {
        if (userId === currentUser?.id) {
            Swal.fire({
                icon: 'warning',
                title: 'Acción no permitida',
                text: 'No puedes eliminar tu propia cuenta mientras estás conectado.',
                confirmButtonText: 'Entendido',
                confirmButtonColor: '#6E9EFF',
            });
            return;
        }

        const result = await Swal.fire({
            icon: 'warning',
            title: '¿Estás seguro?',
            html: `<p style="color: #64748b; font-size: 0.9375rem;">Vas a eliminar permanentemente al usuario <strong>"${username}"</strong>. Esta acción no se puede deshacer.</p>`,
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#e5e7eb',
            reverseButtons: true,
        });

        if (result.isConfirmed) {
            try {
                await axios.delete(`/api/usuarios/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(users.filter(u => u.id !== userId));

                Swal.fire({
                    icon: 'success',
                    title: '¡Eliminado!',
                    text: `El usuario "${username}" ha sido eliminado correctamente.`,
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true,
                });
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo eliminar el usuario. Inténtalo de nuevo.',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#6E9EFF',
                });
            }
        }
    };

    const handleOpenCreate = () => {
        setSelectedUser(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (u) => {
        setSelectedUser(u);
        setIsModalOpen(true);
    };

    const handleViewProfile = (u) => {
        setProfileUser(u);
        setIsProfileOpen(true);
    };

    const handleSaveModal = (savedUser, action) => {
        if (action === 'create') {
            setUsers([...users, savedUser]);
        } else {
            setUsers(users.map(u => u.id === savedUser.id ? savedUser : u));
        }
    };

    // 3-state sort toggle: null → asc → desc → null
    const handleSort = (column) => {
        if (sortColumn !== column) {
            // New column: start ascending
            setSortColumn(column);
            setSortDirection('asc');
        } else if (sortDirection === 'asc') {
            setSortDirection('desc');
        } else {
            // Reset
            setSortColumn(null);
            setSortDirection(null);
        }
    };

    const getSortIcon = (column) => {
        if (sortColumn !== column) return <ChevronsUpDown size={14} className="opacity-40" />;
        if (sortDirection === 'asc') return <ChevronUp size={14} />;
        return <ChevronDown size={14} />;
    };

    const filteredUsers = users.filter(user => {
        const searchLower = search.toLowerCase();
        const matchesSearch = (user.name || '').toLowerCase().includes(searchLower) ||
            (user.username || '').toLowerCase().includes(searchLower) ||
            (user.email || '').toLowerCase().includes(searchLower);
        const matchesRole = roleFilter ? user.role === roleFilter : true;
        return matchesSearch && matchesRole;
    });

    // Apply sorting
    if (sortColumn && sortDirection) {
        filteredUsers.sort((a, b) => {
            const valA = (a[sortColumn] || '').toLowerCase();
            const valB = (b[sortColumn] || '').toLowerCase();
            const cmp = valA.localeCompare(valB, 'es');
            return sortDirection === 'asc' ? cmp : -cmp;
        });
    }

    // --- Helper: get initials from name ---
    const getInitials = (name) => {
        if (!name) return '??';
        const parts = name.trim().split(' ').filter(Boolean);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    // --- Helper: deterministic avatar color ---
    const avatarColors = [
        'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
        'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-orange-500',
    ];
    const getAvatarColor = (name) => {
        if (!name) return avatarColors[0];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };

    // --- Helper: role badge ---
    const getRoleBadge = (user) => {
        // If user has an AppRole, use its displayName and color
        if (user.appRole) {
            return (
                <span
                    className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide text-white shadow-sm"
                    style={{ backgroundColor: user.appRole.color }}
                >
                    {user.appRole.displayName.toUpperCase()}
                </span>
            );
        }
        // Fallback to enum
        switch (user.role) {
            case 'ADMIN':
                return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-red-500 text-white shadow-sm">ADMINISTRADOR</span>;
            case 'SOCIO':
                return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-emerald-500 text-white shadow-sm">SOCIO</span>;
            case 'WORKER':
                return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-slate-500 text-white shadow-sm">USUARIO</span>;
            default:
                return <span className="inline-flex items-center px-4 py-1.5 rounded-full text-[11px] font-bold tracking-wide bg-orange-500 text-white shadow-sm">OTRO</span>;
        }
    };

    return (
        <div className="w-full bg-white min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8">
            {/* ===== Page Title (like legacy PHP) ===== */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <Users size={26} className="text-blue-600 hidden sm:block" />
                        Gestión de Usuarios
                    </h1>
                    <p className="text-slate-400 text-sm mt-1 sm:ml-10">Administra todos los usuarios del sistema</p>
                </div>
                <Button className="shrink-0 font-bold px-4 sm:px-6 py-2.5 rounded-full text-sm bg-lumina-blue text-white hover:bg-blue-700 shadow-md hover:shadow-lg transition-all w-full sm:w-auto" onClick={handleOpenCreate}>
                    <Plus size={16} className="mr-2" />
                    Dar de alta un nuevo usuario
                </Button>
            </div>

            {/* ===== Search & Filters Bar (like legacy PHP) ===== */}
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
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por nombre, descripción..."
                                className="w-full pl-4 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            />
                            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" />
                        </div>
                    </div>

                    {/* Filter by Role */}
                    <div className="w-full sm:w-48">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <Shield size={13} /> Filtrar por rol
                        </label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                        >
                            <option value="">Todos los roles</option>
                            <option value="ADMIN">Administrador</option>
                            <option value="WORKER">Usuario</option>
                        </select>
                    </div>

                    {/* Reset */}
                    <button
                        onClick={() => { setSearch(''); setRoleFilter(''); }}
                        className="px-4 py-2.5 text-sm font-semibold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-all flex items-center gap-1.5 shrink-0"
                    >
                        <Filter size={14} /> Restablecer filtros
                    </button>
                </div>
            </div>
            {/* Apple-style User Table */}
            <div className="bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        {/* ---- Gradient Header ---- */}
                        <thead>
                            <tr className="bg-blue-50/80 border-b-2 border-blue-100">
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center justify-center gap-1.5"><User size={14} /> Usuario {getSortIcon('name')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('email')}>
                                    <div className="flex items-center justify-center gap-1.5"><Search size={14} /> Email {getSortIcon('email')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center cursor-pointer select-none hover:bg-blue-100/60 transition-colors" onClick={() => handleSort('role')}>
                                    <div className="flex items-center justify-center gap-1.5"><Shield size={14} /> Rol {getSortIcon('role')}</div>
                                </th>
                                <th className="px-6 py-3.5 text-[12px] font-bold uppercase tracking-wider text-blue-500 text-center">
                                    <div className="flex items-center justify-center gap-1.5">Acciones</div>
                                </th>
                            </tr>
                        </thead>

                        {/* ---- Table Body ---- */}
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-14 text-center text-slate-400 text-base">Cargando usuarios...</td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-14 text-center text-slate-400 text-base">No se encontraron usuarios.</td></tr>
                            ) : (
                                filteredUsers.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="border-b border-slate-100/70 last:border-b-0 group transition-all duration-200 ease-out hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/30 hover:shadow-[0_2px_16px_-4px_rgba(59,130,246,0.18)] hover:-translate-y-[1px] cursor-default"
                                    >
                                        {/* -- Usuario -- */}
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="relative shrink-0">
                                                    <div className={`flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-[15px] shadow-md ring-2 ring-white ${getAvatarColor(u.name || u.username)} transition-transform duration-200 group-hover:scale-110`}>
                                                        {getInitials(u.name || u.username)}
                                                    </div>
                                                    {u.id === currentUser?.id && (
                                                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-[2.5px] border-white rounded-full shadow-sm"></div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-800 text-[15px] uppercase leading-tight truncate">{u.name || u.username}</p>
                                                    <p className="text-[12px] text-slate-400 mt-0.5">{u.appRole?.displayName || (u.role === 'ADMIN' ? 'Administrador del Sistema' : 'Usuario')}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* -- Email -- */}
                                        <td className="px-6 py-5">
                                            <span className="text-[14px] text-blue-600 font-medium tracking-wide">{u.email ? u.email.toUpperCase() : '-'}</span>
                                        </td>

                                        {/* -- Rol Badge -- */}
                                        <td className="px-6 py-5 text-center">
                                            {getRoleBadge(u)}
                                        </td>

                                        {/* -- Acciones (text buttons like legacy) -- */}
                                        <td className="px-4 py-5">
                                            <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap">
                                                <button
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Ver perfil"
                                                    onClick={() => handleViewProfile(u)}
                                                >
                                                    <Eye size={14} /> <span className="hidden md:inline">Ver perfil</span>
                                                </button>
                                                <button
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-yellow-700 bg-yellow-50/80 hover:bg-yellow-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Modificar perfil"
                                                    onClick={() => handleOpenEdit(u)}
                                                >
                                                    <Edit3 size={14} /> <span className="hidden md:inline">Modificar perfil</span>
                                                </button>
                                                <button
                                                    className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-2 rounded-lg text-[12px] font-semibold text-red-600 bg-red-50/80 hover:bg-red-100 hover:shadow transition-all duration-150 active:scale-95 whitespace-nowrap"
                                                    title="Eliminar usuario"
                                                    onClick={() => handleDelete(u.id, u.username)}
                                                >
                                                    <Trash2 size={14} /> <span className="hidden md:inline">Eliminar usuario</span>
                                                </button>
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
            <UserModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                userToEdit={selectedUser}
                onSave={handleSaveModal}
            />
            <UserProfileModal
                isOpen={isProfileOpen}
                onClose={() => setIsProfileOpen(false)}
                user={profileUser}
            />
        </div>
    );
};

export default Usuarios;
