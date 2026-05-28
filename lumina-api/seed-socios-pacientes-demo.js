/**
 * Borra todos los socios (cascade: pacientes, cuestionarios, recibos SEPA, inscripciones…)
 * y crea 5 socios demo + hijos con nombres solo numéricos y combinaciones de delegación/municipio.
 *
 * Uso (desde lumina-api, con .env y BD accesible):
 *   node seed-socios-pacientes-demo.js
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    const n = await prisma.socio.count();
    console.log(`[seed] Socios actuales: ${n}. Eliminando todos…`);
    await prisma.socio.deleteMany({});
    console.log('[seed] Socios y pacientes dependientes eliminados.');

    const dels = await prisma.delegation.findMany({
        where: { active: true },
        orderBy: { id: 'asc' },
    });
    const byShort = (s) => dels.find((d) => (d.shortName || '').toUpperCase() === s);
    const byName = (sub) => dels.find((d) => d.name.includes(sub));
    const ctr = byName('Central') || dels[0];
    const mtr = byShort('MTR') || byName('Martorell') || dels[1] || dels[0];
    const ols = byShort('OLS') || byName('Olesa') || dels[2] || dels[0];

    if (!ctr || !mtr) {
        throw new Error('No hay delegaciones en la BD. Ejecuta antes seed-demo-data o crea delegaciones.');
    }

    const M1 = 'Martorell';
    const M2 = 'Olesa de Montserrat';
    const M3 = 'Abrera';

    const sociosSpec = [
        {
            memberCode: 'SOC-D01',
            name: 'Demo — hijos',
            lastName: 'Misma deleg MTR',
            email: 'seed.demo01@lumina.local',
            dni: 'SEED-DNI-D01',
            delegationId: mtr.id,
            municipio: M1,
            address: 'Calle Demo Central 1, Martorell',
            patients: [
                { name: '01', lastName: '10', delegationId: mtr.id, municipio: M1, address: 'Calle Menor 1, 1º A, Martorell' },
                { name: '02', lastName: '20', delegationId: mtr.id, municipio: M1, address: 'Calle Menor 2, Martorell' },
            ],
        },
        {
            memberCode: 'SOC-D02',
            name: 'Demo — tutor',
            lastName: 'MTR hijos OLS',
            email: 'seed.demo02@lumina.local',
            dni: 'SEED-DNI-D02',
            delegationId: mtr.id,
            municipio: M1,
            address: 'Av. Tutor Demo 2, Martorell',
            patients: [
                { name: '11', lastName: '11', delegationId: ols.id, municipio: M2, address: 'Plaza Olesa 3' },
                { name: '12', lastName: '12', delegationId: ctr.id, municipio: M1, address: 'Núm. central 99' },
            ],
        },
        {
            memberCode: 'SOC-D03',
            name: 'Demo — mezcla',
            lastName: 'Un hijo igual otro no',
            email: 'seed.demo03@lumina.local',
            dni: 'SEED-DNI-D03',
            delegationId: ols.id,
            municipio: M2,
            address: 'Carrer Mezcla 3, Olesa',
            patients: [
                { name: '21', lastName: '21', delegationId: ols.id, municipio: M2, address: 'Misma delegación que tutor' },
                { name: '22', lastName: '22', delegationId: mtr.id, municipio: M3, address: 'Otro municipio y delegación' },
            ],
        },
        {
            memberCode: 'SOC-D04',
            name: 'Demo — tres',
            lastName: 'Municipios distintos',
            email: 'seed.demo04@lumina.local',
            dni: 'SEED-DNI-D04',
            delegationId: ctr.id,
            municipio: M1,
            address: 'Polígono Demo 4',
            patients: [
                { name: '31', lastName: '31', delegationId: mtr.id, municipio: M1, address: 'Dir 31' },
                { name: '32', lastName: '32', delegationId: ols.id, municipio: M2, address: 'Dir 32' },
                { name: '33', lastName: '33', delegationId: mtr.id, municipio: M3, address: 'Dir 33 Abrera' },
            ],
        },
        {
            memberCode: 'SOC-D05',
            name: 'Demo — un hijo',
            lastName: 'Sin deleg paciente',
            email: 'seed.demo05@lumina.local',
            dni: 'SEED-DNI-D05',
            delegationId: mtr.id,
            municipio: M3,
            address: 'Calle Única 5, Abrera',
            patients: [{ name: '99', lastName: '01', delegationId: null, municipio: M3, address: 'Menor sin delegación asignada' }],
        },
    ];

    for (const spec of sociosSpec) {
        const { patients, ...socioData } = spec;
        const socio = await prisma.socio.create({
            data: {
                ...socioData,
                status: 'ACTIVE',
            },
        });
        let idx = 0;
        for (const p of patients) {
            idx += 1;
            const num = String(idx).padStart(2, '0');
            await prisma.patient.create({
                data: {
                    patientCode: `${socio.memberCode}-${num}`,
                    socioId: socio.id,
                    name: p.name,
                    lastName: p.lastName,
                    birthDate: new Date(`2015-06-${10 + idx}`),
                    gender: idx % 2 === 0 ? 'femenino' : 'masculino',
                    relationship: 'tutor',
                    delegationId: p.delegationId,
                    municipio: p.municipio,
                    address: p.address,
                    school: `Colegio ${p.name}`,
                    schoolYear: '3º EP',
                },
            });
        }
        console.log(`  ✅ ${socio.memberCode} — ${socio.name} ${socio.lastName} (${patients.length} paciente(s))`);
    }

    console.log('[seed] Listo. Revisa Socios → Filtros hijos / Mis pacientes.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
