const https = require('https');
async function sendEmail(to, subject, html) {
  return postJSON({
    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
    }
  }, {
    from: 'Angel Scott <angel@ascottdigitalbiz.com>',
    to: [to],
    subject,
    html
  });
}
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
- For buying_intent: score 8-10 with clear budget and urgency = "hot". Score 5-7 or budget unclear = "warm". Score 1-4 or no budget = "cold".

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
  "buying_intent": "Use EXACTLY one of: hot, warm, cold. Rules — hot: score 8-10 AND has budget AND expresses urgency or strong desire to start now; warm: score 5-7 OR has budget but uncertain timing; cold: score 1-4 OR no budget OR just exploring with no urgency",
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
// ===== DIAGNOSIS EMAIL =====
if (savedLeadId) {
  try {

    const chatLink =
      `${req.headers.origin || 'https://ai-funnel-engine.vercel.app'}/chat?id=${savedLeadId}`;

    const emailResult = await sendEmail(
      email,
      'Your Personalized Funnel Diagnosis Is Ready',
      `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;padding:20px;">

        <h1 style="color:#0F766E;">
          ${analysisData.page_title}
        </h1>

        <p>Hi ${name},</p>

        <p>
          Thank you for completing the Funnel Assessment.
          Based on your answers, here is your personalized diagnosis.
        </p>

        <h2>Your Current Situation</h2>

        <ul>
          ${(analysisData.situation_bullets || [])
            .map(item => `<li>${item}</li>`)
            .join('')}
        </ul>

        <h2>Diagnosis</h2>

        <p>
          ${analysisData.diagnosis}
        </p>

        <p>
          <em>${analysisData.agitation_footnote}</em>
        </p>

        <h2>Recommended Next Step</h2>

        <p>
          ${analysisData.next_step}
        </p>

        <p>
          <strong>${analysisData.next_step_footnote}</strong>
        </p>

        <h2>Recommended Solution</h2>

        <h3>
          ${analysisData.solution_name}
        </h3>

        <p>
          ${analysisData.solution_desc}
        </p>

        <div
          style="
            background:#ECFDF5;
            border:1px solid #10B981;
            border-radius:10px;
            padding:15px;
            margin-top:25px;
          "
        >
          <strong>
            Opportunity Score:
            ${analysisData.opportunity_score}/10
          </strong>
        </div>

        <hr style="margin:30px 0;">

        <h2>
          ${analysisData.cta_headline}
        </h2>

        <p>
          ${analysisData.cta_body}
        </p>

        <div style="margin-top:30px;text-align:center;">

          <a
            href="${chatLink}"
            style="
              background:#0F766E;
              color:#ffffff;
              padding:15px 25px;
              border-radius:8px;
              text-decoration:none;
              display:inline-block;
              font-weight:bold;
            "
          >
            Continue My Strategy Session
          </a>

        </div>

        <p
          style="
            margin-top:25px;
            color:#666;
            font-size:14px;
            text-align:center;
          "
        >
          Click the button above to learn more about your diagnosis,
          ask questions, and explore the best strategy for your business.
        </p>

      </div>
      `
    );

    console.log('Diagnosis email sent:', emailResult);
// Schedule follow-up sequence
try {
  const supabaseURL = new URL(process.env.SUPABASE_URL);

  await postJSON({
    hostname: supabaseURL.hostname,
    path: `/rest/v1/leads?id=eq.${savedLeadId}`,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
      'Prefer': 'return=representation'
    }
  }, {
    followup_stage: 0,
    followup_active: true,
    last_email_sent_at: new Date().toISOString(),

    // First follow-up = 2 days after quiz
    next_followup_at: new Date(
      Date.now() + (2 * 24 * 60 * 60 * 1000)
    ).toISOString()
  });

  console.log('Follow-up sequence scheduled');

} catch (followupError) {
  console.error(
    'Failed to schedule follow-up:',
    followupError
  );
}
  } catch (emailError) {
    console.error('Resend email error:', emailError);
  }
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
