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

async function getAdvisorProfile(slug, body) {
  const fallback = {
    slug: slug || 'featured-advisor',
    full_name: clean(body.advisor_name, 'Your Financial Advisor'),
    role_title: clean(body.advisor_title, 'Licensed Financial Advisor'),
    reply_to_email: safeEmail(body.advisor_email),
    messenger_url: safeURL(body.advisor_messenger, 'https://m.me/'),
    booking_url: safeURL(body.advisor_booking, safeURL(body.advisor_messenger, 'https://m.me/'))
  };

  if (!slug || !process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return fallback;
  }

  try {
    const supabaseURL = new URL(process.env.SUPABASE_URL);
    const key = process.env.SUPABASE_ANON_KEY;
    const rows = await requestJSON({
      hostname: supabaseURL.hostname,
      path: `/rest/v1/advisors_directory?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    }, undefined, 10000);

    if (Array.isArray(rows) && rows[0]) {
      const r = rows[0];
      return {
        slug: clean(r.slug, fallback.slug),
        full_name: clean(r.full_name, fallback.full_name),
        role_title: clean(r.role_title, fallback.role_title),
        reply_to_email: safeEmail(r.reply_to_email) || fallback.reply_to_email,
        messenger_url: safeURL(r.messenger_url, fallback.messenger_url),
        booking_url: safeURL(r.booking_url, safeURL(r.live_profile_url, fallback.booking_url))
      };
    }
  } catch (err) {
    console.warn('Advisor lookup skipped (using payload defaults):', err.message);
  }
  return fallback;
}

function buildEmail1HTML(prospectName, calc, advisor) {
  const runwayText = `${Number(calc.runway_months || 0).toFixed(1)} months`;
  const gapText = formatPHP(calc.protection_gap);
  const totalTargetText = formatPHP(calc.total_needed);
  const monthlyBurnText = formatPHP(calc.monthly_expenses);
  const liquidCashText = formatPHP(calc.liquid_savings);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6f8;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="background-color:#1e3a5f;padding:24px 28px;color:#ffffff;">
              <p style="margin:0;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#93c5fd;font-weight:700;">Your Family Safety Net Breakdown</p>
              <h1 style="margin:8px 0 0;font-size:21px;line-height:1.35;font-weight:700;color:#ffffff;">Hi ${esc(prospectName)}, here is your 30-second Safety Net result</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;">
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Maraming salamat sa pag-check ng iyong <strong>Family Safety Net</strong>. Base sa mga nilagay mong detalye, ito ang magiging sitwasyon ng pamilya mo kung biglang huminto ang kita bukas dahil sa sakit o aksidente:
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;">
                    <span style="display:block;font-size:12px;color:#64748b;font-weight:600;">CURRENT CASH RUNWAY (Kung gaano katagal tatagal ang cash mo)</span>
                    <span style="display:block;font-size:24px;font-weight:800;color:#b91c1c;margin-top:4px;">${esc(runwayText)}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 18px;border-bottom:1px solid #e2e8f0;">
                    <span style="display:block;font-size:12px;color:#64748b;font-weight:600;">ESTIMATED PROTECTION GAP (Kulang na backup fund)</span>
                    <span style="display:block;font-size:22px;font-weight:800;color:#0f172a;margin-top:4px;">${esc(gapText)}</span>
                    <span style="display:block;font-size:12px;color:#64748b;margin-top:4px;">Total target safety net: ${esc(totalTargetText)} (${esc(calc.milestone_label || 'Family Protection')})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:12px 18px;font-size:13px;color:#475569;">
                    Monthly Family Bills: <strong>${esc(monthlyBurnText)}</strong> &nbsp;|&nbsp; Ready Emergency Cash: <strong>${esc(liquidCashText)}</strong>
                  </td>
                </tr>
              </table>

              <h2 style="margin:0 0 10px;font-size:16px;font-weight:700;color:#0f172a;">3 Practical Options You Can Do Today (Nang Hindi Nabibigatan sa Budget):</h2>
              <ol style="margin:0 0 22px;padding-left:20px;font-size:14px;line-height:1.65;color:#334155;">
                <li style="margin-bottom:8px;"><strong>Separate Your Health Fund from Your Savings:</strong> Kahit may company HMO ka, hanggang ₱100k–₱250k lang ito at nawawala kapag hindi ka na nakapagtrabaho. Maglaan ng hiwalay na Critical Illness shield para hindi maubos ang ipon ng pamilya.</li>
                <li style="margin-bottom:8px;"><strong>Lock In Income Replacement While Healthy:</strong> Mas mura nang malaki ang pag-set up ng family safety net habang bata at malakas pa—para tuloy ang monthly bills at tuition ng mga bata kahit anong mangyari.</li>
                <li><strong>Protect Hard-Earned Assets from Freeze &amp; Forced Sale:</strong> Siguraduhing may tax-free cash backup ang pamilya para hindi kailangang ibenta nang palugi ang lupa, bahay, o sasakyan pambayad sa utang o BIR estate tax.</li>
              </ol>

              <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:18px;margin-bottom:22px;">
                <p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#1e3a8a;">
                  <strong>Gusto mo bang makita kung magkano lang ang pinaka-abot-kayang option para ma-close ang ${esc(gapText)} gap mo?</strong><br>
                  Puwede tayong mag-usap nang 15 minutes—walang pilitan, pure clarity at computation lang base sa budget mo.
                </p>
                <a href="${esc(advisor.booking_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#1e3a5f;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;margin-right:8px;margin-bottom:6px;">Book a Free 15-Min Clarity Chat &rarr;</a>
                <a href="${esc(advisor.messenger_url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background-color:#ffffff;color:#1e3a5f;border:1px solid #93c5fd;text-decoration:none;font-weight:600;font-size:14px;padding:11px 18px;border-radius:10px;margin-bottom:6px;">Message on Messenger</a>
              </div>

              <p style="margin:0;font-size:14px;line-height:1.6;color:#334155;">
                Para sa proteksyon ng pamilya mo,<br>
                <strong>${esc(advisor.full_name)}</strong><br>
                <span style="font-size:12px;color:#64748b;">${esc(advisor.role_title)}</span>
              </p>
              <p style="margin:14px 0 0;font-size:12px;color:#64748b;">
                <em>Tip: Puwede kang mag-reply directly sa email na ito kung may tanong ka—diretso ito sa inbox ni ${esc(advisor.full_name)}.</em>
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

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const prospectName = clean(body.prospect_name || body.name);
  const prospectEmail = safeEmail(body.prospect_email || body.email);
  const advisorSlug = clean(body.advisor_slug, 'featured-advisor');

  if (!prospectName || !prospectEmail) {
    return res.status(400).json({ error: 'Please provide your first name and a valid email address.' });
  }

  const calc = {
    monthly_expenses: Number(body.monthly_expenses) || 0,
    liquid_savings: Number(body.liquid_savings) || 0,
    education_fund: Number(body.education_fund) || 0,
    debts_assets: Number(body.debts_assets) || 0,
    protection_years: Number(body.protection_years) || 5,
    milestone_label: clean(body.milestone_label, 'Family Transition & Protection'),
    runway_months: Number(body.runway_months) || 0,
    total_needed: Number(body.total_needed) || 0,
    protection_gap: Number(body.protection_gap) || 0,
    directory_goal: clean(body.directory_goal)
  };

  const advisor = await getAdvisorProfile(advisorSlug, body);
  const now = new Date();
  const nextSend = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();

  let savedId = null;
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    try {
      const supabaseURL = new URL(process.env.SUPABASE_URL);
      const key = process.env.SUPABASE_ANON_KEY;
      const inserted = await requestJSON({
        hostname: supabaseURL.hostname,
        path: '/rest/v1/advisor_prospects',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'return=representation'
        }
      }, {
        advisor_slug: advisor.slug,
        prospect_name: prospectName,
        prospect_email: prospectEmail,
        monthly_expenses: calc.monthly_expenses,
        liquid_savings: calc.liquid_savings,
        education_fund: calc.education_fund,
        debts_assets: calc.debts_assets,
        protection_years: calc.protection_years,
        milestone_label: calc.milestone_label,
        runway_months: calc.runway_months,
        total_needed: calc.total_needed,
        protection_gap: calc.protection_gap,
        directory_goal: calc.directory_goal || null,
        nurture_step: 1,
        next_send_at: nextSend,
        created_at: now.toISOString()
      }, 15000);
      if (Array.isArray(inserted) && inserted[0] && inserted[0].id) {
        savedId = inserted[0].id;
      }
    } catch (err) {
      console.error('Supabase advisor_prospects insert error:', err.message);
      return res.status(500).json({ error: 'Could not save your calculation right now. Please try again.' });
    }
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.RESEND_ADVISOR_FROM || process.env.RESEND_FROM || 'Trusted Advisor Match <notifications@ascottdigitalbiz.com>';

  if (resendKey) {
    try {
      const emailPayload = {
        from: `${advisor.full_name} via Ascott Digital Biz <${fromAddress.replace(/^.*<|>$/g, '')}>`,
        to: [prospectEmail],
        subject: `${prospectName}, your Family Safety Net Result (${Number(calc.runway_months).toFixed(1)} Months Runway)`,
        html: buildEmail1HTML(prospectName, calc, advisor)
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
    } catch (err) {
      console.error('Resend Email #1 send error:', err.message);
    }
  }

  return res.status(200).json({
    success: true,
    lead_id: savedId,
    message: 'Your Safety Net Breakdown has been sent to your email!'
  });
};
