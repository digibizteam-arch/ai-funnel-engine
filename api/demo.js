const https = require('https');

const VIBES = {
  'bold-premium':       { bg:'#0D0D0D', text:'#FFFFFF', accent:'#C9A84C', btnText:'#0D0D0D', section:'#1A1A1A', card:'#222222' },
  'warm-trustworthy':   { bg:'#1B2B4B', text:'#FFFFFF', accent:'#E8C87A', btnText:'#1B2B4B', section:'#243761', card:'#2D4475' },
  'modern-edgy':        { bg:'#0A0A0A', text:'#FFFFFF', accent:'#00E5FF', btnText:'#0A0A0A', section:'#111111', card:'#1A1A1A' },
  'fresh-approachable': { bg:'#F9FFFC', text:'#1A1A1A', accent:'#2D6A4F', btnText:'#FFFFFF', section:'#EDFAF3', card:'#FFFFFF' },
  'bold-energetic':     { bg:'#1A1A2E', text:'#FFFFFF', accent:'#FF6B35', btnText:'#FFFFFF', section:'#16213E', card:'#0F3460' },
  'clean-creative':     { bg:'#1E1E2E', text:'#FFFFFF', accent:'#6C5CE7', btnText:'#FFFFFF', section:'#2D2D44', card:'#252538' },
  'corporate-authority':{ bg:'#1E3A5F', text:'#FFFFFF', accent:'#A8C0D6', btnText:'#1E3A5F', section:'#24476E', card:'#2A527D' },
  'elegant-feminine':   { bg:'#FDF6F0', text:'#2D1B1B', accent:'#C4847A', btnText:'#FFFFFF', section:'#FEF0E8', card:'#FFFFFF' },
};

const COACH_ROLES = ['Coach or Trainer', 'Consultant or Advisor', 'Sales Professional'];
function isCoach(role) { return COACH_ROLES.some(r => (role||'').includes(r.split(' ')[0])); }

function postJSON(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Parse fail: ' + data.slice(0,200))); } });
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

  const { lead_id, name, email, role, goal, problem, offer, price, client, pain, transform, vibe } = req.body;

  if (!offer || !client || !pain || !transform) {
    return res.status(400).json({ error: 'Missing required bridge fields' });
  }

  const colors = VIBES[vibe] || VIBES['bold-premium'];
  const showAbout = isCoach(role);

  // ── Build AI prompt ──
  const prompt = `You are an expert conversion copywriter and funnel strategist specializing in psychological persuasion.

Generate complete HTML + CSS for a high-converting sales funnel landing page. Use ONLY inline styles and a single <style> block — no external libraries.

BRAND CONTEXT:
- Designer: Maria Angelica Scott — System Architect
- Tagline: Helping businesses build systems that attract, convert, and close — on autopilot.

CLIENT CONTEXT:
- Name: ${name}
- Role/Industry: ${role}
- Their goal: ${goal}
- Their problem: ${problem}
- Offer: ${offer}
- Price: ${price || 'Contact for pricing'}
- Ideal client: ${client}
- Pain they solve: ${pain}
- Transformation promised: ${transform}
- Show "About" section: ${showAbout}

COLOR PALETTE (use EXACTLY these hex values):
- Page background: ${colors.bg}
- Body text: ${colors.text}
- Accent color: ${colors.accent}
- Button text: ${colors.btnText}
- Section background (alternate): ${colors.section}
- Card background: ${colors.card}

COPYWRITING RULES:
- Every headline must hit an EMOTIONAL pain point — make it hurt, then give hope
- Use "you" and "your" throughout — speak directly to the reader
- Pain statements must be specific and relatable — not generic
- Transformation must feel real and achievable — not hype
- Tone: empathetic, confident, direct — like a trusted advisor
- NO corporate speak, NO fluff, NO generic phrases like "take your business to the next level"

REQUIRED SECTIONS IN ORDER:

1. HERO SECTION
   - Nav bar: logo text left ("${name || 'Your Name'}"), CTA button right
   - Emotionally charged H1 headline (max 12 words) targeting ideal client's EXACT pain
   - Subheadline expanding on the transformation (1-2 sentences)
   - Primary CTA button: "Yes, I Want This →"
   - Trust line below button: "No contracts. No fluff. Just results."

2. PAIN AMPLIFIER SECTION
   - Section label: "DOES THIS SOUND FAMILIAR?"
   - H2: "You're doing everything right — so why does it still feel like this?"
   - 3 pain bullet points in first person (e.g. "I keep posting but nobody's reaching out...")
   - Each bullet: emoji + bold statement + 1 sentence elaboration
   - Closing empathy line: "You're not failing. You just don't have the right system yet."

3. THE GAP SECTION
   - Two-column layout: "RIGHT NOW" vs "IMAGINE IF"
   - Left column (pain state — 3 bullets using their exact pain)
   - Right column (dream state — 3 bullets using their exact transformation)
   - Accent color divider between columns
   - Bridge sentence below: "The only difference? A system built around you."

4. SOLUTION INTRODUCTION
   - Label: "INTRODUCING"
   - Offer name as H2 (make it compelling, not just the raw text)
   - 4 benefit bullets — transformation-focused, NOT feature-focused
   - Price display: "${price || 'Let\'s talk'}" with context
   - Secondary CTA: "Tell Me More →"

${showAbout ? `5. ABOUT SECTION (IMPORTANT — include this)
   - Label: "YOUR GUIDE"
   - Circular placeholder avatar (use a CSS circle with initials "${(name||'YN').split(' ').map(w=>w[0]).join('').slice(0,2)}" in accent color)
   - Name: "${name || 'Your Name'}"
   - Title: Generate a compelling title based on their role: ${role}
   - Bio: 3 sentences — warm, authoritative, specific to their niche (${offer})
   - 3 credential bullets with checkmarks
   - "As seen in" row: 3 generic authority logos as text badges (Forbes, LinkedIn, Entrepreneur)` : ''}

${showAbout ? '6' : '5'}. SOCIAL PROOF SECTION
   - Label: "WHAT CLIENTS ARE SAYING"
   - 3 testimonial cards — AI-generated realistic quotes specific to the transformation (${transform})
   - Each card: quote + client name (first name + last initial) + role/title + ★★★★★
   - Make testimonials feel REAL and SPECIFIC — mention actual results with numbers

${showAbout ? '7' : '6'}. FINAL CTA SECTION
   - Strong closing H2 tied to transformation: make it urgent and hopeful
   - 2-sentence supporting copy addressing their obstacle
   - Large CTA button: "Let's Talk →" linking to "/chat?name=${encodeURIComponent(name||'')}&email=${encodeURIComponent(email||'')}"
   - Fine print: "This is a conversation, not a sales pitch. No pressure, ever."

FOOTER:
   - "This funnel was designed by Maria Angelica Scott — System Architect"
   - "© ${new Date().getFullYear()} · Helping businesses build systems that attract, convert, and close — on autopilot."
   - Small disclaimer: "This is a demo funnel generated based on your quiz answers."

TECHNICAL REQUIREMENTS:
- Full HTML document with <!DOCTYPE html>
- Google Fonts: Import 'Playfair Display' for headings, 'DM Sans' for body
- Mobile responsive using max-width containers and media queries
- Smooth scroll behavior
- All buttons have hover states
- Cards have subtle box-shadows
- Use the accent color for: buttons, borders, highlights, dividers
- Section padding: 80px top/bottom desktop, 48px mobile
- Max content width: 1100px centered
- Return ONLY the complete HTML. No explanation. No markdown. Start with <!DOCTYPE html>`;

  let htmlContent;
  try {
    const openAIBody = {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 4000
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

    htmlContent = openaiData.choices?.[0]?.message?.content?.trim();
    if (!htmlContent) throw new Error('Empty response from OpenAI');

    // Strip any accidental markdown fences
    htmlContent = htmlContent.replace(/^```html\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();

  } catch (err) {
    console.error('OpenAI call failed:', err.message);
    return res.status(500).json({ error: 'Demo generation failed: ' + err.message });
  }

  // ── Save to Supabase ──
  let savedLeadId = lead_id;
  try {
    const supabaseURL = new URL(process.env.SUPABASE_URL);

    // If we have a lead_id, update that row. Otherwise insert new.
    if (lead_id) {
      const updateOptions = {
        hostname: supabaseURL.hostname,
        path: `/rest/v1/leads?id=eq.${lead_id}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        }
      };
      await postJSON(updateOptions, {
        offer_name:        offer,
        offer_price:       price || null,
        ideal_client:      client,
        offer_pain:        pain,
        offer_transform:   transform,
        design_vibe:       vibe || null,
        demo_html:         htmlContent,
        demo_generated_at: new Date().toISOString()
      });
    } else {
      // No lead_id — insert minimal record
      const insertOptions = {
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
      const inserted = await postJSON(insertOptions, {
        name, email,
        offer_name:        offer,
        offer_price:       price || null,
        ideal_client:      client,
        offer_pain:        pain,
        offer_transform:   transform,
        design_vibe:       vibe || null,
        demo_html:         htmlContent,
        demo_generated_at: new Date().toISOString(),
        created_at:        new Date().toISOString()
      });
      if (Array.isArray(inserted) && inserted[0]?.id) savedLeadId = inserted[0].id;
    }
  } catch (err) {
    console.error('Supabase save error:', err.message);
  }

  return res.status(200).json({
    demo_url: `/demo?id=${savedLeadId || 'preview'}`,
    lead_id:  savedLeadId
  });
};
