// api/analyze.js
// Vercel Serverless Function
// Receives 10-question quiz answers → calls OpenAI → saves to Supabase → returns result

export default async function handler(req, res) {
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

A potential client has just completed a deep-dive psychological questionnaire.
Analyze their full answers and generate a personalized funnel blueprint result page.

CLIENT ANSWERS

[INTRODUCTION]
Name: ${name}
Business: ${business_name || 'Not provided'}

[PART 1 — CURRENT REALITY (Pain Points)]
Primary marketing goal: ${goal}
Biggest challenge: ${challenge}
How it's impacting their business: ${impact}

[PART 2 — DREAM STATE]
Ideal outcome if challenge was solved: ${dream}
Specific measurable target: ${metric || 'Not specified'}

[PART 3 — SOLUTION ALIGNMENT]
What they've already tried: ${tried}
How important they believe a funnel is: ${belief}

[PART 4 — FRICTION POINTS]
Biggest hesitation about implementing: ${concern}
Resources available: ${resources}

INSTRUCTIONS: Using their exact words, generate a highly personalized analysis.
Respond ONLY with a valid JSON object. No markdown. No explanation. Raw JSON only.

{
  "headline": "One compelling headline that mirrors their exact situation and goal (max 12 words)",
  "core_desire": "What they truly want beneath their stated goal — one sentence",
  "main_pain": "Their deepest real frustration — one sentence",
  "hidden_trigger": "The emotional driver (fear, urgency, or insecurity) behind their answers — one sentence",
  "buying_intent": "cold or warm or hot",
  "opportunity_score": 7,
  "funnel_type": "Specific funnel type + one sentence on why it fits their situation",
  "diagnosis": "2 specific sentences on exactly why they are stuck — use their own words where possible",
  "agitation": "2 sentences on what happens in 6 months if this is not fixed — make it real and personal",
  "future_state": "2 sentences describing their specific success based on their dream answer",
  "objection_addressed": "One sentence speaking directly to their concern without dismissing it",
  "solution_intro": "1-2 sentences introducing a done-for-you funnel building service as the bridge — warm and confident, not salesy"
}`;

  let analysisData;

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.72,
        max_tokens: 700
      })
    });

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content?.trim();
    const clean = raw.replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();
    analysisData = JSON.parse(clean);

  } catch (err) {
    console.error('OpenAI error:', err);
    return res.status(500).json({ error: 'AI analysis failed. Please try again.' });
  }

  try {
    await fetch(`${process.env.SUPABASE_URL}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        name,
        email,
        business_name:     business_name || null,
        goal,
        challenge,
        impact,
        dream,
        metric:            metric || null,
        tried,
        funnel_belief:     belief,
        concern,
        resources,
        core_desire:       analysisData.core_desire,
        main_pain:         analysisData.main_pain,
        hidden_trigger:    analysisData.hidden_trigger,
        buying_intent:     analysisData.buying_intent,
        opportunity_score: analysisData.opportunity_score,
        funnel_type:       analysisData.funnel_type,
        headline:          analysisData.headline,
        full_analysis:     JSON.stringify(analysisData),
        created_at:        new Date().toISOString()
      })
    });
  } catch (err) {
    console.error('Supabase save error:', err);
  }

  return res.status(200).json(analysisData);
}
