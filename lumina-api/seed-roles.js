const { PrismaClient } = require('@prisma/client');
const { seedRolesAndModules } = require('./lib/seedRolesAndModules');

module.exports = { seedRolesAndModules };

if (require.main === module) {
    const prisma = new PrismaClient();
    seedRolesAndModules(prisma)
        .catch((e) => {
            console.error('❌ Seed error:', e);
            process.exit(1);
        })
        .finally(() => prisma.$disconnect());
}
