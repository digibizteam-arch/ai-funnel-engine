const https = require('https');

// ── VIBE PALETTES ──
const VIBES = {
  'bold-premium': { bg:'#0D0D0D', bg2:'#111111', bg3:'#0A0A0A', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#C9A84C', accentRgb:'201,168,76', btnText:'#0D0D0D', border:'rgba(201,168,76,0.15)', cardBg:'rgba(255,255,255,0.03)', navBg:'rgba(13,13,13,0.8)', honest:'#1A1500' },
  'warm-trustworthy': { bg:'#1B2B4B', bg2:'#16213E', bg3:'#111A2E', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#E8C87A', accentRgb:'232,200,122', btnText:'#1B2B4B', border:'rgba(232,200,122,0.15)', cardBg:'rgba(255,255,255,0.04)', navBg:'rgba(27,43,75,0.8)', honest:'#0F1A2E' },
  'modern-edgy': { bg:'#0A0A0A', bg2:'#080808', bg3:'#050505', text:'#FFFFFF', textMid:'rgba(255,255,255,0.55)', accent:'#00E5FF', accentRgb:'0,229,255', btnText:'#0A0A0A', border:'rgba(0,229,255,0.12)', cardBg:'rgba(255,255,255,0.03)', navBg:'rgba(10,10,10,0.8)', honest:'#001A1F' },
  'fresh-approachable': { bg:'#FFFFFF', bg2:'#F8FBF9', bg3:'#F0FAF5', text:'#1A1A1A', textMid:'#5A7A6A', accent:'#2D6A4F', accentRgb:'45,106,79', btnText:'#FFFFFF', border:'rgba(45,106,79,0.1)', cardBg:'rgba(45,106,79,0.03)', navBg:'rgba(255,255,255,0.85)', honest:'#F5FFF8' },
  'bold-energetic': { bg:'#1A1A2E', bg2:'#151525', bg3:'#101020', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#FF6B35', accentRgb:'255,107,53', btnText:'#FFFFFF', border:'rgba(255,107,53,0.15)', cardBg:'rgba(255,255,255,0.04)', navBg:'rgba(26,26,46,0.8)', honest:'#1A0A00' },
  'clean-creative': { bg:'#1E1E2E', bg2:'#1A1A28', bg3:'#151522', text:'#FFFFFF', textMid:'rgba(255,255,255,0.55)', accent:'#6C5CE7', accentRgb:'108,92,231', btnText:'#FFFFFF', border:'rgba(108,92,231,0.15)', cardBg:'rgba(255,255,255,0.04)', navBg:'rgba(30,30,46,0.8)', honest:'#12112A' },
  'corporate-authority': { bg:'#1E3A5F', bg2:'#172E4D', bg3:'#122240', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#A8C0D6', accentRgb:'168,192,214', btnText:'#1E3A5F', border:'rgba(168,192,214,0.15)', cardBg:'rgba(255,255,255,0.04)', navBg:'rgba(30,58,95,0.8)', honest:'#0F1F35' },
  'elegant-feminine': { bg:'#FDF6F0', bg2:'#FAF0E8', bg3:'#F5E8DC', text:'#2D1B1B', textMid:'#8B5E5E', accent:'#C4847A', accentRgb:'196,132,122', btnText:'#FFFFFF', border:'rgba(196,132,122,0.15)', cardBg:'rgba(196,132,122,0.04)', navBg:'rgba(253,246,240,0.85)', honest:'#FFF5F0' },
};

// ── ROLE DETECTION ──
const ROLE_MAP = {
  coach: ['Coach','Trainer','Life Coach','Business Coach','Fitness'],
  advisor: ['Financial Advisor','Insurance','Wealth','Consultant','Advisor','HR','Legal','Strategy'],
  agency: ['Agency','Freelancer','Marketing','Design','Funnel','Content','Creative'],
  local: ['Local Business','Clinic','Salon','Trades','Restaurant','Retail','Service'],
  sales: ['Sales Professional','B2B','Real Estate','SaaS','Insurance Agent'],
  seller: ['Online Seller','E-commerce','Digital Products','Dropshipping','Product'],
  founder: ['Startup','Founder','Tech','SaaS Founder','Builder'],
  default: []
};

function detectRole(role) {
  if (!role) return 'default';
  const r = role.toLowerCase();
  for (const [key, keywords] of Object.entries(ROLE_MAP)) {
    if (keywords.some(k => r.includes(k.toLowerCase()))) return key;
  }
  return 'default';
}

// ── HONEST SECTION PER ROLE ──
const HONEST_CONTENT = {
  coach: { title: "Let's Be Honest About What It Takes", truth: "A funnel will bring the right people to your door. But it cannot manufacture the transformation only you can deliver.", requirements: [ { icon: "🎯", title: "You need a clear, proven method", desc: "If your coaching process isn't defined yet, no funnel will save you. Clarity on your framework comes first." }, { icon: "📣", title: "You still need to show up", desc: "Consistent content, stories, and presence build the trust that converts strangers into paying clients. The funnel amplifies — it doesn't replace you." }, { icon: "💬", title: "You need to have real conversations", desc: "The funnel warms them up. But the call, the consultation, the moment of commitment — that still requires you to show up fully." }, { icon: "📊", title: "You need to track what works", desc: "A funnel is a living system. What gets measured gets improved. You'll need to review results and iterate." } ], closer: "If you're willing to do the work — we'll build the system that does the heavy lifting. The funnel finds them. You change them." },
  advisor: { title: "Let's Be Honest — This Isn't Magic", truth: "This system will put qualified, warm prospects in front of you. But trust in finance is earned slowly — and one wrong move dissolves it instantly.", requirements: [ { icon: "⚡", title: "You must respond fast", desc: "When a warm lead books a call, they're comparing you to 3 others. A 24-hour response window is a loss. Be ready to move." }, { icon: "📚", title: "You need to educate, not just sell", desc: "The clients this funnel attracts are doing research. They want to understand before they commit. Lead with education, not pitch." }, { icon: "🔒", title: "Compliance and licensing are still your responsibility", desc: "The funnel drives interest. Everything you say and promise after that is on you. Stay within your regulatory boundaries." }, { icon: "🤝", title: "Relationships still close deals", desc: "Referrals, rapport, and follow-through still matter. The funnel opens the door — your character keeps it open." } ], closer: "If you're serious about growing a practice built on trust — we'll build the system that makes qualified people find you first." },
  agency: { title: "Real Talk — Here's What You Still Own", truth: "An automated funnel can fill your pipeline. But it cannot deliver your projects, meet your deadlines, or build your reputation. That part is all you.", requirements: [ { icon: "💼", title: "Your portfolio must be current and strong", desc: "Prospects will check your work before they ever book a call. Outdated or weak samples kill conversions no copy can fix." }, { icon: "📈", title: "You need case studies with real numbers", desc: "Results beat claims. Before we drive traffic, make sure you can show specific outcomes you've delivered for past clients." }, { icon: "⏱", title: "You need capacity to deliver", desc: "A funnel that works too well is a problem if you can't fulfill. Know your limits before you scale." }, { icon: "💰", title: "You must price with confidence", desc: "Underpricing attracts the wrong clients and burns you out. Know your worth and hold the line." } ], closer: "If your work is solid and you're ready to let the right clients find you — we'll build the system that makes that happen consistently." },
  local: { title: "Honest Truth — A Funnel Is a Tool, Not a Miracle", truth: "This system will bring people from your community to your door — people who are already looking for what you offer. But the experience they have when they arrive is still entirely yours to deliver.", requirements: [ { icon: "⭐", title: "Your reviews need to be healthy", desc: "Local buyers check Google before they book. Three bad reviews will kill a funnel's momentum. Address them before we drive traffic." }, { icon: "📱", title: "You need to respond to inquiries fast", desc: "Local leads are impatient. If someone books and doesn't hear back within hours, they've already booked your competitor." }, { icon: "🏪", title: "Your in-person experience must match the promise", desc: "The funnel sets expectations. If the walk-in experience doesn't match — the reviews will tell the story." }, { icon: "📍", title: "Community presence still matters", desc: "Word of mouth and local reputation amplify everything a funnel does. Show up where your customers are." } ], closer: "If your business delivers real value — we'll build the system that makes sure the right people in your area know about it." },
  sales: { title: "Let's Be Straight — The Funnel Doesn't Close for You", truth: "This system pre-qualifies leads, educates them on your solution, and gets them to the conversation already warm. But the close still happens between two people.", requirements: [ { icon: "🎯", title: "Your pitch needs to be sharp", desc: "Warm leads still need a reason to say yes right now. Know your offer, your differentiator, and your answer to every objection." }, { icon: "📞", title: "Follow-up discipline is non-negotiable", desc: "Most deals close on the 5th to 8th follow-up. The funnel starts the conversation — your persistence finishes it." }, { icon: "📖", title: "Product knowledge closes deals", desc: "A lead who arrived educated will ask harder questions. You need to know your product deeper than they do." }, { icon: "🔁", title: "You need to track your pipeline", desc: "Know where every lead is in the process. The funnel fills the top — you need to manage the rest." } ], closer: "If you're a closer who just needs better leads — we'll build the system that makes sure every call starts warm." },
  seller: { title: "Real Talk — Traffic Doesn't Fix a Broken Offer", truth: "A high-converting funnel will bring buyers to your product page ready to purchase. But if the product disappoints — no funnel saves you from returns, chargebacks, and bad reviews.", requirements: [ { icon: "📦", title: "Your product must deliver on its promise", desc: "The funnel creates desire and urgency. Your product creates satisfaction. One without the other destroys your business." }, { icon: "📸", title: "Visuals must be premium", desc: "In e-commerce, photos are the product experience before purchase. Invest in photography before investing in ads." }, { icon: "🚚", title: "Fulfillment must be reliable", desc: "Slow shipping and poor packaging kill repeat purchases and generate refund requests. Get operations right before scaling." }, { icon: "💬", title: "Customer service must be fast", desc: "Buyers who feel ignored become vocal. One bad experience shared publicly costs you 10 potential customers." } ], closer: "If your product is solid and you're ready to scale — we'll build the funnel that turns cold strangers into repeat buyers." },
  founder: { title: "Honest Founder Talk — Growth Requires More Than a Funnel", truth: "A funnel can accelerate user acquisition and make your pitch land consistently. But it cannot fix product-market fit, team issues, or a leaking retention bucket.", requirements: [ { icon: "🎯", title: "You need a defined ICP", desc: "If you don't know exactly who your best customer is, the funnel will attract everyone — which means it converts no one." }, { icon: "🔄", title: "Retention must come before acquisition", desc: "Driving new users into a leaky product is expensive. Fix the experience before you scale the top of the funnel." }, { icon: "📊", title: "You need to track the right metrics", desc: "CAC, LTV, churn rate — these tell you if the funnel is working. Vanity metrics will mislead you at scale." }, { icon: "💡", title: "Product must evolve with feedback", desc: "The funnel will surface what customers want. You need a process to capture that feedback and act on it." } ], closer: "If you've found your market and you're ready to scale — we'll build the acquisition system that compounds your growth." },
  default: { title: "Let's Be Honest — Here's What This Requires", truth: "A done-for-you funnel system will work. But only if you're willing to work alongside it. The best system in the world cannot replace clarity, consistency, and commitment.", requirements: [ { icon: "🎯", title: "Clarity on your offer", desc: "You must know exactly what you're selling, who it's for, and why it's different. Without this, no funnel converts." }, { icon: "📣", title: "Consistent marketing activity", desc: "Funnels amplify effort — they don't replace it. Running ads, posting content, or doing outreach is still required." }, { icon: "⚡", title: "Fast follow-up", desc: "Leads go cold fast. When the system delivers a warm prospect, you need to be ready to respond within hours." }, { icon: "📊", title: "A willingness to review and improve", desc: "The first version is never the best version. You'll need to look at results and be willing to iterate." } ], closer: "If you're ready to put in the work — we'll build the system that makes every hour you invest multiply." }
};

function postJSON(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Parse fail: ' + data.slice(0,300))); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
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
  const roleType = detectRole(role);
  const honest = HONEST_CONTENT[roleType] || HONEST_CONTENT.default;
  const firstName = (name || 'Your Expert').split(' ')[0];
  const initials = (name || 'MA').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const isPersonBrand = ['coach','advisor','sales','founder'].includes(roleType);
  const chatUrl = `/chat?name=${encodeURIComponent(name||'')}&email=${encodeURIComponent(email||'')}${lead_id ? '&id='+lead_id : ''}`;

  // ── STEP 1: Generate content JSON from GPT ──
  const contentPrompt = `You are an elite conversion copywriter and funnel strategist. Generate ONLY a valid JSON object — no markdown, no explanation, raw JSON only.

CONTEXT:
Name: ${name || 'The Expert'}
Role: ${role}
Offer: ${offer}
Price: ${price || 'Contact for pricing'}
Ideal client: ${client}
Pain solved: ${pain}
Transformation: ${transform}
Goal: ${goal}

PSYCHOLOGICAL FRAMEWORK: PAS (Pain-Agitate-Solve) + AIDA (Attention-Interest-Desire-Action)

Generate this exact JSON with powerful, specific, emotionally charged copy:
{
  "hero_headline": "A brutal honest headline that hits the ideal client's deepest pain — make it sting but give hope (max 12 words, no clichés)",
  "hero_sub": "1 sentence expanding on the pain, 1 sentence on the transformation. Make it visceral and real.",
  "hero_cta": "Action-driven button text (4-6 words)",
  "hero_trust": "One short credibility line below the CTA e.g. Trusted by 200+ coaches across Southeast Asia",
  "hero_stats": [
    {"number": "Dynamic metric 1 based on role/offer (e.g. 3x, 48hrs, 100%)", "label": "Short label for metric 1"},
    {"number": "Dynamic metric 2 (e.g. 7, 10k+, 0)", "label": "Short label for metric 2"},
    {"number": "Dynamic metric 3", "label": "Short label for metric 3"}
  ],
  "pain_headline": "A headline that makes them feel deeply seen — like you read their diary",
  "pain_intro": "1 powerful sentence that makes them feel understood — not judged",
  "pain_bullets": [
    {"emoji": "😩", "bold": "The painful truth they feel every day", "detail": "One brutally specific sentence about how this feels in their daily life"},
    {"emoji": "🔁", "bold": "The exhausting cycle they're trapped in", "detail": "One sentence on the repetitive pain of their situation"},
    {"emoji": "💸", "bold": "What this is actually costing them", "detail": "One sentence on the real cost — money, time, or identity"}
  ],
  "pain_reality": "One hard-hitting closing sentence that validates their struggle without giving them an easy out",
  "cost_headline": "A headline about the invisible daily damage",
  "cost_emotional": "2 sentences on the emotional toll — not numbers, pure feeling. What does it feel like to go to bed knowing this problem is still unsolved?",
  "cost_items": [
    {"label": "Every day without a system", "impact": "Is another day your ideal client chose someone else"},
    {"label": "Every unqualified conversation", "impact": "Drains energy you could spend on clients who actually value you"},
    {"label": "Every month of inconsistency", "impact": "Makes it harder to believe you can ever have the business you imagined"}
  ],
  "dream_headline": "Imagine if... headline — paint the exact life they want",
  "dream_intro": "Start with 'Imagine waking up and...' — paint the specific day they want to have",
  "dream_bullets": [
    "Specific dream outcome 1 — tied to their exact transformation",
    "Specific dream outcome 2 — tied to their goal",
    "Specific dream outcome 3 — tied to their ideal client relationship"
  ],
  "dream_closer": "End with hope grounded in reality — not hype. e.g. This is not a fantasy. It is a system.",
  "solution_label": "INTRODUCING",
  "solution_title": "A compelling name for their ideal solution (make it better than the raw offer text)",
  "solution_sub": "One sentence on what it is and who it is for",
  "how_it_works": [
    {"step": "01", "title": "Step name", "desc": "What happens in this step and what the prospect feels"},
    {"step": "02", "title": "Step name", "desc": "What happens and why it matters"},
    {"step": "03", "title": "Step name", "desc": "The outcome of this step"}
  ],
  "solution_price": "${price || 'Let us talk'}",
  "solution_price_context": "One line on value framing — what is this worth compared to staying stuck?",
  "solution_cta": "Button text",
  "testimonials": [
    {"quote": "Highly specific result-driven quote with a real number or outcome. Reference: ${transform}", "name": "First name L.", "role": "Their title or situation", "result": "Key result metric e.g. 3x more booked calls in 30 days", "avatar_letter": "A"},
    {"quote": "Specific quote about before and after. Mention the pain they had before and what changed.", "name": "First name L.", "role": "Their title or situation", "result": "Key result metric", "avatar_letter": "B"},
    {"quote": "Emotional quote about confidence, clarity, or freedom gained.", "name": "First name L.", "role": "Their title or situation", "result": "Key result metric", "avatar_letter": "C"}
  ],
  "about_label": "YOUR GUIDE",
  "about_name": "${name || 'Your Expert'}",
  "about_role_title": "A compelling professional title based on role: ${role} and offer: ${offer}",
  "about_bio_line1": "First sentence — establish credibility and who they help. Specific to niche: ${client}",
  "about_bio_line2": "Second sentence — what makes them different or their unique approach",
  "about_bio_line3": "Third sentence — a human touch — why they do this work",
  "about_credentials": [
    "Specific achievement or credential relevant to their niche",
    "Specific achievement or credential",
    "Specific achievement or credential"
  ],
  "about_featured": ["Forbes", "LinkedIn", "Entrepreneur"],
  "final_headline": "Closing headline — urgency + transformation. Make it the most powerful line on the page.",
  "final_sub": "2 sentences. First: what they get. Second: speak to their deepest fear of staying stuck.",
  "final_cta": "Let's Talk →",
  "final_note": "One reassurance line — no pressure, no pitch, just a conversation"
}`;

  let content;
  try {
    const aiRes = await postJSON({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    }, {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: contentPrompt }],
      temperature: 0.82,
      max_tokens: 2500
    });

    if (aiRes.error) return res.status(500).json({ error: 'OpenAI: ' + aiRes.error.message });
    const raw = aiRes.choices?.[0]?.message?.content?.trim().replace(/^```json\n?/,'').replace(/^```\n?/,'').replace(/```$/,'').trim();
    content = JSON.parse(raw);
  } catch(err) {
    console.error('AI content error:', err.message);
    return res.status(500).json({ error: 'Content generation failed: ' + err.message });
  }

  // ── STEP 2: Build Modern HTML from template ──
  const honestSection = `
  <!-- LET'S BE HONEST -->
  <section style="background:${c.honest};padding:120px 24px;position:relative;overflow:hidden">
    <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(${c.accentRgb},0.3),transparent)"></div>
    <div style="max-width:900px;margin:0 auto;position:relative">
      <div style="text-align:center;margin-bottom:64px">
        <div class="section-pill">🤝 Radical Honesty</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3rem);color:${c.text};max-width:650px;margin:0 auto 20px;line-height:1.15">${honest.title}</h2>
        <p style="font-size:1.1rem;color:${c.textMid};max-width:600px;margin:0 auto;line-height:1.8;font-style:italic">"${honest.truth}"</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:24px;margin-bottom:56px">
        ${honest.requirements.map(r => `
          <div class="glass-card" style="padding:32px">
            <div style="font-size:2.4rem;margin-bottom:16px">${r.icon}</div>
            <div style="font-weight:700;font-size:1.05rem;color:${c.text};margin-bottom:10px;line-height:1.3">${r.title}</div>
            <div style="font-size:0.88rem;color:${c.textMid};line-height:1.7">${r.desc}</div>
          </div>`).join('')}
      </div>
      <div style="text-align:center;background:rgba(${c.accentRgb},0.06);border:1px solid rgba(${c.accentRgb},0.2);border-radius:20px;padding:32px 48px;backdrop-filter:blur(10px)">
        <p style="font-size:1.1rem;color:${c.text};line-height:1.7;font-weight:500">${honest.closer}</p>
      </div>
    </div>
  </section>`;

  const aboutSection = isPersonBrand ? `
  <!-- ABOUT -->
  <section style="background:${c.bg};padding:120px 24px;position:relative">
    <div style="position:absolute;inset:0;background:radial-gradient(circle at 80% 50%,rgba(${c.accentRgb},0.06) 0%,transparent 50%)"></div>
    <div style="max-width:900px;margin:0 auto;position:relative">
      <div style="text-align:center;margin-bottom:64px">
        <div class="section-pill">${content.about_label}</div>
      </div>
      <div class="glass-card" style="padding:48px;display:flex;align-items:center;gap:48px;flex-wrap:wrap;justify-content:center">
        <div style="flex-shrink:0;text-align:center">
          <div style="width:140px;height:140px;border-radius:50%;background:linear-gradient(135deg,rgba(${c.accentRgb},0.2),rgba(${c.accentRgb},0.05));display:flex;align-items:center;justify-content:center;font-size:3.2rem;font-weight:800;color:${c.accent};margin:0 auto 20px;border:2px solid rgba(${c.accentRgb},0.3)">${initials}</div>
          <div style="font-family:'Playfair Display',serif;font-size:1.3rem;font-weight:700;color:${c.text};margin-bottom:6px">${content.about_name}</div>
          <div style="font-size:0.85rem;color:${c.accent};margin-bottom:20px;line-height:1.4">${content.about_role_title}</div>
          <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap">
            ${(content.about_featured||[]).map(f=>`<span style="background:rgba(${c.accentRgb},0.1);border:1px solid rgba(${c.accentRgb},0.25);color:${c.accent};font-size:10px;font-weight:600;padding:4px 12px;border-radius:100px">${f}</span>`).join('')}
          </div>
        </div>
        <div style="flex:1;min-width:280px">
          <p style="font-size:0.95rem;color:${c.textMid};line-height:1.85;margin-bottom:28px">${content.about_bio_line1} ${content.about_bio_line2} ${content.about_bio_line3}</p>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${(content.about_credentials||[]).map(cr=>`
            <div style="display:flex;align-items:flex-start;gap:14px">
              <div style="width:24px;height:24px;border-radius:50%;background:rgba(${c.accentRgb},0.15);color:${c.accent};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0;margin-top:1px">✓</div>
              <span style="color:${c.text};font-size:0.9rem;line-height:1.5">${cr}</span>
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
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth}
    body{font-family:'DM Sans',sans-serif;background:${c.bg};color:${c.text};line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}
    .container{max-width:1100px;margin:0 auto;padding:0 24px}
    .btn-primary{display:inline-flex;align-items:center;gap:8px;background:${c.accent};color:${c.btnText};font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;padding:18px 40px;border-radius:100px;border:none;cursor:pointer;transition:all 0.3s;text-decoration:none;letter-spacing:0.01em;box-shadow:0 4px 20px rgba(${c.accentRgb},0.25)}
    .btn-primary:hover{transform:translateY(-3px);box-shadow:0 12px 40px rgba(${c.accentRgb},0.45)}
    .btn-outline{display:inline-flex;align-items:center;gap:8px;background:transparent;color:${c.accent};font-family:'DM Sans',sans-serif;font-size:0.92rem;font-weight:600;padding:14px 32px;border-radius:100px;border:1.5px solid rgba(${c.accentRgb},0.4);cursor:pointer;transition:all 0.3s;text-decoration:none;backdrop-filter:blur(4px)}
    .btn-outline:hover{background:rgba(${c.accentRgb},0.1);border-color:${c.accent}}
    .section-pill{display:inline-block;background:rgba(${c.accentRgb},0.08);border:1px solid rgba(${c.accentRgb},0.25);color:${c.accent};font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;padding:8px 22px;border-radius:100px;margin-bottom:28px;backdrop-filter:blur(8px)}
    .glass-card{background:${c.cardBg};border:1px solid ${c.border};border-radius:24px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);transition:transform 0.3s,box-shadow 0.3s,border-color 0.3s}
    .glass-card:hover{transform:translateY(-6px);box-shadow:0 20px 60px rgba(0,0,0,0.15);border-color:rgba(${c.accentRgb},0.3)}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    @media(max-width:768px){
      .grid-2,.grid-3{grid-template-columns:1fr}
      .container{padding:0 16px}
      .btn-primary{padding:16px 28px;font-size:0.92rem}
      section{padding:80px 0!important}
    }
  </style>
</head>
<body>

  <!-- NAV -->
  <nav style="position:sticky;top:0;z-index:100;background:${c.navBg};backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border-bottom:1px solid ${c.border};padding:16px 0">
    <div class="container" style="display:flex;align-items:center;justify-content:space-between">
      <div style="font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;color:${c.text}">${firstName}</div>
      <a href="${chatUrl}" class="btn-primary" style="padding:10px 26px;font-size:0.82rem">Let's Talk →</a>
    </div>
  </nav>

  <!-- HERO (ATTENTION) -->
  <section style="padding:140px 0 100px;background:${c.bg};position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(${c.accentRgb},0.12) 0%,transparent 65%)"></div>
    <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(${c.accentRgb},0.5),transparent)"></div>
    <div class="container" style="text-align:center;position:relative">
      <div class="section-pill">✦ ${offer}</div>
      <h1 style="font-family:'Playfair Display',serif;font-size:clamp(2.6rem,6vw,4.5rem);line-height:1.05;max-width:860px;margin:0 auto 28px;color:${c.text}">${content.hero_headline}</h1>
      <p style="font-size:1.15rem;color:${c.textMid};max-width:580px;margin:0 auto 48px;line-height:1.8">${content.hero_sub}</p>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:24px">
        <a href="${chatUrl}" class="btn-primary">${content.hero_cta}</a>
        <a href="#solution" class="btn-outline">See How It Works</a>
      </div>
      <p style="font-size:0.82rem;color:${c.textMid};opacity:0.6;margin-bottom:64px">${content.hero_trust || 'No pressure. Just a real conversation.'}</p>
      
      <div style="display:flex;align-items:center;justify-content:center;gap:48px;flex-wrap:wrap;padding:40px;background:${c.cardBg};border:1px solid ${c.border};border-radius:24px;backdrop-filter:blur(20px);max-width:700px;margin:0 auto">
        ${(content.hero_stats||[]).map((s, i, arr) => `
          <div style="text-align:center">
            <div style="font-family:'Playfair Display',serif;font-size:2.2rem;color:${c.accent};font-weight:700;line-height:1">${s.number}</div>
            <div style="font-size:0.78rem;color:${c.textMid};margin-top:8px;font-weight:500">${s.label}</div>
          </div>
          ${i < arr.length - 1 ? `<div style="width:1px;height:40px;background:${c.border}"></div>` : ''}
        `).join('')}
      </div>
    </div>
  </section>

  <!-- PAIN MIRROR (PROBLEM) -->
  <section style="padding:120px 0;background:${c.bg2};position:relative">
    <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(${c.accentRgb},0.2),transparent)"></div>
    <div class="container">
      <div style="text-align:center;margin-bottom:64px">
        <div class="section-pill">DOES THIS SOUND FAMILIAR?</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3.2rem);max-width:680px;margin:0 auto 18px;line-height:1.15">${content.pain_headline}</h2>
        <p style="color:${c.textMid};font-size:1.05rem;max-width:500px;margin:0 auto;line-height:1.8">${content.pain_intro}</p>
      </div>
      <div class="grid-3" style="margin-bottom:56px">
        ${(content.pain_bullets||[]).map(b=>`
        <div class="glass-card" style="padding:36px 28px;border-top:2px solid ${c.accent}">
          <div style="font-size:2.8rem;margin-bottom:20px">${b.emoji}</div>
          <div style="font-weight:700;font-size:1.05rem;color:${c.text};margin-bottom:12px;line-height:1.3">${b.bold}</div>
          <div style="font-size:0.88rem;color:${c.textMid};line-height:1.7">${b.detail}</div>
        </div>`).join('')}
      </div>
      <div style="text-align:center">
        <div style="display:inline-block;background:rgba(${c.accentRgb},0.05);border:1px solid rgba(${c.accentRgb},0.15);border-radius:20px;padding:24px 40px;max-width:650px;backdrop-filter:blur(10px)">
          <p style="font-size:1.1rem;color:${c.text};line-height:1.7;font-style:italic">"${content.pain_reality}"</p>
        </div>
      </div>
    </div>
  </section>

  <!-- COST OF PAIN (AGITATE) -->
  <section style="padding:120px 0;background:${c.bg3};position:relative">
    <div class="container">
      <div style="text-align:center;margin-bottom:64px">
        <div class="section-pill">THE REAL COST</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:clamp(1.8rem,3.5vw,2.8rem);max-width:650px;margin:0 auto 20px;line-height:1.15">${content.cost_headline}</h2>
        <p style="color:${c.textMid};font-size:1rem;max-width:560px;margin:0 auto;line-height:1.8">${content.cost_emotional}</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:16px;max-width:720px;margin:0 auto">
        ${(content.cost_items||[]).map((item,i)=>`
        <div class="glass-card" style="display:flex;align-items:center;gap:0;border-radius:20px;overflow:hidden;padding:0">
          <div style="background:rgba(${c.accentRgb},0.06);padding:24px 28px;min-width:260px;font-size:0.9rem;font-weight:600;color:${c.textMid};border-right:1px solid ${c.border}">${item.label}</div>
          <div style="padding:24px 28px;font-size:0.9rem;color:${c.text};line-height:1.6;flex:1">${item.impact}</div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- DREAM STATE (INTEREST + DESIRE) -->
  <section style="padding:120px 0;background:${c.bg};position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,rgba(${c.accentRgb},0.08) 0%,transparent 55%)"></div>
    <div class="container" style="position:relative">
      <div style="text-align:center;margin-bottom:64px">
        <div class="section-pill">YOUR NEW REALITY</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3.2rem);max-width:680px;margin:0 auto 20px;line-height:1.15">${content.dream_headline}</h2>
        <p style="color:${c.textMid};font-size:1.05rem;max-width:580px;margin:0 auto;line-height:1.8;font-style:italic">${content.dream_intro}</p>
      </div>
      <div class="grid-3" style="margin-bottom:56px">
        ${(content.dream_bullets||[]).map((b,i)=>`
        <div class="glass-card" style="padding:36px 28px;position:relative;border-left:2px solid ${c.accent}">
          <div style="font-family:'Playfair Display',serif;font-size:3.5rem;color:rgba(${c.accentRgb},0.15);font-weight:700;margin-bottom:8px;line-height:1;position:absolute;top:16px;right:24px">0${i+1}</div>
          <p style="font-size:0.95rem;color:${c.text};line-height:1.8;position:relative">${b}</p>
        </div>`).join('')}
      </div>
      <div style="text-align:center">
        <p style="font-size:1.1rem;color:${c.accent};font-weight:600;font-style:italic">${content.dream_closer}</p>
      </div>
    </div>
  </section>

  <!-- SOLUTION (HOW IT WORKS) -->
  <section id="solution" style="padding:120px 0;background:${c.bg2};position:relative">
    <div class="container">
      <div style="text-align:center;margin-bottom:64px">
        <div class="section-pill">${content.solution_label}</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3.2rem);max-width:740px;margin:0 auto 16px;line-height:1.15">${content.solution_title}</h2>
        <p style="color:${c.textMid};font-size:1.05rem;max-width:540px;margin:0 auto">${content.solution_sub}</p>
      </div>
      <div class="grid-3" style="margin-bottom:64px">
        ${(content.how_it_works||[]).map(s=>`
        <div class="glass-card" style="text-align:center;padding:40px 28px;border-bottom:2px solid ${c.accent}">
          <div style="font-family:'Playfair Display',serif;font-size:3.5rem;color:rgba(${c.accentRgb},0.2);font-weight:700;margin-bottom:12px;line-height:1">${s.step}</div>
          <div style="font-weight:700;font-size:1.1rem;color:${c.text};margin-bottom:12px">${s.title}</div>
          <div style="font-size:0.88rem;color:${c.textMid};line-height:1.7">${s.desc}</div>
        </div>`).join('')}
      </div>
      <div style="background:linear-gradient(135deg,rgba(${c.accentRgb},0.9),rgba(${c.accentRgb},0.6));border:1px solid rgba(${c.accentRgb},0.4);border-radius:28px;padding:56px 40px;text-align:center;max-width:580px;margin:0 auto;backdrop-filter:blur(20px);box-shadow:0 24px 80px rgba(${c.accentRgb},0.2)">
        <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${c.btnText};opacity:0.8;margin-bottom:12px">Investment</div>
        <div style="font-family:'Playfair Display',serif;font-size:3rem;font-weight:700;color:${c.btnText};margin-bottom:8px">${content.solution_price}</div>
        <div style="font-size:0.9rem;color:${c.btnText};opacity:0.8;margin-bottom:32px;line-height:1.5">${content.solution_price_context}</div>
        <a href="${chatUrl}" style="display:inline-block;background:${c.btnText};color:${c.accent};font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;padding:18px 44px;border-radius:100px;text-decoration:none;box-shadow:0 8px 32px rgba(0,0,0,0.2);transition:transform 0.2s">${content.solution_cta}</a>
      </div>
    </div>
  </section>

  ${honestSection}
  ${aboutSection}

  <!-- SOCIAL PROOF -->
  <section style="padding:120px 0;background:${c.bg2};position:relative">
    <div class="container">
      <div style="text-align:center;margin-bottom:64px">
        <div class="section-pill">WHAT CLIENTS SAY</div>
        <h2 style="font-family:'Playfair Display',serif;font-size:clamp(1.8rem,3.5vw,2.8rem)">Real results from real people</h2>
      </div>
      <div class="grid-3">
        ${(content.testimonials||[]).map(t=>`
        <div class="glass-card" style="display:flex;flex-direction:column;gap:20px;padding:32px 28px">
          <div style="color:${c.accent};font-size:1.1rem;letter-spacing:2px">★★★★★</div>
          <p style="font-size:0.92rem;color:${c.textMid};line-height:1.8;flex:1;font-style:italic">"${t.quote}"</p>
          <div style="display:flex;align-items:center;gap:14px;padding-top:20px;border-top:1px solid ${c.border}">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,rgba(${c.accentRgb},0.3),rgba(${c.accentRgb},0.1));display:flex;align-items:center;justify-content:center;font-weight:700;color:${c.accent};font-size:1rem;flex-shrink:0;border:1px solid rgba(${c.accentRgb},0.2)">${t.avatar_letter||t.name.charAt(0)}</div>
            <div>
              <div style="font-weight:700;font-size:0.9rem;color:${c.text}">${t.name}</div>
              <div style="font-size:0.75rem;color:${c.accent};margin-top:2px">${t.result}</div>
            </div>
          </div>
        </div>`).join('')}
      </div>
    </div>
  </section>

  <!-- FINAL CTA (ACTION) -->
  <section style="padding:120px 0;background:${c.bg};position:relative;overflow:hidden">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 0%,rgba(${c.accentRgb},0.05) 100%)"></div>
    <div class="container" style="text-align:center;position:relative">
      <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2.2rem,4.5vw,3.5rem);color:${c.text};max-width:700px;margin:0 auto 20px;line-height:1.1">${content.final_headline}</h2>
      <p style="font-size:1.05rem;color:${c.textMid};max-width:540px;margin:0 auto 48px;line-height:1.8">${content.final_sub}</p>
      <a href="${chatUrl}" class="btn-primary" style="font-size:1.1rem;padding:22px 56px">${content.final_cta}</a>
      <p style="margin-top:20px;font-size:0.82rem;color:${c.textMid};opacity:0.6">${content.final_note}</p>
    </div>
  </section>

  <!-- FOOTER -->
  <footer style="padding:36px 0;background:${c.bg3};border-top:1px solid ${c.border}">
    <div class="container" style="text-align:center">
      <div style="font-family:'Playfair Display',serif;font-size:0.95rem;color:${c.text};margin-bottom:6px">Maria Angelica Scott — System Architect</div>
      <div style="font-size:0.72rem;color:${c.textMid};opacity:0.5">© ${new Date().getFullYear()} · This is a personalized demo funnel. All content is generated based on your quiz answers.</div>
    </div>
  </footer>
</body>
</html>`;

  // ── STEP 3: Save to Supabase ──
  let savedLeadId = lead_id;
  try {
    const supabaseURL = new URL(process.env.SUPABASE_URL);
    if (lead_id) {
      await postJSON({
        hostname: supabaseURL.hostname,
        path: `/rest/v1/leads?id=eq.${lead_id}`,
        method: 'PATCH',
        headers: { 'Content-Type':'application/json','apikey':process.env.SUPABASE_ANON_KEY,'Authorization':`Bearer ${process.env.SUPABASE_ANON_KEY}`,'Prefer':'return=minimal' }
      }, {
        offer_name:offer, offer_price:price||null, ideal_client:client, offer_pain:pain, offer_transform:transform, design_vibe:vibe||null, demo_html:htmlContent, demo_generated_at:new Date().toISOString()
      });
    } else {
      // FALLBACK: Create a new lead if analyze.js failed (Reverted to original working setup)
      const inserted = await postJSON({
        hostname: supabaseURL.hostname,
        path: '/rest/v1/leads',
        method: 'POST',
        headers: { 'Content-Type':'application/json','apikey':process.env.SUPABASE_ANON_KEY,'Authorization':`Bearer ${process.env.SUPABASE_ANON_KEY}`,'Prefer':'return=representation' }
      }, {
        name, email, role: role || 'Not provided', goal: goal || 'Not provided', problem: problem || 'Not provided', offer_name:offer, offer_price:price||null, ideal_client:client, offer_pain:pain, offer_transform:transform, design_vibe:vibe||null, demo_html:htmlContent, demo_generated_at:new Date().toISOString(), created_at:new Date().toISOString()
      });
      if (Array.isArray(inserted) && inserted[0]?.id) savedLeadId = inserted[0].id;
    }
  } catch(err) {
    console.error('Supabase error:', err.message);
  }

  return res.status(200).json({
    demo_url: `/demo?id=${savedLeadId||'preview'}`,
    lead_id: savedLeadId
  });
};
