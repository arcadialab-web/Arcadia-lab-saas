import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ADMIN_EMAILS = ['ai.danielcorso@gmail.com', 'arcadialabyoga@gmail.com'];

async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  const jwt = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(jwt);
  if (error || !user) return false;
  if (ADMIN_EMAILS.includes(user.email ?? '')) return true;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return profile?.role === 'admin';
}

// ── Email benvenuto ───────────────────────────────────────────
function buildEmail(opts: {
  email: string; planNome: string; tempPassword: string;
  isNewUser: boolean; aggiungeTessera: boolean; tesseraScadenza: string;
  siteUrl: string; requireCert: boolean; sbloccato: boolean;
}): string {
  const { email, planNome, tempPassword, isNewUser, aggiungeTessera, tesseraScadenza, siteUrl, requireCert, sbloccato } = opts;
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
        : `Grazie per esserti iscritta/o con <strong>Arcadia Lab.</strong><br/>Il piano <strong>${planNome}</strong> è ora attivo.`}
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
        <p style="margin:0 0 4px;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:#5a544c;font-family:sans-serif;">Piano</p>
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
    ` : ''}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;"><tr><td align="center">
      <a href="${siteUrl}/auth" style="display:inline-block;background:#b56a56;color:#fff;text-decoration:none;padding:14px 36px;border-radius:50px;font-size:14px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;font-family:sans-serif;">${isNewUser ? 'Accedi ora' : 'Accedi alla tua area personale'}</a>
    </td></tr></table>
    ${requireCert && !sbloccato ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f0;border:1px solid #f0d4c4;border-radius:12px;margin-bottom:24px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#b56a56;font-family:sans-serif;">⚕️ Certificato medico richiesto</p>
        <p style="margin:0;font-size:13px;color:#5a544c;line-height:1.6;font-family:sans-serif;">
          Per partecipare alle lezioni è obbligatorio un <strong>certificato medico di buona salute</strong>.<br/>
          Puoi inviarlo a <a href="mailto:arcadialabyoga@gmail.com" style="color:#b56a56;">arcadialabyoga@gmail.com</a> oppure presentarlo alla <strong>prima lezione</strong>.
        </p>
      </td></tr>
    </table>` : ''}
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

async function sendEmail(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.warn('RESEND_API_KEY mancante'); return; }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Arcadia Lab. <noreply@arcadialab.it>', to: [to], subject, html }),
  });
  if (!res.ok) console.error('Errore Resend:', await res.text());
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!await verifyAdmin(req)) {
    return new Response(JSON.stringify({ error: 'Non autorizzato' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const {
      nome, cognome, email, telefono,
      plan_id, aggiungi_tessera, importo_pagato, sblocca_prenotazioni, is_test,
    } = await req.json();

    if (!nome || !cognome || !email || !plan_id) {
      return new Response(JSON.stringify({ error: 'Nome, cognome, email e piano sono obbligatori' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailNorm = String(email).trim().toLowerCase();

    const { data: plan, error: planErr } = await supabase
      .from('plans').select('nome, lezioni_totali, durata_giorni').eq('id', plan_id).single();
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: 'Piano non trovato' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SITE_URL') ?? 'https://www.arcadialab.it';

    let userId: string;
    let isNewUser = false;
    let tempPassword = '';

    const { data: existingProfile } = await supabase
      .from('profiles').select('id').eq('email', emailNorm).maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      isNewUser = true;
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(10)))
        .map(b => chars[b % chars.length]).join('');

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: emailNorm,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { must_change_password: true },
      });

      if (createError || !newUser?.user) {
        return new Response(JSON.stringify({ error: 'Errore creazione utente: ' + createError?.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = newUser.user.id;
    }

    await supabase.from('profiles').upsert({
      id: userId,
      email: emailNorm,
      nome,
      cognome,
      ...(telefono && { telefono }),
    }, { onConflict: 'id' });

    // Tessera
    const oggi = new Date();
    if (aggiungi_tessera) {
      const scad = new Date(oggi);
      scad.setDate(scad.getDate() + 365);
      await supabase.from('profiles').update({ tessera_scadenza: scad.toISOString().split('T')[0] }).eq('id', userId);
    }

    if (sblocca_prenotazioni) {
      await supabase.from('profiles').update({ prenotazioni_sbloccate: true }).eq('id', userId);
    }

    const { data: profAggiornato } = await supabase.from('profiles').select('tessera_scadenza').eq('id', userId).single();
    const tesseraStr = profAggiornato?.tessera_scadenza
      ? new Date(profAggiornato.tessera_scadenza).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
      : '';

    const { data: certSetting } = await supabase
      .from('site_settings').select('value').eq('key', 'require_medical_cert').single();
    const requireCert = certSetting?.value !== 'false';

    // Disattiva abbonamenti precedenti
    await supabase.from('subscriptions').update({ stato: 'scaduto' }).eq('user_id', userId).in('stato', ['attivo', 'in_attesa']);

    const sbloccato = sblocca_prenotazioni === true;
    const statoSub = (requireCert && !sbloccato) ? 'in_attesa' : 'attivo';

    let dataInizioStr: string | null = null;
    let dataScadenzaStr: string | null = null;
    if (statoSub === 'attivo') {
      const scadAbb = new Date(oggi);
      scadAbb.setDate(scadAbb.getDate() + (plan.durata_giorni ?? 30));
      dataInizioStr   = oggi.toISOString().split('T')[0];
      dataScadenzaStr = scadAbb.toISOString().split('T')[0];
    }

    const prezzoPagato = importo_pagato != null && importo_pagato !== '' ? Number(importo_pagato) : 0;

    const { error: subErr } = await supabase.from('subscriptions').insert({
      user_id:        userId,
      plan_id:        plan_id,
      lezioni_totali: plan.lezioni_totali ?? 0,
      lezioni_usate:  0,
      durata_giorni:  plan.durata_giorni ?? 30,
      data_inizio:    dataInizioStr,
      data_scadenza:  dataScadenzaStr,
      stato:          statoSub,
      prezzo_pagato:  prezzoPagato,
      stripe_payment_id: `manual_${crypto.randomUUID()}`,
      is_test:        is_test === true,
    });

    if (subErr) {
      return new Response(JSON.stringify({ error: 'Errore abbonamento: ' + subErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Email benvenuto
    const html = buildEmail({
      email: emailNorm, planNome: plan.nome, tempPassword, isNewUser,
      aggiungeTessera: !!aggiungi_tessera, tesseraScadenza: tesseraStr, siteUrl, requireCert, sbloccato,
    });
    const subject = isNewUser
      ? `Benvenuta/o in Arcadia Lab. — Il tuo account è pronto 🧘`
      : `Arcadia Lab. — Il tuo abbonamento "${plan.nome}" è attivo`;
    await sendEmail(emailNorm, subject, html);

    return new Response(JSON.stringify({ success: true, user_id: userId, is_new_user: isNewUser }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Errore admin-create-user:', err instanceof Error ? err.message : String(err));
    return new Response(JSON.stringify({ error: 'Errore interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
