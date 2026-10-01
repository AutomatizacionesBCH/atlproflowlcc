import 'server-only'
import nodemailer from 'nodemailer'

/**
 * Aviso por correo al equipo. Es "mejor esfuerzo": si falta la configuración o el envío falla, se registra y se sigue
 * (la solicitud del cliente nunca debe fallar por un correo).
 * Variables: GMAIL_USER, GMAIL_APP_PASSWORD, TEAM_NOTIFY_EMAILS (separados por coma), APP_URL.
 */
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

export async function notifyTeamNewRequest(r: {
  id: string; fullName: string; email: string; usd: string; clp: string; bank: string
}) {
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  const to = (process.env.TEAM_NOTIFY_EMAILS ?? '').split(',').map(s => s.trim()).filter(Boolean)
  if (!user || !pass || to.length === 0) {
    console.warn('[notify] sin GMAIL_USER / GMAIL_APP_PASSWORD / TEAM_NOTIFY_EMAILS: no se avisó al equipo')
    return
  }
  const base = (process.env.APP_URL ?? '').replace(/\/$/, '')
  const link = `${base}/admin/solicitudes/${r.id}`

  try {
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    await transporter.sendMail({
      from: `"La Caja Chica" <${user}>`,
      to,
      subject: `Nueva solicitud: ${r.clp} (${r.usd}) — ${r.fullName}`,
      html: `
        <h2>Nueva solicitud en el portal</h2>
        <p><strong>${esc(r.fullName)}</strong> (${esc(r.email)}) confirmó una operación.</p>
        <ul><li>Monto en cupo: <strong>${esc(r.usd)}</strong></li><li>A transferir: <strong>${esc(r.clp)}</strong></li><li>Banco: ${esc(r.bank)}</li></ul>
        ${base ? `<p><a href="${esc(link)}">Revisar la solicitud</a></p>` : ''}`,
    })
  } catch (e) {
    console.error('[notify] no se pudo enviar el aviso:', (e as Error).message)
  }
}
