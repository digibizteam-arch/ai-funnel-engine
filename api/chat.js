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
        path: `/rest/v1/leads?id=eq.${lead_id}&select=role,problem,goal,success,obstacle,investment,offer_name,offer_price,ideal_client,offer_pain,offer_transform,buying_intent,opportunity_score,solution_name`,
        method: 'GET',
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` }
      }, {});
      if (Array.isArray(leadRes) && leadRes[0]) {
        leadData = leadRes[0];
        leadContext = `
LEAD INTELLIGENCE:
- Who they are: ${leadData.role || 'Not specified'}
- Their #1 problem: ${leadData.problem || 'Not specified'}
- Their goal: ${leadData.goal || 'Not specified'}
- Success vision: ${leadData.success || 'Not specified'}
- Their obstacle: ${leadData.obstacle || 'Not specified'}
- Investment level selected: ${leadData.investment || 'Not specified'}
- Their offer: ${leadData.offer_name || 'Not specified'}
- Offer price: ${leadData.offer_price || 'Not specified'}
- Ideal client: ${leadData.ideal_client || 'Not specified'}
- Pain they solve: ${leadData.offer_pain || 'Not specified'}
- Transformation promised: ${leadData.offer_transform || 'Not specified'}
- Buying intent: ${leadData.buying_intent || 'warm'}
- Opportunity score: ${leadData.opportunity_score || '5'}/10
- Recommended solution: ${leadData.solution_name || 'Not specified'}`;
      }
    } catch(err) { console.error('Lead fetch error:', err.message); }
  }

  // Build proposal URL — name comes from lead data first, then fallback to passed name param
  const leadName = leadData?.name || name || '';
  const proposalBase = `/proposal?id=${lead_id||''}&name=${encodeURIComponent(name || leadData?.name || '')}&email=${encodeURIComponent(email||'')}`;

  const systemPrompt = `You are Maria's AI Sales Assistant — a warm, selective, and intelligent sales guide for Maria Angelica Scott, System Architect. You build done-for-you funnel and automation systems.

YOUR IDENTITY:
- You represent Maria Angelica Scott — System Architect
- Tagline: "Helping businesses build systems that attract, convert, and close — on autopilot."
- You are a specialist, not a generic chatbot. You diagnose, then prescribe.

${leadContext}

━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE CONTROL (NON-NEGOTIABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━
- Maximum 2–3 sentences ONLY per response. Never more.
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
   [PROPOSAL:full] or [PROPOSAL:mid] or [PROPOSAL:basic]
   Then add: "Here's your proposal — take your time reviewing it. 😊"

━━━━━━━━━━━━━━━━━━━━━━━━━
MARIA'S PACKAGES (INTERNAL USE ONLY):
━━━━━━━━━━━━━━━━━━━━━━━━━
FULL SYSTEM — ₱25,000
Includes: quiz funnel, AI result page, demo generator, sales chatbot, automation, booking system, admin dashboard

GROWTH PACKAGE — ₱15,000
Includes: quiz funnel, result page, demo generator, chatbot, Calendly booking

STARTER — ₱9,997
Includes: landing page OR funnel + booking integration

━━━━━━━━━━━━━━━━━━━━━━━━━
PRESCRIPTIVE SELLING (CRITICAL):
━━━━━━━━━━━━━━━━━━━━━━━━━
- Always aim to recommend FULL SYSTEM as the default
- State inclusions and how they solve the pain — NOT the price — unless asked
- NEVER say "here are our packages" or "we have 3 options"
- The user sees ONE recommendation only — the one you prescribe
- Only downgrade if user clearly cannot afford after reframing value

━━━━━━━━━━━━━━━━━━━━━━━━━
STRICT PRICING RULES (NON-NEGOTIABLE):
━━━━━━━━━━━━━━━━━━━━━━━━━
- Prices are FIXED and FINAL. ₱25,000 / ₱15,000 / ₱9,997
- DO NOT offer discounts under any circumstance
- DO NOT offer payment plans or installments
- DO NOT break pricing into smaller amounts
- DO NOT adjust price based on what the user says they can afford
- DO NOT create custom pricing or invent new packages
- DO NOT say "we can work something out" or "let me see what I can do"
- If user cannot afford → Acknowledge → Reframe value → THEN offer next lower package ONLY
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
- When sending proposal, use [PROPOSAL:full], [PROPOSAL:mid], or [PROPOSAL:basic] — your choice based on what you recommended

━━━━━━━━━━━━━━━━━━━━━━━━━
CALENDLY:
━━━━━━━━━━━━━━━━━━━━━━━━━
- ONLY share Calendly AFTER proposal is signed (they will be redirected automatically)
- Do NOT share Calendly link in chat unless they ask to speak directly before proposal

TONE: Warm, confident, direct. Like a trusted advisor who's genuinely invested in their success — not desperate to sell.`;

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
        const proposalUrl = `${proposalBase}&package=${proposalPackage}&problem=${encodeURIComponent(leadData?.problem||'')}&goal=${encodeURIComponent(leadData?.goal||'')}&solution=${encodeURIComponent(leadData?.solution_name||'')}`;
        const linkHtml = `<a href="${proposalUrl}" target="_blank" rel="noopener noreferrer">📄 View Your Proposal →</a>`;
        reply = reply.replace(/\[PROPOSAL:(full|mid|basic)\]/i, linkHtml);
      }
    }

    return res.status(200).json({ reply, proposal_package: proposalPackage });

  } catch(err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({ error: 'Chat failed: ' + err.message });
  }
};
