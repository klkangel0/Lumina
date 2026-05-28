/**
 * Datos iniciales / demo: delegaciones, trabajadores, profesionales externos,
 * socios de ejemplo y actividades. Idempotente (upsert / comprobaciones por email o DNI).
 *
 * Uso (en la carpeta lumina-api, con .env apuntando a la BD):
 *   node seed-demo-data.js
 *
 * También rellena módulos, roles y permisos (misma lógica que seed-roles.js).
 *
 * Tras el seed, cuentas de socio de prueba (si no existían usuarios vinculados):
 *   demo_socio1 / demo_socio2 / demo_socio3 — contraseña: demo123
 *   (mismo correo que el socio: seed.socioN@demo.lumina; login admite usuario o email)
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { seedRolesAndModules } = require('./lib/seedRolesAndModules');

const prisma = new PrismaClient();

async function linkAdminToAppRole() {
    const adminRole = await prisma.appRole.findUnique({ where: { name: 'admin' } });
    if (!adminRole) return;
    const r = await prisma.user.updateMany({
        where: { username: 'admin' },
        data: { appRoleId: adminRole.id },
    });
    if (r.count > 0) {
        console.log('  ✅ Usuario "admin" vinculado al rol de aplicación (solo appRoleId; no se cambia la contraseña)');
    }
}

async function seedDelegations() {
    const list = [
        {
            name: 'Assotea Central',
            shortName: 'CTR',
            city: 'Barcelona',
            color: '#6E9EFF',
            isSystem: true,
        },
        {
            name: 'Martorell',
            shortName: 'MTR',
            city: 'Martorell',
            color: '#10b981',
            isSystem: true,
        },
        {
            name: 'Delegación Olesa',
            shortName: 'OLS',
            city: 'Olesa de Montserrat',
            color: '#FF9500',
            isSystem: false,
        },
    ];
    for (const d of list) {
        await prisma.delegation.upsert({
            where: { name: d.name },
            update: {
                shortName: d.shortName,
                city: d.city,
                color: d.color,
                isSystem: d.isSystem,
                active: true,
            },
            create: { ...d, active: true },
        });
    }
    console.log(`  ✅ ${list.length} delegaciones`);
}

async function seedWorkers() {
    const rows = [
        { name: 'Ana', dni: 'SEED-W-DNI-001', jobPosition: 'Psicóloga', email: 'seed.worker1@demo.lumina' },
        { name: 'Lluís', dni: 'SEED-W-DNI-002', jobPosition: 'Logopeda', email: 'seed.worker2@demo.lumina' },
        { name: 'Marta', dni: 'SEED-W-DNI-003', jobPosition: 'Trabajadora social', email: 'seed.worker3@demo.lumina' },
    ];
    for (const w of rows) {
        await prisma.worker.upsert({
            where: { dni: w.dni },
            update: { name: w.name, jobPosition: w.jobPosition, email: w.email },
            create: w,
        });
    }
    console.log(`  ✅ ${rows.length} trabajadores (RRHH)`);
}

async function seedExternalProfessionals() {
    const rows = [
        {
            name: 'Carlos',
            lastName: 'García',
            specialty: 'Fisioterapia',
            collaborationType: 'Externo ocasional',
            email: 'seed.ext1@demo.lumina',
            phone: '611111111',
            hourlyRate: 35,
        },
        {
            name: 'Elena',
            lastName: 'Ruiz',
            specialty: 'Terapia ocupacional',
            collaborationType: 'Bolsa de horas',
            email: 'seed.ext2@demo.lumina',
            phone: '622222222',
            hourlyRate: 40,
        },
        {
            name: 'Jordi',
            lastName: 'Solé',
            specialty: 'Neuropsicología',
            collaborationType: 'Colaboración puntual',
            email: 'seed.ext3@demo.lumina',
            phone: '633333333',
            hourlyRate: null,
        },
    ];
    let n = 0;
    for (const r of rows) {
        const existing = await prisma.externalProfessional.findFirst({ where: { email: r.email } });
        if (existing) continue;
        await prisma.externalProfessional.create({ data: r });
        n += 1;
    }
    console.log(`  ✅ Profesionales externos: ${n} nuevos (${rows.length} definidos; omitidos si el email ya existía)`);
}

async function seedSociosAndPatients() {
    const central = await prisma.delegation.findFirst({ where: { name: 'Assotea Central' } });
    const socios = [
        {
            name: 'Laura',
            lastName: 'Demo',
            email: 'seed.socio1@demo.lumina',
            dni: 'SEED-S-DNI-001',
            patient: { name: 'Nil', lastName: 'Demo' },
        },
        {
            name: 'Pere',
            lastName: 'Demo',
            email: 'seed.socio2@demo.lumina',
            dni: 'SEED-S-DNI-002',
            patient: { name: 'Laia', lastName: 'Demo' },
        },
        {
            name: 'Montse',
            lastName: 'Demo',
            email: 'seed.socio3@demo.lumina',
            dni: 'SEED-S-DNI-003',
            patient: null,
        },
    ];
    let sociosN = 0;
    let patientsN = 0;
    for (const s of socios) {
        let socio = await prisma.socio.findFirst({ where: { email: s.email } });
        if (!socio) {
            const tmpCode = `SEED${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            socio = await prisma.socio.create({
                data: {
                    memberCode: tmpCode,
                    name: s.name,
                    lastName: s.lastName,
                    dni: s.dni,
                    email: s.email,
                    phone: '644444444',
                    status: 'ACTIVE',
                    municipio: 'Martorell',
                    delegationId: central?.id ?? null,
                },
            });
            const memberCode = `SOC-${String(socio.id).padStart(5, '0')}`;
            await prisma.socio.update({ where: { id: socio.id }, data: { memberCode } });
            socio = await prisma.socio.findUnique({ where: { id: socio.id } });
            sociosN += 1;
        }
        if (s.patient && socio) {
            const code = `${socio.memberCode}-01`;
            const existsP = await prisma.patient.findFirst({ where: { patientCode: code } });
            if (!existsP) {
                await prisma.patient.create({
                    data: {
                        socioId: socio.id,
                        patientCode: code,
                        name: s.patient.name,
                        lastName: s.patient.lastName,
                    },
                });
                patientsN += 1;
            }
        }
    }
    console.log(`  ✅ Socios demo: ${sociosN} nuevos; pacientes demo: ${patientsN} nuevos`);
}

/** Usuario app vinculado a cada socio demo (para probar Mi perfil, documentos, etc.). Idempotente. */
async function seedDemoSocioUsers() {
    const socioAppRole = await prisma.appRole.findUnique({ where: { name: 'soci' } });
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const rows = [
        { username: 'demo_socio1', socioEmail: 'seed.socio1@demo.lumina' },
        { username: 'demo_socio2', socioEmail: 'seed.socio2@demo.lumina' },
        { username: 'demo_socio3', socioEmail: 'seed.socio3@demo.lumina' },
    ];
    let created = 0;
    for (const { username, socioEmail } of rows) {
        const socio = await prisma.socio.findFirst({ where: { email: socioEmail } });
        if (!socio) continue;
        const already = await prisma.user.findFirst({ where: { socioId: socio.id } });
        if (already) continue;

        if (socio.email) {
            const byEmail = await prisma.user.findFirst({ where: { email: socio.email } });
            if (byEmail) {
                if (!byEmail.socioId) {
                    await prisma.user.update({
                        where: { id: byEmail.id },
                        data: {
                            socioId: socio.id,
                            role: 'SOCIO',
                            appRoleId: socioAppRole ? socioAppRole.id : byEmail.appRoleId,
                        },
                    });
                    created += 1;
                } else {
                    console.log(
                        `  ⚠️  Saltado ${username}: el email ${socio.email} ya pertenece a un usuario vinculado a otra ficha.`
                    );
                }
                continue;
            }
        }

        const byUsername = await prisma.user.findUnique({ where: { username } });
        if (byUsername) {
            console.log(`  ⚠️  Saltado ${username}: el nombre de usuario ya existe (no se sobrescribe).`);
            continue;
        }

        await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: 'SOCIO',
                name: `${socio.name} ${socio.lastName}`.trim(),
                email: socio.email || undefined,
                phone: socio.phone,
                socioId: socio.id,
                appRoleId: socioAppRole ? socioAppRole.id : null,
            },
        });
        created += 1;
    }
    if (created > 0) {
        console.log(`  ✅ Usuarios socio demo: ${created} nuevos (usuario: demo_socio1…3, contraseña: demo123)`);
    } else {
        console.log('  ℹ️  Usuarios socio demo: sin cambios (ya vinculados o usuario/email ocupado)');
    }
}

async function seedActivities() {
    const now = new Date();
    const inDays = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const rows = [
        {
            title: 'Taller de habilidades sociales (demo)',
            description: 'Sesión de ejemplo generada por seed-demo-data.js',
            startTime: inDays(10),
            endTime: new Date(inDays(10).getTime() + 2 * 60 * 60 * 1000),
            location: 'Sala polivalente',
            maxCapacity: 12,
            organizerName: 'Assotea',
            organizerDelegation: 'Central',
        },
        {
            title: 'Grupo de apoyo familiar (demo)',
            description: 'Actividad de ejemplo',
            startTime: inDays(17),
            endTime: new Date(inDays(17).getTime() + 90 * 60 * 1000),
            location: 'Online',
            maxCapacity: 20,
            organizerName: 'Assotea',
            organizerDelegation: 'Martorell',
        },
        {
            title: 'Piscina terapéutica (demo)',
            description: 'Actividad de ejemplo',
            startTime: inDays(24),
            endTime: new Date(inDays(24).getTime() + 60 * 60 * 1000),
            location: 'Centro deportivo',
            maxCapacity: 8,
            organizerName: 'Assotea',
            organizerDelegation: 'Olesa',
        },
    ];
    let n = 0;
    for (const r of rows) {
        const exists = await prisma.activity.findFirst({ where: { title: r.title } });
        if (exists) continue;
        await prisma.activity.create({ data: r });
        n += 1;
    }
    console.log(`  ✅ Actividades demo: ${n} nuevas (${rows.length} definidas; omitidas si el título ya existía)`);
}

async function main() {
    console.log('🌱 seed-demo-data.js — módulos/roles + datos de ejemplo\n');
    await seedRolesAndModules(prisma);
    await linkAdminToAppRole();
    await seedDelegations();
    await seedWorkers();
    await seedExternalProfessionals();
    await seedSociosAndPatients();
    await seedDemoSocioUsers();
    await seedActivities();
    console.log('\n🎉 Listo. Reinicia la app Node en Plesk si hace falta.');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
