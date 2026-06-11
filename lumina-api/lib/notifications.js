const { sendMail } = require('./email');

// Valores por defecto (también reflejados en el modelo Prisma NotificationSettings)
const DEFAULTS = {
    seguroEnabled: true,
    seguroMonthsBefore: 1,
    subvencionEnabled: true,
    subvencionMonthsBefore: 1,
    actividadEnrollEnabled: true,
};

/** Devuelve la fila única de configuración de notificaciones, creándola si no existe. */
async function getOrCreateNotificationSettings(prisma) {
    return prisma.notificationSettings.upsert({
        where: { id: 1 },
        create: { id: 1, ...DEFAULTS },
        update: {},
    });
}

function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

function formatDate(date) {
    try {
        return new Date(date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return String(date);
    }
}

/**
 * Comprobación diaria: avisa al CREADOR de seguros que caducan y de subvenciones cuya
 * fecha límite se acerca, según los meses de antelación configurados. Usa `reminderSentAt`
 * para no repetir el aviso.
 */
async function runDailyNotificationChecks(prisma) {
    const settings = await getOrCreateNotificationSettings(prisma);
    const now = new Date();
    const summary = { segurosNotified: 0, subvencionesNotified: 0, errors: 0 };

    // --- SEGUROS: aviso al usuario que lo creó N meses antes de caducar ---
    if (settings.seguroEnabled) {
        const months = settings.seguroMonthsBefore ?? DEFAULTS.seguroMonthsBefore;
        const threshold = addMonths(now, months);
        try {
            const seguros = await prisma.seguro.findMany({
                where: {
                    reminderSentAt: null,
                    expiryDate: { gte: now, lte: threshold },
                    user: { is: { email: { not: null } } },
                },
                include: { user: { select: { id: true, name: true, email: true } } },
            });

            for (const s of seguros) {
                const to = s.user?.email;
                if (!to) continue;
                const subject = `Aviso: el seguro "${s.name}" caduca el ${formatDate(s.expiryDate)}`;
                const text = [
                    `Hola ${s.user?.name || ''}:`.trim(),
                    '',
                    `Te escribimos desde Assotea para informarte de que el seguro "${s.name}" caduca el ${formatDate(s.expiryDate)}.`,
                    'Por favor, revisa su renovación con antelación suficiente para evitar períodos sin cobertura.',
                    '',
                    'Un saludo,',
                    'Equipo Assotea',
                ].join('\n');
                const html = `
                    <p>Hola ${s.user?.name || ''}:</p>
                    <p>Te escribimos desde Assotea para informarte de que el seguro <strong>"${s.name}"</strong> caduca el <strong>${formatDate(s.expiryDate)}</strong>.</p>
                    <p>Por favor, revisa su renovación con antelación suficiente para evitar períodos sin cobertura.</p>
                    <p>Un saludo,<br/>Equipo Assotea</p>`;
                try {
                    await sendMail({ to, subject, text, html });
                    await prisma.seguro.update({ where: { id: s.id }, data: { reminderSentAt: new Date() } });
                    summary.segurosNotified++;
                } catch (err) {
                    summary.errors++;
                    console.error(`[notifications] Error enviando aviso de seguro ${s.id}:`, err.message);
                }
            }
        } catch (err) {
            summary.errors++;
            console.error('[notifications] Error comprobando seguros:', err.message);
        }
    }

    // --- SUBVENCIONES: aviso al usuario que la creó N meses antes de la fecha límite ---
    if (settings.subvencionEnabled) {
        const months = settings.subvencionMonthsBefore ?? DEFAULTS.subvencionMonthsBefore;
        const threshold = addMonths(now, months);
        try {
            const subvenciones = await prisma.subvencion.findMany({
                where: {
                    reminderSentAt: null,
                    deadlineDate: { gte: now, lte: threshold },
                    status: { notIn: ['JUSTIFICADO', 'EN_ORDEN'] },
                    user: { is: { email: { not: null } } },
                },
                include: {
                    user: { select: { id: true, name: true, email: true } },
                    delegation: { select: { name: true } },
                },
            });

            for (const sub of subvenciones) {
                const to = sub.user?.email;
                if (!to) continue;
                const subject = `Aviso: la subvención "${sub.name}" vence el ${formatDate(sub.deadlineDate)}`;
                const text = [
                    `Hola ${sub.user?.name || ''}:`.trim(),
                    '',
                    `La subvención "${sub.name}"${sub.delegation?.name ? ` (${sub.delegation.name})` : ''} tiene como fecha límite de justificación el ${formatDate(sub.deadlineDate)}.`,
                    'Recuerda presentar la documentación justificativa antes de esa fecha para no perder la ayuda.',
                    '',
                    'Un saludo,',
                    'Equipo Assotea',
                ].join('\n');
                const html = `
                    <p>Hola ${sub.user?.name || ''}:</p>
                    <p>La subvención <strong>"${sub.name}"</strong>${sub.delegation?.name ? ` (${sub.delegation.name})` : ''} tiene como fecha límite de justificación el <strong>${formatDate(sub.deadlineDate)}</strong>.</p>
                    <p>Recuerda presentar la documentación justificativa antes de esa fecha para no perder la ayuda.</p>
                    <p>Un saludo,<br/>Equipo Assotea</p>`;
                try {
                    await sendMail({ to, subject, text, html });
                    await prisma.subvencion.update({ where: { id: sub.id }, data: { reminderSentAt: new Date() } });
                    summary.subvencionesNotified++;
                } catch (err) {
                    summary.errors++;
                    console.error(`[notifications] Error enviando aviso de subvención ${sub.id}:`, err.message);
                }
            }
        } catch (err) {
            summary.errors++;
            console.error('[notifications] Error comprobando subvenciones:', err.message);
        }
    }

    return summary;
}

/**
 * Aviso inmediato a la delegación organizadora cuando un socio se inscribe en una actividad.
 * El correo de la delegación se obtiene por su nombre (Activity.organizerDelegation es texto).
 * No lanza error: si falla, solo registra en consola (no debe romper la inscripción).
 */
async function notifyActivityEnrollment(prisma, { activity, socioId, guestChildrenUnder18 = 0, guestAdults18Plus = 0, patientCount = 0 }) {
    try {
        const settings = await getOrCreateNotificationSettings(prisma);
        if (!settings.actividadEnrollEnabled) return { sent: false };
        if (!activity?.organizerDelegation) return { sent: false };

        const delegation = await prisma.delegation.findFirst({
            where: { name: activity.organizerDelegation },
            select: { email: true, name: true },
        });
        const to = delegation?.email;
        if (!to) {
            console.warn(`[notifications] Inscripción sin aviso: la delegación "${activity.organizerDelegation}" no tiene correo.`);
            return { sent: false };
        }

        let socioName = '';
        if (socioId) {
            const socio = await prisma.socio.findUnique({ where: { id: socioId }, select: { name: true, lastName: true } }).catch(() => null);
            if (socio) socioName = [socio.name, socio.lastName].filter(Boolean).join(' ').trim();
        }

        const subject = `Nueva inscripción en la actividad "${activity.title}"`;
        const lines = [
            'Hola,',
            '',
            `Acaba de inscribirse una persona en la actividad "${activity.title}"${activity.startTime ? ` (${formatDate(activity.startTime)})` : ''}.`,
            socioName ? `Socio: ${socioName}` : null,
            patientCount ? `Pacientes: ${patientCount}` : null,
            (guestChildrenUnder18 || guestAdults18Plus)
                ? `Acompañantes adicionales: ${guestAdults18Plus} adulto(s), ${guestChildrenUnder18} menor(es)`
                : null,
            '',
            'Un saludo,',
            'Equipo Assotea',
        ].filter((l) => l !== null);
        const text = lines.join('\n');
        const html = `
            <p>Hola,</p>
            <p>Acaba de inscribirse una persona en la actividad <strong>"${activity.title}"</strong>${activity.startTime ? ` (${formatDate(activity.startTime)})` : ''}.</p>
            <ul>
                ${socioName ? `<li><strong>Socio:</strong> ${socioName}</li>` : ''}
                ${patientCount ? `<li><strong>Pacientes:</strong> ${patientCount}</li>` : ''}
                ${(guestChildrenUnder18 || guestAdults18Plus) ? `<li><strong>Acompañantes adicionales:</strong> ${guestAdults18Plus} adulto(s), ${guestChildrenUnder18} menor(es)</li>` : ''}
            </ul>
            <p>Un saludo,<br/>Equipo Assotea</p>`;

        return await sendMail({ to, subject, text, html });
    } catch (err) {
        console.error('[notifications] Error enviando aviso de inscripción:', err.message);
        return { sent: false };
    }
}

// Evita ejecuciones concurrentes de la comprobación diaria dentro del mismo proceso.
let dailyRunInFlight = false;

/**
 * Lanza la comprobación diaria como máximo una vez al día. Pensado para funcionar bajo
 * Passenger (donde node-cron no corre): se dispara de forma perezosa con las peticiones.
 * Actualiza `lastDailyRunAt` ANTES de ejecutar para evitar dobles envíos.
 */
async function maybeRunDailyChecks(prisma) {
    if (dailyRunInFlight) return;
    try {
        const settings = await getOrCreateNotificationSettings(prisma);
        const now = new Date();
        const last = settings.lastDailyRunAt ? new Date(settings.lastDailyRunAt) : null;
        const alreadyToday =
            last &&
            last.getFullYear() === now.getFullYear() &&
            last.getMonth() === now.getMonth() &&
            last.getDate() === now.getDate();
        if (alreadyToday) return;

        dailyRunInFlight = true;
        await prisma.notificationSettings.update({ where: { id: 1 }, data: { lastDailyRunAt: now } });
        // No await del envío para no penalizar la latencia de la petición que disparó la comprobación.
        runDailyNotificationChecks(prisma)
            .then((s) => console.log('[notifications] Comprobación diaria:', s))
            .catch((e) => console.error('[notifications] Comprobación diaria falló:', e.message))
            .finally(() => { dailyRunInFlight = false; });
    } catch (err) {
        dailyRunInFlight = false;
        console.error('[notifications] maybeRunDailyChecks error:', err.message);
    }
}

module.exports = {
    DEFAULTS,
    getOrCreateNotificationSettings,
    runDailyNotificationChecks,
    notifyActivityEnrollment,
    maybeRunDailyChecks,
};
