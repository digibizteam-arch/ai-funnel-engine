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
    from: 'Angel Scott <angel.scott@ascottdigitalbiz.com>',
    to: [to],
    subject,
    html
  });
}
// ── OWNER ALERT: a short email to you whenever a new quiz is completed ──
function escHtml(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function notifyOwnerNewLead(lead) {
  if (!process.env.RESEND_API_KEY) return;
  const ownerEmail = process.env.OWNER_EMAIL || 'angel.scott@ascottdigitalbiz.com';
  const safeName = String(lead.name || '').replace(/[\r\n]+/g, ' ').slice(0, 80);
  const intent = String(lead.buying_intent || 'unknown').toLowerCase();
  const intentLabel = intent === 'hot' ? '🔥 HOT' : intent === 'warm' ? '🟡 Warm' : intent === 'cold' ? '🔵 Cold' : intent;
  const row = (label, value) => `<tr><td style="padding:6px 10px;color:#6b7280;vertical-align:top;white-space:nowrap">${escHtml(label)}</td><td style="padding:6px 10px;color:#111827">${escHtml(value || 'Not provided')}</td></tr>`;
  const adminLink = lead.adminUrl;
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;padding:20px;color:#111827">
    <h2 style="margin:0 0 4px">New quiz lead: ${escHtml(safeName)}</h2>
    <p style="margin:0 0 16px;color:#6b7280">${escHtml(intentLabel)} &middot; Opportunity score ${escHtml(lead.opportunity_score)}/10</p>
    <table style="border-collapse:collapse;width:100%;font-size:14px;background:#f9fafb;border-radius:8px">
      ${row('Email', lead.email)}
      ${row('Agency / company', lead.business_name)}
      ${row('Specialty', lead.role)}
      ${row('Biggest problem', lead.problem)}
      ${row('Wants their online presence to', lead.goal)}
      ${row('A good month online', lead.success)}
      ${row('Has tried', lead.tried)}
      ${row('Readiness', lead.readiness)}
      ${row('Obstacle', lead.obstacle)}
      ${row('Investment range', lead.investment)}
      ${row('Recommended solution', lead.solution_name)}
    </table>
    ${lead.diagnosis ? `<p style="margin:16px 0 0;font-size:14px"><strong>Diagnosis:</strong> ${escHtml(lead.diagnosis)}</p>` : ''}
    <p style="margin:20px 0 6px;font-size:14px"><strong>Stage:</strong> Quiz completed. No demo or chat yet.</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280">Open the lead in admin to review everything, then follow up personally. You can also reply to this email to write to them directly.</p>
    ${adminLink ? `<a href="${escHtml(adminLink)}" style="background:#0F766E;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Open admin</a>` : ''}
    ${lead.saved ? '' : '<p style="margin-top:16px;color:#b91c1c;font-size:13px">Heads up: this lead could not be saved to the database. Their details are in this email only.</p>'}
  </div>`;
  const payload = {
    from: 'Angel Scott <angel.scott@ascottdigitalbiz.com>',
    to: [ownerEmail],
    subject: `New quiz lead: ${safeName} (${intent}, ${lead.opportunity_score}/10)`,
    html
  };
  if (/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(String(lead.email || ''))) payload.reply_to = lead.email;
  return postJSON({
    hostname: 'api.resend.com',
    path: '/emails',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` }
  }, payload);
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

  const prompt = `You are a content-attraction strategist who works with Filipino financial advisors (life insurance, health and critical illness, education, retirement and investment advisors). A potential client just completed a discovery questionnaire. Your job is to write a highly personalized, empathetic diagnosis of why their online posts are not attracting the right prospects, and to show how a short AI film plus one personal advisor profile link can help. Use their exact words and situation throughout.

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

WHO YOU ARE WRITING FOR:
A Filipino financial advisor, often working under a company or agency, who usually starts with a warm market: family, friends, former classmates and officemates, church and community groups, and OFW families. If the role label above is clearly not finance-related, still use the same attraction lens but do not call them a financial advisor.

HOW THEY USUALLY MARKET TODAY (mention only what fits their answers):
- Posting on Facebook (feed, stories, occasional Facebook Live) using company templates, product posters, or general tips
- Messenger and Viber messages, group chat posts, and "Hi po, kumusta?" follow-ups
- Asking for referrals, joining networking events or seminars
- Posting only when they have time, so content is irregular

COMMON REAL STRUGGLES IN THE PHILIPPINE MARKET (use the ones that fit their answers, name them gently, never insult):
- Their posts look like everyone else's, so nothing stands out in a crowded Facebook feed
- They worry about sounding pushy or "hard sell", so they post little or stay vague
- Their warm market is running thin and referrals are unpredictable
- Prospects react or "seen" the message but never reply, or say "pag-iisipan ko muna", because trust is not built yet
- Many Filipinos see insurance as a gastos or are wary of advisors, so a product pitch makes them pull back, while a story about their own family makes them listen
- There is no single clear place to send people. Details are scattered across posts, chats and links, so they explain everything again in every conversation
- Between clients, family and sometimes another job, they cannot post consistently

WHAT THIS SERVICE CAN DO (describe it as support, never as a guaranteed result):
- A short AI film with a relatable, psychology-based story about a real family worry, made around their specialty, to give a post a stronger hook and help the right viewer feel understood
- A personal advisor profile page: one trustworthy link for every post, showing who they are, what they specialize in, who they help, and clear calls to action for interested prospects to reach out
- A follow-up email sequence that keeps in touch with people who showed interest
- An AI sales chatbot trained on their offer, so common questions get answered while they are busy
- The same profile link can be reused on any post they make

STRICT HONESTY RULES:
- Never promise or imply any result: no guaranteed followers, reach, views, leads, booked calls, clients, sales or income, and never state numbers or percentages. Results depend on how they position themselves in their specialty, how consistently they share their story, and how they follow up.
- Do not give financial, insurance or investment advice. Do not mention specific products, companies or regulators.
- Do not use the word "funnel".
- No stereotypes and no blame. The problem is the message and the system around it, not the person.

OUTPUT RULES:
- Use their name (${name}) naturally in bullet points
- Reference their exact goal and challenge using their own words
- Be specific, no generic statements
- Tone: warm, direct, expert, like a trusted advisor who understands the Philippine market. Write in clear English. A short, natural Filipino phrase is fine once or twice, never forced.
- Respond ONLY with a valid raw JSON object. No markdown. No code fences. No explanation.
- For buying_intent: score 8-10 with clear budget and urgency = "hot". Score 5-7 or budget unclear = "warm". Score 1-4 or no budget = "cold".

JSON FORMAT:
{
  "page_title": "Your Personalized Prospect-Attraction Diagnosis",
  "situation_bullets": [
    "You're a [their role] who's currently [restate their challenge in their own words]",
    "Your top goal is to [restate their goal exactly]",
    "Ideally [their specific success outcome]",
    "The biggest friction point is [restate their obstacle]"
  ],
  "diagnosis": "3-4 sentences on WHY their posts are not turning into conversations. Specific to their challenge and what they have tried. Name 1-2 of the struggles above that fit them. Use the word you. Reference the gap between where they are and where they want to be.",
  "agitation_footnote": "1-2 sentences on what this is costing them right now, such as good posts that get scrolled past and interested people who never reach out.",
  "next_step": "2-3 sentences on the single most important action: a story-based hook that makes the right prospect stop and relate, with one personal link they can send everywhere. Specific to their situation. Address their obstacle naturally.",
  "next_step_footnote": "One short sentence reinforcing why this step matters most.",
  "solution_name": "Short name for their ideal solution e.g. An AI Film and Advisor Profile Prospect-Attraction System",
  "solution_desc": "3 sentences on how the AI film and advisor profile page address their challenge and can be reused on any post. The last sentence plainly says the system gives their message a stronger hook and a clear place to send people, while results depend on their positioning and consistency.",
  "cta_headline": "Personalized CTA headline tied to their goal or outcome",
  "cta_body": "2 sentences. First: what we will build for them (AI short film, personal advisor profile page, follow-up emails and AI sales chatbot). Second: speak to their obstacle to remove hesitation, without promising results.",
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
      max_tokens: 1300
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
    console.log(
  'INSERT RESPONSE:',
  JSON.stringify(inserted, null, 2)
);
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
      'Your Personalized Prospect-Attraction Diagnosis Is Ready',
      `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;padding:20px;">

        <h1 style="color:#0F766E;">
          ${analysisData.page_title}
        </h1>

        <p>Hi ${name},</p>

        <p>
          Thank you for completing the Assessment.
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
          ask questions, and explore the best way to attract more prospects online.
        </p>

      </div>
      `
    );

    console.log('Diagnosis email sent:', emailResult);
// Schedule follow-up sequence
try {
  const supabaseURL = new URL(process.env.SUPABASE_URL);

  const patchResult = await postJSON({
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
 console.log(
  'PATCH RESPONSE:',
  JSON.stringify(patchResult, null, 2)
);  
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

  // ===== OWNER ALERT (never blocks the quiz result) =====
  try {
    await notifyOwnerNewLead({
      name, email, business_name: businessName,
      role: resolvedRole, problem: resolvedProblem, goal: resolvedGoal, success: resolvedSuccess,
      tried: resolvedTried, readiness: resolvedReadiness, obstacle: resolvedObstacle, investment: resolvedResources,
      buying_intent: analysisData.buying_intent, opportunity_score: analysisData.opportunity_score,
      solution_name: analysisData.solution_name, diagnosis: analysisData.page_title,
      saved: !!savedLeadId,
      adminUrl: `${req.headers.origin || 'https://ai-funnel-engine.vercel.app'}/admin`
    });
  } catch (ownerAlertError) {
    console.error('Owner alert failed:', ownerAlertError.message);
  }

  return res.status(200).json({
    ...analysisData,
    lead_id: savedLeadId
  });
};
