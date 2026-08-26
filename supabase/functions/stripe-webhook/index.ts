// Nessun import Stripe — verifica firma con crypto nativo di Deno
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};
const cors = corsHeaders; // alias usato nel branch evento

// ── Verifica firma Stripe con Web Crypto (nativo Deno) ────────
async function verifyStripeSignature(body: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts     = sigHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1sigs    = parts.filter(p => p.startsWith('v1=')).map(p => p.slice(3));

  if (!timestamp || v1sigs.length === 0) return false;

  // Tolleranza 5 minuti
  if (Math.abs(Date.now() / 1000 - parseInt(timestamp)) > 300) return false;

  const payload  = `${timestamp}.${body}`;
  const keyData  = new TextEncoder().encode(secret);
  const msgData  = new TextEncoder().encode(payload);

  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf   = await crypto.subtle.sign('HMAC', key, msgData);
  const computed = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return v1sigs.some(s => s === computed);
}

// ── Email admin HTML ──────────────────────────────────────────
function buildAdminEmail(opts: {
  nomeDisplay: string; email: string; planNome: string;
  isNewUser: boolean; aggiungeTessera: boolean; siteUrl: string;
}): string {
  const { nomeDisplay, email, planNome, isNewUser, aggiungeTessera, siteUrl } = opts;
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#fdfbf7;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfbf7;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:#2b2927;padding:32px 48px;text-align:center;">
    <p style="margin:0;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.5);font-family:sans-serif;">Arcadia Lab. — Notifica Admin</p>
    <h1 style="margin:10px 0 0;font-size:24px;color:#fff;font-weight:400;font-style:italic;">Nuovo abbonamento acquistato</h1>
  </td></tr>
  <tr><td style="padding:36px 48px;">
    <p style="margin:0 0 20px;font-size:15px;color:#2b2927;line-height:1.7;font-family:sans-serif;">
      ${isNewUser ? 'Un <strong>nuovo utente</strong> si è iscritto' : 'Un utente esistente ha <strong>rinnovato</strong> l\'abbonamento'} su Arcadia Lab.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;border-radius:16px;margin-bottom:24px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#5a544c;font-family:sans-serif;">Dettagli iscrizione</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:4px 0;font-size:14px;color:#5a544c;font-family:sans-serif;width:140px;">Nome</td><td style="padding:4px 0;font-size:14px;color:#2b2927;font-weight:700;font-family:sans-serif;">${nomeDisplay}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#5a544c;font-family:sans-serif;">Email</td><td style="padding:4px 0;font-size:14px;color:#2b2927;font-family:sans-serif;">${email}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#5a544c;font-family:sans-serif;">Piano</td><td style="padding:4px 0;font-size:14px;color:#b56a56;font-weight:700;font-family:sans-serif;">${planNome}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#5a544c;font-family:sans-serif;">Nuovo utente</td><td style="padding:4px 0;font-size:14px;color:#2b2927;font-family:sans-serif;">${isNewUser ? 'Sì' : 'No'}</td></tr>
          <tr><td style="padding:4px 0;font-size:14px;color:#5a544c;font-family:sans-serif;">Tessera inclusa</td><td style="padding:4px 0;font-size:14px;color:#2b2927;font-family:sans-serif;">${aggiungeTessera ? 'Sì' : 'No'}</td></tr>
        </table>
      </td></tr>
    </table>
    ${isNewUser ? `<div style="background:#fff8f0;border:1px solid #f0d4c4;border-radius:12px;padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0;font-size:13px;color:#b56a56;font-family:sans-serif;font-weight:700;">⏳ Certificato medico richiesto</p>
      <p style="margin:6px 0 0;font-size:13px;color:#5a544c;font-family:sans-serif;">Ricorda di sbloccare le prenotazioni una volta ricevuto il certificato medico.</p>
    </div>` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
      <a href="${siteUrl}/dashboard/users" style="display:inline-block;background:#b56a56;color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:sans-serif;">Gestisci utenti</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#f5f1e8;padding:20px 48px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#a39c90;font-family:sans-serif;font-style:italic;">Arcadia Lab. Yoga · <a href="${siteUrl}" style="color:#b56a56;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── Email HTML ────────────────────────────────────────────────
function buildEmail(opts: {
  email: string; planNome: string; tempPassword: string;
  isNewUser: boolean; aggiungeTessera: boolean; tesseraScadenza: string;
  siteUrl: string; requireCert: boolean;
}): string {
  const { email, planNome, tempPassword, isNewUser, aggiungeTessera, tesseraScadenza, siteUrl, requireCert } = opts;
  return `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#fdfbf7;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfbf7;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:#2b2927;padding:36px 48px;text-align:center;">
    <p style="margin:0;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.5);font-family:sans-serif;">Arcadia Lab. Yoga</p>
    <h1 style="margin:10px 0 0;font-size:30px;color:#fff;font-weight:400;font-style:italic;">${isNewUser ? 'Benvenuta/o!' : 'Abbonamento attivato!'}</h1>
  </td></tr>
  <tr><td style="padding:36px 48px;">
    <p style="margin:0 0 20px;font-size:15px;color:#2b2927;line-height:1.7;font-family:sans-serif;">
      ${isNewUser
        ? `Grazie per aver scelto <strong>Arcadia Lab.</strong><br/>Abbiamo creato il tuo account con: <strong>${email}</strong>`
        : `Grazie per aver rinnovato con <strong>Arcadia Lab.</strong><br/>Il piano <strong>${planNome}</strong> è ora attivo.`}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff4e0;border:1px solid #f0d4c4;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:#8a5a3a;line-height:1.6;font-family:sans-serif;">
          📬 <strong>Non vedi l'email tra pochi minuti?</strong> Controlla anche nella cartella <strong>Spam / Posta indesiderata</strong>.
        </p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;border-radius:16px;margin-bottom:24px;">
      <tr><td style="padding:18px 24px;">
        <p style="margin:0 0 4px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#5a544c;font-family:sans-serif;">Piano acquistato</p>
        <p style="margin:0;font-size:17px;color:#2b2927;font-weight:700;font-family:sans-serif;">${planNome}</p>
        ${aggiungeTessera ? `<p style="margin:8px 0 0;font-size:12px;color:#b56a56;font-family:sans-serif;">🎫 Tessera annuale inclusa — valida fino al ${tesseraScadenza}</p>` : ''}
      </td></tr>
    </table>
    ${isNewUser ? `
    <p style="margin:0 0 14px;font-size:15px;color:#2b2927;line-height:1.7;font-family:sans-serif;">
      Abbiamo creato le tue credenziali di accesso temporanee.<br/>
      Al primo accesso ti verrà chiesto di cambiare la password.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f7f0;border:1px solid #c8e0c8;border-radius:16px;margin-bottom:20px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 12px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#5a544c;font-family:sans-serif;">Le tue credenziali di accesso</p>
        <p style="margin:0 0 8px;font-size:14px;color:#2b2927;font-family:sans-serif;"><strong>Email:</strong> ${email}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#2b2927;font-family:sans-serif;"><strong>Password temporanea:</strong> <span style="font-family:monospace;background:#fff;padding:4px 10px;border-radius:6px;font-size:16px;letter-spacing:.1em;color:#b56a56;">${tempPassword}</span></p>
        <p style="margin:0;font-size:11px;color:#5a544c;font-family:sans-serif;">⚠️ Cambia la password al primo accesso per sicurezza.</p>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
      <a href="${siteUrl}/auth" style="display:inline-block;background:#b56a56;color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:sans-serif;">Accedi ora</a>
    </td></tr></table>
    ` : `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
      <a href="${siteUrl}/auth" style="display:inline-block;background:#b56a56;color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:sans-serif;">Accedi alla tua area personale</a>
    </td></tr></table>
    `}
    ${requireCert ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border:1px solid #f0d4c4;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b56a56;font-family:sans-serif;">⏳ Abbonamento in attesa di attivazione</p>
        <p style="margin:0;font-size:13px;color:#5a544c;line-height:1.6;font-family:sans-serif;">
          Il tuo abbonamento verrà attivato non appena riceveremo il tuo <strong>certificato medico di buona salute</strong>.<br/>
          Invialo a <a href="mailto:arcadialabyoga@gmail.com" style="color:#b56a56;">arcadialabyoga@gmail.com</a> oppure su WhatsApp al <strong>+39 346 677 0909</strong>.<br/>
          Non perderai nessun giorno — l'abbonamento partirà dalla data di verifica.
        </p>
      </td></tr>
    </table>` : `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border:1px solid #f0d4c4;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b56a56;font-family:sans-serif;">⚕️ Certificato medico richiesto</p>
        <p style="margin:0;font-size:13px;color:#5a544c;line-height:1.6;font-family:sans-serif;">
          Per partecipare alle lezioni è obbligatorio un <strong>certificato medico di buona salute</strong>.<br/>
          Puoi inviarlo a <a href="mailto:arcadialabyoga@gmail.com" style="color:#b56a56;">arcadialabyoga@gmail.com</a> oppure presentarlo alla <strong>prima lezione</strong>.
        </p>
      </td></tr>
    </table>`}
    <p style="margin:0;font-size:13px;color:#5a544c;font-family:sans-serif;">Dubbi? <a href="mailto:arcadialabyoga@gmail.com" style="color:#b56a56;">arcadialabyoga@gmail.com</a></p>
  </td></tr>
  <tr><td style="background:#f5f1e8;padding:20px 48px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#a39c90;font-family:sans-serif;font-style:italic;">Arcadia Lab. Yoga · <a href="${siteUrl}" style="color:#b56a56;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

// ── Resend ────────────────────────────────────────────────────
async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.warn('RESEND_API_KEY mancante'); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Arcadia Lab. <noreply@arcadialab.it>', to: [to], subject, html }),
  });
  if (!res.ok) console.error('Errore Resend:', await res.text());
  else console.log('✉️ Email inviata a', to);
}

// ── Handler principale ────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const body      = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';
  const secret    = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

  const valid = await verifyStripeSignature(body, sigHeader, secret);
  if (!valid) {
    console.error('Firma Stripe non valida');
    return new Response('Firma non valida', { status: 400 });
  }

  const event = JSON.parse(body);
  console.log('Evento ricevuto:', event.type);

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const session      = event.data.object;
  const metaType     = session.metadata?.type ?? 'plan';
  const customerEmail = session.customer_details?.email ?? session.metadata?.email ?? session.metadata?.customer_email;

  if (!customerEmail) {
    console.error('Email mancante');
    return new Response('Email mancante', { status: 400 });
  }

  const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.arcadialab.it';

  // ── RINNOVO TESSERA STANDALONE ───────────────────────────────
  if (metaType === 'tessera_renewal') {
    const customerEmail = session.customer_details?.email ?? session.metadata?.customer_email;
    if (customerEmail) {
      const scad = new Date();
      scad.setDate(scad.getDate() + 365);
      await supabase.from('profiles')
        .update({ tessera_scadenza: scad.toISOString().split('T')[0] })
        .eq('email', customerEmail.toLowerCase());

      await sendEmail(
        customerEmail,
        'Arcadia Lab. — Tessera associativa rinnovata',
        `<p style="font-family:sans-serif;font-size:15px;">
          La tua <strong>tessera associativa annuale</strong> è stata rinnovata con successo.<br/>
          Nuova scadenza: <strong>${scad.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
        </p>`,
      );
      console.log(`✅ Tessera rinnovata per ${customerEmail}`);
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── EVENTO SPECIALE ───────────────────────────────────────────
  if (metaType === 'event') {
    const eventId    = session.metadata?.event_id;
    const nome       = session.metadata?.nome ?? '';
    const cognome    = session.metadata?.cognome ?? '';
    const telefono   = session.metadata?.telefono ?? '';
    const userId     = session.metadata?.user_id || null;
    const isAbbonato = session.metadata?.is_abbonato === 'true';
    const prezzoStr  = session.metadata?.prezzo_pagato ?? '0';
    const eventTitolo = session.metadata?.event_titolo ?? 'Evento';

    // Genera codice riferimento: ARC-XXXXXX
    const chars   = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codice  = 'ARC-' + Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => chars[b % chars.length]).join('');

    // Salva biglietto
    const { error: ticketErr } = await supabase.from('event_tickets').insert({
      event_id:         eventId,
      user_id:          userId || null,
      nome,
      cognome,
      email:            customerEmail,
      telefono,
      codice_ref:       codice,
      stripe_payment_id: session.payment_intent ?? null,
      prezzo_pagato:    parseFloat(prezzoStr),
      is_abbonato:      isAbbonato,
    });

    if (ticketErr) {
      console.error('Errore biglietto:', JSON.stringify(ticketErr));
      return new Response('Errore salvataggio biglietto', { status: 500 });
    }

    // Leggi data evento per l'email
    const { data: evento } = await supabase.from('special_events').select('data_evento, luogo').eq('id', eventId).single();
    const dataFmt = evento?.data_evento
      ? new Date(evento.data_evento).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';

    // Email biglietto
    const htmlEmail = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#fdfbf7;font-family:Georgia,serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fdfbf7;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:#2b2927;padding:36px 48px;text-align:center;">
    <p style="margin:0;font-size:11px;letter-spacing:.3em;text-transform:uppercase;color:rgba(255,255,255,.5);font-family:sans-serif;">Arcadia Lab. Yoga</p>
    <h1 style="margin:10px 0 0;font-size:28px;color:#fff;font-weight:400;font-style:italic;">Il tuo biglietto è confermato!</h1>
  </td></tr>
  <tr><td style="padding:36px 48px;">
    <p style="margin:0 0 20px;font-size:15px;color:#2b2927;line-height:1.7;font-family:sans-serif;">
      Ciao <strong>${nome} ${cognome}</strong>,<br/>
      la tua prenotazione per l'evento <strong>${eventTitolo}</strong> è confermata.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff4e0;border:1px solid #f0d4c4;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0;font-size:13px;color:#8a5a3a;line-height:1.6;font-family:sans-serif;">
          📬 <strong>Non vedi l'email tra pochi minuti?</strong> Controlla anche nella cartella <strong>Spam / Posta indesiderata</strong>.
        </p>
      </td></tr>
    </table>

    <!-- Codice riferimento -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1e8;border-radius:16px;margin-bottom:24px;">
      <tr><td style="padding:24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#5a544c;font-family:sans-serif;">Il tuo codice di riferimento</p>
        <p style="margin:0;font-family:monospace;font-size:32px;font-weight:900;color:#b56a56;letter-spacing:.2em;">${codice}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#5a544c;font-family:sans-serif;">Presentalo all'ingresso dell'evento</p>
      </td></tr>
    </table>

    <!-- Dettagli evento -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #efebdf;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 4px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#5a544c;font-family:sans-serif;">Evento</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#2b2927;font-family:sans-serif;">${eventTitolo}</p>
        <p style="margin:0 0 4px;font-size:12px;color:#5a544c;font-family:sans-serif;">📅 ${dataFmt}</p>
        ${evento?.luogo ? `<p style="margin:4px 0 0;font-size:12px;color:#5a544c;font-family:sans-serif;">📍 ${evento.luogo}</p>` : ''}
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#5a544c;font-family:sans-serif;">
      Per info: <a href="mailto:arcadialabyoga@gmail.com" style="color:#b56a56;">arcadialabyoga@gmail.com</a>
    </p>
  </td></tr>
  <tr><td style="background:#f5f1e8;padding:20px 48px;text-align:center;">
    <p style="margin:0;font-size:12px;color:#a39c90;font-family:sans-serif;font-style:italic;">Arcadia Lab. Yoga · <a href="${siteUrl}" style="color:#b56a56;text-decoration:none;">${siteUrl.replace(/^https?:\/\//, '')}</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    await sendEmail(
      customerEmail,
      `Il tuo biglietto per "${eventTitolo}" — Codice: ${codice}`,
      htmlEmail,
    );

    // Notifica admin
    await sendEmail(
      'arcadialabyoga@gmail.com',
      `[Arcadia Lab.] Nuovo biglietto: ${eventTitolo}`,
      `<p style="font-family:sans-serif;font-size:15px;">Nuovo acquisto biglietto:<br/>
      <strong>Evento:</strong> ${eventTitolo}<br/>
      <strong>Data:</strong> ${dataFmt}<br/>
      <strong>Nome:</strong> ${nome} ${cognome}<br/>
      <strong>Email:</strong> ${customerEmail}<br/>
      <strong>Codice:</strong> ${codice}<br/>
      <strong>Abbonato:</strong> ${isAbbonato ? 'Sì' : 'No'}</p>`,
    );

    console.log(`✅ Biglietto evento ${codice} emesso per ${customerEmail}`);

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // ── ABBONAMENTO (flusso esistente) ────────────────────────────
  const planId          = session.metadata?.plan_id;
  const lezioni         = parseInt(session.metadata?.lezioni_totali ?? '0');
  const durata          = parseInt(session.metadata?.durata_giorni  ?? '30');
  const aggiungeTessera = session.metadata?.aggiunge_tessera === 'true';
  const stripeCustomerId = session.customer ?? null;
  const planNome        = session.metadata?.plan_nome ?? 'Abbonamento';

  if (!planId) {
    console.error('plan_id mancante');
    return new Response('Dati mancanti', { status: 400 });
  }

  console.log('Elaborazione abbonamento per:', customerEmail);

  // Idempotenza: se questo payment_intent è già stato processato, ignoralo
  const stripePaymentId = session.payment_intent ?? session.id;
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('stripe_payment_id', stripePaymentId)
    .maybeSingle();

  if (existing) {
    console.log('Evento già processato, skip:', stripePaymentId);
    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    let userId: string;
    let isNewUser = false;
    let tempPassword = '';

    // Genera password temporanea leggibile
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(10)))
      .map(b => chars[b % chars.length]).join('');

    // Cerca se l'utente esiste tramite il profilo
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail.toLowerCase())
      .maybeSingle();

    if (profile) {
      userId    = profile.id;
      isNewUser = false;
      tempPassword = ''; // utente esistente, non mandiamo nuova password
      console.log('Utente esistente:', userId);
    } else {
      // Crea nuovo utente con password temporanea
      isNewUser = true;
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email:            customerEmail,
        password:         tempPassword,
        email_confirm:    true,
        user_metadata:    { stripe_customer_id: stripeCustomerId, must_change_password: true },
      });

      if (createError || !newUser?.user) {
        console.error('createUser error:', JSON.stringify(createError));
        return new Response('Errore creazione utente: ' + createError?.message, { status: 500 });
      }

      userId = newUser.user.id;
      console.log('Nuovo utente creato:', userId);
    }

    const nomeUtente     = session.metadata?.nome    ?? '';
    const cognomeUtente  = session.metadata?.cognome  ?? '';
    const telefonoUtente = session.metadata?.telefono ?? '';

    // Assicura che il profilo esista (nel caso il trigger non l'abbia creato)
    await supabase.from('profiles').upsert(
      {
        id: userId,
        email: customerEmail,
        stripe_customer_id: stripeCustomerId,
        ...(nomeUtente    && { nome:     nomeUtente }),
        ...(cognomeUtente && { cognome:  cognomeUtente }),
        ...(telefonoUtente && { telefono: telefonoUtente }),
      },
      { onConflict: 'id' }
    );
    console.log('Profilo assicurato per:', userId);

    // Tessera
    const oggi = new Date();
    if (aggiungeTessera) {
      const scad = new Date(oggi);
      scad.setDate(scad.getDate() + 365);
      await supabase.from('profiles').update({ tessera_scadenza: scad.toISOString().split('T')[0] }).eq('id', userId);
      console.log('Tessera aggiunta');
    }

    // Data tessera per email
    const { data: profAggiornato } = await supabase.from('profiles').select('tessera_scadenza').eq('id', userId).single();
    const tesseraStr = profAggiornato?.tessera_scadenza
      ? new Date(profAggiornato.tessera_scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    // Controlla impostazione certificato medico
    const { data: certSetting } = await supabase
      .from('site_settings').select('value').eq('key', 'require_medical_cert').single();
    const requireCert = certSetting?.value !== 'false';

    // Disattiva abbonamenti precedenti
    await supabase.from('subscriptions').update({ stato: 'scaduto' }).eq('user_id', userId).eq('stato', 'attivo');

    // Calcola date solo se non richiede cert (o se è un rinnovo di utente già verificato)
    const renewalFrom = session.metadata?.renewal_from;
    const profileAttuale = await supabase.from('profiles').select('prenotazioni_sbloccate').eq('id', userId).single();
    const giaVerificato = profileAttuale.data?.prenotazioni_sbloccate === true;

    // Se cert richiesto e utente non ancora verificato → abbonamento in attesa
    const statoSub = (requireCert && !giaVerificato) ? 'in_attesa' : 'attivo';

    let dataInizioStr: string | null = null;
    let dataScadenzaStr: string | null = null;

    // Inizio corsi 2026: chi si abbona prima di questa data non perde giorni,
    // l'abbonamento parte da qui invece che dal giorno del pagamento (eccezione valida solo per quest'anno)
    const inizioCorsi2026 = new Date('2026-09-08T00:00:00Z');

    if (statoSub === 'attivo') {
      const dataInizio = renewalFrom
        ? (() => { const d = new Date(renewalFrom); d.setDate(d.getDate() + 1); return d; })()
        : (oggi < inizioCorsi2026 ? inizioCorsi2026 : oggi);
      const scadAbb = new Date(dataInizio);
      scadAbb.setDate(scadAbb.getDate() + durata);
      dataInizioStr   = dataInizio.toISOString().split('T')[0];
      dataScadenzaStr = scadAbb.toISOString().split('T')[0];
    }

    const { error: subErr } = await supabase.from('subscriptions').insert({
      user_id:            userId,
      plan_id:            planId,
      lezioni_totali:     lezioni,
      lezioni_usate:      0,
      durata_giorni:      durata,
      data_inizio:        dataInizioStr,
      data_scadenza:      dataScadenzaStr,
      stato:              statoSub,
      prezzo_pagato:      session.amount_total ? session.amount_total / 100 : null,
      stripe_payment_id:  session.payment_intent ?? null,
      stripe_customer_id: stripeCustomerId,
    });

    if (subErr) {
      console.error('Errore abbonamento:', JSON.stringify(subErr));
      return new Response('Errore abbonamento: ' + subErr.message, { status: 500 });
    }

    console.log('Abbonamento creato');

    // Email
    const html = buildEmail({ email: customerEmail, planNome, tempPassword, isNewUser, aggiungeTessera, tesseraScadenza: tesseraStr, siteUrl, requireCert });
    const subject = isNewUser
      ? `Benvenuta/o in Arcadia Lab. — Il tuo account è pronto 🧘`
      : `Arcadia Lab. — Il tuo abbonamento "${planNome}" è attivo`;
    await sendEmail(customerEmail, subject, html);

    // Notifica admin
    const nomeDisplay = [session.metadata?.nome, session.metadata?.cognome].filter(Boolean).join(' ') || customerEmail;
    await sendEmail(
      'arcadialabyoga@gmail.com',
      `[Arcadia Lab.] Nuovo abbonamento: ${nomeDisplay} — ${planNome}`,
      buildAdminEmail({ nomeDisplay, email: customerEmail, planNome, isNewUser, aggiungeTessera, siteUrl }),
    );

    console.log('✅ Tutto completato per', customerEmail);

    return new Response(JSON.stringify({ received: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Errore non gestito:', err instanceof Error ? err.message : String(err));
    return new Response('Errore interno', { status: 500 });
  }
});
