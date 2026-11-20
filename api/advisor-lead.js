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

// Clean, personal-style HTML & Plain Text (optimized for Gmail Primary tab)
function buildPrimaryEmailContent(prospectName, calc, advisor) {
  const runwayText = `${Number(calc.runway_months || 0).toFixed(1)} months`;
  const gapText = formatPHP(calc.protection_gap);
  const totalTargetText = formatPHP(calc.total_needed);
  const monthlyBurnText = formatPHP(calc.monthly_expenses);
  const liquidCashText = formatPHP(calc.liquid_savings);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:16px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#1f2937;">
  <div style="max-width:580px;">
    <p style="margin:0 0 16px;">Hi ${esc(prospectName)},</p>

    <p style="margin:0 0 16px;">Thanks for checking your Family Safety Net earlier. Here is a copy of your calculation so you have it saved:</p>

    <p style="margin:0 0 16px;padding-left:14px;border-left:3px solid #cbd5e1;">
      <strong>Current Cash Runway:</strong> ${esc(runwayText)}<br>
      <strong>Estimated Protection Gap:</strong> ${esc(gapText)} (Target: ${esc(totalTargetText)} — ${esc(calc.milestone_label || 'Family Protection')})<br>
      <strong>Monthly Family Bills:</strong> ${esc(monthlyBurnText)} | <strong>Ready Cash:</strong> ${esc(liquidCashText)}
    </p>

    <p style="margin:0 0 10px;"><strong>3 practical steps you can take today (nang hindi nabibigatan sa budget):</strong></p>

    <p style="margin:0 0 12px;"><strong>1. Separate your Health Fund from your savings.</strong><br>
    Company HMOs usually cap out at ₱100k–₱250k and stop the moment you resign or can no longer work. Setting aside a dedicated Critical Illness shield keeps hospital bills from draining your family's cash.</p>

    <p style="margin:0 0 12px;"><strong>2. Lock in income replacement while you're healthy.</strong><br>
    Setting up a safety net is significantly more affordable while you're young and healthy—ensuring monthly bills and tuition continue even if your income stops.</p>

    <p style="margin:0 0 18px;"><strong>3. Protect hard-earned assets from freeze and forced sale.</strong><br>
    Under Philippine law, bank accounts and land titles freeze upon passing until the 6% BIR estate tax is paid. A tax-free cash backup prevents your family from selling properties at a loss.</p>

    <p style="margin:0 0 16px;">If you'd like to see the most budget-friendly way to close your ${esc(gapText)} gap, just hit <strong>Reply</strong> to this email with your age—or pick a quick 15-minute slot here:<br>
    <a href="${esc(advisor.booking_url)}" style="color:#1d4ed8;text-decoration:underline;">${esc(advisor.booking_url)}</a></p>

    <p style="margin:20px 0 0;">
      Best,<br>
      <strong>${esc(advisor.full_name)}</strong><br>
      <span style="font-size:13px;color:#6b7280;">${esc(advisor.role_title)}</span>
    </p>
  </div>
</body>
</html>`;

  const text = `Hi ${prospectName},

Thanks for checking your Family Safety Net earlier. Here is a copy of your calculation so you have it saved:

- Current Cash Runway: ${runwayText}
- Estimated Protection Gap: ${gapText} (Target: ${totalTargetText} - ${calc.milestone_label || 'Family Protection'})
- Monthly Family Bills: ${monthlyBurnText} | Ready Cash: ${liquidCashText}

3 practical steps you can take today (nang hindi nabibigatan sa budget):

1. Separate your Health Fund from your savings.
Company HMOs usually cap out at ₱100k–₱250k and stop the moment you resign or can no longer work. Setting aside a dedicated Critical Illness shield keeps hospital bills from draining your family's cash.

2. Lock in income replacement while you're healthy.
Setting up a safety net is significantly more affordable while you're young and healthy—ensuring monthly bills and tuition continue even if your income stops.

3. Protect hard-earned assets from freeze and forced sale.
Under Philippine law, bank accounts and land titles freeze upon passing until the 6% BIR estate tax is paid. A tax-free cash backup prevents your family from selling properties at a loss.

If you'd like to see the most budget-friendly way to close your ${gapText} gap, just hit Reply to this email with your age—or pick a quick 15-minute slot here:
${advisor.booking_url}

Best,
${advisor.full_name}
${advisor.role_title}`;

  return { html, text };
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
  const fromAddress = process.env.RESEND_ADVISOR_FROM || process.env.RESEND_FROM || 'advisor@ascottdigitalbiz.com';
  const cleanFromEmail = fromAddress.replace(/^.*<|>$/g, '').trim();

  if (resendKey) {
    try {
      const { html, text } = buildPrimaryEmailContent(prospectName, calc, advisor);
      const emailPayload = {
        from: `${advisor.full_name} <${cleanFromEmail}>`,
        to: [prospectEmail],
        subject: `${prospectName}, your Family Safety Net numbers (${Number(calc.runway_months).toFixed(1)} months)`,
        html,
        text
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
