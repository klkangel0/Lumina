const express = require('express');
const { PrismaClient } = require('@prisma/client');
const verifyToken = require('../middleware/authMiddleware');
const requireAppRoleNames = require('../middleware/requireAppRoleNames');
const { assertSepaCompleteForActiveSocio } = require('../lib/sepaMandateValidation');

const router = express.Router();
const prisma = new PrismaClient();

const ALLOWED_APP_ROLES = ['admin', 'junta_plus', 'junta'];

function parseEuroToCents(input) {
    if (input === undefined || input === null) return null;
    if (typeof input === 'number' && Number.isFinite(input)) {
        return Math.round(input * 100);
    }
    const s = String(input).trim();
    if (!s) return null;
    // Aceptar "12", "12.34", "12,34"
    const normalized = s.replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
    const [euros, cents = ''] = normalized.split('.');
    const c = (cents + '00').slice(0, 2);
    return parseInt(euros, 10) * 100 + parseInt(c, 10);
}

function addMonthsKeepingDay(date, months) {
    const d = new Date(date);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
    return d;
}

function startOfUtcDay(d) {
    const dt = d instanceof Date ? d : new Date(d);
    return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate(), 0, 0, 0, 0));
}

function minCollectionDateUtc(leadDays = 1) {
    const now = new Date();
    const base = startOfUtcDay(now);
    base.setUTCDate(base.getUTCDate() + Math.max(0, Number(leadDays) || 0));
    return base;
}

function parseLeadDaysFromSettings(bankExtraJson) {
    // Optional: allow overriding lead time via SepaSettings.bankExtraJson = { "collectionLeadDays": 1 }
    if (!bankExtraJson) return null;
    try {
        const obj = JSON.parse(String(bankExtraJson));
        const v = obj?.collectionLeadDays;
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0 && n <= 30) return Math.trunc(n);
        return null;
    } catch {
        return null;
    }
}

function xmlEscape(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function toIsoDate(d) {
    const dt = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return dt.toISOString().slice(0, 10);
}

function groupBy(arr, keyFn) {
    const m = new Map();
    for (const it of arr) {
        const k = keyFn(it);
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(it);
    }
    return m;
}

async function getSepaSettings() {
    const row = await prisma.sepaSettings.upsert({
        where: { id: 1 },
        create: { id: 1, sepaEnabled: false },
        update: {},
    });
    return row;
}

// =========================
// PUBLIC (sin auth): para socios (elección de cuota)
// =========================
router.get('/templates/public', async (req, res) => {
    try {
        const s = await getSepaSettings();
        if (!s.sepaEnabled) return res.json({ templates: [] });

        const allowedRaw = String(s.memberAllowedPlanFrequencies || '').trim();
        const allowedSet = new Set(
            allowedRaw
                .split(',')
                .map((x) => x.trim().toUpperCase())
                .filter(Boolean)
        );

        const allowed = allowedSet.size > 0 ? Array.from(allowedSet) : ['MONTHLY', 'QUARTERLY', 'YEARLY'];
        const rows = await prisma.sepaReceiptTemplate.findMany({
            where: {
                active: true,
                frequency: { in: allowed },
            },
            orderBy: [{ frequency: 'asc' }, { name: 'asc' }],
        });
        res.json({ templates: rows });
    } catch (e) {
        console.error('sepa-recibos templates public GET:', e);
        res.status(500).json({ message: 'Error al cargar plantillas.' });
    }
});

router.use(verifyToken);
router.use(requireAppRoleNames(ALLOWED_APP_ROLES));

// =========================
// PLANTILLAS (mini-config)
// =========================

// GET /api/sepa-recibos/templates
router.get('/templates', async (req, res) => {
    try {
        const rows = await prisma.sepaReceiptTemplate.findMany({
            where: { active: true },
            orderBy: [{ frequency: 'asc' }, { name: 'asc' }],
        });
        res.json({ templates: rows });
    } catch (e) {
        console.error('sepa-recibos templates GET:', e);
        res.status(500).json({ message: 'Error al cargar plantillas.' });
    }
});

// POST /api/sepa-recibos/templates
router.post('/templates', async (req, res) => {
    try {
        const body = req.body || {};
        const name = String(body.name || '').trim();
        if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });
        if (name.length > 60) return res.status(400).json({ message: 'Nombre demasiado largo (máx. 60).' });

        const frequency = String(body.frequency || 'ONE_OFF').trim().toUpperCase();
        if (!['ONE_OFF', 'MONTHLY', 'QUARTERLY', 'YEARLY'].includes(frequency)) {
            return res.status(400).json({ message: 'Frecuencia inválida.' });
        }

        const amountCents =
            body.amountCents !== undefined && body.amountCents !== null && String(body.amountCents).trim() !== ''
                ? Number(body.amountCents)
                : parseEuroToCents(body.amount);
        if (!Number.isFinite(amountCents) || amountCents <= 0) return res.status(400).json({ message: 'Importe inválido.' });

        const concept = String(body.concept || '').trim();
        if (!concept) return res.status(400).json({ message: 'El concepto es obligatorio.' });
        if (concept.length > 140) return res.status(400).json({ message: 'El concepto es demasiado largo (máx. 140).' });

        const created = await prisma.sepaReceiptTemplate.create({
            data: {
                name,
                amountCents: Math.trunc(amountCents),
                currency: 'EUR',
                concept,
                frequency,
                active: true,
                createdByUserId: req.user.id,
            },
        });
        res.status(201).json({ message: 'Plantilla creada.', template: created });
    } catch (e) {
        console.error('sepa-recibos templates POST:', e);
        res.status(500).json({ message: 'Error al crear plantilla.' });
    }
});

// PUT /api/sepa-recibos/templates/:id
router.put('/templates/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID inválido.' });
        const body = req.body || {};

        const name = body.name !== undefined ? String(body.name || '').trim() : undefined;
        if (name !== undefined) {
            if (!name) return res.status(400).json({ message: 'El nombre es obligatorio.' });
            if (name.length > 60) return res.status(400).json({ message: 'Nombre demasiado largo (máx. 60).' });
        }

        const frequency =
            body.frequency !== undefined ? String(body.frequency || '').trim().toUpperCase() : undefined;
        if (frequency !== undefined && !['ONE_OFF', 'MONTHLY', 'QUARTERLY', 'YEARLY'].includes(frequency)) {
            return res.status(400).json({ message: 'Frecuencia inválida.' });
        }

        let amountCents = undefined;
        if (body.amount !== undefined || body.amountCents !== undefined) {
            amountCents =
                body.amountCents !== undefined && body.amountCents !== null && String(body.amountCents).trim() !== ''
                    ? Number(body.amountCents)
                    : parseEuroToCents(body.amount);
            if (!Number.isFinite(amountCents) || amountCents <= 0) return res.status(400).json({ message: 'Importe inválido.' });
            amountCents = Math.trunc(amountCents);
        }

        const concept = body.concept !== undefined ? String(body.concept || '').trim() : undefined;
        if (concept !== undefined) {
            if (!concept) return res.status(400).json({ message: 'El concepto es obligatorio.' });
            if (concept.length > 140) return res.status(400).json({ message: 'El concepto es demasiado largo (máx. 140).' });
        }

        const updated = await prisma.sepaReceiptTemplate.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(frequency !== undefined ? { frequency } : {}),
                ...(amountCents !== undefined ? { amountCents } : {}),
                ...(concept !== undefined ? { concept } : {}),
            },
        });
        res.json({ message: 'Plantilla actualizada.', template: updated });
    } catch (e) {
        console.error('sepa-recibos templates PUT:', e);
        res.status(500).json({ message: 'Error al actualizar plantilla.' });
    }
});

// DELETE /api/sepa-recibos/templates/:id  (desactivar)
router.delete('/templates/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (!Number.isFinite(id)) return res.status(400).json({ message: 'ID inválido.' });
        await prisma.sepaReceiptTemplate.update({ where: { id }, data: { active: false } });
        res.json({ message: 'Plantilla desactivada.' });
    } catch (e) {
        console.error('sepa-recibos templates DELETE:', e);
        res.status(500).json({ message: 'Error al desactivar plantilla.' });
    }
});

// =========================
// CUOTAS PERIÓDICAS (mensual/trimestral/anual)
// =========================

function frequencyToMonths(freq) {
    if (freq === 'MONTHLY') return 1;
    if (freq === 'QUARTERLY') return 3;
    if (freq === 'YEARLY') return 12;
    return null;
}

// GET /api/sepa-recibos/monthly-due
router.get('/monthly-due', async (req, res) => {
    try {
        const takeRaw = req.query.take;
        const take = Math.max(1, Math.min(500, takeRaw ? Number(takeRaw) : 200));
        const rows = await prisma.socio.findMany({
            where: {
                status: 'ACTIVE',
                sepaMonthlyTemplateId: { not: null },
                sepaMonthlyNextChargeAt: { not: null },
            },
            take,
            orderBy: [{ sepaMonthlyNextChargeAt: 'asc' }, { id: 'asc' }],
            select: {
                id: true,
                memberCode: true,
                name: true,
                lastName: true,
                iban: true,
                sepaMandateUm: true,
                sepaMandateSignedAt: true,
                docSepa: true,
                sepaMonthlyNextChargeAt: true,
                sepaMonthlyTemplate: true,
                sepaReceipts: {
                    take: 1,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                        amountCents: true,
                        concept: true,
                    },
                },
            },
        });
        res.json({ socios: rows });
    } catch (e) {
        console.error('sepa-recibos monthly-due GET:', e);
        res.status(500).json({ message: 'Error al cargar cuotas periódicas.' });
    }
});

// POST /api/sepa-recibos/monthly-plan  { socioId, templateId, nextChargeAt }
router.post('/monthly-plan', async (req, res) => {
    try {
        const body = req.body || {};
        const socioId = Number(body.socioId);
        const templateId = Number(body.templateId);
        if (!Number.isFinite(socioId) || socioId <= 0) return res.status(400).json({ message: 'socioId inválido.' });
        if (!Number.isFinite(templateId) || templateId <= 0) return res.status(400).json({ message: 'templateId inválido.' });

        const nextChargeAtRaw = String(body.nextChargeAt || '').trim();
        if (!nextChargeAtRaw) return res.status(400).json({ message: 'La próxima fecha de cargo es obligatoria.' });
        const nextDate = new Date(nextChargeAtRaw);
        if (Number.isNaN(nextDate.getTime())) return res.status(400).json({ message: 'Fecha inválida.' });

        const tpl = await prisma.sepaReceiptTemplate.findUnique({ where: { id: templateId } });
        if (!tpl || !tpl.active) return res.status(400).json({ message: 'Plantilla no válida.' });
        const months = frequencyToMonths(tpl.frequency);
        if (!months) return res.status(400).json({ message: 'La plantilla no es periódica (mensual/trimestral/anual).' });

        const updated = await prisma.socio.update({
            where: { id: socioId },
            data: { sepaMonthlyTemplateId: tpl.id, sepaMonthlyNextChargeAt: nextDate },
            select: {
                id: true,
                sepaMonthlyNextChargeAt: true,
                sepaMonthlyTemplate: true,
            },
        });
        res.json({ message: 'Cuota periódica configurada.', socio: updated });
    } catch (e) {
        console.error('sepa-recibos monthly-plan POST:', e);
        res.status(500).json({ message: 'Error al configurar la cuota periódica.' });
    }
});

// POST /api/sepa-recibos/monthly-due/:socioId/generate
router.post('/monthly-due/:socioId/generate', async (req, res) => {
    try {
        const socioId = Number(req.params.socioId);
        if (!Number.isFinite(socioId) || socioId <= 0) return res.status(400).json({ message: 'socioId inválido.' });

        const settings = await getSepaSettings();
        const sepaEnabled = settings?.sepaEnabled === true;
        if (!sepaEnabled) return res.status(400).json({ message: 'SEPA está desactivado en la configuración.' });

        const socio = await prisma.socio.findUnique({
            where: { id: socioId },
            select: {
                id: true,
                status: true,
                iban: true,
                sepaMandateUm: true,
                sepaMandateSignedAt: true,
                docSepa: true,
                memberCode: true,
                name: true,
                lastName: true,
                sepaMonthlyNextChargeAt: true,
                sepaMonthlyTemplate: true,
            },
        });
        if (!socio) return res.status(404).json({ message: 'Socio no encontrado.' });
        if (socio.status !== 'ACTIVE') return res.status(400).json({ message: 'Solo socios activos.' });
        const months = socio.sepaMonthlyTemplate ? frequencyToMonths(socio.sepaMonthlyTemplate.frequency) : null;
        if (!socio.sepaMonthlyTemplate || !months) {
            return res.status(400).json({ message: 'Este socio no tiene cuota periódica configurada.' });
        }
        if (!socio.sepaMonthlyNextChargeAt) return res.status(400).json({ message: 'Falta próxima fecha de cargo.' });

        const sepaCheck = assertSepaCompleteForActiveSocio({
            sepaOrgEnabled: sepaEnabled,
            status: socio.status,
            iban: socio.iban,
            sepaMandateUm: socio.sepaMandateUm,
            sepaMandateSignedAt: socio.sepaMandateSignedAt,
            docSepa: socio.docSepa,
        });
        if (!sepaCheck.ok) {
            return res.status(400).json({ message: sepaCheck.message });
        }

        const leadDays = parseLeadDaysFromSettings(settings?.bankExtraJson) ?? 1;
        const minDate = minCollectionDateUtc(leadDays);
        const requestedRaw = new Date(socio.sepaMonthlyNextChargeAt);
        const requestedCollectionDate =
            Number.isNaN(requestedRaw.getTime()) ? null : requestedRaw < minDate ? minDate : requestedRaw;
        if (!requestedCollectionDate) return res.status(400).json({ message: 'Fecha de cargo inválida.' });

        const created = await prisma.$transaction(async (tx) => {
            const receipt = await tx.sepaReceipt.create({
                data: {
                    socioId: socio.id,
                    createdByUserId: req.user.id,
                    amountCents: socio.sepaMonthlyTemplate.amountCents,
                    currency: socio.sepaMonthlyTemplate.currency || 'EUR',
                    concept: socio.sepaMonthlyTemplate.concept,
                    requestedCollectionDate,
                    status: 'DRAFT',
                    debtorIbanSnapshot: socio.iban || null,
                    mandateUmSnapshot: socio.sepaMandateUm || null,
                    mandateSignedAtSnapshot: socio.sepaMandateSignedAt || null,
                },
            });
            const nextDate = addMonthsKeepingDay(requestedCollectionDate, months);
            await tx.socio.update({
                where: { id: socio.id },
                data: { sepaMonthlyNextChargeAt: nextDate },
            });
            return receipt;
        });

        return res.status(201).json({ message: 'Recibo periódico creado.', receipt: created });
    } catch (e) {
        console.error('sepa-recibos monthly generate POST:', e);
        res.status(500).json({ message: e?.message || 'Error al generar el recibo periódico.' });
    }
});

// POST /api/sepa-recibos  (crear recibo manual)
router.post('/', async (req, res) => {
    try {
        const body = req.body || {};
        const socioId = Number(body.socioId);
        if (!Number.isFinite(socioId) || socioId <= 0) {
            return res.status(400).json({ message: 'socioId inválido.' });
        }

        const settings = await getSepaSettings();
        const sepaEnabled = settings?.sepaEnabled === true;
        if (!sepaEnabled) {
            return res.status(400).json({ message: 'SEPA está desactivado en la configuración.' });
        }

        const socio = await prisma.socio.findUnique({
            where: { id: socioId },
            select: {
                id: true,
                status: true,
                iban: true,
                sepaMandateUm: true,
                sepaMandateSignedAt: true,
                docSepa: true,
                name: true,
                lastName: true,
                memberCode: true,
            },
        });
        if (!socio) return res.status(404).json({ message: 'Socio no encontrado.' });

        // En fase 2 solo generamos recibos para socios ACTIVE con mandato completo
        if (socio.status !== 'ACTIVE') {
            return res.status(400).json({ message: 'Solo se pueden generar recibos SEPA para socios activos.' });
        }
        const sepaCheck = assertSepaCompleteForActiveSocio({
            sepaOrgEnabled: sepaEnabled,
            status: socio.status,
            iban: socio.iban,
            sepaMandateUm: socio.sepaMandateUm,
            sepaMandateSignedAt: socio.sepaMandateSignedAt,
            docSepa: socio.docSepa,
        });
        if (!sepaCheck.ok) {
            return res.status(400).json({ message: sepaCheck.message });
        }

        const amountCents =
            body.amountCents !== undefined && body.amountCents !== null && String(body.amountCents).trim() !== ''
                ? Number(body.amountCents)
                : parseEuroToCents(body.amount);
        if (!Number.isFinite(amountCents) || amountCents <= 0) {
            return res.status(400).json({ message: 'Importe inválido.' });
        }
        if (amountCents > 99999999) {
            return res.status(400).json({ message: 'Importe demasiado alto.' });
        }

        const concept = String(body.concept || '').trim();
        if (!concept) return res.status(400).json({ message: 'El concepto es obligatorio.' });
        if (concept.length > 140) return res.status(400).json({ message: 'El concepto es demasiado largo (máx. 140).' });

        const leadDays = parseLeadDaysFromSettings(settings?.bankExtraJson) ?? 1;
        const minDate = minCollectionDateUtc(leadDays);
        let requestedCollectionDate = null;
        if (body.requestedCollectionDate !== undefined && body.requestedCollectionDate !== null && String(body.requestedCollectionDate).trim()) {
            const d = new Date(String(body.requestedCollectionDate));
            if (Number.isNaN(d.getTime())) {
                return res.status(400).json({ message: 'Fecha de cargo inválida.' });
            }
            if (d < minDate) {
                return res.status(400).json({ message: `La fecha de cargo no puede ser anterior a ${toIsoDate(minDate)} (mínimo D+${leadDays}).` });
            }
            requestedCollectionDate = d;
        }

        const created = await prisma.sepaReceipt.create({
            data: {
                socioId: socio.id,
                createdByUserId: req.user.id,
                amountCents: Math.trunc(amountCents),
                currency: 'EUR',
                concept,
                requestedCollectionDate,
                status: 'DRAFT',
                debtorIbanSnapshot: socio.iban || null,
                mandateUmSnapshot: socio.sepaMandateUm || null,
                mandateSignedAtSnapshot: socio.sepaMandateSignedAt || null,
            },
            include: {
                socio: { select: { id: true, memberCode: true, name: true, lastName: true } },
            },
        });

        return res.status(201).json({ message: 'Recibo SEPA creado.', receipt: created });
    } catch (e) {
        console.error('sepa-recibos POST:', e);
        return res.status(500).json({ message: e?.message || 'Error al generar el recibo.' });
    }
});

// GET /api/sepa-recibos?status=DRAFT&take=100
router.get('/', async (req, res) => {
    try {
        const takeRaw = req.query.take;
        const take = Math.max(1, Math.min(200, takeRaw ? Number(takeRaw) : 100));
        const status = req.query.status ? String(req.query.status).trim().toUpperCase() : null;
        const notDraft = String(req.query.notDraft || '').trim() === '1';
        const where = {};
        if (status && ['DRAFT', 'GENERATED', 'CANCELLED'].includes(status)) {
            where.status = status;
        }
        if (notDraft) {
            where.status = { not: 'DRAFT' };
        }

        const rows = await prisma.sepaReceipt.findMany({
            where,
            take,
            orderBy: { createdAt: 'desc' },
            include: {
                socio: { select: { id: true, memberCode: true, name: true, lastName: true } },
                createdBy: { select: { id: true, username: true, name: true } },
            },
        });

        res.json({ receipts: rows });
    } catch (e) {
        console.error('sepa-recibos GET:', e);
        res.status(500).json({ message: 'Error al cargar recibos.' });
    }
});

// =========================
// EXPORTACIÓN pain.008 CORE (B2C)
// =========================
// GET /api/sepa-recibos/export/pain008?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/export/pain008', async (req, res) => {
    try {
        const settings = await getSepaSettings();
        if (!settings?.sepaEnabled) return res.status(400).json({ message: 'SEPA está desactivado en la configuración.' });
        const leadDays = parseLeadDaysFromSettings(settings?.bankExtraJson) ?? 1;
        const minDate = minCollectionDateUtc(leadDays);

        const creditorLegalName = String(settings.creditorLegalName || '').trim();
        const creditorIban = String(settings.creditorIban || '').trim();
        const creditorIdentifier = String(settings.creditorIdentifier || '').trim();
        if (!creditorLegalName || !creditorIban || !creditorIdentifier) {
            return res.status(400).json({ message: 'Faltan datos del acreedor en Configuración SEPA.' });
        }

        const fromRaw = String(req.query.from || '').trim();
        const toRaw = String(req.query.to || '').trim();
        if (!fromRaw || !toRaw) return res.status(400).json({ message: 'Indica from y to (YYYY-MM-DD).' });

        const fromDate = new Date(`${fromRaw}T00:00:00.000Z`);
        const toDate = new Date(`${toRaw}T23:59:59.999Z`);
        if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
            return res.status(400).json({ message: 'Rango de fechas inválido.' });
        }
        if (fromDate > toDate) return res.status(400).json({ message: 'El rango de fechas no es válido (from > to).' });

        const receipts = await prisma.sepaReceipt.findMany({
            where: {
                status: 'GENERATED',
                requestedCollectionDate: { not: null, gte: fromDate, lte: toDate },
            },
            orderBy: [{ requestedCollectionDate: 'asc' }, { createdAt: 'asc' }],
            include: {
                socio: { select: { id: true, memberCode: true, name: true, lastName: true } },
            },
        });

        if (!receipts.length) {
            return res.status(400).json({ message: 'No hay recibos GENERATED en ese rango de fecha de cargo.' });
        }

        const invalid = receipts.filter((r) => !r.debtorIbanSnapshot || !r.mandateUmSnapshot || !r.mandateSignedAtSnapshot);
        if (invalid.length) {
            return res.status(400).json({
                message: `Hay ${invalid.length} recibo(s) sin snapshot completo (IBAN/UMR/fecha firma). No se puede exportar.`,
            });
        }

        // 1) Cobros en el pasado (o antes del plazo mínimo)
        const past = receipts.filter((r) => new Date(r.requestedCollectionDate) < minDate);
        if (past.length) {
            return res.status(400).json({
                message: `Hay ${past.length} recibo(s) con fecha de cargo anterior a ${toIsoDate(minDate)} (mínimo D+${leadDays}). Ajusta la fecha de cargo antes de exportar.`,
            });
        }

        // 2) Fechas de firma de mandato no razonables (bancos suelen rechazar)
        const sepaStart = new Date('2009-11-01T00:00:00.000Z');
        const today = minCollectionDateUtc(0);
        const weirdMandate = receipts.filter((r) => {
            const dt = new Date(r.mandateSignedAtSnapshot);
            return Number.isNaN(dt.getTime()) || dt < sepaStart || dt > today;
        });
        if (weirdMandate.length) {
            const example = weirdMandate[0];
            return res.status(400).json({
                message: `Hay ${weirdMandate.length} recibo(s) con fecha de firma del mandato inválida/no razonable (p. ej. ${toIsoDate(example.mandateSignedAtSnapshot)}). Corrige la fecha de firma del mandato del socio y vuelve a generar el recibo.`,
            });
        }

        const now = new Date();
        const msgId = `LUMINA-${now.toISOString().replace(/[-:]/g, '').replace(/\..*$/, '')}`;
        const creDtTm = now.toISOString();
        const nbOfTxs = receipts.length;
        const ctrlSum = (receipts.reduce((acc, r) => acc + (Number(r.amountCents) || 0), 0) / 100).toFixed(2);

        const byDate = groupBy(receipts, (r) => toIsoDate(r.requestedCollectionDate) || '1970-01-01');

        const pmtInfos = [];
        let pmtIndex = 1;
        for (const [reqdColltnDt, rows] of byDate.entries()) {
            const pmtInfId = `${msgId}-P${pmtIndex++}`;
            const pmtNb = rows.length;
            const pmtSum = (rows.reduce((acc, r) => acc + (Number(r.amountCents) || 0), 0) / 100).toFixed(2);

            const txs = rows
                .map((r) => {
                    const dbtrNm = `${r.socio?.name || ''} ${r.socio?.lastName || ''}`.trim() || `SOCIO-${r.socioId}`;
                    const endToEndId = r.id;
                    const instdAmt = (Number(r.amountCents) / 100).toFixed(2);
                    const mandateId = r.mandateUmSnapshot;
                    const dtOfSgntr = toIsoDate(r.mandateSignedAtSnapshot);
                    const ustrd = r.concept || '';
                    return `
          <DrctDbtTxInf>
            <PmtId>
              <InstrId>${xmlEscape(r.id)}</InstrId>
              <EndToEndId>${xmlEscape(endToEndId)}</EndToEndId>
            </PmtId>
            <InstdAmt Ccy="EUR">${xmlEscape(instdAmt)}</InstdAmt>
            <DrctDbtTx>
              <MndtRltdInf>
                <MndtId>${xmlEscape(mandateId)}</MndtId>
                <DtOfSgntr>${xmlEscape(dtOfSgntr)}</DtOfSgntr>
              </MndtRltdInf>
            </DrctDbtTx>
            <DbtrAgt>
              <FinInstnId>
                <Othr><Id>NOTPROVIDED</Id></Othr>
              </FinInstnId>
            </DbtrAgt>
            <Dbtr>
              <Nm>${xmlEscape(dbtrNm)}</Nm>
            </Dbtr>
            <DbtrAcct>
              <Id><IBAN>${xmlEscape(r.debtorIbanSnapshot)}</IBAN></Id>
            </DbtrAcct>
            <RmtInf>
              <Ustrd>${xmlEscape(ustrd)}</Ustrd>
            </RmtInf>
          </DrctDbtTxInf>`;
                })
                .join('');

            pmtInfos.push(`
      <PmtInf>
        <PmtInfId>${xmlEscape(pmtInfId)}</PmtInfId>
        <PmtMtd>DD</PmtMtd>
        <BtchBookg>true</BtchBookg>
        <NbOfTxs>${pmtNb}</NbOfTxs>
        <CtrlSum>${xmlEscape(pmtSum)}</CtrlSum>
        <PmtTpInf>
          <SvcLvl><Cd>SEPA</Cd></SvcLvl>
          <LclInstrm><Cd>CORE</Cd></LclInstrm>
          <SeqTp>RCUR</SeqTp>
        </PmtTpInf>
        <ReqdColltnDt>${xmlEscape(reqdColltnDt)}</ReqdColltnDt>
        <Cdtr><Nm>${xmlEscape(creditorLegalName)}</Nm></Cdtr>
        <CdtrAcct><Id><IBAN>${xmlEscape(creditorIban)}</IBAN></Id></CdtrAcct>
        <CdtrAgt><FinInstnId><Othr><Id>NOTPROVIDED</Id></Othr></FinInstnId></CdtrAgt>
        <ChrgBr>SLEV</ChrgBr>
        <CdtrSchmeId>
          <Id>
            <PrvtId>
              <Othr>
                <Id>${xmlEscape(creditorIdentifier)}</Id>
                <SchmeNm><Prtry>SEPA</Prtry></SchmeNm>
              </Othr>
            </PrvtId>
          </Id>
        </CdtrSchmeId>${txs}
      </PmtInf>`);
        }

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${xmlEscape(msgId)}</MsgId>
      <CreDtTm>${xmlEscape(creDtTm)}</CreDtTm>
      <NbOfTxs>${nbOfTxs}</NbOfTxs>
      <CtrlSum>${xmlEscape(ctrlSum)}</CtrlSum>
      <InitgPty><Nm>${xmlEscape(creditorLegalName)}</Nm></InitgPty>
    </GrpHdr>${pmtInfos.join('')}
  </CstmrDrctDbtInitn>
</Document>`;

        const fileName = `pain008_CORE_${fromRaw.replace(/-/g, '')}_${toRaw.replace(/-/g, '')}.xml`;
        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        return res.status(200).send(xml);
    } catch (e) {
        console.error('sepa-recibos export pain008 GET:', e);
        return res.status(500).json({ message: 'Error al exportar XML.' });
    }
});

// GET /api/sepa-recibos/:id
router.get('/:id', async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) return res.status(400).json({ message: 'ID inválido.' });

        const row = await prisma.sepaReceipt.findUnique({
            where: { id },
            include: {
                socio: { select: { id: true, memberCode: true, name: true, lastName: true } },
                createdBy: { select: { id: true, username: true, name: true } },
            },
        });
        if (!row) return res.status(404).json({ message: 'Recibo no encontrado.' });

        res.json({ receipt: row });
    } catch (e) {
        console.error('sepa-recibos GET/:id:', e);
        res.status(500).json({ message: 'Error al cargar recibo.' });
    }
});

// =========================
// CAMBIO DE ESTADO (borrador → generado/cancelado)
// =========================
// PUT /api/sepa-recibos/:id/status  { status: "GENERATED" | "CANCELLED" }
router.put('/:id/status', async (req, res) => {
    try {
        const id = String(req.params.id || '').trim();
        if (!id) return res.status(400).json({ message: 'ID inválido.' });

        const nextStatus = String(req.body?.status || '').trim().toUpperCase();
        if (!['GENERATED', 'CANCELLED'].includes(nextStatus)) {
            return res.status(400).json({ message: 'Estado inválido.' });
        }

        const current = await prisma.sepaReceipt.findUnique({
            where: { id },
            select: { id: true, status: true },
        });
        if (!current) return res.status(404).json({ message: 'Recibo no encontrado.' });

        if (current.status !== 'DRAFT') {
            return res.status(400).json({ message: 'Solo se pueden cambiar recibos en borrador.' });
        }

        const updated = await prisma.sepaReceipt.update({
            where: { id },
            data: { status: nextStatus },
            include: {
                socio: { select: { id: true, memberCode: true, name: true, lastName: true } },
                createdBy: { select: { id: true, username: true, name: true } },
            },
        });

        return res.json({
            message: nextStatus === 'GENERATED' ? 'Recibo confirmado.' : 'Recibo cancelado.',
            receipt: updated,
        });
    } catch (e) {
        console.error('sepa-recibos PUT/:id/status:', e);
        return res.status(500).json({ message: 'Error al cambiar el estado del recibo.' });
    }
});

module.exports = router;

