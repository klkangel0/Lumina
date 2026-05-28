import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import {
    Users, UserPlus, Shield, Calendar, TrendingUp, Activity,
    ArrowUpRight, ArrowDownRight, Plus, BarChart3, Clock,
    FileText, Package, Building, Settings, Briefcase, PiggyBank
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area, PieChart, Pie, Cell
} from 'recharts';

const Dashboard = () => {
    const { token, user } = useAuthStore();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const res = await axios.get('/api/dashboard', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setData(res.data);
            } catch (err) {
                console.error('Dashboard error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, [token]);

    const greeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Buenos días';
        if (hour < 20) return 'Buenas tardes';
        return 'Buenas noches';
    };

    const today = new Date().toLocaleDateString('es-ES', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Quick action cards
    const quickActions = [
        { label: 'Nuevo Socio', icon: <UserPlus size={22} />, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', action: () => navigate('/socios?crear=true'), description: 'Dar de alta a un socio' },
        { label: 'Nuevo Usuario', icon: <Users size={22} />, color: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20', action: () => navigate('/usuarios?crear=true'), description: 'Crear cuenta de sistema' },
        { label: 'Nuevo Rol', icon: <Shield size={22} />, color: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-500/20', action: () => navigate('/roles-permisos?crear=true'), description: 'Configurar permisos' },
        { label: 'Nueva Actividad', icon: <Calendar size={22} />, color: 'from-emerald-500 to-green-600', shadow: 'shadow-emerald-500/20', action: () => navigate('/actividades?crear=true'), description: 'Programar actividad' },
        { label: 'Inventario', icon: <Package size={22} />, color: 'from-cyan-400 to-cyan-500', shadow: 'shadow-cyan-400/20', action: () => navigate('/inventario?crear=true'), description: 'Añadir material' },
        { label: 'RRHH', icon: <Briefcase size={22} />, color: 'from-pink-400 to-pink-500', shadow: 'shadow-pink-400/20', action: () => navigate('/recursos-humanos?crear=true'), description: 'Añadir trabajador' },
        { label: 'Subvenciones', icon: <PiggyBank size={22} />, color: 'from-yellow-400 to-amber-500', shadow: 'shadow-amber-400/20', action: () => navigate('/subvenciones?crear=true'), description: 'Añadir subvención' },
        { label: 'Delegaciones', icon: <Building size={22} />, color: 'from-indigo-400 to-indigo-500', shadow: 'shadow-indigo-400/20', action: () => navigate('/delegaciones?crear=true'), description: 'Nueva delegación' },
        { label: 'Configuración', icon: <Settings size={22} />, color: 'from-slate-400 to-slate-500', shadow: 'shadow-slate-400/20', action: () => navigate('/usuarios'), description: 'Ajustes del sistema' },
    ];

    const PIE_COLORS = ['#22c55e', '#e2e8f0'];

    // Custom tooltip for charts
    const CustomBarTooltip = ({ active, payload, label }) => {
        if (!active || !payload?.length) return null;
        return (
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-100 px-4 py-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</p>
                <p className="text-lg font-bold text-slate-800 mt-0.5">{payload[0].value} <span className="text-xs font-normal text-slate-400">socios</span></p>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin w-10 h-10 border-4 border-blue-200 border-t-[#6E9EFF] rounded-full mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-medium">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    const s = data?.stats || {};
    const monthly = data?.monthlyData || [];
    const recent = data?.recentSocios || [];

    // Calculate trend (this month vs last month)
    const thisMonthCount = monthly.length > 0 ? monthly[monthly.length - 1]?.count : 0;
    const lastMonthCount = monthly.length > 1 ? monthly[monthly.length - 2]?.count : 0;
    const trend = lastMonthCount > 0 ? Math.round(((thisMonthCount - lastMonthCount) / lastMonthCount) * 100) : (thisMonthCount > 0 ? 100 : 0);

    return (
        <div className="w-full space-y-6">

            {/* Welcome Banner */}
            <div className="relative bg-gradient-to-br from-[#6E9EFF] via-[#5b8df5] to-[#8b5cf6] rounded-2xl p-6 sm:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ij48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoMnY0aC0yem0tNiA2aC00djJoNHYtMnptMC02aC00djJoNHYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white">{greeting()}, {user?.name?.split(' ')[0] || 'Administrador'} 👋</h1>
                        <p className="text-blue-100 text-sm mt-1.5 capitalize">{today}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                        <Activity size={20} className="text-white" />
                        <div>
                            <p className="text-[11px] text-blue-100 font-semibold uppercase tracking-wide">Este mes</p>
                            <p className="text-white text-lg font-bold">{s.sociosThisMonth || 0} nuevos socios</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Socios', value: s.totalSocios || 0, icon: <Users size={20} />, color: 'text-blue-500', bg: 'bg-blue-50', trend: trend, trendLabel: 'vs mes anterior' },
                    { label: 'Socios Activos', value: s.activeSocios || 0, icon: <TrendingUp size={20} />, color: 'text-emerald-500', bg: 'bg-emerald-50', percent: s.totalSocios > 0 ? Math.round((s.activeSocios / s.totalSocios) * 100) : 0 },
                    { label: 'Usuarios', value: s.totalUsers || 0, icon: <Shield size={20} />, color: 'text-violet-500', bg: 'bg-violet-50' },
                    { label: 'Roles Activos', value: s.totalRoles || 0, icon: <Shield size={20} />, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between mb-3">
                            <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                                {stat.icon}
                            </div>
                            {stat.trend !== undefined && (
                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${stat.trend >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50'}`}>
                                    {stat.trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                    {Math.abs(stat.trend)}%
                                </span>
                            )}
                            {stat.percent !== undefined && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg text-emerald-600 bg-emerald-50">
                                    {stat.percent}% activos
                                </span>
                            )}
                        </div>
                        <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div>
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Plus size={16} className="text-[#6E9EFF]" /> Acciones Rápidas
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
                    {quickActions.map((action, i) => (
                        <button key={i} onClick={action.action}
                            className={`group bg-white rounded-2xl border border-slate-100 shadow-sm p-3 xl:p-4 hover:shadow-lg hover:${action.shadow} hover:border-transparent transition-all text-center`}>
                            <div className={`w-10 h-10 xl:w-12 xl:h-12 mx-auto rounded-xl bg-gradient-to-br ${action.color} text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                {action.icon}
                            </div>
                            <p className="text-[11px] xl:text-xs font-bold text-slate-700 mt-2 xl:mt-3 leading-tight tracking-tight">{action.label}</p>
                            <p className="text-[9px] xl:text-[10px] text-slate-400 mt-0.5 leading-tight hidden xl:block">{action.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart — Monthly Registrations */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <BarChart3 size={16} className="text-[#6E9EFF]" /> Altas de Socios — Últimos 12 Meses
                        </h3>
                    </div>
                    <div className="p-6">
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={monthly} barCategoryGap="20%">
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#6E9EFF" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#5b8df5" stopOpacity={0.8} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f8fafc' }} />
                                <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Pie Chart + Stats — Socios Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Activity size={16} className="text-emerald-500" /> Estado de Socios
                        </h3>
                    </div>
                    <div className="p-6 flex flex-col items-center">
                        <ResponsiveContainer width="100%" height={180}>
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Activos', value: s.activeSocios || 0 },
                                        { name: 'Inactivos', value: s.inactiveSocios || 0 },
                                    ]}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={78}
                                    paddingAngle={3}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {PIE_COLORS.map((c, i) => <Cell key={i} fill={c} />)}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="w-full mt-4 space-y-3">
                            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                    <span className="text-sm font-medium text-slate-600">Activos</span>
                                </div>
                                <span className="text-sm font-bold text-emerald-600">{s.activeSocios || 0}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-slate-300" />
                                    <span className="text-sm font-medium text-slate-600">Inactivos</span>
                                </div>
                                <span className="text-sm font-bold text-slate-500">{s.inactiveSocios || 0}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trend Line + Recent Table */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Area Chart — Trend */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <TrendingUp size={16} className="text-violet-500" /> Tendencia de Crecimiento
                        </h3>
                    </div>
                    <div className="p-4">
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={monthly}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                <YAxis hide allowDecimals={false} />
                                <Tooltip content={<CustomBarTooltip />} />
                                <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#areaGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recent Socios Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Clock size={16} className="text-amber-500" /> Últimos Socios Registrados
                        </h3>
                        <button onClick={() => navigate('/socios')} className="text-xs font-bold text-[#6E9EFF] hover:underline">Ver todos →</button>
                    </div>
                    <div className="overflow-x-auto">
                        {recent.length > 0 ? (
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-slate-50/80">
                                        <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Socio</th>
                                        <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Código</th>
                                        <th className="px-6 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {recent.map(s => (
                                        <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6E9EFF] to-[#8b5cf6] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                                        {(s.name?.[0] || '').toUpperCase()}
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-700">{s.name} {s.lastName || ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm font-medium text-slate-500">{s.memberCode || '—'}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-400">{s.email || '—'}</td>
                                            <td className="px-6 py-3.5 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${s.status === 'activo' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {s.status || 'activo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-sm text-slate-400 text-right">{new Date(s.createdAt).toLocaleDateString('es-ES')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center">
                                <Users size={32} className="text-slate-200 mx-auto mb-2" />
                                <p className="text-sm text-slate-400">No hay socios registrados todavía</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
