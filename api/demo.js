const https = require('https');

const VIBES = {
  'bold-premium':        { bg:'#0D0D0D', bg2:'#1A1A1A', bg3:'#111111', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#C9A84C', accentDark:'#A07830', btnText:'#0D0D0D', border:'rgba(201,168,76,0.25)', cardBg:'#1E1E1E', navBg:'rgba(13,13,13,0.95)' },
  'warm-trustworthy':    { bg:'#1B2B4B', bg2:'#243761', bg3:'#1A2740', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#E8C87A', accentDark:'#C4A055', btnText:'#1B2B4B', border:'rgba(232,200,122,0.25)', cardBg:'#1F3258', navBg:'rgba(27,43,75,0.95)' },
  'modern-edgy':         { bg:'#0A0A0A', bg2:'#111111', bg3:'#080808', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#00E5FF', accentDark:'#00B8CC', btnText:'#0A0A0A', border:'rgba(0,229,255,0.2)', cardBg:'#161616', navBg:'rgba(10,10,10,0.95)' },
  'fresh-approachable':  { bg:'#FFFFFF', bg2:'#F0FAF5', bg3:'#E8F5EE', text:'#1A1A1A', textMid:'#5A7A6A', accent:'#2D6A4F', accentDark:'#1E4D38', btnText:'#FFFFFF', border:'rgba(45,106,79,0.2)', cardBg:'#FFFFFF', navBg:'rgba(255,255,255,0.95)' },
  'bold-energetic':      { bg:'#1A1A2E', bg2:'#16213E', bg3:'#0F3460', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#FF6B35', accentDark:'#CC5520', btnText:'#FFFFFF', border:'rgba(255,107,53,0.25)', cardBg:'#1E2440', navBg:'rgba(26,26,46,0.95)' },
  'clean-creative':      { bg:'#1E1E2E', bg2:'#252538', bg3:'#1A1A2A', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#6C5CE7', accentDark:'#5048C4', btnText:'#FFFFFF', border:'rgba(108,92,231,0.25)', cardBg:'#262638', navBg:'rgba(30,30,46,0.95)' },
  'corporate-authority': { bg:'#1E3A5F', bg2:'#24476E', bg3:'#1A3255', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#A8C0D6', accentDark:'#7A9AB8', btnText:'#1E3A5F', border:'rgba(168,192,214,0.25)', cardBg:'#243F6A', navBg:'rgba(30,58,95,0.95)' },
  'elegant-feminine':    { bg:'#FDF6F0', bg2:'#FEF0E8', bg3:'#FCE8DC', text:'#2D1B1B', textMid:'#8B5E5E', accent:'#C4847A', accentDark:'#A0605A', btnText:'#FFFFFF', border:'rgba(196,132,122,0.25)', cardBg:'#FFFFFF', navBg:'rgba(253,246,240,0.95)' },
};

const COACH_ROLES = ['Coach','Trainer','Consultant','Advisor','Sales Professional'];
function isCoach(role) { return COACH_ROLES.some(r => (role||'').includes(r)); }

function postJSON(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Parse fail: ' + data.slice(0,300))); } });
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
  if (!offer || !client || !pain || !transform) return res.status(400).json({ error: 'Missing required fields' });

  const c = VIBES[vibe] || VIBES['bold-premium'];
  const showAbout = isCoach(role);
  const initials = (name||'MA').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const firstName = (name||'Your Advisor').split(' ')[0];

  // ── Step 1: Get AI content ──
  const contentPrompt = `You are an expert conversion copywriter. Generate ONLY a JSON object with funnel copy. No markdown, no explanation, raw JSON only.

CONTEXT:
Name: ${name || 'The Advisor'}
Role: ${role}
Offer: ${offer}
Price: ${price || 'Contact for pricing'}
Ideal client: ${client}
Pain solved: ${pain}
Transformation: ${transform}
Goal: ${goal}

Generate this exact JSON:
{
  "hero_headline": "Emotionally charged headline targeting ideal client's exact pain (max 12 words, make it hurt then give hope)",
  "hero_sub": "1-2 sentences expanding on the transformation promise",
  "hero_cta": "Action-oriented button text (4-6 words)",
  "pain_section_title": "Empathetic section heading that mirrors client's daily struggle",
  "pain_intro": "1 sentence that makes them feel deeply understood",
  "pain_bullets": [
    {"emoji": "😩", "bold": "Short painful truth", "detail": "One sentence elaboration specific to their situation"},
    {"emoji": "😤", "bold": "Short painful truth", "detail": "One sentence elaboration specific to their situation"},
    {"emoji": "🔄", "bold": "Short painful truth", "detail": "One sentence elaboration specific to their situation"}
  ],
  "pain_closer": "Short empathy closer — 1 sentence. e.g. You are not failing. You just need the right system.",
  "gap_left_title": "RIGHT NOW",
  "gap_right_title": "IMAGINE IF",
  "gap_left": ["Painful current state bullet 1", "Painful current state bullet 2", "Painful current state bullet 3"],
  "gap_right": ["Dream outcome bullet 1", "Dream outcome bullet 2", "Dream outcome bullet 3"],
  "gap_bridge": "The only difference? One short powerful sentence.",
  "offer_label": "INTRODUCING",
  "offer_title": "Compelling offer name (make it better than the raw text)",
  "offer_sub": "1 sentence on what it is and who it is for",
  "offer_benefits": [
    {"icon": "✓", "title": "Benefit title", "desc": "One sentence transformation, not feature"},
    {"icon": "✓", "title": "Benefit title", "desc": "One sentence transformation, not feature"},
    {"icon": "✓", "title": "Benefit title", "desc": "One sentence transformation, not feature"},
    {"icon": "✓", "title": "Benefit title", "desc": "One sentence transformation, not feature"}
  ],
  "offer_price_display": "Price formatted nicely e.g. Starting at ₱15,000",
  "offer_price_context": "Short value framing e.g. Less than losing one more client this month",
  "offer_cta": "Button text e.g. Tell Me More →",
  "about_title": "YOUR GUIDE",
  "about_name": "${name || 'Your Expert'}",
  "about_role": "Compelling title based on role: ${role} and offer: ${offer}",
  "about_bio": "3 warm, authoritative sentences. Specific to their niche. Written in first person. Reference the client type: ${client}",
  "about_credentials": [
    "Credential or achievement specific to their niche",
    "Credential or achievement specific to their niche",
    "Credential or achievement specific to their niche"
  ],
  "testimonials": [
    {"quote": "Specific result-driven quote mentioning a real number or transformation. Reference: ${transform}", "name": "First name L.", "role": "Their job title or situation", "result": "Key result e.g. 3x more leads in 30 days"},
    {"quote": "Specific result-driven quote mentioning a real number or transformation", "name": "First name L.", "role": "Their job title or situation", "result": "Key result"},
    {"quote": "Specific result-driven quote mentioning a real number or transformation", "name": "First name L.", "role": "Their job title or situation", "result": "Key result"}
  ],
  "final_headline": "Urgency-driven closing headline tied to transformation promise",
  "final_sub": "2 sentences. First: what they get. Second: address their hesitation (${problem}).",
  "final_cta": "Let's Talk →",
  "footer_tagline": "Short brand tagline"
}`;

  let content;
  try {
    const aiRes = await postJSON({
      hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    }, { model: 'gpt-4o-mini', messages: [{ role: 'user', content: contentPrompt }], temperature: 0.8, max_tokens: 2000 });

    if (aiRes.error) return res.status(500).json({ error: 'OpenAI: ' + aiRes.error.message });
    const raw = aiRes.choices?.[0]?.message?.content?.trim().replace(/^```json\n?/,'').replace(/^```\n?/,'').replace(/```$/,'').trim();
    content = JSON.parse(raw);
  } catch(err) {
    console.error('AI content error:', err.message);
    return res.status(500).json({ error: 'Content generation failed: ' + err.message });
  }

  // ── Step 2: Build HTML from template ──
  const chatUrl = `/chat?name=${encodeURIComponent(name||'')}&email=${encodeURIComponent(email||'')}${lead_id ? '&id='+lead_id : ''}`;

  const aboutSection = showAbout ? `
    <!-- ABOUT -->
    <section style="background:${c.bg2};padding:80px 24px">
      <div style="max-width:900px;margin:0 auto">
        <div style="text-align:center;margin-bottom:48px">
          <div style="display:inline-block;background:${c.accent}22;border:1px solid ${c.accent}44;color:${c.accent};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;padding:6px 18px;border-radius:100px;margin-bottom:16px">${content.about_title}</div>
        </div>
        <div style="display:flex;align-items:center;gap:48px;flex-wrap:wrap;justify-content:center">
          <div style="flex-shrink:0;text-align:center">
            <div style="width:140px;height:140px;border-radius:50%;background:linear-gradient(135deg,${c.accent},${c.accentDark});display:flex;align-items:center;justify-content:center;font-size:2.8rem;font-weight:700;color:${c.btnText};margin:0 auto 16px;border:4px solid ${c.accent}44">${initials}</div>
            <div style="font-weight:600;font-size:1.1rem;color:${c.text}">${content.about_name}</div>
            <div style="font-size:0.85rem;color:${c.accent};margin-top:4px">${content.about_role}</div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:16px;flex-wrap:wrap">
              <span style="background:${c.accent}18;border:1px solid ${c.accent}33;color:${c.accent};font-size:10px;padding:4px 10px;border-radius:100px">Forbes</span>
              <span style="background:${c.accent}18;border:1px solid ${c.accent}33;color:${c.accent};font-size:10px;padding:4px 10px;border-radius:100px">LinkedIn</span>
              <span style="background:${c.accent}18;border:1px solid ${c.accent}33;color:${c.accent};font-size:10px;padding:4px 10px;border-radius:100px">Entrepreneur</span>
            </div>
          </div>
          <div style="flex:1;min-width:260px">
            <p style="font-size:1rem;color:${c.textMid};line-height:1.8;margin-bottom:24px">${content.about_bio}</p>
            <div style="display:flex;flex-direction:column;gap:10px">
              ${(content.about_credentials||[]).map(cr=>`
              <div style="display:flex;align-items:flex-start;gap:10px">
                <span style="width:20px;height:20px;border-radius:50%;background:${c.accent};color:${c.btnText};display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;margin-top:2px">✓</span>
                <span style="color:${c.text};font-size:0.92rem;line-height:1.5">${cr}</span>
              </div>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </section>` : '';

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${content.hero_headline}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'DM Sans',sans-serif;background:${c.bg};color:${c.text};line-height:1.6}
a{color:inherit;text-decoration:none}
img{max-width:100%;display:block}
.container{max-width:1060px;margin:0 auto;padding:0 24px}
.btn-primary{display:inline-block;background:${c.accent};color:${c.btnText};font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:600;padding:16px 36px;border-radius:100px;border:none;cursor:pointer;transition:all 0.2s;text-decoration:none;letter-spacing:0.01em}
.btn-primary:hover{background:${c.accentDark};transform:translateY(-2px);box-shadow:0 8px 24px ${c.accent}44}
.btn-outline{display:inline-block;background:transparent;color:${c.accent};font-family:'DM Sans',sans-serif;font-size:0.95rem;font-weight:500;padding:14px 32px;border-radius:100px;border:1.5px solid ${c.accent};cursor:pointer;transition:all 0.2s;text-decoration:none}
.btn-outline:hover{background:${c.accent};color:${c.btnText}}
.section-label{display:inline-block;background:${c.accent}18;border:1px solid ${c.accent}44;color:${c.accent};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;padding:6px 18px;border-radius:100px;margin-bottom:20px}
.card{background:${c.cardBg};border:1px solid ${c.border};border-radius:16px;padding:28px 24px}
@media(max-width:640px){
  .container{padding:0 16px}
  .btn-primary{padding:14px 28px;font-size:0.92rem}
  h1{font-size:2rem!important}
  .grid-2{grid-template-columns:1fr!important}
  .grid-3{grid-template-columns:1fr!important}
  .grid-4{grid-template-columns:1fr 1fr!important}
  section{padding:56px 0!important}
}
</style>
</head>
<body>

<!-- NAV -->
<nav style="position:sticky;top:0;z-index:100;background:${c.navBg};backdrop-filter:blur(12px);border-bottom:1px solid ${c.border};padding:16px 0">
  <div class="container" style="display:flex;align-items:center;justify-content:space-between;gap:16px">
    <div style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;color:${c.text}">${firstName}</div>
    <a href="${chatUrl}" class="btn-primary" style="padding:10px 24px;font-size:0.85rem">Let's Talk →</a>
  </div>
</nav>

<!-- HERO -->
<section style="padding:100px 0 80px;background:${c.bg};position:relative;overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 60% 0%,${c.accent}12 0%,transparent 60%);pointer-events:none"></div>
  <div class="container" style="text-align:center;position:relative">
    <div class="section-label">✦ ${offer}</div>
    <h1 style="font-family:'Playfair Display',serif;font-size:clamp(2.2rem,5vw,3.8rem);line-height:1.1;max-width:800px;margin:0 auto 20px;color:${c.text}">${content.hero_headline}</h1>
    <p style="font-size:1.1rem;color:${c.textMid};max-width:560px;margin:0 auto 40px;line-height:1.7">${content.hero_sub}</p>
    <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="${chatUrl}" class="btn-primary">${content.hero_cta}</a>
      <a href="#offer" class="btn-outline">See How It Works</a>
    </div>
    <p style="margin-top:20px;font-size:0.78rem;color:${c.textMid};opacity:0.7">No contracts. No fluff. Just results.</p>
    <!-- Trust bar -->
    <div style="margin-top:56px;display:flex;align-items:center;justify-content:center;gap:32px;flex-wrap:wrap;opacity:0.6">
      <div style="display:flex;align-items:center;gap:8px;font-size:0.82rem;color:${c.textMid}"><span style="color:${c.accent}">★★★★★</span> 5-star results</div>
      <div style="width:1px;height:16px;background:${c.border}"></div>
      <div style="font-size:0.82rem;color:${c.textMid}">✓ Proven framework</div>
      <div style="width:1px;height:16px;background:${c.border}"></div>
      <div style="font-size:0.82rem;color:${c.textMid}">✓ Done-for-you system</div>
    </div>
  </div>
</section>

<!-- PAIN AMPLIFIER -->
<section style="padding:80px 0;background:${c.bg2}">
  <div class="container">
    <div style="text-align:center;margin-bottom:48px">
      <div class="section-label">DOES THIS SOUND FAMILIAR?</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:clamp(1.7rem,3.5vw,2.6rem);max-width:620px;margin:0 auto 12px">${content.pain_section_title}</h2>
      <p style="color:${c.textMid};font-size:1rem;max-width:480px;margin:0 auto">${content.pain_intro}</p>
    </div>
    <div class="grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:40px">
      ${(content.pain_bullets||[]).map(b=>`
      <div class="card" style="border-top:3px solid ${c.accent}">
        <div style="font-size:2rem;margin-bottom:14px">${b.emoji}</div>
        <div style="font-weight:600;font-size:1rem;color:${c.text};margin-bottom:8px">${b.bold}</div>
        <div style="font-size:0.87rem;color:${c.textMid};line-height:1.6">${b.detail}</div>
      </div>`).join('')}
    </div>
    <div style="text-align:center">
      <div style="display:inline-block;background:${c.accent}15;border:1px solid ${c.accent}33;border-radius:12px;padding:18px 32px;font-size:1rem;font-style:italic;color:${c.text}">
        "${content.pain_closer}"
      </div>
    </div>
  </div>
</section>

<!-- THE GAP -->
<section style="padding:80px 0;background:${c.bg3}">
  <div class="container">
    <div style="text-align:center;margin-bottom:48px">
      <div class="section-label">THE TURNING POINT</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:clamp(1.6rem,3vw,2.4rem)">Two paths. One decision.</h2>
    </div>
    <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-radius:20px;overflow:hidden;border:1px solid ${c.border}">
      <div style="padding:40px 32px;background:${c.cardBg}">
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.15em;color:${c.textMid};margin-bottom:20px">${content.gap_left_title}</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${(content.gap_left||[]).map(b=>`
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="color:#FF5555;flex-shrink:0;margin-top:2px">✗</span>
            <span style="color:${c.textMid};font-size:0.92rem;line-height:1.5">${b}</span>
          </div>`).join('')}
        </div>
      </div>
      <div style="padding:40px 32px;background:${c.accent}15;border-left:3px solid ${c.accent}">
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.15em;color:${c.accent};margin-bottom:20px">${content.gap_right_title}</div>
        <div style="display:flex;flex-direction:column;gap:14px">
          ${(content.gap_right||[]).map(b=>`
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="color:${c.accent};flex-shrink:0;margin-top:2px">✓</span>
            <span style="color:${c.text};font-size:0.92rem;line-height:1.5">${b}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div style="text-align:center;margin-top:32px">
      <p style="font-size:1.05rem;color:${c.textMid};font-style:italic">${content.gap_bridge}</p>
    </div>
  </div>
</section>

<!-- OFFER -->
<section id="offer" style="padding:80px 0;background:${c.bg2}">
  <div class="container">
    <div style="text-align:center;margin-bottom:48px">
      <div class="section-label">${content.offer_label}</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:clamp(1.8rem,3.5vw,2.8rem);max-width:680px;margin:0 auto 12px">${content.offer_title}</h2>
      <p style="color:${c.textMid};font-size:1rem;max-width:500px;margin:0 auto">${content.offer_sub}</p>
    </div>
    <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:40px">
      ${(content.offer_benefits||[]).map(b=>`
      <div class="card" style="display:flex;align-items:flex-start;gap:14px">
        <div style="width:36px;height:36px;border-radius:50%;background:${c.accent};color:${c.btnText};display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;font-weight:700">${b.icon}</div>
        <div>
          <div style="font-weight:600;font-size:0.97rem;color:${c.text};margin-bottom:5px">${b.title}</div>
          <div style="font-size:0.85rem;color:${c.textMid};line-height:1.55">${b.desc}</div>
        </div>
      </div>`).join('')}
    </div>
    <!-- Price card -->
    <div style="background:${c.accent};border-radius:20px;padding:40px;text-align:center;max-width:480px;margin:0 auto">
      <div style="font-size:0.8rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${c.btnText};opacity:0.8;margin-bottom:10px">Investment</div>
      <div style="font-family:'Playfair Display',serif;font-size:2.4rem;font-weight:700;color:${c.btnText};margin-bottom:8px">${content.offer_price_display}</div>
      <div style="font-size:0.88rem;color:${c.btnText};opacity:0.75;margin-bottom:24px">${content.offer_price_context}</div>
      <a href="${chatUrl}" style="display:inline-block;background:${c.btnText};color:${c.accent};font-family:'DM Sans',sans-serif;font-size:0.95rem;font-weight:700;padding:14px 32px;border-radius:100px;text-decoration:none">${content.offer_cta}</a>
    </div>
  </div>
</section>

${aboutSection}

<!-- TESTIMONIALS -->
<section style="padding:80px 0;background:${c.bg}">
  <div class="container">
    <div style="text-align:center;margin-bottom:48px">
      <div class="section-label">WHAT CLIENTS ARE SAYING</div>
      <h2 style="font-family:'Playfair Display',serif;font-size:clamp(1.6rem,3vw,2.4rem)">Real results from real people</h2>
    </div>
    <div class="grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
      ${(content.testimonials||[]).map((t,i)=>`
      <div class="card" style="display:flex;flex-direction:column;gap:16px">
        <div style="color:${c.accent};font-size:1.1rem">★★★★★</div>
        <p style="font-size:0.9rem;color:${c.textMid};line-height:1.7;flex:1;font-style:italic">"${t.quote}"</p>
        <div style="display:flex;align-items:center;gap:12px;padding-top:12px;border-top:1px solid ${c.border}">
          <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,${c.accent},${c.accentDark});display:flex;align-items:center;justify-content:center;font-size:0.85rem;font-weight:700;color:${c.btnText};flex-shrink:0">${t.name.charAt(0)}</div>
          <div>
            <div style="font-weight:600;font-size:0.88rem;color:${c.text}">${t.name}</div>
            <div style="font-size:0.78rem;color:${c.accent}">${t.result}</div>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>
</section>

<!-- FINAL CTA -->
<section style="padding:80px 0;background:${c.accent}">
  <div class="container" style="text-align:center">
    <h2 style="font-family:'Playfair Display',serif;font-size:clamp(1.8rem,3.5vw,2.8rem);color:${c.btnText};max-width:620px;margin:0 auto 16px">${content.final_headline}</h2>
    <p style="font-size:1rem;color:${c.btnText};opacity:0.8;max-width:500px;margin:0 auto 36px;line-height:1.7">${content.final_sub}</p>
    <a href="${chatUrl}" style="display:inline-block;background:${c.btnText};color:${c.accent};font-family:'DM Sans',sans-serif;font-size:1.05rem;font-weight:700;padding:18px 44px;border-radius:100px;text-decoration:none;transition:all 0.2s">${content.final_cta}</a>
    <p style="margin-top:16px;font-size:0.78rem;color:${c.btnText};opacity:0.6">This is a conversation, not a sales pitch. No pressure, ever.</p>
  </div>
</section>

<!-- FOOTER -->
<footer style="padding:32px 0;background:${c.bg3};border-top:1px solid ${c.border}">
  <div class="container" style="text-align:center">
    <div style="font-family:'Playfair Display',serif;font-size:0.95rem;color:${c.text};margin-bottom:6px">Maria Angelica Scott — System Architect</div>
    <div style="font-size:0.78rem;color:${c.textMid};margin-bottom:16px">${content.footer_tagline}</div>
    <div style="font-size:0.72rem;color:${c.textMid};opacity:0.5">© ${new Date().getFullYear()} · This is a demo funnel generated based on your quiz answers. All content is AI-generated as a preview.</div>
  </div>
</footer>

</body>
</html>`;

  // ── Step 3: Save to Supabase ──
  let savedLeadId = lead_id;
  try {
    const supabaseURL = new URL(process.env.SUPABASE_URL);
    if (lead_id) {
      await postJSON({
        hostname: supabaseURL.hostname,
        path: `/rest/v1/leads?id=eq.${lead_id}`,
        method: 'PATCH',
        headers: { 'Content-Type':'application/json','apikey':process.env.SUPABASE_ANON_KEY,'Authorization':`Bearer ${process.env.SUPABASE_ANON_KEY}`,'Prefer':'return=minimal' }
      }, { offer_name:offer, offer_price:price||null, ideal_client:client, offer_pain:pain, offer_transform:transform, design_vibe:vibe||null, demo_html:htmlContent, demo_generated_at:new Date().toISOString() });
    } else {
      const inserted = await postJSON({
        hostname: supabaseURL.hostname,
        path: '/rest/v1/leads',
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':process.env.SUPABASE_ANON_KEY,'Authorization':`Bearer ${process.env.SUPABASE_ANON_KEY}`,'Prefer':'return=representation' }
      }, { name, email, offer_name:offer, offer_price:price||null, ideal_client:client, offer_pain:pain, offer_transform:transform, design_vibe:vibe||null, demo_html:htmlContent, demo_generated_at:new Date().toISOString(), created_at:new Date().toISOString() });
      if (Array.isArray(inserted) && inserted[0]?.id) savedLeadId = inserted[0].id;
    }
  } catch(err) { console.error('Supabase error:', err.message); }

  return res.status(200).json({ demo_url: `/demo?id=${savedLeadId||'preview'}`, lead_id: savedLeadId });
};
