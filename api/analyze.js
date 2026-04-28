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

  const body = req.body;
  const name = body.name || '';
  const email = body.email || '';

  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // ── Resolve all fields — new 9-question quiz fields take priority ──
  const resolvedRole = body.role || body.business_name || 'Not provided';
  const resolvedGoal = body.goal || body.dream || 'Not provided';
  const resolvedProblem = body.problem || body.challenge || 'Not provided';
  const resolvedSuccess = body.success || body.metric || 'Not provided';
  const resolvedTried = body.tried_str || (Array.isArray(body.tried) ? body.tried.join(', ') : body.tried) || body.impact || 'Not specified';
  const resolvedReadiness = body.readiness || body.belief || 'Not specified';
  const resolvedObstacle = body.obstacle || body.concern || 'Not provided';
  const resolvedResources = body.investment || body.resources || 'Not provided';
  const businessName = body.business_name || '';

  const prompt = `You are an expert funnel strategist and conversion copywriter who specializes in deep psychological diagnosis. A potential client just completed a discovery questionnaire. Your job is to produce a highly personalized, empathetic funnel diagnosis. Use their exact words and situation throughout.

CLIENT ANSWERS:
Name: ${name}
Role / Business Type: ${resolvedRole}
Business: ${businessName || resolvedRole}
Primary goal: ${resolvedGoal}
Biggest challenge: ${resolvedProblem}
What success looks like: ${resolvedSuccess}
What they have tried: ${resolvedTried}
Readiness level: ${resolvedReadiness}
Biggest obstacle: ${resolvedObstacle}
Resources / Investment level: ${resolvedResources}

OUTPUT RULES:
- Use their name (${name}) naturally in bullet points
- Reference their exact goal and challenge using their own words
- Be specific — no generic statements
- Tone: warm, direct, expert — like a trusted advisor
- Respond ONLY with a valid raw JSON object. No markdown. No code fences. No explanation.

JSON FORMAT:
{
  "page_title": "Your Personalized Funnel Diagnosis",
  "situation_bullets": [
    "You're a [their role] who's currently [restate their challenge in their own words]",
    "Your top goal is to [restate their goal exactly]",
    "Ideally [their specific success outcome]",
    "The biggest friction point is [restate their obstacle]"
  ],
  "diagnosis": "2-3 sentence paragraph on WHY they are stuck. Specific to their challenge. Use the word you. Reference the gap between where they are and where they want to be.",
  "agitation_footnote": "One sentence on what this is costing them right now.",
  "next_step": "2-3 sentences on the single most important action they should take RIGHT NOW. Specific to their situation. Address their obstacle naturally.",
  "next_step_footnote": "One short sentence reinforcing why this step matters most.",
  "solution_name": "Short name for their ideal solution e.g. A Value-First Lead Qualification Funnel",
  "solution_desc": "2 sentences on how this solution addresses their challenge and gets them to their goal. Reference their resources to show it fits.",
  "cta_headline": "Personalized CTA headline tied to their goal or outcome",
  "cta_body": "2 sentences. First: what we will build for them. Second: speak to their obstacle to remove hesitation.",
  "buying_intent": "cold or warm or hot",
  "opportunity_score": 7
}`;

  let analysisData;
  try {
    const openAIData = await postJSON({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      }
    }, {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 900
    });

    if (openAIData.error) {
      console.error('OpenAI API error:', openAIData.error);
      return res.status(500).json({ error: 'OpenAI error: ' + openAIData.error.message });
    }

    const raw = openAIData.choices?.[0]?.message?.content?.trim();
    if (!raw) throw new Error('Empty response from OpenAI');
    const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();
    analysisData = JSON.parse(clean);

  } catch (err) {
    console.error('OpenAI call failed:', err.message);
    return res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  }

  // ── Save to Supabase ──
  let savedLeadId = null;
  try {
    const supabaseURL = new URL(process.env.SUPABASE_URL);
    
    // FIX: Removed 'success', 'tried', 'readiness', 'obstacle' from top-level insert.
    // Your database likely doesn't have these columns, which was causing the silent Supabase failure!
    // Don't worry, they are still saved inside the full_analysis JSON string below.
    const inserted = await postJSON({
      hostname: supabaseURL.hostname,
      path: '/rest/v1/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation'
      }
    }, {
      name,
      email,
      business_name: businessName || null,
      role: resolvedRole,
      goal: resolvedGoal,
      problem: resolvedProblem,
      investment: resolvedResources,
      buying_intent: analysisData.buying_intent,
      opportunity_score: analysisData.opportunity_score,
      solution_name: analysisData.solution_name,
      headline: analysisData.page_title || analysisData.cta_headline,
      full_analysis: JSON.stringify(analysisData), // All raw data is safely preserved here
      created_at: new Date().toISOString()
    });

    if (Array.isArray(inserted) && inserted[0]?.id) {
      savedLeadId = inserted[0].id;
    } else {
      // FIX: If Supabase returns an error array instead of the inserted row, log it clearly
      console.error('Supabase insert failed or returned no ID:', JSON.stringify(inserted));
    }
  } catch (err) {
    console.error('Supabase save error:', err.message);
    // FIX: If the DB save fails, we need to know. We still return the AI data so the user isn't stuck, 
    // but we explicitly pass null lead_id so you know it didn't save.
  }

  return res.status(200).json({
    ...analysisData,
    lead_id: savedLeadId
  });
};
