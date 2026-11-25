const https = require('https');

const BASE_URL = 'https://ai-funnel-engine.vercel.app';

function postJSON(options, body) {
  return new Promise((resolve, reject) => {

    const req = https.request(options, (res) => {

      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {

        // Empty response is valid for PATCH/DELETE
        if (!data || data.trim() === '') {
          return resolve({});
        }

        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('JSON parse failed: ' + data));
        }

      });

    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();

  });
}

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

function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------
// WHICH STEP IS THIS LEAD ON?
// Picks the furthest step the lead has reached, so every email
// pushes them toward the NEXT step:
//   quiz     -> finished the quiz, no demo page yet
//   demo     -> has their advisor profile demo, has not opened the chat
//   chat     -> opened the chat, no proposal yet
//   proposal -> proposal made or viewed, not signed yet
// ---------------------------------------------------------------
function getTrack(lead) {
  if (lead.proposal_generated_at || lead.proposal_viewed_at) return 'proposal';
  if (lead.chat_started_at) return 'chat';
  if (lead.demo_generated_at || lead.demo_html) return 'demo';
  return 'quiz';
}

// Leads who signed the proposal or are marked "won" are done.
function isConverted(lead) {
  return !!lead.proposal_signed_at || lead.admin_status === 'won';
}

function emailShell(inner) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;font-size:15px;line-height:1.65;color:#1f2937;">
    ${inner}
    <p style="margin:28px 0 0;">
      Salamat,<br>
      <strong>Angel Scott</strong><br>
      <span style="font-size:13px;color:#6b7280;">AI-Powered Marketing Systems Strategist</span>
    </p>
  </div>`;
}

function button(href, label) {
  return `
    <p style="margin:24px 0;">
      <a href="${href}" style="background:#0F766E;color:#ffffff;padding:14px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">
        ${label}
      </a>
    </p>`;
}

// ---------------------------------------------------------------
// QUIZ ANSWERS -> CLEAN ENGLISH PHRASES
// The quiz saves each answer as "Label — sub-label". Pasting that
// raw text into a sentence read badly, so every known answer is
// matched here to a short phrase written to fit inside a sentence.
// An answer that is not recognised (for example from an older quiz)
// gets a safe general sentence instead of the raw text.
// Subject lines stay in Tagalog; the email body is in English.
// ---------------------------------------------------------------
const PROBLEM_TOPICS = [
  { re: /not enough prospects/i,                       topic: 'not having enough prospects' },
  { re: /reach out but (do not|don'?t) move forward/i, topic: 'prospects who reach out but never move forward' },
  { re: /inconsistent income/i,                        topic: 'inconsistent income from month to month' },
  { re: /everything is manual/i,                       topic: 'doing everything manually, from posting to following up' },
  { re: /look like everyone/i,                         topic: 'posts that look just like everyone else\'s' },
  { re: /too busy to market/i,                         topic: 'being too busy to market yourself consistently' }
];

const GOAL_WISHES = [
  { re: /felt understood/i,             wish: 'prospects who message you because they felt understood, before you even pitch' },
  { re: /trusted advisor in my niche/i, wish: 'to be the trusted advisor in your niche' },
  { re: /one professional link/i,       wish: 'one professional link you can share in every post and chat' },
  { re: /story on video/i,              wish: 'to share your story on video without hours of work' },
  { re: /consistent without burnout/i,  wish: 'to stay consistent without burnout' },
  { re: /beyond my warm market/i,       wish: 'to reach new people beyond your warm market' }
];

function matchPhrase(value, list) {
  const text = String(value == null ? '' : value);
  return list.find(item => item.re.test(text)) || null;
}

// Ready-made pieces that can be dropped into an email safely.
function describeLead(lead) {
  const p = matchPhrase(lead.problem, PROBLEM_TOPICS);
  const g = matchPhrase(lead.goal, GOAL_WISHES);

  return {
    // "...started the conversation <about X>"
    aboutProblem: p
      ? `about <strong>${p.topic}</strong>`
      : 'about the challenges you shared',

    challenge: p
      ? `The biggest challenge you shared is <strong>${p.topic}</strong>.`
      : 'You shared a few challenges with getting the right prospects online.',

    goal: g
      ? `What you want most is <strong>${g.wish}</strong>.`
      : 'You were clear about what you want your online presence to do for you.'
  };
}

const PACKAGE_NAME = 'AI Marketing System for Financial Advisors';

// The AI diagnosis is written in English, so it now fits the email.
// It is shown as a quote so it reads as the lead's own result.
function diagnosisBlock(diagnosis) {
  if (!diagnosis) return '';
  return `<p style="margin:16px 0;padding:4px 0 4px 14px;border-left:3px solid #0F766E;color:#374151;">${diagnosis}</p>`;
}

function generateFollowupContent(lead, track, index) {

  let analysis = {};

  try {
    analysis = lead.full_analysis
      ? (typeof lead.full_analysis === 'string'
          ? JSON.parse(lead.full_analysis)
          : lead.full_analysis)
      : {};
  } catch (e) {
    console.log('Full analysis parse failed');
  }

  const firstRaw = String(lead.name || '').trim().split(/\s+/)[0] || '';
  const first    = esc(firstRaw || 'there');
  const subjectName = firstRaw || 'Hi';

  const diagnosis = diagnosisBlock(esc(analysis.diagnosis || ''));

  const { aboutProblem, challenge, goal } = describeLead(lead);

  const id = encodeURIComponent(lead.id);

  const chatLink  = `${BASE_URL}/chat?id=${id}`;
  const demoLink  = `${BASE_URL}/demo?id=${id}`;
  const proposalLink =
    `${BASE_URL}/proposal?id=${id}` +
    `&name=${encodeURIComponent(lead.name || '')}` +
    `&email=${encodeURIComponent(lead.email || '')}`;

  // Every email stands on its own, so the order can change
  // when a lead moves to a new step. No "last chance" wording.
  const pools = {

    // ---------- Finished the quiz, no demo page yet ----------
    quiz: [
      {
        subject: `${subjectName}, nandito pa ang diagnosis mo`,
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Thank you for taking my assessment. Here is what stood out in your answers:</p>
          <p>${challenge}</p>
          <p>${goal}</p>
          ${diagnosis}
          <p>Your full diagnosis is still waiting for you, and you can ask me about it anytime in the chat.</p>
          ${button(chatLink, 'Continue My Conversation')}
        `)
      },
      {
        subject: 'Bakit hindi nagiging usapan ang mga post mo?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Many advisors post consistently on Facebook and message people on Messenger, yet it still doesn't turn into conversations.</p>
          <p>Most of the time, it isn't a lack of effort. What's missing is a story the prospect can relate to, and a professional place where they can get to know you and message you.</p>
          <p>That's where the <strong>${PACKAGE_NAME}</strong> comes in: free membership in our Financial Advisor Directory, where prospects from our AI short film ads can find you, and a personal advisor profile page you can link in any post.</p>
          <p>I can't promise a number of leads or clients, because that depends on your positioning and consistency. But you will be easier to recognize, and more professional to deal with.</p>
          ${button(chatLink, 'Ask Me How It Works')}
        `)
      },
      {
        subject: 'Isang professional na tahanan para sa kuwento mo',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Imagine one link you can place in every post, story, or chat. When a prospect opens it, they immediately see your profile, what you do best, and how to reach you.</p>
          <p>That's the advisor profile page. It includes lead capture, so an interested prospect has a way to reach out.</p>
          <p>If you'd like to see how it would fit your specialty, just ask me in the chat.</p>
          ${button(chatLink, 'Continue My Conversation')}
        `)
      }
    ],

    // ---------- Has a demo page, has not opened the chat ----------
    demo: [
      {
        subject: `${subjectName}, nakita mo na ba ang advisor profile page mo?`,
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>${challenge}</p>
          <p>${goal}</p>
          <p>That's why I made you a sample advisor profile page, so you can see how you would appear to your prospects.</p>
          <p style="margin:16px 0;"><a href="${demoLink}" style="color:#0F766E;font-weight:bold;">Open your demo profile page</a></p>
          <p>It's only a demo. If you'd like this page to become your own, head to the chat and we'll talk about the next step.</p>
          ${button(chatLink, 'I Want This As My Own Page')}
        `)
      },
      {
        subject: 'Ano ang kasama kapag naging sarili mo na ito?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>If you like your demo profile page, here is what's included when it becomes your own:</p>
          <p>
            1. Free membership in our Financial Advisor Directory, with your profile featured in our AI short film campaigns and ads<br>
            2. A personal advisor profile page with lead capture and call-to-action buttons<br>
            3. A follow-up and nurture email sequence for every new lead<br>
            4. An AI sales chatbot trained on your offer
          </p>
          <p>I don't promise followers, booked calls, or clients. What we make sure of is that you're introduced online in a clear, professional way.</p>
          ${button(chatLink, 'Ask About The Next Step')}
        `)
      },
      {
        subject: 'Isang mabilis na tanong tungkol sa profile page mo',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>A quick question: do the specialty and the way you're introduced on your demo page feel right to you?</p>
          <p>If you'd like to change anything, or you have a question, just reply to this email or go straight to the chat. That's also where I'll explain how this can become your own.</p>
          <p style="margin:16px 0;"><a href="${demoLink}" style="color:#0F766E;font-weight:bold;">Take another look at the demo page</a></p>
          ${button(chatLink, 'Continue In Chat')}
        `)
      }
    ],

    // ---------- Opened the chat, no proposal yet ----------
    chat: [
      {
        subject: 'Itutuloy ba natin ang usapan natin?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>We started a conversation ${aboutProblem}, and everything we talked about is still there.</p>
          ${diagnosis ? `<p>As a reminder, here is what your assessment showed:</p>${diagnosis}` : ''}
          <p>If you still have questions, you can pick up right where we left off.</p>
          ${button(chatLink, 'Continue My Chat')}
        `)
      },
      {
        subject: 'Ano ang pinakakinakabahan mo?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>It's natural to have questions or hesitations before deciding. Maybe it's about time, the process, or whether this fits your specialty.</p>
          <p>Whatever it is, tell me in the chat or reply to this email. I'll answer honestly, even if you never end up taking it.</p>
          ${button(chatLink, 'Ask My Question')}
        `)
      },
      {
        subject: 'Gusto mo ba ng mabilis na proposal?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>If you'd like to see exactly what's included in the ${PACKAGE_NAME}, I can put together a quick proposal for you in the chat. It takes about 30 seconds.</p>
          <p>Looking costs nothing, and the decision stays with you.</p>
          ${button(chatLink, 'Get My Quick Proposal')}
        `)
      }
    ],

    // ---------- Proposal made or viewed, not signed yet ----------
    proposal: [
      {
        subject: 'Nandito pa rin ang proposal mo',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Your proposal for the <strong>${PACKAGE_NAME}</strong> is still here. You can come back to it anytime and read it at your own pace.</p>
          ${button(proposalLink, 'Review My Proposal')}
        `)
      },
      {
        subject: 'May tanong ka ba tungkol sa proposal mo?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>If anything in the proposal isn't clear, or there's something you'd like to clarify before deciding, just reply to this email or stop by the chat.</p>
          <p>The proposal includes: free directory membership with your profile featured in our AI short film campaigns, an advisor profile page with lead capture, a follow-up email sequence, and an AI sales chatbot.</p>
          <p style="margin:16px 0;"><a href="${chatLink}" style="color:#0F766E;font-weight:bold;">Ask in the chat</a></p>
          ${button(proposalLink, 'Review My Proposal')}
        `)
      },
      {
        subject: 'Bumalik tayo sa assessment mo',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>${goal}</p>
          <p>${challenge}</p>
          <p>Your proposal was built to speak to exactly that, so your prospects can get to know you in a clearer, more professional way.</p>
          <p>If you're ready, you can sign the proposal. If you'd like to clarify something first, head to the chat and we'll talk it through.</p>
          <p style="margin:16px 0;"><a href="${chatLink}" style="color:#0F766E;font-weight:bold;">Ask in the chat</a></p>
          ${button(proposalLink, 'Review My Proposal')}
        `)
      }
    ]
  };

  const pool = pools[track] || pools.quiz;
  return pool[index % pool.length];
}

module.exports = async function handler(req, res) {

  try {

    const supabaseURL = new URL(process.env.SUPABASE_URL);

    const authHeaders = {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
    };

    // Get all leads due for follow-up
    const dueLeads = await postJSON({
      hostname: supabaseURL.hostname,
      path:
        '/rest/v1/leads' +
        '?followup_active=eq.true' +
        '&next_followup_at=lte.' + encodeURIComponent(new Date().toISOString()),
      method: 'GET',
      headers: authHeaders
    });

    if (!Array.isArray(dueLeads)) {
      throw new Error('Unexpected leads response: ' + JSON.stringify(dueLeads));
    }

    console.log('Due leads found:', dueLeads.length);

    let sent = 0;
    let stopped = 0;

    for (const lead of dueLeads) {

      // STOP the sequence for leads who signed or are marked won
      if (isConverted(lead)) {

        await postJSON({
          hostname: supabaseURL.hostname,
          path: `/rest/v1/leads?id=eq.${lead.id}`,
          method: 'PATCH',
          headers: { ...authHeaders, 'Prefer': 'return=minimal' }
        }, {
          followup_active: false
        });

        stopped += 1;
        console.log('Follow-up stopped (converted):', lead.email);
        continue;
      }

      const currentStage = lead.followup_stage || 0;
      const track = getTrack(lead);

      const emailContent = generateFollowupContent(lead, track, currentStage);

      await sendEmail(
        lead.email,
        emailContent.subject,
        emailContent.html
      );

      // Days until the next email (same timing as before).
      // After stage 7 the stage goes back to 0, so the loop keeps
      // running until the lead signs or is marked won.
      const scheduleDays = {
        0: 5,
        1: 7,
        2: 7,
        3: 9,
        4: 15,
        5: 15,
        6: 30,
        7: 30
      };

      const nextDate = new Date();

      nextDate.setDate(
        nextDate.getDate() +
        (scheduleDays[currentStage] || 7)
      );

      await postJSON({
        hostname: supabaseURL.hostname,
        path: `/rest/v1/leads?id=eq.${lead.id}`,
        method: 'PATCH',
        headers: { ...authHeaders, 'Prefer': 'return=representation' }
      }, {
        followup_stage: (currentStage + 1) > 7 ? 0 : (currentStage + 1),
        last_email_sent_at: new Date().toISOString(),
        next_followup_at: nextDate.toISOString()
      });

      sent += 1;
      console.log('Follow-up sent to:', lead.email, '| track:', track);
    }

    return res.status(200).json({
      success: true,
      processed: dueLeads.length,
      sent,
      stopped
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};
