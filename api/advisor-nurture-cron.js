'use strict';

const https = require('https');

function requestJSON(options, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (response) => {
      let raw = '';
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        let parsed = {};
        if (raw.trim()) {
          try { parsed = JSON.parse(raw); }
          catch (_) { return reject(new Error(`Invalid JSON (${response.statusCode}): ${raw.slice(0, 200)}`)); }
        }
        if (response.statusCode >= 400) {
          const msg = (parsed && (parsed.message || (parsed.error && parsed.error.message) || parsed.error)) || `HTTP ${response.statusCode}`;
          return reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    if (timeoutMs) req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out')));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clean(v, fallback = '') {
  const s = String(v == null ? '' : v).trim();
  return s || fallback;
}

function safeEmail(v) {
  const s = String(v || '').trim();
  return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(s) ? s : '';
}

function safeURL(v, fallback) {
  const s = String(v || '').trim();
  if (!s) return fallback;
  try {
    const u = new URL(s);
    return ['http:', 'https:', 'viber:'].includes(u.protocol) ? u.href : fallback;
  } catch (_) {
    return fallback;
  }
}

function formatPHP(num) {
  const n = Math.max(0, Math.round(Number(num) || 0));
  return '₱' + n.toLocaleString('en-PH');
}

function wrapEmail(title, bodyHtml, advisor) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background-color:#1e3a5f;padding:22px 26px;color:#ffffff;">
              <h1 style="margin:0;font-size:20px;line-height:1.35;font-weight:700;color:#ffffff;">${esc(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px;">
              ${bodyHtml}
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;margin-top:20px;">
                <p style="margin:0 0 10px;font-size:13.5px;color:#334155;">Want a quick, zero-pressure computation tailored to your budget?</p>
                <a href="${esc(advisor.booking_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:700;font-size:13.5px;padding:11px 18px;border-radius:10px;margin-right:8px;margin-bottom:6px;">Book 15-Min Clarity Call &rarr;</a>
                <a href="${esc(advisor.messenger_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#ffffff;color:#1e3a5f;border:1px solid #cbd5e1;text-decoration:none;font-weight:600;font-size:13.5px;padding:10px 16px;border-radius:10px;margin-bottom:6px;">Chat on Messenger</a>
              </div>
              <p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#334155;">
                Warm regards,<br>
                <strong>${esc(advisor.full_name)}</strong><br>
                <span style="font-size:12px;color:#64748b;">${esc(advisor.role_title)}</span>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getNurtureTemplate(nextStep, lead, advisor) {
  const name = esc(lead.prospect_name);
  const gap = esc(formatPHP(lead.protection_gap));

  if (nextStep === 2) {
    return {
      subject: `${lead.prospect_name}, bakit hindi sapat ang company HMO kapag nagkasakit?`,
      daysUntilNext: 2,
      html: wrapEmail(
        'Why Company HMO Often Stops Right When You Need It Most',
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${name},</p>
         <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Marami sa mga nakakausap ko ang nagsasabi: <em>"Okay na ako, may HMO naman ako sa company."</em></p>
         <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Maganda ang company HMO para sa check-ups at minor confinement. Pero sa private hospitals sa Pilipinas, ang heart bypass surgery ay umaabot ng <strong>₱1.2M–₱1.4M</strong> at ang cancer treatment ay nasa <strong>₱800k–₱2.5M+</strong>—at kapag hindi ka na nakabalik sa trabaho, <strong>nawawala rin ang company HMO mo</strong>.</p>
         <p style="margin:0;font-size:14.5px;line-height:1.6;">Ang solusyon? Isang hiwalay na <strong>Critical Illness Cash Fund</strong> na diretso sa iyo ang lump-sum cash para hindi maubos ang pinaghirapang ipon ng pamilya.</p>`,
        advisor
      )
    };
  }

  if (nextStep === 3) {
    return {
      subject: `Paano maiiwasang ma-freeze ang bank account at lupa ng pamilya`,
      daysUntilNext: 3,
      html: wrapEmail(
        'The 6% BIR Rule Every Filipino Family Should Know',
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${name},</p>
         <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Alam mo ba na sa ilalim ng <strong>TRAIN Law</strong>, kapag pumanaw ang may-ari ng bank account, lupa, o sasakyan, automatic na naka-freeze ito?</p>
         <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Hindi puwedeng mag-withdraw ang pamilya at hindi rin maililipat ang titulo hangga’t hindi nababayaran sa BIR ang <strong>6% Estate Tax</strong> sa loob ng 1 taon (+25% surcharge kapag na-late).</p>
         <p style="margin:0;font-size:14.5px;line-height:1.6;">Ang magandang balita: ang life insurance na may irrevocable beneficiary ay <strong>hindi nafi-freeze at 100% tax-free</strong>—kaya may instant cash ang pamilya pambayad sa BIR nang hindi nagbebenta ng ari-arian nang palugi.</p>`,
        advisor
      )
    };
  }

  if (nextStep === 4) {
    return {
      subject: `${lead.prospect_name}, magkano lang ba talaga ang tamang safety net?`,
      daysUntilNext: 3,
      html: wrapEmail(
        'Closing Your Protection Gap Without Hurting Your Monthly Budget',
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${name},</p>
         <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Sa Safety Net Check mo kamakailan, lumabas ang estimated gap na <strong>${gap}</strong>. Baka iniisip mo na masyadong mahal kung pupunuin agad lahat.</p>
         <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Sa totoo lang, hindi mo kailangang biglain. Puwede tayong magsimula sa <strong>Stage 1 protection</strong> na pasok sa komportableng monthly budget mo—para lang siguradong hindi zero ang pamilya kung may mangyari bukas.</p>
         <p style="margin:0;font-size:14.5px;line-height:1.6;">Reply ka lang sa email na ito kung gusto mong makita ang sample monthly options para sa age at budget mo.</p>`,
        advisor
      )
    };
  }

  return {
    subject: `Quick check-in, ${lead.prospect_name} (Walang pilitan)`,
    daysUntilNext: null,
    html: wrapEmail(
      'Still Here Whenever You Are Ready for a Quick Check-In',
      `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;">Hi ${name},</p>
       <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Kumusta? Ito na ang huling automated reminder mula sa akin para hindi mapuno ang inbox mo.</p>
       <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;">Kung busy ka pa sa ngayon, okay na okay lang. Pero kung gusto mo nang gawing konkreto ang <strong>${gap}</strong> safety net ng pamilya mo—o gusto mo lang magtanong ng kahit ano tungkol sa existing plans mo—puwede mo akong i-message anytime.</p>
       <p style="margin:0;font-size:14.5px;line-height:1.6;">I-save mo lang ang email na ito at mag-reply kapag ready ka na.</p>`,
      advisor
    )
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: 'Missing required environment variables' });
  }

  const supabaseURL = new URL(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_ANON_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_ADVISOR_FROM || process.env.RESEND_FROM || 'Trusted Advisor Match <notifications@ascottdigitalbiz.com>';
  const nowIso = new Date().toISOString();

  try {
    const dueLeads = await requestJSON({
      hostname: supabaseURL.hostname,
      path: `/rest/v1/advisor_prospects?nurture_step=lt.5&next_send_at=lte.${encodeURIComponent(nowIso)}&select=*&limit=25`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    }, undefined, 15000);

    if (!Array.isArray(dueLeads) || dueLeads.length === 0) {
      return res.status(200).json({ processed: 0, message: 'No due advisor nurture emails right now.' });
    }

    const advisorRows = await requestJSON({
      hostname: supabaseURL.hostname,
      path: '/rest/v1/advisors_directory?select=*',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    }, undefined, 10000).catch(() => []);

    const advisorMap = {};
    if (Array.isArray(advisorRows)) {
      advisorRows.forEach((r) => { if (r.slug) advisorMap[r.slug] = r; });
    }

    let sentCount = 0;

    for (const lead of dueLeads) {
      const nextStep = (Number(lead.nurture_step) || 1) + 1;
      const rawAdv = advisorMap[lead.advisor_slug] || {};
      const advisor = {
        full_name: clean(rawAdv.full_name, 'Your Financial Advisor'),
        role_title: clean(rawAdv.role_title, 'Licensed Financial Advisor'),
        reply_to_email: safeEmail(rawAdv.reply_to_email),
        messenger_url: safeURL(rawAdv.messenger_url, 'https://m.me/'),
        booking_url: safeURL(rawAdv.booking_url, safeURL(rawAdv.live_profile_url, 'https://m.me/'))
      };

      const tpl = getNurtureTemplate(nextStep, lead, advisor);
      const emailPayload = {
        from: `${advisor.full_name} via Ascott Digital Biz <${fromAddress.replace(/^.*<|>$/g, '')}>`,
        to: [lead.prospect_email],
        subject: tpl.subject,
        html: tpl.html
      };
      if (advisor.reply_to_email) {
        emailPayload.reply_to = advisor.reply_to_email;
      }

      await requestJSON({
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendKey}`
        }
      }, emailPayload, 15000);

      const nextSendAt = tpl.daysUntilNext
        ? new Date(Date.now() + tpl.daysUntilNext * 24 * 60 * 60 * 1000).toISOString()
        : null;

      await requestJSON({
        hostname: supabaseURL.hostname,
        path: `/rest/v1/advisor_prospects?id=eq.${encodeURIComponent(lead.id)}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      }, {
        nurture_step: nextStep,
        next_send_at: nextSendAt
      }, 10000);

      sentCount += 1;
    }

    return res.status(200).json({ processed: sentCount });
  } catch (err) {
    console.error('Advisor nurture cron error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
