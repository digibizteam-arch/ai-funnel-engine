'use strict';

const https = require('https');

// ── ADVISOR PROFILE PAGE GENERATOR ──────────────────────────────────────────
// Same contract as before: POST /api/demo -> saves HTML in leads.demo_html
// -> returns { demo_url, lead_id }. public/demo.html, admin and chat keep working.
// The page is a light, professional advisor profile (no film or video).
// The "vibe" choice only tints the accent colour, the page stays light.

// ── PROFILE PHOTO ──
// To change the photo on every new page, replace the file public/advisors/default.jpg
// (same file name, any photo, a portrait about 800x1000 works best).
// To use a different photo for one advisor, send photo_url (a full https link),
// or edit the <img src> in the copied page HTML.
const DEFAULT_PHOTO_PATH = '/advisors/default.jpg';

// ── VIBE ACCENTS (the existing palette choices, kept as subtle options) ──
const VIBE_ACCENTS = {
  'bold-premium':        { accent: '#C9A84C', dark: '#A07830' },
  'warm-trustworthy':    { accent: '#E8C87A', dark: '#C4A055' },
  'modern-edgy':         { accent: '#00E5FF', dark: '#00B8CC' },
  'fresh-approachable':  { accent: '#2D6A4F', dark: '#1E4D38' },
  'bold-energetic':      { accent: '#FF6B35', dark: '#CC5520' },
  'clean-creative':      { accent: '#6C5CE7', dark: '#5048C4' },
  'corporate-authority': { accent: '#A8C0D6', dark: '#7A9AB8' },
  'elegant-feminine':    { accent: '#C4847A', dark: '#A0605A' }
};
const DEFAULT_ACCENT = { accent: '#b8956a', dark: '#96744e' };

// Compiled utility CSS for the profile card (generated once with the Tailwind CLI, so
// pages need no external CSS library and still work when copied out of the admin).
const PAGE_CSS = String.raw`*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }/*! tailwindcss v3.4.17 | MIT License | https://tailwindcss.com*/*,:after,:before{box-sizing:border-box;border:0 solid #e5e7eb}:after,:before{--tw-content:""}:host,html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]:where(:not([hidden=until-found])){display:none}.mb-2{margin-bottom:.5rem}.mb-2\.5{margin-bottom:.625rem}.mb-3{margin-bottom:.75rem}.mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.mt-0{margin-top:0}.mt-0\.5{margin-top:.125rem}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-2\.5{margin-top:.625rem}.mt-5{margin-top:1.25rem}.block{display:block}.flex{display:flex}.table{display:table}.grid{display:grid}.hidden{display:none}.h-24{height:6rem}.min-h-screen{min-height:100vh}.w-24{width:6rem}.w-full{width:100%}.max-w-\[440px\]{max-width:440px}.shrink-0{flex-shrink:0}.transform{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.items-start{align-items:flex-start}.items-center{align-items:center}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.gap-2{gap:.5rem}.gap-4{gap:1rem}.whitespace-nowrap{white-space:nowrap}.rounded-2xl{border-radius:1rem}.rounded-3xl{border-radius:1.5rem}.rounded-full{border-radius:9999px}.border{border-width:1px}.border-b{border-bottom-width:1px}.border-emerald-200{--tw-border-opacity:1;border-color:rgb(167 243 208/var(--tw-border-opacity,1))}.border-emerald-200\/60{border-color:rgba(167,243,208,.6)}.border-slate-100{--tw-border-opacity:1;border-color:rgb(241 245 249/var(--tw-border-opacity,1))}.border-slate-200{--tw-border-opacity:1;border-color:rgb(226 232 240/var(--tw-border-opacity,1))}.border-slate-200\/80{border-color:rgba(226,232,240,.8)}.bg-emerald-100{--tw-bg-opacity:1;background-color:rgb(209 250 229/var(--tw-bg-opacity,1))}.bg-emerald-100\/80{background-color:rgba(209,250,229,.8)}.bg-emerald-50{--tw-bg-opacity:1;background-color:rgb(236 253 245/var(--tw-bg-opacity,1))}.bg-slate-100{--tw-bg-opacity:1;background-color:rgb(241 245 249/var(--tw-bg-opacity,1))}.bg-slate-50{--tw-bg-opacity:1;background-color:rgb(248 250 252/var(--tw-bg-opacity,1))}.bg-slate-50\/90{background-color:rgba(248,250,252,.9)}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity,1))}.object-cover{-o-object-fit:cover;object-fit:cover}.object-top{-o-object-position:top;object-position:top}.p-4{padding:1rem}.p-5{padding:1.25rem}.p-6{padding:1.5rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-2\.5{padding-left:.625rem;padding-right:.625rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-3\.5{padding-left:.875rem;padding-right:.875rem}.px-5{padding-left:1.25rem;padding-right:1.25rem}.py-0{padding-top:0;padding-bottom:0}.py-0\.5{padding-top:.125rem;padding-bottom:.125rem}.py-1{padding-top:.25rem;padding-bottom:.25rem}.py-1\.5{padding-top:.375rem;padding-bottom:.375rem}.py-4{padding-top:1rem}.pb-4,.py-4{padding-bottom:1rem}.pr-3{padding-right:.75rem}.text-center{text-align:center}.text-4xl{font-size:2.25rem;line-height:2.5rem}.text-\[11px\]{font-size:11px}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-xs{font-size:.75rem;line-height:1rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.uppercase{text-transform:uppercase}.leading-normal{line-height:1.5}.leading-relaxed{line-height:1.625}.leading-snug{line-height:1.375}.leading-tight{line-height:1.25}.tracking-wider{letter-spacing:.05em}.text-emerald-700{--tw-text-opacity:1;color:rgb(4 120 87/var(--tw-text-opacity,1))}.text-emerald-800{--tw-text-opacity:1;color:rgb(6 95 70/var(--tw-text-opacity,1))}.text-slate-300{--tw-text-opacity:1;color:rgb(203 213 225/var(--tw-text-opacity,1))}.text-slate-400{--tw-text-opacity:1;color:rgb(148 163 184/var(--tw-text-opacity,1))}.text-slate-500{--tw-text-opacity:1;color:rgb(100 116 139/var(--tw-text-opacity,1))}.text-slate-600{--tw-text-opacity:1;color:rgb(71 85 105/var(--tw-text-opacity,1))}.text-slate-700{--tw-text-opacity:1;color:rgb(51 65 85/var(--tw-text-opacity,1))}.text-slate-800{--tw-text-opacity:1;color:rgb(30 41 59/var(--tw-text-opacity,1))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity,1))}.shadow-sm{--tw-shadow:0 1px 2px 0 rgba(0,0,0,.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}@media (min-width:640px){.sm\:h-28{height:7rem}.sm\:w-28{width:7rem}.sm\:p-6{padding:1.5rem}.sm\:p-8{padding:2rem}.sm\:text-2xl{font-size:1.5rem;line-height:2rem}.sm\:text-\[22px\]{font-size:22px}.sm\:text-base{font-size:1rem;line-height:1.5rem}.sm\:text-sm{font-size:.875rem;line-height:1.25rem}}@media (min-width:768px){.md\:col-span-5{grid-column:span 5/span 5}.md\:col-span-7{grid-column:span 7/span 7}.md\:mb-0{margin-bottom:0}.md\:mb-5{margin-bottom:1.25rem}.md\:mb-8{margin-bottom:2rem}.md\:h-64{height:16rem}.md\:w-full{width:100%}.md\:max-w-\[880px\]{max-width:880px}.md\:grid-cols-12{grid-template-columns:repeat(12,minmax(0,1fr))}.md\:flex-col{flex-direction:column}.md\:items-start{align-items:flex-start}.md\:gap-0{gap:0}.md\:gap-8{gap:2rem}.md\:p-10{padding:2.5rem}.md\:text-6xl{font-size:3.75rem;line-height:1}}`;

// ── COLOUR HELPERS (keep text readable whatever vibe is chosen) ──
function hexToRgb(hex) {
  const h = String(hex).replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHex(rgb) {
  return '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
// Darken a colour until it has at least `min` contrast against `against`.
function readable(hex, against, min) {
  let rgb = hexToRgb(hex);
  let out = rgbToHex(rgb);
  for (let i = 0; i < 40 && contrast(out, against) < min; i++) {
    rgb = rgb.map((v) => v * 0.93);
    out = rgbToHex(rgb);
  }
  return out;
}
function getTheme(vibe) {
  // No vibe chosen (or the old default) keeps the approved navy button.
  if (!vibe || vibe === 'bold-premium') return { accent: '#244363', text: '#244363', button: '#244363' };
  const pick = VIBE_ACCENTS[vibe] || DEFAULT_ACCENT;
  return {
    accent: pick.accent,                          // decorative (top line, soft tints)
    text: readable(pick.dark, '#ffffff', 4.5),    // small coloured text on white
    button: readable(pick.dark, '#ffffff', 4.5)   // button fill under white text
  };
}

// ── SMALL UTILITIES ──
function requestJSON(options, body, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (response) => {
      let raw = '';
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        let parsed = {};
        if (raw.trim()) {
          try { parsed = JSON.parse(raw); }
          catch (_) { return reject(new Error(`Invalid JSON response (${response.statusCode}): ${raw.slice(0, 200)}`)); }
        }
        if (response.statusCode >= 400) {
          const msg = (parsed && (parsed.message || (parsed.error && parsed.error.message) || parsed.error)) || `Request failed (${response.statusCode})`;
          return reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)));
        }
        resolve(parsed);
      });
    });
    req.on('error', reject);
    if (timeoutMs) req.setTimeout(timeoutMs, () => req.destroy(new Error('Request timed out')));
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeURL(value) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:', 'viber:'].includes(parsed.protocol) ? parsed.href : '';
  } catch (_) {
    return '';
  }
}

function safeEmail(value) {
  const candidate = String(value || '').trim();
  return /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(candidate) ? candidate : '';
}

function clean(value, fallback = '') {
  const text = String(value == null ? '' : value).trim();
  return text || fallback;
}

function toList(value) {
  if (Array.isArray(value)) return value.map((i) => String(i).trim()).filter(Boolean).slice(0, 6);
  return String(value || '').split(/[,;\n]/).map((i) => i.trim()).filter(Boolean).slice(0, 6);
}

// ── READ THE REQUEST ──
// Old funnel fields still work, so index.html and the admin Regenerate button keep working:
//   offer -> specialty, client -> who they help, pain -> challenges those clients face,
//   transform -> outcome clients want.
// A client's pain is NOT used as the advisor's personal story. Story only comes from
// an explicit story/bio field.
function getAdvisorData(body) {
  const p = body.advisor_profile && typeof body.advisor_profile === 'object' ? body.advisor_profile : body;
  return {
    leadId: clean(body.lead_id),
    name: clean(p.advisor_name || p.name || body.name, 'Your Financial Advisor'),
    title: clean(p.professional_title || p.title || p.role || body.role, 'Financial Advisor'),
    company: clean(p.company_name || p.company || p.business_name),
    specialization: clean(p.specialization || p.expertise || p.offer || p.offer_name, 'Financial Planning and Protection'),
    audience: clean(p.ideal_clients || p.audience || p.client || p.ideal_client),
    challenge: clean(p.client_challenge || p.pain || p.offer_pain),
    outcome: clean(p.client_outcome || p.transform || p.offer_transform),
    story: clean(p.personal_story || p.story || p.about || p.bio),
    approach: clean(p.advisory_approach || p.approach),
    services: toList(p.services || p.services_offered || p.key_services),
    credentials: toList(p.credentials || p.qualifications || p.awards),
    photo: safeURL(p.photo_url || p.profile_photo || p.photo),
    messenger: safeURL(p.messenger_url || p.messenger),
    viber: safeURL(p.viber_url || p.viber),
    whatsapp: safeURL(p.whatsapp_url || p.whatsapp),
    website: safeURL(p.website_url || p.website),
    email: safeEmail(p.contact_email || p.email || body.email)
  };
}

// ── AI COPY ──
// Writes the words for each slot of the profile card. Taglish by default (natural
// Filipino-English mix, like the approved sample), or plain English if language is "english".
function buildCopyPrompt(a, english) {
  const style = english
    ? 'Write in clear, warm, natural English.'
    : 'Write in natural Taglish (a warm Filipino and English mix, the way a friendly Filipino advisor talks). Keep terms like "Health Fund", "OFW", "breadwinner" in English.';
  return `You are a careful personal-brand copywriter for Filipino Financial Advisors. ${style}

ADVISOR FACTS (use only these facts):
Name: ${a.name}
Professional title: ${a.title}
Company: ${a.company || 'Not supplied'}
Specialty: ${a.specialization}
Who they help: ${a.audience || 'Not supplied'}
Challenges those clients face: ${a.challenge || 'Not supplied'}
Outcome those clients want: ${a.outcome || 'Not supplied'}
Advisor's personal story/background: ${a.story || 'Not supplied'}
Advisory approach: ${a.approach || 'Not supplied'}

STRICT RULES:
- Never invent licenses, certifications, awards, years of experience, client numbers, statistics, percentages, testimonials, company affiliations, guarantees, returns, or financial outcomes.
- No fake social proof. Do not promise wealth or guaranteed results.
- Challenges and outcomes describe the advisor's CLIENTS, never the advisor's own experience.
- If no personal story was supplied, do not invent one. Speak from the advisor's helping role only.
- Warm, approachable, never pushy and never fear-mongering. Name the real-life worry gently, then offer a conversation.
- Do not give individualized financial advice.
- Keep every field short and concrete.
- Return ONLY valid JSON with exactly these keys:
{
  "top_label": "small label at the top, maximum 5 words",
  "specialty_label": "the specialty as a short label, maximum 4 words",
  "tagline": "one line saying who the advisor helps, maximum 10 words",
  "headline": "one empathetic headline about the client's real-life worry, maximum 22 words",
  "problem": "2 sentences describing the client's situation and worry, no statistics",
  "lead_in": "a short line like 'Here is how I can help', maximum 6 words",
  "help": "2 sentences on how the advisor helps, using the specialty and the outcome clients want",
  "highlight": "an exact 2 to 5 word phrase copied from the help text to emphasise",
  "audience_label": "short line introducing the audience tags, maximum 8 words",
  "audience_tags": ["3 short tags, maximum 4 words each, who this conversation is for"],
  "cta_text": "button text inviting a conversation, maximum 8 words",
  "cta_sub": "one short reassuring line under the button, maximum 8 words"
}`;
}

function fallbackCopy(a) {
  return {
    top_label: 'Your Financial Partner',
    specialty_label: a.specialization.length <= 40 ? a.specialization : 'Financial Planning',
    tagline: a.audience ? `For ${a.audience}`.slice(0, 80) : 'For individuals and families planning ahead',
    headline: 'Your family’s future deserves a clear plan.',
    problem: a.challenge
      ? `Many people I speak with are dealing with this: ${a.challenge}. It is not easy to know where to start.`
      : 'Life is busy, and financial decisions are easy to put off. It is not easy to know where to start.',
    lead_in: 'This is where I can help.',
    help: a.outcome
      ? `I help you work toward ${a.outcome}. We take it step by step, at a pace that feels comfortable.`
      : 'I listen first, then help you understand the options that may fit your situation. We take it step by step.',
    highlight: '',
    audience_label: 'This conversation is for:',
    audience_tags: a.audience ? [a.audience.slice(0, 40)] : ['Individuals', 'Families'],
    cta_text: 'Let’s talk about your plan',
    cta_sub: 'A short, no-pressure conversation.'
  };
}

async function generateCopy(a, english) {
  const fb = fallbackCopy(a);
  const key = process.env.OPENAI_API_KEY;
  if (!key) return fb;
  try {
    const result = await requestJSON({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` }
    }, {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 900,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are an expert personal-brand copywriter. Follow the instructions exactly and return valid JSON only.' },
        { role: 'user', content: buildCopyPrompt(a, english) }
      ]
    }, 25000);
    const content = result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content;
    if (!content) return fb;
    const ai = JSON.parse(content);
    const out = {};
    // Keep only expected keys, as plain, length-limited text.
    Object.keys(fb).forEach((k) => {
      if (k === 'audience_tags') {
        const tags = Array.isArray(ai.audience_tags) ? ai.audience_tags.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim().slice(0, 40)).slice(0, 3) : [];
        out[k] = tags.length ? tags : fb[k];
      } else {
        const v = typeof ai[k] === 'string' ? ai[k].trim() : '';
        out[k] = v ? v.slice(0, 500) : fb[k];
      }
    });
    return out;
  } catch (error) {
    console.error('AI copy generation failed:', error.message);
    return fb;
  }
}

// ── PAGE ──
// One-card advisor profile. Styles are inlined (no external CSS library), so the
// page also works when the HTML is copied out of the admin for a client's own page.
// Parts marked DEMO-ONLY can be deleted from a client's final page.
function buildHTML(a, copy, vibe) {
  const t = getTheme(vibe);
  const fb = fallbackCopy(a);
  const c = (key) => clean(copy[key], fb[key]);
  const initials = a.name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || 'FA';

  // Bold the highlight phrase inside the help text (both pieces are escaped first).
  let help = esc(c('help'));
  const hl = esc(clean(copy.highlight));
  if (hl && help.includes(hl)) help = help.replace(hl, `<strong>${hl}</strong>`);

  const tags = (Array.isArray(copy.audience_tags) && copy.audience_tags.length ? copy.audience_tags : fb.audience_tags)
    .map((x) => `<span class="px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">${esc(x)}</span>`).join('');

  const photoClass = 'w-24 h-24 sm:w-28 sm:h-28 md:w-full md:h-64 rounded-2xl bg-slate-100 shrink-0 border border-slate-100 md:mb-5';
  const photoSrc = a.photo || DEFAULT_PHOTO_PATH;
  const photo = `<img src="${esc(photoSrc)}" alt="${esc(a.name)}" class="${photoClass} object-cover object-top" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="${photoClass} items-center justify-center text-4xl md:text-6xl font-bold text-slate-400" style="display:none">${esc(initials)}</div>`;

  // Primary CTA button (defaults to Messenger if none supplied) + secondary contact pills
  // Inline styles are included so buttons stay fully visible inside Dashnex Page Builder.
  const primaryHref = a.messenger || a.whatsapp || a.viber || a.website || (a.email ? `mailto:${a.email}` : 'https://m.me/');
  const primaryExternal = !primaryHref.startsWith('mailto:');
  const primaryBtnStyle = `background-color:${t.button};color:#ffffff;display:block;width:100%;text-align:center;text-decoration:none;border-radius:1rem;padding:1rem 1.25rem;`;
  const pillStyle = `display:inline-flex;align-items:center;justify-content:center;padding:0.45rem 0.9rem;border-radius:9999px;font-size:12px;font-weight:600;background-color:#f1f5f9;color:#334155;border:1px solid #cbd5e1;text-decoration:none;`;

  const contactLinks = [
    { label: 'Messenger', href: a.messenger || 'https://m.me/', external: true },
    { label: 'WhatsApp', href: a.whatsapp || 'https://wa.me/', external: true },
    { label: 'Viber', href: a.viber || 'https://www.viber.com/', external: true },
    { label: 'Email', href: a.email ? `mailto:${a.email}` : 'mailto:advisor@example.com', external: false }
  ];
  const pillsMarkup = contactLinks.map((item) =>
    `<a href="${esc(item.href)}"${item.external ? ' target="_blank" rel="noopener noreferrer"' : ''} style="${pillStyle}" class="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">${esc(item.label)}</a>`
  ).join('');

  const ctaMarkup = `<a href="${esc(primaryHref)}"${primaryExternal ? ' target="_blank" rel="noopener noreferrer"' : ''} style="${primaryBtnStyle}" class="cta-btn block w-full text-white text-center rounded-2xl py-4 px-5 shadow-sm"><span style="display:block;color:#ffffff;font-weight:600;" class="block text-sm sm:text-base font-semibold">${esc(c('cta_text'))} &rarr;</span><span style="display:block;color:#e2e8f0;margin-top:0.25rem;" class="block text-xs text-slate-300 mt-1">${esc(c('cta_sub'))}</span></a>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:0.5rem;margin-top:0.875rem;" class="flex flex-wrap justify-center gap-2 mt-3.5">${pillsMarkup}</div>`;

  const roleLine = [a.title, a.company].filter(Boolean).map(esc).join(' · ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="${esc(c('tagline'))}">
<title>${esc(a.name)} | ${esc(a.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${PAGE_CSS}
:root{--button:${t.button}}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background-color:#f3f5f7}
.cta-btn{background-color:var(--button);transition:filter .2s,transform .1s}
.cta-btn:hover{filter:brightness(.86)}.cta-btn:active{transform:scale(.99)}
:focus-visible{outline:3px solid var(--button);outline-offset:3px}
</style>
</head>
<body class="min-h-screen flex items-center justify-center p-4 sm:p-8">
<main class="w-full max-w-[440px] md:max-w-[880px] bg-white rounded-3xl shadow-sm border border-slate-200/80 p-6 sm:p-8 md:p-10">
  <div class="flex items-center justify-between mb-6 md:mb-8 pb-4 border-b border-slate-100">
    <span class="text-[11px] font-semibold tracking-wider text-slate-500 uppercase pr-3">${esc(c('top_label'))}</span>
    <!-- DEMO-ONLY: delete this badge on a client's final page -->
    <span class="shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">Demo profile</span>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-12 md:gap-8 items-start">
    <div class="md:col-span-5 flex md:flex-col items-center md:items-start gap-4 md:gap-0 mb-6 md:mb-0">
      ${photo}
      <div class="flex flex-col items-start">
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">${esc(a.name)}</h1>
        <p class="text-sm text-slate-500 mt-0.5">${roleLine}</p>
        <span class="mt-2.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100/80 text-emerald-800">${esc(c('specialty_label'))}</span>
        <p class="text-xs sm:text-sm text-slate-600 mt-2.5 font-medium">${esc(c('tagline'))}</p>
      </div>
    </div>
    <div class="md:col-span-7 flex flex-col justify-between">
      <section class="bg-slate-50/90 rounded-2xl p-5 sm:p-6 border border-slate-100 mb-6">
        <h2 class="text-xl sm:text-[22px] font-bold text-slate-800 leading-snug mb-3">${esc(c('headline'))}</h2>
        <p class="text-sm text-slate-600 leading-relaxed mb-4">${esc(c('problem'))}</p>
        <p class="text-sm font-semibold text-slate-800 mb-2">${esc(c('lead_in'))}</p>
        <p class="text-sm text-slate-600 leading-relaxed">${help}</p>
      </section>
      <section class="mb-6">
        <p class="text-xs sm:text-sm font-semibold text-slate-700 mb-2.5">${esc(c('audience_label'))}</p>
        <div class="flex flex-wrap gap-2">${tags}</div>
      </section>
      ${ctaMarkup}
      <footer class="mt-5 text-center">
        <p class="text-[11px] text-slate-500 leading-normal">General information only. This page is not financial advice.</p>
        <!-- DEMO-ONLY: delete this line on a client's final page -->
        <p class="text-[11px] text-slate-500 leading-normal mt-1">This is a demonstration profile. Advisor information and credentials are sample content.</p>
      </footer>
    </div>
  </div>
</main>
</body></html>`;
}

// ── SAVE (same Supabase approach as before: anon key, same columns) ──
async function saveToSupabase(body, a, html) {
  const supabaseURL = new URL(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_ANON_KEY;
  const headers = { 'Content-Type': 'application/json', 'apikey': key, 'Authorization': `Bearer ${key}` };
  const now = new Date().toISOString();
  const fields = {
    offer_name: body.offer || a.specialization,
    offer_price: body.price || null,
    ideal_client: body.client || null,
    offer_pain: body.pain || null,
    offer_transform: body.transform || null,
    design_vibe: body.vibe || null,
    demo_html: html,
    demo_generated_at: now
  };

  if (a.leadId) {
    await requestJSON({
      hostname: supabaseURL.hostname,
      path: `/rest/v1/leads?id=eq.${encodeURIComponent(a.leadId)}`,
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' }
    }, fields, 20000);
    return a.leadId;
  }

  const inserted = await requestJSON({
    hostname: supabaseURL.hostname,
    path: '/rest/v1/leads',
    method: 'POST',
    headers: { ...headers, 'Prefer': 'return=representation' }
  }, {
    name: body.name,
    email: body.email,
    role: body.role || 'Not provided',
    goal: body.goal || 'Not provided',
    problem: body.problem || 'Not provided',
    ...fields,
    created_at: now
  }, 20000);
  return Array.isArray(inserted) && inserted[0] && inserted[0].id ? inserted[0].id : null;
}

// ── HANDLER ──
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (_) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!clean(body.offer)) return res.status(400).json({ error: 'Missing required fields' });

  const advisor = getAdvisorData(body);

  // Pages are shown from a temporary blob address, so the photo needs a full web address.
  // Use APP_URL if set, else this site's own host (checked to be a plain host name).
  if (!advisor.photo) {
    const hdrs = req.headers || {};
    const host = String(hdrs['x-forwarded-host'] || hdrs.host || '').split(',')[0].trim();
    const base = (process.env.APP_URL || (/^[a-z0-9.-]+(:\d+)?$/i.test(host) ? `https://${host}` : '')).replace(/\/+$/, '');
    advisor.photo = base ? `${base}${DEFAULT_PHOTO_PATH}` : DEFAULT_PHOTO_PATH;
  }

  let html;
  try {
    const copy = await generateCopy(advisor, String(body.language || '').toLowerCase() === 'english');
    html = buildHTML(advisor, copy, body.vibe);
  } catch (err) {
    console.error('Profile page build error:', err.message);
    return res.status(500).json({ error: 'Content generation failed: ' + err.message });
  }

  let savedLeadId;
  try {
    savedLeadId = await saveToSupabase(body, advisor, html);
  } catch (err) {
    console.error('Supabase error:', err.message);
    return res.status(500).json({ error: 'Could not save the page: ' + err.message });
  }

  return res.status(200).json({
    success: true,
    demo_url: `/demo?id=${encodeURIComponent(savedLeadId || 'preview')}`,
    lead_id: savedLeadId
  });
};
