function normalizeEmail(email) {
    return String(email || '')
        .trim()
        .toLowerCase();
}

/**
 * Busca usuario por correo sin depender de mayúsculas (email único en User).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} rawEmail
 */
async function findUserByEmailLoose(prisma, rawEmail) {
    const norm = normalizeEmail(rawEmail);
    if (!norm) return null;

    const users = await prisma.user.findMany({
        where: { email: { not: null } },
        select: { id: true, email: true, username: true },
    });
    const row = users.find((u) => u.email && normalizeEmail(u.email) === norm);
    if (!row) return null;
    return prisma.user.findUnique({ where: { id: row.id } });
}

/** Rate limit en memoria: máx. solicitudes por correo normalizado por ventana. */
const forgotWindows = new Map();

function checkForgotRateLimit(normalizedEmail, maxPerHour = 5) {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    let arr = forgotWindows.get(normalizedEmail) || [];
    arr = arr.filter((t) => now - t < windowMs);
    if (arr.length >= maxPerHour) {
        forgotWindows.set(normalizedEmail, arr);
        return false;
    }
    arr.push(now);
    forgotWindows.set(normalizedEmail, arr);
    return true;
}

module.exports = {
    normalizeEmail,
    findUserByEmailLoose,
    checkForgotRateLimit,
};
