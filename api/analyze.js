const https = require('https');

function postJSON(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse failed: ' + data.slice(0, 200))); }
      });
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

  const {
    name, email, business_name,
    goal, challenge, impact,
    dream, metric, tried,
    belief, concern, resources
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const prompt = `You are an expert funnel strategist and conversion copywriter who specializes in deep psychological diagnosis.

A potential client just completed a discovery questionnaire. Your job is to produce a highly personalized, empathetic funnel diagnosis — not generic advice. Use their exact words and situation throughout.

CLIENT ANSWERS:
Name: ${name}
Business: ${business_name || 'Not provided'}
Primary goal: ${goal}
Biggest challenge: ${challenge}
How it impacts them: ${impact}
Ideal outcome if solved: ${dream}
Specific target metric: ${metric || 'Not specified'}
What they have tried: ${tried}
How important they think a funnel is: ${belief}
Biggest hesitation: ${concern}
Resources available: ${resources}

OUTPUT RULES:
- Use their name (${name}) naturally in bullet points
- Reference their exact goal, challenge, and dream using their own words
- Be specific — no generic statements
- Tone: warm, direct, expert — like a trusted advisor who truly understands them
- Respond ONLY with a valid raw JSON object. No markdown. No code fences. No explanation.

JSON FORMAT:
{
  "page_title": "Your Personalized Funnel Diagnosis",

  "situation_bullets": [
    "You're a [their business/role] who's currently [restate their challenge in their own words]",
    "Your top goal is to [restate their goal exactly]",
    "Ideally achieving [their specific metric or dream outcome]",
    "The biggest friction point is that [restate their concern]"
  ],

  "diagnosis": "2-3 sentence paragraph that goes deep into WHY they are stuck. Be specific to their challenge and what they told you. Use the word 'you' to make it personal. Reference the gap between where they are and where they want to be. This is the core insight — not surface level.",

  "agitation_footnote": "One sentence on what this blind spot is costing them — tied to their specific impact answer.",

  "next_step": "2-3 sentences describing the single most important action they should take RIGHT NOW to move toward their dream. Be very specific to their situation. Address their concern (${concern}) naturally without dismissing it.",

  "next_step_footnote": "One short sentence reinforcing why this step matters most for them specifically.",

  "solution_name": "A short name for their ideal solution — e.g. 'A Value-First Lead Qualification Funnel' or 'An Automated Client Attraction System'",

  "solution_desc": "2 sentences explaining how this solution directly addresses their challenge and gets them to their dream. Mention their resources (${resources}) to show it fits their situation.",

  "cta_headline": "A personalized CTA headline tied to their dream metric or outcome — e.g. 'Ready to Get [their metric] Without [their pain]?'",

  "cta_body": "2 sentences. First: what we will do for them (done-for-you, specific). Second: one line that speaks directly to their concern (${concern}) to remove the hesitation.",

  "buying_intent": "cold or warm or hot",
  "opportunity_score": 7
}`;

  let analysisData;
  try {
    const openAIBody = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 900
    };

    const openAIOptions = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    };

    const openaiData = await postJSON(openAIOptions, openAIBody);

    if (openaiData.error) {
      console.error('OpenAI API error:', openaiData.error);
      return res.status(500).json({ error: 'OpenAI error: ' + openaiData.error.message });
    }

    const raw = openaiData.choices?.[0]?.message?.content?.trim();
    const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();
    analysisData = JSON.parse(clean);

  } catch (err) {
    console.error('OpenAI call failed:', err.message);
    return res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }

  // Save to Supabase
  try {
    const supabaseBody = {
      name, email,
      business_name: business_name || null,
      goal, challenge, impact, dream,
      metric: metric || null,
      tried,
      funnel_belief: belief,
      concern, resources,
      buying_intent:     analysisData.buying_intent,
      opportunity_score: analysisData.opportunity_score,
      solution_name:     analysisData.solution_name,
      full_analysis:     JSON.stringify(analysisData),
      created_at:        new Date().toISOString()
    };

    const supabaseURL = new URL(process.env.SUPABASE_URL);
    const supabaseOptions = {
      hostname: supabaseURL.hostname,
      path: '/rest/v1/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      }
    };

    await postJSON(supabaseOptions, supabaseBody);
  } catch (err) {
    console.error('Supabase save error:', err.message);
  }

  // Try to extract the saved lead id
  let leadId = null;
  try {
    const supaURL = new URL(process.env.SUPABASE_URL);
    const checkOpts = {
      hostname: supaURL.hostname,
      path: '/rest/v1/leads?email=eq.' + encodeURIComponent(email) + '&order=created_at.desc&limit=1&select=id',
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + process.env.SUPABASE_ANON_KEY
      }
    };
    const rows = await new Promise((resolve, reject) => {
      const req = require('https').request(checkOpts, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { resolve([]); } });
      });
      req.on('error', reject);
      req.end();
    });
    if (rows && rows[0] && rows[0].id) leadId = rows[0].id;
  } catch(e) { console.error('lead_id fetch error:', e.message); }

  return res.status(200).json({ ...analysisData, lead_id: leadId });
};
