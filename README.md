# AI Funnel Engine — Setup Guide
## Copy-paste steps, zero fluff

---

## WHAT YOU ARE DEPLOYING

```
funnel-engine/
├── public/
│   └── index.html       ← Your landing page + quiz (the full frontend)
├── api/
│   └── analyze.js       ← Serverless function: OpenAI + Supabase
├── vercel.json          ← Tells Vercel how to serve everything
└── package.json
```

---

## STEP 1 — CREATE YOUR SUPABASE DATABASE (5 minutes)

1. Go to → https://supabase.com → Sign up free
2. Click "New Project" → name it `funnel-engine` → set a password → Create
3. Wait ~2 minutes for it to provision
4. Go to the left sidebar → **SQL Editor**
5. Paste this SQL exactly and click **Run**:

```sql
create table leads (
  id                uuid default gen_random_uuid() primary key,
  created_at        timestamptz default now(),

  -- Lead info
  name              text,
  email             text,
  business_name     text,

  -- Part 1: Current Reality
  goal              text,
  challenge         text,
  impact            text,

  -- Part 2: Dream State
  dream             text,
  metric            text,

  -- Part 3: Solution Alignment
  tried             text,
  funnel_belief     text,

  -- Part 4: Friction Points
  concern           text,
  resources         text,

  -- AI Analysis output
  core_desire       text,
  main_pain         text,
  hidden_trigger    text,
  buying_intent     text,
  opportunity_score integer,
  funnel_type       text,
  headline          text,
  full_analysis     text
);
```

6. Go to **Project Settings** → **API**
7. Copy these two values — you'll need them soon:
   - **Project URL** (looks like: https://xyzxyz.supabase.co)
   - **anon public** key (long string starting with "eyJ...")

---

## STEP 2 — DEPLOY TO VERCEL (5 minutes)

### Option A: Using GitHub (recommended)
1. Create a free GitHub account if you don't have one → https://github.com
2. Create a new repository → name it `ai-funnel-engine` → Public
3. Upload all the files from this folder (drag and drop works in GitHub's UI)
4. Go to → https://vercel.com → Sign up with GitHub
5. Click "Add New Project" → Import your `ai-funnel-engine` repo
6. Click **Deploy** (defaults are fine)

### Option B: Using Vercel CLI
```bash
npm install -g vercel
cd funnel-engine
vercel
```
Follow the prompts — it deploys in ~30 seconds.

---

## STEP 3 — ADD YOUR SECRET KEYS (2 minutes)

In Vercel dashboard → your project → **Settings** → **Environment Variables**

Add these 3 variables:

| Name | Value |
|------|-------|
| `OPENAI_API_KEY` | Your OpenAI key (from platform.openai.com → API Keys) |
| `SUPABASE_URL` | Your Supabase project URL from Step 1 |
| `SUPABASE_ANON_KEY` | Your Supabase anon key from Step 1 |

After adding all 3 → go to **Deployments** → click the three dots on your latest deployment → **Redeploy**

---

## STEP 4 — TEST IT

1. Open your Vercel URL (something like `https://ai-funnel-engine.vercel.app`)
2. Click "Discover your gaps"
3. Fill in the quiz with fake test data
4. Hit "Build my blueprint"
5. Within 5–10 seconds you should see personalized AI results

**Check Supabase:** Go to your Supabase dashboard → Table Editor → `leads` table
You should see a new row with everything saved.

---

## STEP 5 — CONNECT YOUR BOOKING LINK

In `public/index.html`, find this line near the bottom:
```html
<a href="#" class="btn-book" id="book-btn">Book a free strategy call →</a>
```

Replace `#` with your Calendly link:
```html
<a href="https://calendly.com/YOUR_LINK" class="btn-book" ...>
```

---

## COMMON ERRORS + FIXES

| Error | Fix |
|-------|-----|
| Result page shows "Something went wrong" | Check Vercel → Functions → Logs for the exact error |
| AI returns broken JSON | Add `console.log(raw)` in analyze.js temporarily to see what GPT returned |
| Supabase save fails but result still shows | That's fine — result still shows. Check column names match your SQL exactly |
| Vercel build fails | Make sure `vercel.json` is in the ROOT folder, not inside `public/` |
| OpenAI 401 error | Your API key is wrong or has no credits — check platform.openai.com |

---

## HOW N8N CONNECTS (for Brain 3, 4, 5 later)

Once this is running, n8n can poll your Supabase `leads` table directly:
- Use the **Supabase node** in n8n (or HTTP Request to Supabase REST API)
- Filter by `buying_intent = 'high'` to trigger your hottest leads workflow
- Use the `created_at` timestamp to only process new rows

That replaces the Google Sheets polling entirely.

---

## CUSTOMIZATION QUICK REFERENCE

| What to change | Where |
|----------------|-------|
| Hero headline | `index.html` → `<h1>` tag in the hero section |
| Quiz questions | `index.html` → each `.q-card` block |
| Colors | `index.html` → `:root` CSS variables at the top |
| AI prompt / tone | `api/analyze.js` → the `prompt` variable |
| Booking link | `index.html` → `<a href="#" class="btn-book">` |
| Add Messenger link | Add a second button below `.btn-book` |
