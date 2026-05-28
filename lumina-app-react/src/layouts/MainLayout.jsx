import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Users, FileText, Calendar, LogOut, Key, User, Menu, MoreVertical, Heart, Clock, Building2, FileBadge, Boxes, Briefcase, Gauge, Shield, ClipboardList, Bell, Settings, ReceiptText } from 'lucide-react';
import useAuthStore, { usePermissions } from '../store/authStore';

export default function MainLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuthStore();
    const { isAdmin, isSocio, canView } = usePermissions();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    /** null = aún no cargado; si es false se oculta el menú Recibos SEPA aunque el rol lo permita */
    const [sepaInstallEnabled, setSepaInstallEnabled] = useState(null);

    const refreshSepaPublic = useCallback(() => {
        axios
            .get('/api/sepa-settings/public')
            .then((r) => setSepaInstallEnabled(!!r.data?.sepaEnabled))
            .catch(() => setSepaInstallEnabled(false));
    }, []);

    useEffect(() => {
        if (isSocio) return;
        refreshSepaPublic();
        window.addEventListener('lumina:sepa-settings-changed', refreshSepaPublic);
        return () => window.removeEventListener('lumina:sepa-settings-changed', refreshSepaPublic);
    }, [isSocio, refreshSepaPublic]);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Close sidebar on window resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // ── Build Menu Items Dynamically Based on Permissions ──

    let menuGroups = [];

    if (isSocio) {
        if (user?.socioStatus === 'PENDING') {
            menuGroups = [
                {
                    title: 'PRINCIPAL',
                    items: [
                        { id: 'lista-espera', label: 'Lista de espera', icon: <Clock size={20} />, path: '/lista-espera' },
                        { id: 'avisos', label: 'Avisos', icon: <Bell size={20} />, path: '/avisos' },
                        { id: 'formulario-alta', label: 'Formulario de alta', icon: <ClipboardList size={20} />, path: '/formulario-alta' },
                        { id: 'mi-perfil', label: 'Mi perfil', icon: <User size={20} />, path: '/mi-perfil' },
                        { id: 'mis-documentos', label: 'Mis documentos', icon: <FileText size={20} />, path: '/mis-documentos' }
                    ]
                }
            ];
        } else {
            menuGroups = [
                {
                    title: 'PRINCIPAL',
                    items: [
                        { id: 'mi-perfil', label: 'Mi perfil', icon: <User size={20} />, path: '/mi-perfil' },
                        { id: 'mis-pacientes', label: 'Mis pacientes', icon: <Heart size={20} />, path: '/mis-pacientes' },
                        { id: 'mis-documentos', label: 'Mis documentos', icon: <FileText size={20} />, path: '/mis-documentos' },
                        { id: 'avisos', label: 'Avisos', icon: <Bell size={20} />, path: '/avisos' },
                        { id: 'actividades-socio', label: 'Lista de actividades', icon: <Calendar size={20} />, path: '/actividades' },
                    ]
                }
            ];
        }
    } else {
        // Build Worker/Admin full menu structure based on permissions
        menuGroups = [
            {
                title: null, // Sin título para emular el legacy
                items: [
                    { id: 'dashboard', module: 'dashboard', label: 'Panel de control', icon: <Gauge size={20} />, path: '/' }
                ].filter(item => canView(item.module) || isAdmin)
            },
            {
                title: 'GESTIÓN',
                items: [
                    { id: 'socios', module: 'socios', label: 'Socios', icon: <Users size={20} />, path: '/socios' },
                    { id: 'inventario', module: 'inventario', label: 'Inventario', icon: <Boxes size={20} />, path: '/inventario' },
                    { id: 'admin-espera', module: 'lista_espera', label: 'Lista de espera', icon: <FileText size={20} />, path: '/admin-espera' },
                    { id: 'actividades', module: 'actividades', label: 'Actividades', icon: <Calendar size={20} />, path: '/actividades' }
                ].filter(item => canView(item.module) || isAdmin)
            },
            {
                title: 'RECURSOS',
                items: [
                    { id: 'recursos-humanos', module: 'recursos_humanos', label: 'Recursos humanos', icon: <User size={20} />, path: '/recursos-humanos' },
                    { id: 'profesionales-externos', module: 'profesionales_externos', label: 'Profesionales externos', icon: <Briefcase size={20} />, path: '/profesionales-externos' }
                ].filter(item => canView(item.module) || isAdmin)
            },
            {
                title: 'ADMINISTRACIÓN',
                items: [
                    { id: 'subvenciones', module: 'subvenciones', label: 'Subvenciones', icon: <FileBadge size={20} />, path: '/subvenciones' },
                    { id: 'seguros', module: 'seguros', label: 'Seguros', icon: <Shield size={20} />, path: '/seguros' },
                    { id: 'delegaciones', module: 'delegaciones', label: 'Delegaciones', icon: <Building2 size={20} />, path: '/delegaciones' },
                    {
                        id: 'recibos-sepa',
                        module: 'sepa_recibos',
                        label: 'Recibos SEPA',
                        icon: <ReceiptText size={20} />,
                        path: '/recibos-sepa',
                        // Mostrar para los roles de app aunque el módulo aún no esté sembrado en permisos
                        force: user?.role === 'ADMIN' || ['admin', 'junta', 'junta_plus'].includes(user?.appRoleName || ''),
                    }
                ].filter((item) => {
                    if (item.id === 'recibos-sepa' && sepaInstallEnabled === false) return false;
                    return item.force || canView(item.module) || isAdmin;
                })
            },
            {
                title: 'COMUNICACIÓN',
                items: [{ id: 'avisos', label: 'Avisos', icon: <Bell size={20} />, path: '/avisos' }],
            },
            {
                title: 'CONFIGURACIÓN',
                items: [
                    ...(user?.appRoleName === 'admin' || user?.role === 'ADMIN'
                        ? [{ id: 'config-sistema', label: 'Configuración del sistema', icon: <Settings size={20} />, path: '/config' }]
                        : []),
                    { id: 'usuarios', module: 'usuarios', label: 'Usuarios', icon: <Users size={20} />, path: '/usuarios' },
                    { id: 'roles', module: 'roles_permisos', label: 'Roles y permisos', icon: <Key size={20} />, path: '/roles-permisos' }
                ].filter(item => canView(item.module) || isAdmin || item.path === '/config')
            }
        ];
        
        // Remove empty groups
        menuGroups = menuGroups.filter(g => g.items.length > 0);
    }

    const NavButton = ({ item }) => {
        return (
            <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path))
                    ? 'bg-[#6E9EFF] text-white shadow-md'
                    : 'text-gray-600 hover:bg-blue-50 hover:text-[#6E9EFF]'
                    }`}
            >
                {item.icon}
                <span className="font-medium text-[15px]">{item.label}</span>
            </button>
        );
    };

    return (
        <div className="flex h-screen bg-[#f5f5f7] overflow-hidden">

            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden animate-fadeIn"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40
                w-72 bg-white border-r border-gray-100 flex flex-col shadow-sm
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo Area */}
                <div className="flex flex-col items-center justify-center py-5 px-4 border-b border-gray-100 gap-2">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="LUMINA" className="h-9 w-auto" />
                        <span className="bg-[#FFD93D] text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wide">1.0</span>
                    </div>
                    <span className="bg-gray-100 text-gray-600 text-[11px] font-semibold px-3.5 py-1.5 rounded-full tracking-wide uppercase">
                        Assotea Martorell
                    </span>
                </div>

                {/* Navigation */}
                <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide flex flex-col gap-6">
                    {menuGroups.map((group, index) => (
                        <div key={index} className="space-y-1">
                            {group.title && (
                                <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                                    {group.title}
                                </h3>
                            )}
                            {group.items.map(item => (
                                <NavButton key={item.id} item={item} />
                            ))}
                            {/* Thin separator line below each section if it's not the last one */}
                            {index < menuGroups.length - 1 && (
                                <div className="mx-4 mt-6 h-px bg-gray-100"></div>
                            )}
                        </div>
                    ))}
                </div>

                {/* User Card Fixed Bottom */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50">
                    {/* Sliding Menu */}
                    <div
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                            maxHeight: userMenuOpen ? '120px' : '0px',
                            opacity: userMenuOpen ? 1 : 0,
                            marginBottom: userMenuOpen ? '8px' : '0px',
                        }}
                    >
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 flex items-center justify-around gap-2">
                            <button
                                onClick={() => { navigate(isSocio ? '/mi-perfil' : '/perfil'); setUserMenuOpen(false); }}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-blue-50 hover:text-[#6E9EFF] transition-colors flex-1 justify-center"
                            >
                                <User size={16} />
                                Mi perfil
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors flex-1 justify-center"
                            >
                                <LogOut size={16} />
                                Cerrar sesión
                            </button>
                        </div>
                    </div>

                    {/* User Card */}
                    <div className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm flex items-center justify-between hover:border-[#6E9EFF]/30 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#6E9EFF] text-white flex flex-col items-center justify-center font-bold shadow-sm shrink-0">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="flex-1 overflow-hidden max-w-[120px]">
                                <p className="text-sm font-bold text-gray-800 truncate">{user?.name || 'Usuario'}</p>
                                <p className="text-xs text-gray-400 capitalize truncate">{user?.role === 'ADMIN' ? 'Administrador' : 'Trabajador'}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className={`p-2 rounded-lg border transition-all duration-200 ${userMenuOpen
                                ? 'text-[#6E9EFF] bg-blue-50 border-blue-200'
                                : 'text-gray-400 hover:text-gray-600 bg-gray-50 border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <MoreVertical size={18} />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Top Bar */}
                <header className="lg:hidden h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Menu size={22} />
                    </button>
                    <img src="/logo.png" alt="LUMINA" className="h-7 w-auto" />
                    <div className="w-10 h-10 rounded-full bg-[#6E9EFF] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                </header>

                {/* Page Content area */}
                <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Animations */}
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
            `}</style>
        </div>
    );
}
