/**
 * Módulos de navegación, roles de aplicación y permisos por defecto.
 * Compartido por seed-roles.js y seed-demo-data.js.
 */
async function seedRolesAndModules(prisma) {
    console.log('🌱 Seeding roles and modules...');

    const modulesData = [
        { name: 'dashboard', displayName: 'Dashboard', icon: 'home', route: '/', order: 1 },
        { name: 'socios', displayName: 'Socios', icon: 'users', route: '/socios', order: 2 },
        { name: 'lista_espera', displayName: 'Lista de Espera', icon: 'clock', route: '/lista-espera', order: 3 },
        { name: 'inventario', displayName: 'Inventario', icon: 'package', route: '/inventario', order: 4 },
        { name: 'actividades', displayName: 'Actividades', icon: 'calendar', route: '/actividades', order: 5 },
        { name: 'recursos_humanos', displayName: 'Recursos Humanos', icon: 'badge', route: '/recursos-humanos', order: 6 },
        { name: 'profesionales_externos', displayName: 'Profesionales Externos', icon: 'briefcase', route: '/profesionales-externos', order: 7 },
        { name: 'subvenciones', displayName: 'Subvenciones', icon: 'piggy-bank', route: '/subvenciones', order: 8 },
        { name: 'seguros', displayName: 'Seguros', icon: 'umbrella', route: '/seguros', order: 9 },
        { name: 'delegaciones', displayName: 'Delegaciones', icon: 'building', route: '/delegaciones', order: 10 },
        { name: 'usuarios', displayName: 'Usuarios', icon: 'user-cog', route: '/usuarios', order: 11 },
        { name: 'roles_permisos', displayName: 'Roles y Permisos', icon: 'shield', route: '/roles-permisos', order: 12 },
        { name: 'notificaciones', displayName: 'Avisos / notificaciones', icon: 'bell', route: '/avisos', order: 13 },
        { name: 'configuracion', displayName: 'Configuración', icon: 'settings', route: '/config', order: 14 },
        { name: 'sepa_recibos', displayName: 'Recibos SEPA', icon: 'file-text', route: '/recibos-sepa', order: 15 },
    ];

    for (const m of modulesData) {
        await prisma.module.upsert({
            where: { name: m.name },
            update: { displayName: m.displayName, icon: m.icon, route: m.route, order: m.order },
            create: m,
        });
    }
    console.log(`  ✅ ${modulesData.length} modules upserted`);

    const rolesData = [
        { name: 'admin', displayName: 'Administrador', color: '#dc3545', description: 'Control total del sistema. Acceso a todas las funcionalidades y configuraciones.', isSystem: true },
        { name: 'junta_plus', displayName: 'Junta Plus', color: '#6E9EFF', description: 'Junta directiva con permisos extendidos para ciertas áreas administrativas.', isSystem: true },
        { name: 'junta', displayName: 'Junta Directiva', color: '#6E9EFF', description: 'Miembro de la junta directiva con acceso a gestión de socios e informes.', isSystem: true },
        { name: 'jefe_personal', displayName: 'Jefe de Personal', color: '#FF9500', description: 'Gestión de personal, usuarios y asignación de roles.', isSystem: true },
        { name: 'soci', displayName: 'Socio', color: '#28a745', description: 'Usuario socio con acceso limitado a su perfil y servicios.', isSystem: true },
        { name: 'user', displayName: 'Usuario', color: '#6c757d', description: 'Usuario básico del sistema con permisos mínimos.', isSystem: true },
    ];

    for (const r of rolesData) {
        await prisma.appRole.upsert({
            where: { name: r.name },
            update: { displayName: r.displayName, color: r.color, description: r.description, isSystem: r.isSystem },
            create: r,
        });
    }
    console.log(`  ✅ ${rolesData.length} roles upserted`);

    const adminRole = await prisma.appRole.findUnique({ where: { name: 'admin' } });
    const allModules = await prisma.module.findMany();

    for (const mod of allModules) {
        await prisma.permission.upsert({
            where: { roleId_moduleId: { roleId: adminRole.id, moduleId: mod.id } },
            update: { canView: true, canCreate: true, canEdit: true, canDelete: true },
            create: {
                roleId: adminRole.id,
                moduleId: mod.id,
                canView: true,
                canCreate: true,
                canEdit: true,
                canDelete: true,
            },
        });
    }
    console.log(`  ✅ Admin permissions seeded for all ${allModules.length} modules`);

    const juntaPlus = await prisma.appRole.findUnique({ where: { name: 'junta_plus' } });
    const junta = await prisma.appRole.findUnique({ where: { name: 'junta' } });
    const jefePersonal = await prisma.appRole.findUnique({ where: { name: 'jefe_personal' } });

    const juntaPlusModules = allModules.filter((m) => m.order <= 8 || m.name === 'notificaciones');
    for (const mod of juntaPlusModules) {
        await prisma.permission.upsert({
            where: { roleId_moduleId: { roleId: juntaPlus.id, moduleId: mod.id } },
            update: { canView: true, canCreate: true, canEdit: true, canDelete: false },
            create: { roleId: juntaPlus.id, moduleId: mod.id, canView: true, canCreate: true, canEdit: true, canDelete: false },
        });
    }
    // Recibos SEPA: junta_plus puede generar bajo demanda
    const sepaRecibosModule = allModules.find((m) => m.name === 'sepa_recibos');
    if (sepaRecibosModule) {
        await prisma.permission.upsert({
            where: { roleId_moduleId: { roleId: juntaPlus.id, moduleId: sepaRecibosModule.id } },
            update: { canView: true, canCreate: true, canEdit: true, canDelete: false },
            create: { roleId: juntaPlus.id, moduleId: sepaRecibosModule.id, canView: true, canCreate: true, canEdit: true, canDelete: false },
        });
    }

    const juntaModules = allModules.filter((m) => m.order <= 5);
    for (const mod of juntaModules) {
        await prisma.permission.upsert({
            where: { roleId_moduleId: { roleId: junta.id, moduleId: mod.id } },
            update: { canView: true, canCreate: false, canEdit: false, canDelete: false },
            create: { roleId: junta.id, moduleId: mod.id, canView: true, canCreate: false, canEdit: false, canDelete: false },
        });
    }
    // Recibos SEPA: junta puede generar bajo demanda
    if (sepaRecibosModule) {
        await prisma.permission.upsert({
            where: { roleId_moduleId: { roleId: junta.id, moduleId: sepaRecibosModule.id } },
            update: { canView: true, canCreate: true, canEdit: false, canDelete: false },
            create: { roleId: junta.id, moduleId: sepaRecibosModule.id, canView: true, canCreate: true, canEdit: false, canDelete: false },
        });
    }

    const jpModuleNames = ['dashboard', 'recursos_humanos', 'profesionales_externos', 'usuarios'];
    const jpModules = allModules.filter((m) => jpModuleNames.includes(m.name));
    for (const mod of jpModules) {
        await prisma.permission.upsert({
            where: { roleId_moduleId: { roleId: jefePersonal.id, moduleId: mod.id } },
            update: { canView: true, canCreate: true, canEdit: true, canDelete: true },
            create: { roleId: jefePersonal.id, moduleId: mod.id, canView: true, canCreate: true, canEdit: true, canDelete: true },
        });
    }

    console.log('  ✅ Default permissions seeded for junta_plus, junta, jefe_personal');
    console.log('🎉 Seeding complete!');
}

module.exports = { seedRolesAndModules };
