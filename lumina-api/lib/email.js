const nodemailer = require('nodemailer');

// Correo de salida por defecto de la entidad. Se puede sobreescribir con SMTP_FROM en .env.
const DEFAULT_FROM = process.env.SMTP_FROM || '"Assotea" <info@assotea.cat>';

function createTransport() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || pass === undefined) {
        return null;
    }
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
    });
}

/**
 * Envío genérico de correo. Si no hay SMTP configurado, no lanza error: registra en consola
 * y devuelve { sent: false, simulated: true } (mismo criterio que el resto de la app).
 * @param {{ to: string|string[], subject: string, text?: string, html?: string, from?: string }} opts
 * @returns {Promise<{ sent: boolean, simulated: boolean }>}
 */
async function sendMail({ to, subject, text, html, from }) {
    const transport = createTransport();
    const sender = from || DEFAULT_FROM;
    if (!transport) {
        console.warn('[email] SMTP no configurado; correo no enviado (simulado):', { to, subject });
        return { sent: false, simulated: true };
    }
    await transport.sendMail({ from: sender, to, subject, text, html });
    return { sent: true, simulated: false };
}

/**
 * @param {string} to
 * @param {string} code
 * @returns {Promise<{ sent: boolean, simulated: boolean }>}
 */
async function sendPasswordResetCode(to, code) {
    const from = DEFAULT_FROM;
    const transport = createTransport();

    const text = [
        'Has solicitado restablecer la contraseña de tu cuenta en Lumina (Assotea).',
        '',
        `Tu código de verificación es: ${code}`,
        '',
        'El código caduca en 15 minutos. Si no has solicitado este cambio, puedes ignorar este mensaje.',
    ].join('\n');

    const html = `
      <p>Has solicitado restablecer la contraseña de tu cuenta en <strong>Lumina</strong> (Assotea).</p>
      <p style="font-size:22px;letter-spacing:0.2em;font-weight:bold">${code}</p>
      <p>El código caduca en 15 minutos. Si no has solicitado este cambio, puedes ignorar este mensaje.</p>
    `;

    if (!transport) {
        console.warn(
            '[email] SMTP no configurado (SMTP_HOST / SMTP_USER / SMTP_PASS). Código de recuperación:',
            { to, code }
        );
        return { sent: false, simulated: true };
    }

    await transport.sendMail({
        from,
        to,
        subject: 'Código para restablecer contraseña — Lumina',
        text,
        html,
    });
    return { sent: true, simulated: false };
}

module.exports = { createTransport, sendPasswordResetCode, sendMail, DEFAULT_FROM };
