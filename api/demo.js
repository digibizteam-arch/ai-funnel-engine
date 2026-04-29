const https = require('https');

// ── VIBE COLOR PALETTES ──
const VIBES = {
 'bold-premium': { bg:'#0D0D0D', bg2:'#1A1A1A', bg3:'#111111', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#C9A84C', accentDark:'#A07830', btnText:'#0D0D0D', border:'rgba(201,168,76,0.25)', cardBg:'#1E1E1E', navBg:'rgba(13,13,13,0.95)' },
 'warm-trustworthy': { bg:'#1B2B4B', bg2:'#243761', bg3:'#1A2740', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#E8C87A', accentDark:'#C4A055', btnText:'#1B2B4B', border:'rgba(232,200,122,0.25)', cardBg:'#1F3258', navBg:'rgba(27,43,75,0.95)' },
 'modern-edgy': { bg:'#0A0A0A', bg2:'#111111', bg3:'#080808', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#00E5FF', accentDark:'#00B8CC', btnText:'#0A0A0A', border:'rgba(0,229,255,0.2)', cardBg:'#161616', navBg:'rgba(10,10,10,0.95)' },
 'fresh-approachable': { bg:'#FFFFFF', bg2:'#F0FAF5', bg3:'#E8F5EE', text:'#1A1A1A', textMid:'#5A7A6A', accent:'#2D6A4F', accentDark:'#1E4D38', btnText:'#FFFFFF', border:'rgba(45,106,79,0.2)', cardBg:'#FFFFFF', navBg:'rgba(255,255,255,0.95)' },
 'bold-energetic': { bg:'#1A1A2E', bg2:'#16213E', bg3:'#0F3460', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#FF6B35', accentDark:'#CC5520', btnText:'#FFFFFF', border:'rgba(255,107,53,0.25)', cardBg:'#1E2440', navBg:'rgba(26,26,46,0.95)' },
 'clean-creative': { bg:'#1E1E2E', bg2:'#252538', bg3:'#1A1A2A', text:'#FFFFFF', textMid:'rgba(255,255,255,0.6)', accent:'#6C5CE7', accentDark:'#5048C4', btnText:'#FFFFFF', border:'rgba(108,92,231,0.25)', cardBg:'#262638', navBg:'rgba(30,30,46,0.95)' },
 'corporate-authority': { bg:'#1E3A5F', bg2:'#24476E', bg3:'#1A3255', text:'#FFFFFF', textMid:'rgba(255,255,255,0.65)', accent:'#A8C0D6', accentDark:'#7A9AB8', btnText:'#1E3A5F', border:'rgba(168,192,214,0.25)', cardBg:'#243F6A', navBg:'rgba(30,58,95,0.95)' },
 'elegant-feminine': { bg:'#FDF6F0', bg2:'#FEF0E8', bg3:'#FCE8DC', text:'#2D1B1B', textMid:'#8B5E5E', accent:'#C4847A', accentDark:'#A0605A', btnText:'#FFFFFF', border:'rgba(196,132,122,0.25)', cardBg:'#FFFFFF', navBg:'rgba(253,246,240,0.95)' },
};

// ── ROLE DETECTION ──
function detectRole(role) {
 const r = (role || '').toLowerCase();
 if (r.includes('coach') || r.includes('trainer')) return 'coach';
 if (r.includes('financial') || r.includes('advisor') || r.includes('insurance') || r.includes('wealth')) return 'advisor';
 if (r.includes('agency') || r.includes('freelancer') || r.includes('marketing')) return 'agency';
 if (r.includes('local') || r.includes('clinic') || r.includes('salon') || r.includes('restaurant') || r.includes('trades')) return 'local';
 if (r.includes('sales professional') || r.includes('real estate') || r.includes('saas') || r.includes('b2b')) return 'sales';
 if (r.includes('online seller') || r.includes('ecommerce') || r.includes('digital product') || r.includes('dropshipping')) return 'seller';
 if (r.includes('consultant') || r.includes('legal') || r.includes('hr') || r.includes('strategy') || r.includes('startup')) return 'consultant';
 return 'default';
}

// ── ROLE-BASED CONTENT PROMPT ──
function buildContentPrompt(roleType, data) {
 const { name, role, offer, price, client, pain, transform, goal, problem } = data;
 const frameworks = {
 coach: `You are writing for a COACH or TRAINER. Framework: Authority + Transformation. Psychology: Speak to identity shift. The reader wants to BECOME someone. Use "you deserve", "you were meant for", "it's not your fault". Lead with the gap between who they are and who they could be. Make them feel understood first, then inspired. Headline formula: "[Pain they feel] — [Promise of who they become]" Testimonials must include: specific transformation result + emotional before/after.`,
 advisor: `You are writing for a FINANCIAL ADVISOR or INSURANCE AGENT. Framework: Trust + Protection. Psychology: Speak to fear of loss, family security, and missed opportunity. Use calm authority. Never hype. Lead with what's at risk if they don't act. Use words like "protect", "secure", "peace of mind", "your family deserves". Headline formula: "[What they risk losing] — [How you protect it]" Testimonials must include: specific financial result + family/security angle.`,
 agency: `You are writing for an AGENCY or FREELANCER. Framework: Results + Speed. Psychology: Speak to ROI and done-for-you appeal. Clients are tired and busy. They want speed and certainty. Use numbers, timelines, before/after metrics. Lead with the cost of NOT having a system. Headline formula: "[Time wasted / money lost] — [Specific result in X days]" Testimonials must include: specific metric improvement + time saved.`,
 local: `You are writing for a LOCAL BUSINESS OWNER. Framework: Community + Social Proof. Psychology: Local trust is everything. Use neighborhood language. People buy from people they know. Emphasize "your area", "clients like you", "trusted by [type of client] in [region]". Make it feel familiar and personal. Headline formula: "[Local frustration] — [Local solution with trust signal]" Testimonials must include: local context + word-of-mouth feel.`,
 sales: `You are writing for a SALES PROFESSIONAL. Framework: Pipeline + Income. Psychology: Speak to their income ceiling and pipeline anxiety. They track numbers. Use pipeline language: "qualified leads", "closing rate", "monthly target". Make it feel like a system upgrade, not a marketing tool. Headline formula: "[Pipeline problem] — [Income/conversion outcome]" Testimonials must include: pipeline metric + income improvement.`,
 seller: `You are writing for an ONLINE SELLER. Framework: Desire + Aspiration. Psychology: Speak to lifestyle and freedom. Readers want to escape the grind. Use aspirational language: "wake up to orders", "work from anywhere", "your store works while you sleep". Lead with the dream, then the path. Headline formula: "[Current hustle struggle] — [Freedom/lifestyle outcome]" Testimonials must include: income result + lifestyle freedom element.`,
 consultant: `You are writing for a CONSULTANT or STRATEGIC ADVISOR. Framework: Credibility + Process. Psychology: Speak to expertise and structured thinking. Clients want someone who has done this before and has a system. Use process language: "proven framework", "step-by-step", "based on X cases". Lead with authority, then clarity. Headline formula: "[Complexity/confusion they face] — [Your structured solution]" Testimonials must include: business outcome + clarity/confidence gained.`,
 default: `You are writing for a BUSINESS OWNER. Framework: Problem-Solution-Result. Psychology: Speak to frustration with the current situation and desire for a clear path forward. Use empathetic, direct language. Lead with their specific pain, then paint the outcome. Headline formula: "[Specific pain] — [Specific outcome]" Testimonials must include: specific result + emotional relief.`
 };

 return `You are an expert conversion copywriter. Generate ONLY a JSON object with funnel copy. No markdown, no explanation, raw JSON only.
ROLE FRAMEWORK: ${frameworks[roleType]}
CONTEXT:
Name: ${name || 'The Expert'}
Role: ${role}
Offer: ${offer}
Price: ${price || 'Contact for pricing'}
Ideal client: ${client}
Pain solved: ${pain}
Transformation: ${transform}
Their goal: ${goal || ''}
Their problem: ${problem || ''}

Generate this EXACT JSON — all fields required:
{
 "hero_eyebrow": "Short attention-grabbing label above headline (5-7 words, role-specific)",
 "hero_headline": "Emotionally charged headline using the role framework formula (max 14 words)",
 "hero_subheadline": "2 sentences expanding the transformation promise. Specific. No fluff.",
 "hero_cta": "Action button text (4-6 words, role-specific action verb)",
 "hero_trust": "3 short trust signals separated by · e.g. 500+ Clients Helped · 5-Star Results · No Lock-in Contracts",
 "pain_eyebrow": "DOES THIS SOUND FAMILIAR?",
 "pain_headline": "Empathetic section heading mirroring their daily frustration (10-14 words)",
 "pain_intro": "1 sentence that makes them feel deeply understood. Use 'you'.",
 "pain_bullets": [
 {"emoji": "😩", "bold": "Short painful truth (4-6 words)", "detail": "One specific elaboration sentence"},
 {"emoji": "😤", "bold": "Short painful truth (4-6 words)", "detail": "One specific elaboration sentence"},
 {"emoji": "🔄", "bold": "Short painful truth (4-6 words)", "detail": "One specific elaboration sentence"},
 {"emoji": "💸", "bold": "Short painful truth (4-6 words)", "detail": "One specific elaboration sentence"}
 ],
 "pain_closer": "Empathy statement — 1 powerful sentence. Not your fault. You just need the right system.",
 "gap_left_title": "WHERE YOU ARE NOW",
 "gap_right_title": "WHERE YOU COULD BE",
 "gap_left": ["Specific painful current state 1", "Specific painful current state 2", "Specific painful current state 3"],
 "gap_right": ["Specific dream outcome 1 with number or detail", "Specific dream outcome 2 with number or detail", "Specific dream outcome 3 with number or detail"],
 "gap_bridge": "One powerful bridge sentence. The only difference is a system built around you.",
 "stats": [
 {"number": "X+", "label": "Role-relevant stat e.g. Clients Transformed"},
 {"number": "X%", "label": "Role-relevant stat e.g. Average Conversion Lift"},
 {"number": "Xd", "label": "Role-relevant stat e.g. Average Time to First Result"}
 ],
 "offer_eyebrow": "INTRODUCING",
 "offer_headline": "Compelling offer name — better than raw text, role-specific (6-10 words)",
 "offer_sub": "1 sentence: what it is, who it is for, what outcome it delivers.",
 "offer_benefits": [
 {"icon": "✓", "title": "Benefit title (transformation-focused)", "desc": "One sentence outcome, not feature"},
 {"icon": "✓", "title": "Benefit title (transformation-focused)", "desc": "One sentence outcome, not feature"},
 {"icon": "✓", "title": "Benefit title (transformation-focused)", "desc": "One sentence outcome, not feature"},
 {"icon": "✓", "title": "Benefit title (transformation-focused)", "desc": "One sentence outcome, not feature"}
 ],
 "offer_price_display": "Price formatted nicely e.g. Starting at ₱15,000",
 "offer_price_context": "Short value framing — what it's worth vs what it costs",
 "offer_cta": "Button text specific to role e.g. Start Building My System →",
 "process_title": "How It Works",
 "process_steps": [
 {"num": "01", "title": "Step title", "desc": "One sentence what happens in this step"},
 {"num": "02", "title": "Step title", "desc": "One sentence what happens in this step"},
 {"num": "03", "title": "Step title", "desc": "One sentence what happens in this step"}
 ],
 "about_eyebrow": "YOUR GUIDE",
 "about_name": "${name || 'Your Expert'}",
 "about_role_title": "Compelling title based on role: ${role} and offer: ${offer}",
 "about_bio": "3 warm, authoritative sentences in first person. Specific to their niche. Reference client type: ${client}. End with mission statement.",
 "about_credentials": [
 "Specific credential or achievement for this niche",
 "Specific credential or achievement for this niche",
 "Specific credential or achievement for this niche"
 ],
 "testimonials": [
 {"quote": "Specific result with number + emotional transformation. Role-relevant. Reference: ${transform}", "name": "First name L.", "role": "Their specific job title or situation", "result": "Key metric result e.g. 3x leads in 30 days", "initial": "A"},
 {"quote": "Specific result with number + before/after moment. Different angle from first.", "name": "First name L.", "role": "Their specific job title or situation", "result": "Key metric result", "initial": "B"},
 {"quote": "Specific result focusing on time saved or ease. Emotional closer.", "name": "First name L.", "role": "Their specific job title or situation", "result": "Key metric result", "initial": "C"}
 ],
 "faq": [
 {"q": "Most common objection as a question — role-specific", "a": "Warm, specific answer that reframes the concern (2-3 sentences)"},
 {"q": "Second most common objection — role-specific", "a": "Warm, specific answer (2-3 sentences)"},
 {"q": "Pricing or timeline question — role-specific", "a": "Warm, specific answer (2-3 sentences)"}
 ],
 "final_headline": "Urgency-driven closing headline tied to transformation (10-14 words)",
 "final_sub": "2 sentences. First: what they get. Second: directly address their main obstacle.",
 "final_cta": "Let's Talk →",
 "footer_tagline": "Short brand tagline specific to their niche"
}`;
}

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
 req.write(JSON.stringify(body));
 req.end();
 });
}

function buildHTML(c, roleType, colors, chatUrl, name, showAbout) {
 const col = colors;
 const initials = (name||'MA').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
 
 const aboutSection = showAbout ? `
 <section style="padding:80px 0;background:${col.bg2}">
 <div style="max-width:1060px;margin:0 auto;padding:0 24px">
 <div style="text-align:center;margin-bottom:52px">
 <div style="display:inline-block;background:${col.accent}18;border:1px solid ${col.accent}44;color:${col.accent};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;padding:6px 18px;border-radius:100px;margin-bottom:16px">${c.about_eyebrow||'YOUR GUIDE'}</div>
 </div>
 <div style="display:flex;align-items:center;gap:56px;flex-wrap:wrap;justify-content:center">
 <div style="flex-shrink:0;text-align:center">
 <div style="width:160px;height:160px;border-radius:50%;background:linear-gradient(135deg,${col.accent},${col.accentDark});display:flex;align-items:center;justify-content:center;font-size:3.2rem;font-weight:700;color:${col.btnText};margin:0 auto 20px;border:4px solid ${col.accent}33;box-shadow:0 0 40px ${col.accent}22">${initials}</div>
 <div style="font-weight:700;font-size:1.2rem;color:${col.text};margin-bottom:4px">${c.about_name}</div>
 <div style="font-size:0.85rem;color:${col.accent};margin-bottom:16px">${c.about_role_title||''}</div>
 </div>
 <div style="flex:1;min-width:280px;max-width:560px">
 <p style="font-size:1.05rem;color:${col.textMid};line-height:1.85;margin-bottom:28px">${c.about_bio||''}</p>
 <div style="display:flex;flex-direction:column;gap:12px">
 ${(c.about_credentials||[]).map(cr=>`<div style="display:flex;align-items:flex-start;gap:12px"><div style="width:22px;height:22px;border-radius:50%;background:${col.accent};color:${col.btnText};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px">✓</div><span style="color:${col.text};font-size:0.93rem;line-height:1.55">${cr}</span></div>`).join('')}
 </div>
 </div>
 </div>
 </div>
 </section>` : '';
 
 return `<!DOCTYPE html>
<html lang="en">
<head>
 <meta charset="UTF-8"/>
 <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
 <title>${c.hero_headline||'Your Funnel'}</title>
 <link rel="preconnect" href="https://fonts.googleapis.com"/>
 <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
 <style>
 *{box-sizing:border-box;margin:0;padding:0} html{scroll-behavior:smooth} body{font-family:'DM Sans',sans-serif;background:${col.bg};color:${col.text};line-height:1.6;overflow-x:hidden;padding-bottom:80px} a{color:inherit;text-decoration:none} .container{max-width:1060px;margin:0 auto;padding:0 24px} .btn-primary{display:inline-block;background:${col.accent};color:${col.btnText};font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;padding:17px 40px;border-radius:100px;border:none;cursor:pointer;transition:all 0.2s;text-decoration:none;letter-spacing:0.01em} .btn-primary:hover{background:${col.accentDark};transform:translateY(-2px);box-shadow:0 12px 32px ${col.accent}44} .eyebrow{display:inline-block;background:${col.accent}18;border:1px solid ${col.accent}44;color:${col.accent};font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;padding:6px 18px;border-radius:100px;margin-bottom:20px} .section-title{font-family:'Playfair Display',serif;font-size:clamp(1.8rem,3.5vw,2.8rem);line-height:1.2;margin-bottom:14px} @media(max-width:640px){ .container{padding:0 16px} section{padding:56px 0!important} .grid-2{grid-template-columns:1fr!important} .grid-3{grid-template-columns:1fr!important} .grid-4{grid-template-columns:1fr 1fr!important} .hero-btns{flex-direction:column;align-items:center} }
 /* UNMISSABLE FLOATING CTA IN GENERATED HTML */
 .floating-cta-generated{position:fixed;bottom:0;left:0;right:0;background:${col.navBg};backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-top:1px solid ${col.border};padding:14px 24px;z-index:9999;display:flex;align-items:center;justify-content:center;box-shadow:0 -10px 40px rgba(0,0,0,0.3)} .floating-cta-btn{background:${col.accent};color:${col.btnText};font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;padding:18px 36px;border-radius:100px;text-decoration:none;display:inline-block;text-align:center;width:100%;max-width:500px;box-shadow:0 8px 24px ${col.accent}66;transition:transform 0.2s} .floating-cta-btn:hover{transform:translateY(-2px)}
 </style>
</head>
<body>
 <!-- NAV -->
 <nav style="position:sticky;top:0;z-index:1000;background:${col.navBg};backdrop-filter:blur(14px);border-bottom:1px solid ${col.border};padding:14px 0">
 <div class="container" style="display:flex;align-items:center;justify-content:space-between">
 <div style="font-family:'Playfair Display',serif;font-size:1.05rem;font-weight:700;color:${col.text}">${name||'Expert'}</div>
 <a href="${chatUrl}" class="btn-primary" style="padding:10px 24px;font-size:0.85rem">Let's Talk →</a>
 </div>
 </nav>

 <!-- HERO -->
 <section style="padding:110px 0 90px;background:${col.bg};position:relative;overflow:hidden">
 <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 65% 0%,${col.accent}15 0%,transparent 65%);pointer-events:none"></div>
 <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(to right,transparent,${col.accent}44,transparent)"></div>
 <div class="container" style="text-align:center;position:relative">
 <div class="eyebrow">${c.hero_eyebrow||'✦ '+offer}</div>
 <h1 style="font-family:'Playfair Display',serif;font-size:clamp(2.4rem,5.5vw,4rem);line-height:1.08;max-width:860px;margin:0 auto 22px;color:${col.text}">${c.hero_headline||''}</h1>
 <p style="font-size:1.12rem;color:${col.textMid};max-width:580px;margin:0 auto 44px;line-height:1.72">${c.hero_subheadline||''}</p>
 <div class="hero-btns" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-bottom:32px">
 <a href="${chatUrl}" class="btn-primary">${c.hero_cta||'Get Started →'}</a>
 <a href="#offer" style="display:inline-flex;align-items:center;gap:8px;color:${col.textMid};font-size:0.92rem;padding:17px 24px;border-radius:100px;border:1.5px solid ${col.border};transition:all 0.2s" onmouseover="this.style.borderColor='${col.accent}'" onmouseout="this.style.borderColor='${col.border}'">See How It Works ↓</a>
 </div>
 <div style="display:flex;align-items:center;justify-content:center;gap:0;flex-wrap:wrap">
 ${(c.hero_trust||'Proven Framework · Real Results · No Lock-in').split('·').map((t,i,arr)=>`<span style="font-size:0.8rem;color:${col.textMid};opacity:0.7;padding:0 16px;${i<arr.length-1?'border-right:1px solid '+col.border:''}">${t.trim()}</span>`).join('')}
 </div>
 </div>
 </section>

 <!-- PAIN AMPLIFIER -->
 <section style="padding:80px 0;background:${col.bg2}">
 <div class="container">
 <div style="text-align:center;margin-bottom:52px">
 <div class="eyebrow">${c.pain_eyebrow||'DOES THIS SOUND FAMILIAR?'}</div>
 <h2 class="section-title" style="max-width:640px;margin:0 auto 14px">${c.pain_headline||''}</h2>
 <p style="color:${col.textMid};font-size:1rem;max-width:500px;margin:0 auto">${c.pain_intro||''}</p>
 </div>
 <div class="grid-4" style="display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:44px">
 ${(c.pain_bullets||[]).map(b=>`<div style="background:${col.cardBg};border:1px solid ${col.border};border-top:3px solid ${col.accent};border-radius:14px;padding:24px 20px"><div style="font-size:2rem;margin-bottom:14px">${b.emoji}</div><div style="font-weight:700;font-size:0.95rem;color:${col.text};margin-bottom:8px;line-height:1.3">${b.bold}</div><div style="font-size:0.83rem;color:${col.textMid};line-height:1.6">${b.detail}</div></div>`).join('')}
 </div>
 <div style="text-align:center">
 <div style="display:inline-block;background:${col.accent}12;border:1px solid ${col.accent}33;border-radius:14px;padding:20px 36px;font-size:1.02rem;font-style:italic;color:${col.text};max-width:620px">"${c.pain_closer||''}"</div>
 </div>
 </div>
 </section>

 <!-- THE GAP -->
 <section style="padding:80px 0;background:${col.bg3}">
 <div class="container">
 <div style="text-align:center;margin-bottom:48px"><div class="eyebrow">THE TURNING POINT</div><h2 class="section-title">Two paths. One decision.</h2></div>
 <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:0;border-radius:20px;overflow:hidden;border:1px solid ${col.border}">
 <div style="padding:40px 32px;background:${col.cardBg}"><div style="font-size:0.72rem;font-weight:700;letter-spacing:0.15em;color:${col.textMid};margin-bottom:24px;text-transform:uppercase">${c.gap_left_title||'WHERE YOU ARE NOW'}</div><div style="display:flex;flex-direction:column;gap:16px">${(c.gap_left||[]).map(b=>`<div style="display:flex;align-items:flex-start;gap:12px"><span style="color:#ef4444;flex-shrink:0;font-weight:700;margin-top:1px;font-size:1rem">✗</span><span style="color:${col.textMid};font-size:0.92rem;line-height:1.55">${b}</span></div>`).join('')}</div></div>
 <div style="padding:40px 32px;background:${col.accent}12;border-left:3px solid ${col.accent}"><div style="font-size:0.72rem;font-weight:700;letter-spacing:0.15em;color:${col.accent};margin-bottom:24px;text-transform:uppercase">${c.gap_right_title||'WHERE YOU COULD BE'}</div><div style="display:flex;flex-direction:column;gap:16px">${(c.gap_right||[]).map(b=>`<div style="display:flex;align-items:flex-start;gap:12px"><span style="color:${col.accent};flex-shrink:0;font-weight:700;margin-top:1px;font-size:1rem">✓</span><span style="color:${col.text};font-size:0.92rem;line-height:1.55;font-weight:500">${b}</span></div>`).join('')}</div></div>
 </div>
 <div style="text-align:center;margin-top:32px"><p style="font-size:1.05rem;color:${col.textMid};font-style:italic">${c.gap_bridge||''}</p></div>
 </div>
 </section>

 <!-- STATS BAR -->
 <section style="padding:56px 0;background:${col.accent};overflow:hidden">
 <div class="container">
 <div class="grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;text-align:center">
 ${(c.stats||[]).map((s,i,arr)=>`<div style="padding:24px;${i<arr.length-1?'border-right:1px solid '+col.btnText+'33':''}"><div style="font-family:'Playfair Display',serif;font-size:2.8rem;font-weight:700;color:${col.btnText};line-height:1">${s.number}</div><div style="font-size:0.82rem;color:${col.btnText};opacity:0.75;margin-top:8px;font-weight:500">${s.label}</div></div>`).join('')}
 </div>
 </div>
 </section>

 <!-- OFFER -->
 <section id="offer" style="padding:90px 0;background:${col.bg2}">
 <div class="container">
 <div style="text-align:center;margin-bottom:52px"><div class="eyebrow">${c.offer_eyebrow||'INTRODUCING'}</div><h2 class="section-title" style="max-width:720px;margin:0 auto 14px">${c.offer_headline||''}</h2><p style="color:${col.textMid};font-size:1rem;max-width:540px;margin:0 auto">${c.offer_sub||''}</p></div>
 <div class="grid-2" style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:44px">
 ${(c.offer_benefits||[]).map(b=>`<div style="background:${col.cardBg};border:1px solid ${col.border};border-radius:16px;padding:26px;display:flex;align-items:flex-start;gap:16px;transition:transform 0.2s" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'"><div style="width:38px;height:38px;border-radius:50%;background:${col.accent};color:${col.btnText};display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;flex-shrink:0">${b.icon}</div><div><div style="font-weight:700;font-size:0.97rem;color:${col.text};margin-bottom:6px">${b.title}</div><div style="font-size:0.85rem;color:${col.textMid};line-height:1.6">${b.desc}</div></div></div>`).join('')}
 </div>
 <div style="background:linear-gradient(135deg,${col.accent},${col.accentDark});border-radius:20px;padding:48px;text-align:center;max-width:520px;margin:0 auto;box-shadow:0 20px 60px ${col.accent}33"><div style="font-size:0.78rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${col.btnText};opacity:0.8;margin-bottom:12px">Investment</div><div style="font-family:'Playfair Display',serif;font-size:3rem;font-weight:700;color:${col.btnText};margin-bottom:8px;line-height:1">${c.offer_price_display||'Contact for Pricing'}</div><div style="font-size:0.88rem;color:${col.btnText};opacity:0.72;margin-bottom:32px;line-height:1.5">${c.offer_price_context||''}</div><a href="${chatUrl}" style="display:inline-block;background:${col.btnText};color:${col.accent};font-family:'DM Sans',sans-serif;font-size:1rem;font-weight:700;padding:16px 40px;border-radius:100px;text-decoration:none;transition:all 0.2s" onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'">${c.offer_cta||'Get Started →'}</a></div>
 </div>
 </section>

 <!-- HOW IT WORKS -->
 <section style="padding:80px 0;background:${col.bg}">
 <div class="container">
 <div style="text-align:center;margin-bottom:52px"><div class="eyebrow">THE PROCESS</div><h2 class="section-title">${c.process_title||'How It Works'}</h2></div>
 <div class="grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;position:relative">
 ${(c.process_steps||[]).map((s,i,arr)=>`<div style="text-align:center;padding:32px 24px;position:relative"><div style="width:56px;height:56px;border-radius:50%;background:${col.accent};color:${col.btnText};display:flex;align-items:center;justify-content:center;font-family:'Playfair Display',serif;font-size:1.2rem;font-weight:700;margin:0 auto 20px">${s.num}</div><div style="font-weight:700;font-size:1rem;color:${col.text};margin-bottom:10px">${s.title}</div><div style="font-size:0.85rem;color:${col.textMid};line-height:1.65">${s.desc}</div></div>`).join('')}
 </div>
 </div>
 </section>

 ${aboutSection}

 <!-- TESTIMONIALS -->
 <section style="padding:80px 0;background:${col.bg2}">
 <div class="container">
 <div style="text-align:center;margin-bottom:52px"><div class="eyebrow">WHAT CLIENTS ARE SAYING</div><h2 class="section-title">Real results from real people</h2></div>
 <div class="grid-3" style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px">
 ${(c.testimonials||[]).map(t=>`<div style="background:${col.cardBg};border:1px solid ${col.border};border-radius:18px;padding:28px;display:flex;flex-direction:column;gap:18px"><div style="color:${col.accent};font-size:1rem;letter-spacing:2px">★★★★★</div><p style="font-size:0.9rem;color:${col.textMid};line-height:1.75;flex:1;font-style:italic">"${t.quote}"</p><div style="background:${col.accent}15;border-radius:8px;padding:8px 12px;font-size:0.78rem;font-weight:600;color:${col.accent}">${t.result}</div><div style="display:flex;align-items:center;gap:12px;padding-top:14px;border-top:1px solid ${col.border}"><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,${col.accent},${col.accentDark});display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;color:${col.btnText};flex-shrink:0">${t.initial||t.name.charAt(0)}</div><div><div style="font-weight:600;font-size:0.88rem;color:${col.text}">${t.name}</div><div style="font-size:0.75rem;color:${col.textMid}">${t.role}</div></div></div></div>`).join('')}
 </div>
 </div>
 </section>

 <!-- FAQ -->
 <section style="padding:80px 0;background:${col.bg}">
 <div class="container" style="max-width:720px">
 <div style="text-align:center;margin-bottom:48px"><div class="eyebrow">COMMON QUESTIONS</div><h2 class="section-title">Got questions? We've got answers.</h2></div>
 <div style="display:flex;flex-direction:column;gap:14px">
 ${(c.faq||[]).map(f=>`<div style="background:${col.cardBg};border:1px solid ${col.border};border-radius:14px;padding:24px 28px"><div style="font-weight:700;font-size:0.97rem;color:${col.text};margin-bottom:10px">Q: ${f.q}</div><div style="font-size:0.88rem;color:${col.textMid};line-height:1.7">${f.a}</div></div>`).join('')}
 </div>
 </div>
 </section>

 <!-- FINAL CTA -->
 <section style="padding:90px 0 120px;background:${col.accent};position:relative;overflow:hidden">
 <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,rgba(255,255,255,0.1) 0%,transparent 70%);pointer-events:none"></div>
 <div class="container" style="text-align:center;position:relative">
 <h2 style="font-family:'Playfair Display',serif;font-size:clamp(2rem,4vw,3.2rem);color:${col.btnText};max-width:680px;margin:0 auto 18px;line-height:1.15">${c.final_headline||''}</h2>
 <p style="font-size:1.02rem;color:${col.btnText};opacity:0.78;max-width:520px;margin:0 auto 40px;line-height:1.72">${c.final_sub||''}</p>
 <a href="${chatUrl}" style="display:inline-block;background:${col.btnText};color:${col.accent};font-family:'DM Sans',sans-serif;font-size:1.05rem;font-weight:700;padding:19px 48px;border-radius:100px;text-decoration:none;transition:all 0.2s;box-shadow:0 8px 32px rgba(0,0,0,0.2)" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">${c.final_cta||"Let's Talk →"}</a>
 <p style="margin-top:18px;font-size:0.78rem;color:${col.btnText};opacity:0.55">This is a conversation, not a sales pitch. No pressure, ever.</p>
 </div>
 </section>

 <!-- FOOTER -->
 <footer style="padding:36px 0;background:${col.bg3};border-top:1px solid ${col.border}">
 <div class="container" style="text-align:center">
 <div style="font-family:'Playfair Display',serif;font-size:1rem;color:${col.text};margin-bottom:6px">Maria Angelica Scott — System Architect</div>
 <div style="font-size:0.8rem;color:${col.textMid};margin-bottom:16px">${c.footer_tagline||'Helping businesses build systems that attract, convert, and close — on autopilot.'}</div>
 <div style="font-size:0.7rem;color:${col.textMid};opacity:0.45">© ${new Date().getFullYear()} · This is a personalized demo funnel generated based on your quiz answers.</div>
 </div>
 </footer>

 <!-- UNMISSABLE FLOATING CTA BAR -->
 <div class="floating-cta-generated">
 <a href="${chatUrl}" class="floating-cta-btn">I Want This For My Business →</a>
 </div>

</body>
</html>`;
}

module.exports = async function handler(req, res) {
 res.setHeader('Access-Control-Allow-Origin', '*');
 res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
 res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 if (req.method === 'OPTIONS') return res.status(200).end();
 if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

 const { lead_id, name, email, role, goal, problem, offer, price, client, pain, transform, vibe } = req.body;
 if (!offer || !client || !pain || !transform) return res.status(400).json({ error: 'Missing required fields' });

 const colors = VIBES[vibe] || VIBES['bold-premium'];
 const roleType = detectRole(role);
 const COACH_ROLES = ['coach','advisor','consultant','sales'];
 const showAbout = COACH_ROLES.includes(roleType);
 const chatUrl = `/chat?name=${encodeURIComponent(name||'')}&email=${encodeURIComponent(email||'')}${lead_id?'&id='+lead_id:''}`;

 // ── Step 1: Get role-specific AI content ──
 let content;
 try {
 const prompt = buildContentPrompt(roleType, { name, role, offer, price, client, pain, transform, goal, problem });
 const aiRes = await postJSON({ hostname: 'api.openai.com', path: '/v1/chat/completions', method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` } }, { model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }], temperature: 0.8, max_tokens: 2500 });
 if (aiRes.error) return res.status(500).json({ error: 'OpenAI: ' + aiRes.error.message });
 const raw = aiRes.choices?.[0]?.message?.content?.trim().replace(/^```json\n?/,'').replace(/^```\n?/,'').replace(/```$/,'').trim();
 content = JSON.parse(raw);
 } catch(err) {
 console.error('AI content error:', err.message);
 return res.status(500).json({ error: 'Content generation failed: ' + err.message });
 }

 // ── Step 2: Build HTML from template ──
 const htmlContent = buildHTML(content, roleType, colors, chatUrl, name, showAbout);

 // ── Step 3: Save to Supabase (Your existing exact logic, untouched) ──
 let savedLeadId = lead_id;
 try {
 const supabaseURL = new URL(process.env.SUPABASE_URL);
 if (lead_id) {
 await postJSON({ hostname: supabaseURL.hostname, path: `/rest/v1/leads?id=eq.${lead_id}`, method: 'PATCH', headers: { 'Content-Type':'application/json','apikey':process.env.SUPABASE_ANON_KEY,'Authorization':`Bearer ${process.env.SUPABASE_ANON_KEY}`,'Prefer':'return=minimal' } }, { offer_name:offer, offer_price:price||null, ideal_client:client, offer_pain:pain, offer_transform:transform, design_vibe:vibe||null, demo_html:htmlContent, demo_generated_at:new Date().toISOString() });
 } else {
 const inserted = await postJSON({ hostname: supabaseURL.hostname, path: '/rest/v1/leads', method: 'POST', headers: { 'Content-Type':'application/json','apikey':process.env.SUPABASE_ANON_KEY,'Authorization':`Bearer ${process.env.SUPABASE_ANON_KEY}`,'Prefer':'return=representation' } }, { name, email, role: role || 'Not provided', goal: goal || 'Not provided', problem: problem || 'Not provided', offer_name:offer, offer_price:price||null, ideal_client:client, offer_pain:pain, offer_transform:transform, design_vibe:vibe||null, demo_html:htmlContent, demo_generated_at:new Date().toISOString(), created_at:new Date().toISOString() });
 if (Array.isArray(inserted) && inserted[0]?.id) savedLeadId = inserted[0].id;
 }
 } catch(err) {
 console.error('Supabase error:', err.message);
 }

 return res.status(200).json({ demo_url: `/demo?id=${savedLeadId||'preview'}`, lead_id: savedLeadId });
};
