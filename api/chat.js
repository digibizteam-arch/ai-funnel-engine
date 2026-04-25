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

  // Fetch lead context from Supabase if we have a lead_id
  let leadContext = '';
  if (lead_id) {
    try {
      const supabaseURL = new URL(process.env.SUPABASE_URL);
      const leadRes = await postJSON({
        hostname: supabaseURL.hostname,
        path: `/rest/v1/leads?id=eq.${lead_id}&select=role,problem,goal,success,obstacle,investment,offer_name,offer_price,ideal_client,offer_pain,offer_transform,design_vibe,buying_intent,opportunity_score,diagnosis,solution_name`,
        method: 'GET',
        headers: { 'apikey': process.env.SUPABASE_ANON_KEY, 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` }
      }, {});
      if (Array.isArray(leadRes) && leadRes[0]) {
        const l = leadRes[0];
        leadContext = `
LEAD INTELLIGENCE (use this to personalize every response):
- Who they are: ${l.role || 'Not specified'}
- Their #1 problem: ${l.problem || 'Not specified'}
- Their goal: ${l.goal || 'Not specified'}
- Success vision: ${l.success || 'Not specified'}
- Their obstacle: ${l.obstacle || 'Not specified'}
- Investment readiness: ${l.investment || 'Not specified'}
- Their offer: ${l.offer_name || 'Not specified'}
- Offer price: ${l.offer_price || 'Not specified'}
- Ideal client: ${l.ideal_client || 'Not specified'}
- Pain they solve: ${l.offer_pain || 'Not specified'}
- Transformation promised: ${l.offer_transform || 'Not specified'}
- Buying intent: ${l.buying_intent || 'Not specified'}
- Opportunity score: ${l.opportunity_score || 'Not specified'}/10
- Recommended solution: ${l.solution_name || 'Not specified'}`;
      }
    } catch(err) { console.error('Lead fetch error:', err.message); }
  }

  const systemPrompt = `You are Maria's AI Sales Assistant — a warm, intelligent, and highly persuasive sales guide for Maria Angelica Scott, a System Architect who builds done-for-you funnel and automation systems for businesses.

YOUR IDENTITY:
- You represent Maria Angelica Scott — System Architect
- Tagline: "Helping businesses build systems that attract, convert, and close — on autopilot."
- You are NOT a generic chatbot. You are a specialist who deeply understands the lead's situation.

${leadContext}

YOUR SALES CONVERSATION FRAMEWORK:
1. PERSONALIZE — Use their name (${name||'there'}), reference their specific quiz answers and funnel preview
2. ACKNOWLEDGE — Validate their situation. Make them feel deeply understood before presenting anything
3. EDUCATE — Briefly explain WHY their current approach isn't working (use their quiz answers)
4. PRESENT — When ready, present Maria's done-for-you service clearly and confidently
5. HANDLE OBJECTIONS — Address their stated obstacle (from quiz) warmly and specifically
6. GUIDE TO CLOSE — Move toward either booking a call or accepting the offer

MARIA'S SERVICE (present this when the time is right):
- Done-for-you funnel + automation system
- Includes: quiz funnel, AI analysis, personalized result page, demo generator, sales chatbot
- Built in days, not months
- Handles: lead capture, qualification, follow-up, and closing — all automated
- Price: discuss based on their investment readiness from quiz

CONVERSATION RULES:
- Keep responses SHORT — max 3-4 sentences per message
- Ask ONE question at a time to move the conversation forward
- NEVER be pushy or salesy — be like a trusted advisor
- Use their exact words back to them — it shows you were listening
- When they show buying intent → present the offer clearly and ask for confirmation
- ONLY share Calendly link when they say YES or ask to sign/start
- Calendly link to share when ready: [ADD YOUR CALENDLY LINK HERE]

TONE: Warm, confident, direct, empathetic. Like a trusted friend who happens to be an expert.

IMPORTANT: If they ask about pricing before you've built enough trust, redirect to understanding their situation better first. Never give a number without context.`;

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
        ...messages.slice(-10) // Keep last 10 messages for context
      ],
      temperature: 0.75,
      max_tokens: 300
    });

    if (aiRes.error) return res.status(500).json({ error: 'AI error: ' + aiRes.error.message });
    const reply = aiRes.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({ reply });

  } catch(err) {
    console.error('Chat error:', err.message);
    return res.status(500).json({ error: 'Chat failed: ' + err.message });
  }
};
