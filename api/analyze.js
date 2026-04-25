const https = require('https');

function postJSON(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
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

  const prompt = `You are a conversion-focused funnel strategist and direct-response copywriter.

A potential client completed a psychological questionnaire. Analyze their answers and generate a personalized funnel blueprint.

CLIENT ANSWERS:
Name: ${name}
Business: ${business_name || 'Not provided'}
Primary goal: ${goal}
Biggest challenge: ${challenge}
Business impact: ${impact}
Ideal outcome: ${dream}
Target metric: ${metric || 'Not specified'}
What they tried: ${tried}
Funnel belief: ${belief}
Biggest hesitation: ${concern}
Resources available: ${resources}

Respond ONLY with a valid JSON object. No markdown. No explanation. Raw JSON only.

{
  "headline": "One compelling headline mirroring their exact situation (max 12 words)",
  "core_desire": "What they truly want beneath their stated goal — one sentence",
  "main_pain": "Their deepest frustration — one sentence",
  "hidden_trigger": "The emotional driver behind their answers — one sentence",
  "buying_intent": "cold or warm or hot",
  "opportunity_score": 7,
  "funnel_type": "Specific funnel type + one sentence why it fits",
  "diagnosis": "2 sentences on exactly why they are stuck",
  "agitation": "2 sentences on what happens in 6 months if not fixed",
  "future_state": "2 sentences describing their specific success",
  "objection_addressed": "One sentence speaking to their concern without dismissing it",
  "solution_intro": "1-2 sentences introducing done-for-you funnel building as the bridge"
}`;

  // Call OpenAI
  let analysisData;
  try {
    const openAIBody = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.72,
      max_tokens: 700
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
      console.error('OpenAI error:', openaiData.error);
      return res.status(500).json({ error: 'OpenAI error: ' + openaiData.error.message });
    }

    const raw = openaiData.choices?.[0]?.message?.content?.trim();
    const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();
    analysisData = JSON.parse(clean);

  } catch (err) {
    console.error('OpenAI call failed:', err);
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
      core_desire: analysisData.core_desire,
      main_pain: analysisData.main_pain,
      hidden_trigger: analysisData.hidden_trigger,
      buying_intent: analysisData.buying_intent,
      opportunity_score: analysisData.opportunity_score,
      funnel_type: analysisData.funnel_type,
      headline: analysisData.headline,
      full_analysis: JSON.stringify(analysisData),
      created_at: new Date().toISOString()
    };

    const supabaseOptions = {
      hostname: new URL(process.env.SUPABASE_URL).hostname,
      path: '/rest/v1/leads',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      }
    };

    await postJSON(supabaseOptions, supabaseBody);
  } catch (err) {
    console.error('Supabase save error:', err);
  }

  return res.status(200).json(analysisData);
};
