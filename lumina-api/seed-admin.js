const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdminUser(prismaClient = prisma) {
    const username = 'admin';
    const password = 'admin'; // Old default password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Get the admin role ID
    const adminRole = await prismaClient.appRole.findUnique({ where: { name: 'admin' } });

    const user = await prismaClient.user.upsert({
        where: { username },
        update: {
            password: hashedPassword,
            role: 'ADMIN',
            appRoleId: adminRole ? adminRole.id : null,
        },
        create: {
            username,
            name: 'Administrador del Sistema',
            email: 'admin@assotea.cat',
            password: hashedPassword,
            role: 'ADMIN',
            appRoleId: adminRole ? adminRole.id : null,
        },
    });

    console.log(`✅ Default admin: ${user.username} vinculado al rol app (ID: ${user.id}). Contraseña por defecto del script: ${password}`);
}

module.exports = { seedAdminUser };

if (require.main === module) {
    seedAdminUser(prisma)
        .catch((e) => {
            console.error(e);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
