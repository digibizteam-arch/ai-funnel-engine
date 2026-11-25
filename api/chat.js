const https = require('https');

function postJSON(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Parse fail')); } });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// Sample video of the Financial Advisor Directory and the strategy. The link lives here, not in the AI's hands.
const SAMPLE_VIDEO_URL = 'https://www.facebook.com/share/v/1Mzd8d8ngJ/';

// ── OWNER ALERT: short email to you when a prospect sends their first chat message ──
function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function notifyOwnerChat(info) {
  if (!process.env.RESEND_API_KEY) return;
  const ownerEmail = process.env.OWNER_EMAIL || 'angel.scott@ascottdigitalbiz.com';
  const safeName = String(info.name || 'A prospect').replace(/[\r\n]+/g, ' ').slice(0, 80);
  const intent = String(info.buying_intent || '').toLowerCase();
  const intentLabel = intent === 'hot' ? '🔥 HOT' : intent === 'warm' ? '🟡 Warm' : intent === 'cold' ? '🔵 Cold' : '';
  const scoreLine = [intentLabel, info.opportunity_score ? `Opportunity score ${info.opportunity_score}/10` : ''].filter(Boolean).join(' · ');
  const firstMessage = String(info.first_message || '').slice(0, 500);
  const row = (label, value) => `<tr><td style="padding:6px 10px;color:#6b7280;vertical-align:top;white-space:nowrap">${escHtml(label)}</td><td style="padding:6px 10px;color:#111827">${escHtml(value || 'Not provided')}</td></tr>`;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:20px;color:#111827">
    <h2 style="margin:0 0 4px">Chat started: ${escHtml(safeName)}</h2>
    ${scoreLine ? `<p style="margin:0 0 16px;color:#6b7280">${escHtml(scoreLine)}</p>` : '<div style="height:12px"></div>'}
    <div style="background:#ECFDF5;border:1px solid #10B981;border-radius:8px;padding:12px 14px;font-size:14px;margin-bottom:16px">
      <strong>Their first message:</strong><br>${escHtml(firstMessage)}
    </div>
    <table style="border-collapse:collapse;width:100%;font-size:14px;background:#f9fafb;border-radius:8px">
      ${row('Email', info.email)}
      ${row('Specialty', info.role)}
      ${row('Their offer', info.offer_name)}
      ${row('Recommended solution', info.solution_name)}
    </table>
    <p style="margin:20px 0 6px;font-size:14px"><strong>Stage:</strong> Quiz completed, demo generated, chat started.</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">They are talking to your AI assistant right now. Check their answers in admin and follow up personally.</p>
    ${info.adminUrl ? `<a href="${escHtml(info.adminUrl)}" style="background:#0F766E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Open admin</a>` : ''}
  </div>`;
  const payload = {
    from: 'Angel Scott <angel.scott@ascottdigitalbiz.com>',
    to: [ownerEmail],
    subject: `Chat started: ${safeName}`,
    html
  };
  if (/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(String(info.email || ''))) payload.reply_to = info.email;
  return postJSON({
    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
  }, payload);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { messages, lead_id, name, email } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Missing messages' });

  // Fetch lead context from Supabase
  let leadContext = '';
  let leadData = null;
  if (lead_id) {
    try {
      const supabaseURL = new URL(process.env.SUPABASE_URL);
      const leadRes = await postJSON({
        hostname: supabaseURL.hostname,
        path: `/rest/v1/leads?id=eq.${lead_id}&select=name,role,problem,goal,success,obstacle,investment,offer_name,offer_price,ideal_client,offer_pain,offer_transform,buying_intent,opportunity_score,solution_name,full_analysis`,
        method: 'GET',
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` }
      }, {});
      if (Array.isArray(leadRes) && leadRes[0]) {
        leadData = leadRes[0];
        // Saved diagnosis and advisor profile details (optional; safe if missing)
        let analysis = {};
        try {
          const raw = leadData.full_analysis;
          analysis = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
        } catch (_) { analysis = {}; }
        const profile = analysis && typeof analysis.advisor_profile === 'object' && analysis.advisor_profile ? analysis.advisor_profile : {};
        leadContext = `
LEAD INTELLIGENCE (the financial advisor you are speaking with):
- Their specialty / practice: ${leadData.role || 'Not specified'}
- Their biggest problem getting prospects online: ${leadData.problem || 'Not specified'}
- What they want their online presence to do: ${leadData.goal || 'Not specified'}
- What a good month online looks like to them: ${leadData.success || 'Not specified'}
- What is most likely to slow them down: ${leadData.obstacle || 'Not specified'}
- One-time investment range they chose: ${leadData.investment || 'Not specified'}
- Specialty on their profile page: ${leadData.offer_name || 'Not specified'}
- Who they help: ${leadData.ideal_client || 'Not specified'}
- What they help those people with: ${leadData.offer_pain || 'Not specified'}
- Outcome those people want: ${leadData.offer_transform || 'Not specified'}
- Professional title on their page: ${profile.professional_title || 'Not specified'}
- Company or agency: ${profile.company_name || 'Not specified'}
- Buying intent: ${leadData.buying_intent || 'warm'}
- Opportunity score: ${leadData.opportunity_score || '5'}/10
- Recommended solution: ${leadData.solution_name || 'Not specified'}
- Their diagnosis headline: ${analysis.diagnosis || 'Not specified'}`;
      }
    } catch(err) { console.error('Lead fetch error:', err.message); }
  }

  // Build proposal URL — name comes from lead data first, then fallback to passed name param
  const leadName = leadData?.name || name || '';
  const proposalBase = `/proposal?id=${lead_id||''}&name=${encodeURIComponent(leadName)}&email=${encodeURIComponent(email||'')}`;

  const systemPrompt = `You are Maria's AI Sales Assistant — a warm, selective, and intelligent guide for Maria Angelica Scott, an AI-Powered Marketing Systems Strategist and former financial advisor. You help Filipino financial advisors show up online with a clear, trustworthy presence.

YOUR IDENTITY:
- You represent Maria Angelica Scott — a former financial advisor who studied buyer psychology and marketing strategies
- You are talking with a Filipino financial advisor who took the assessment and saw their advisor profile page preview
- You understand how Filipino advisors usually market: Facebook posts and stories, Messenger and Viber, referrals, seminars, and company templates
- You are a specialist, not a generic chatbot. You diagnose, then prescribe.
- Speak in the language the advisor uses: English or natural Taglish. Keep it warm, simple, and respectful.

${leadContext}

━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE CONTROL (NON-NEGOTIABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━
- Maximum 1-2 sentences ONLY per response. Never more.
- NEVER explain the full system unless directly asked
- NEVER list all features at once
- Reveal information step-by-step, one piece at a time
- One question per message, maximum
- If you feel the urge to explain more — stop. Say less.

━━━━━━━━━━━━━━━━━━━━━━━━━
CONVERSATION FRAMEWORK:
━━━━━━━━━━━━━━━━━━━━━━━━━
1. PERSONALIZE — Use their name (${name||'there'}), reference their quiz answers
2. ACKNOWLEDGE — Validate their situation deeply before presenting anything
3. EDUCATE — Briefly explain WHY their current approach isn't working (1-2 sentences max)
4. PRESCRIBE — Recommend ONE solution with calm confidence. No options. No menus.
5. HANDLE OBJECTIONS — Address their obstacle warmly and specifically
6. PROPOSAL TRIGGER — When they show clear interest, ask: "Want me to put together a quick proposal for you? It takes 30 seconds and shows exactly what's included."
7. SEND PROPOSAL — Only after they say YES, reply with EXACTLY this format on its own line:
   [PROPOSAL:full]
   Then add: "Here's your proposal — take your time reviewing it. 😊"

━━━━━━━━━━━━━━━━━━━━━━━━━
MARIA'S OFFER (INTERNAL USE ONLY):
━━━━━━━━━━━━━━━━━━━━━━━━━
FOUNDER'S OFFER — ₱4,997 (limited founding slots; the regular price will be ₱9,997)
Name: AI Marketing System for Financial Advisors. Includes exactly four things:
1. One AI short film — a story built around the advisor's specialty and what their clients worry about, delivered as a video file that the advisor posts on their own social media
2. A personal advisor profile page — a professional page with lead capture and call-to-action buttons that the advisor can share in any post, story, or chat
3. A follow-up and nurture email sequence for every new lead
4. An AI sales chatbot trained on the advisor's offer — free and included
Delivery: within 3–7 days from the onboarding call. Terms: 50% deposit, 50% on delivery.
NOT included — never promise these: a lead management system, a booking system, an admin dashboard, or monthly fees.

FINANCIAL ADVISOR DIRECTORY (separate from the four inclusions):
- The Financial Advisor Directory is live and currently collecting founding advisors. We connect the advisor's profile, and Maria's team runs the ads for the directory, so the advisor does not have to run ads for it. The advisor only needs to stay available to answer inquiries as they come in.
- The directory is mentioned only when it is relevant, for example when they worry about ad budget or reaching more people. Do not push it.
- Do NOT state a price, a start date, or whether it is included in the Founder's Offer. If asked, say Maria will explain the directory details on the onboarding call.
- Never promise inquiries, leads, or clients from the directory.

HONESTY RULES (NON-NEGOTIABLE):
- NEVER guarantee followers, inquiries, booked calls, clients, sales, or income. Results depend on the advisor's own positioning, specialty, and consistency.
- Say what the system does (gives their story a professional home, helps prospects feel understood, follows up automatically), never what it will earn them.
- Do not give financial, insurance, or investment advice. You only discuss Maria's marketing service.
- Do not invent testimonials, statistics, slot numbers, or deadlines.

━━━━━━━━━━━━━━━━━━━━━━━━━
PRESCRIPTIVE SELLING (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━
- There is ONE offer — the Founder's Offer. Recommend it with calm confidence, tied to what the advisor told you (their specialty, their problem, their obstacle)
- State inclusions and how they solve the pain — NOT the price — unless asked
- NEVER say "here are our packages" or "we have options" — there is one offer only
- When they ask about price or hesitate, you may say the founder's price is limited to a small number of founding slots — never invent a slot number or a deadline

━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT PRICING RULES (NON-NEGOTIABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━
- The price is FIXED and FINAL: ₱4,997 as the Founder's Offer, with the regular price becoming ₱9,997 later
- DO NOT offer discounts under any circumstance
- DO NOT offer payment plans or installments
- DO NOT break pricing into smaller amounts
- DO NOT adjust price based on what the user says they can afford
- DO NOT create custom pricing or invent new packages
- DO NOT say "we can work something out" or "let me see what I can do"
- If user cannot afford → Acknowledge → Reframe value → Do NOT lower the price or invent another package; offer to answer any remaining questions
- Never invent new pricing structures. Ever.

━━━━━━━━━━━━━━━━━━━━━━━━━
PROPOSAL TRIGGER RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━
- ONLY ask "Want me to put together a quick proposal?" when the user:
  a) Says yes, sounds good, let's do it, or similar
  b) Asks about next steps
  c) Asks what's included or how to get started
- Do NOT send proposal link until they explicitly say yes
- NEVER volunteer the proposal unprompted early in conversation
- When sending proposal, always use [PROPOSAL:full] — there is only one offer

━━━━━━━━━━━━━━━━━━━━━━━━━
SAMPLES (SHARE ONLY WHEN ASKED):
━━━━━━━━━━━━━━━━━━━━━━━━━
- If they ask to see a sample or example, how the strategy works, or what the Financial Advisor Directory looks like, reply with ONE short line and put [SAMPLE_LINK] on its own line. Example: "Of course. Here's a sample of the directory and the strategy."
- Never write the link or any URL yourself. Only use [SAMPLE_LINK], and use it at most once per reply.
- Do NOT describe what is inside the video, and do not claim results from it. Just invite them to watch and ask what they think.
- Do not volunteer the sample early. Offer it only if they ask or say they want proof.

━━━━━━━━━━━━━━━━━━━━━━━━━
CALENDLY:
━━━━━━━━━━━━━━━━━━━━━━━━━
- ONLY share Calendly AFTER proposal is signed (they will be redirected automatically)
- Do NOT share Calendly link in chat unless they ask to speak directly before proposal

TONE: Warm, confident, direct. Like someone who has been an advisor and understands the grind of prospecting — genuinely invested in their success, never desperate to sell, never pushy.`;

  try {
    const aiRes = await postJSON({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    }, {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.slice(-12)
      ],
      temperature: 0.7,
      max_tokens: 250
    });

    if (aiRes.error) return res.status(500).json({ error: 'AI error: ' + aiRes.error.message });
    let reply = aiRes.choices?.[0]?.message?.content?.trim();

    // Detect proposal trigger and replace with real link
    let proposalPackage = null;
   if (reply && reply.includes('[PROPOSAL:')) {
  const match = reply.match(/\[PROPOSAL:(full|mid|basic)\]/i);

  if (match) {
    proposalPackage = match[1].toLowerCase();

   // TRACK: Proposal Generated — write once only
    if (lead_id) {
      try {
        const supabaseURL = new URL(process.env.SUPABASE_URL);

        // Check if already tracked first
        const existing = await postJSON({
          hostname: supabaseURL.hostname,
          path: `/rest/v1/leads?id=eq.${lead_id}&select=proposal_generated_at`,
          method: 'GET',
          headers: {
            'apikey': process.env.SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
          }
        }, {});

        if (!Array.isArray(existing) || !existing[0]?.proposal_generated_at) {
          await postJSON({
            hostname: supabaseURL.hostname,
            path: `/rest/v1/leads?id=eq.${lead_id}`,
            method: 'PATCH',
            headers: {
              'apikey': process.env.SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            }
          }, { proposal_generated_at: new Date().toISOString() });
        }

      } catch (err) {
        console.error('Proposal tracking error:', err.message);
      }
    }

    // 🔽 YOUR ORIGINAL CODE (UNCHANGED)
    const proposalUrl = `${proposalBase}&package=${proposalPackage}&role=${encodeURIComponent(leadData?.role||'')}&offer=${encodeURIComponent(leadData?.offer_name||'')}&price=${encodeURIComponent(leadData?.offer_price||'')}&client=${encodeURIComponent(leadData?.ideal_client||'')}&goal=${encodeURIComponent(leadData?.goal||'')}&problem=${encodeURIComponent(leadData?.problem||'')}&transform=${encodeURIComponent(leadData?.offer_transform||'')}&solution=${encodeURIComponent(leadData?.solution_name||'')}`;

    const linkHtml = `<a href="${proposalUrl}" target="_blank" rel="noopener noreferrer">📄 View Your Proposal →</a>`;

    reply = reply.replace(/\[PROPOSAL:(full|mid|basic)\]/i, linkHtml);
  }
}

    // Replace the sample marker with the real link (first marker only; extras are removed)
    if (reply && reply.includes('[SAMPLE_LINK]')) {
      const sampleHtml = `<a href="${SAMPLE_VIDEO_URL}" target="_blank" rel="noopener noreferrer">▶ Watch the sample</a>`;
      reply = reply.replace('[SAMPLE_LINK]', sampleHtml).split('[SAMPLE_LINK]').join('');
    }

    // Owner alert on the prospect's first message only. Never blocks the reply.
    try {
      const userMsgs = messages.filter(m => m && m.role === 'user');
      if (lead_id && userMsgs.length === 1) {
        const hdrs = req.headers || {};
        const host = String(hdrs['x-forwarded-host'] || hdrs.host || '').split(',')[0].trim();
        const base = (process.env.APP_URL || (/^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `https://${host}` : 'https://ai-funnel-engine.vercel.app')).replace(/\/+$/, '');
        await notifyOwnerChat({
          name: leadName,
          email: email || '',
          first_message: userMsgs[0].content,
          role: leadData && leadData.role,
          offer_name: leadData && leadData.offer_name,
          solution_name: leadData && leadData.solution_name,
          buying_intent: leadData && leadData.buying_intent,
          opportunity_score: leadData && leadData.opportunity_score,
          adminUrl: `${base}/admin`
        });
      }
    } catch (ownerAlertError) {
      console.error('Owner chat alert failed:', ownerAlertError.message);
    }

    return res.status(200).json({ reply, proposal_package: proposalPackage });

  } catch(err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({ error: 'Chat failed: ' + err.message });
  }
};
