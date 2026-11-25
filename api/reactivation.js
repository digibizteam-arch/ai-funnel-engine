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

        if (!data || data.trim() === '') {
          return resolve({});
        }

        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(
            new Error('JSON parse failed: ' + data)
          );
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
      'Authorization':
      `Bearer ${process.env.RESEND_API_KEY}`
    }

  }, {

    from:
    'Angel Scott <angel.scott@ascottdigitalbiz.com>',

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


// Leads who signed the proposal or are marked "won" are done.
function isConverted(lead) {
  return !!lead.proposal_signed_at || lead.admin_status === 'won';
}


// These leads took the OLDER quiz, which was open to many kinds of
// businesses. The new offer is only for financial advisors, so we
// check the saved role. Anyone else gets a gentle, non-pushy update.
function isFinancialAdvisor(lead) {
  const role = String(lead.role || '');
  return /financial|insurance|invest|retirement|mutual|uitf|life and health|agency leader|new advisor/i.test(role);
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
// Old leads saved their answers as "Label — sub-label", and the
// older quiz had different questions. Pasting that raw text into a
// sentence read badly, so answers from the current quiz are matched
// to short phrases, and anything else gets a safe general sentence
// instead of the raw text.
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
    // A full sentence that stands on its own.
    challenge: p
      ? `The biggest challenge you shared is <strong>${p.topic}</strong>.`
      : 'You shared a few challenges with getting the right prospects online.',

    goal: g
      ? `What you want most is <strong>${g.wish}</strong>.`
      : 'You were clear about what you want your online presence to do for you.',

    // A full question that stands on its own.
    stillWant: g
      ? `Do you still want <strong>${g.wish}</strong>?`
      : 'Do you still want to be found more easily online?'
  };
}


function generateReactivationContent(lead, stage) {

  const firstRaw =
    String(lead.name || '').trim().split(/\s+/)[0] || '';

  // HTML-safe version for the email body.
  const first = esc(firstRaw || 'there');

  // Plain version for the subject line (a subject is not HTML,
  // so a name like O'Brien must not show as O&#39;Brien).
  const subjectName = firstRaw || 'Hi';

  const { challenge, goal, stillWant } =
    describeLead(lead);

  const id = encodeURIComponent(lead.id);

  const chatLink =
    `${BASE_URL}/chat?id=${id}`;

  // The new assessment is the best next step for old leads:
  // it is built for financial advisors, and leads straight into
  // the profile page demo, the chat and the proposal.
  const quizLink =
    `${BASE_URL}/`;

  const advisor = isFinancialAdvisor(lead);


  // ---------- Financial advisors: the new offer ----------
  const advisorTemplates = [

    {
      subject: `${subjectName}, may bago na akong ginagawa para sa mga financial advisor`,
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Thank you for taking my assessment earlier.</p>
        <p>${challenge}</p>
        <p>${goal}</p>
        <p>Since then, I've focused on helping financial advisors get known properly online. Here is what I'm doing now:</p>
        <p>
          1. Free membership in our Financial Advisor Directory, with your profile featured in our AI short film campaigns and ads<br>
          2. A personal advisor profile page with lead capture<br>
          3. Follow-up emails for every new lead<br>
          4. An AI sales chatbot trained on your offer
        </p>
        <p>I also have a new 2-minute assessment tailored to your specialty, and it's free.</p>
        ${button(quizLink, 'Take The New Assessment')}
      `)
    },

    {
      subject: 'Hindi kulang sa effort ang problema',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Many advisors post and message consistently, yet it still doesn't turn into conversations.</p>
        <p>Most of the time, it isn't a lack of hard work. What's missing is a story the prospect can relate to, and a professional place where they can get to know you.</p>
        <p>The new assessment will show you where you may be struggling, and how a directory listing and an advisor profile page can help. No results are promised, because that depends on your positioning and consistency.</p>
        ${button(quizLink, 'Take The New Assessment')}
      `)
    },

    {
      subject: 'Nagbago na ba ang sitwasyon mo?',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>I just wanted to check in: have the challenges you shared improved, stayed the same, or gotten harder?</p>
        <p>If you'd like to talk about it, just reply to this email. You can also take the new assessment to see your latest recommendation.</p>
        ${button(quizLink, 'Take The New Assessment')}
      `)
    },

    {
      subject: `Quick check-in, ${subjectName}`,
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>${stillWant}</p>
        <p>If so, we can talk about how to get you known more professionally by your prospects, with no pressure.</p>
        <p style="margin:16px 0;"><a href="${chatLink}" style="color:#0F766E;font-weight:bold;">Chat with me</a></p>
        ${button(quizLink, 'Take The New Assessment')}
      `)
    }

  ];


  // ---------- Everyone else: honest, low-pressure update ----------
  const generalTemplates = [

    {
      subject: `Update mula kay Angel`,
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Thank you for taking my assessment earlier.</p>
        <p>I wanted to let you know that my service is now focused on financial advisors. If you're a financial advisor, or you know one who struggles to get the right prospects online, this is our new free 2-minute assessment.</p>
        <p>If not, no problem. Thank you for your time.</p>
        ${button(quizLink, 'See The New Assessment')}
      `)
    },

    {
      subject: 'Para sa mga financial advisor',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>What I do now is a directory listing, promoted through AI short film campaigns, and a personal profile page for financial advisors, so their prospects can get to know them properly.</p>
        <p>If you know an advisor who would benefit, it would mean a lot if you shared this link.</p>
        ${button(quizLink, 'See The New Assessment')}
      `)
    },

    {
      subject: 'Kumusta ka na?',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>How have you been? If you'd like to share how things are going, just reply to this email.</p>
        <p>If you're a financial advisor, the free assessment is still here.</p>
        ${button(quizLink, 'See The New Assessment')}
      `)
    },

    {
      subject: `Quick check-in, ${subjectName}`,
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Thank you for taking my assessment earlier. If you're a financial advisor, or you know one, the free assessment is still open.</p>
        ${button(quizLink, 'See The New Assessment')}
      `)
    }

  ];


  const templates = advisor ? advisorTemplates : generalTemplates;

  return templates[stage] || templates[0];

}

module.exports = async function handler(req, res) {

  try {


    const supabaseURL =
      new URL(process.env.SUPABASE_URL);

    const authHeaders = {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
    };


    // Get maximum 10 old leads ready for reactivation
    const oldLeads = await postJSON({

      hostname: supabaseURL.hostname,

      path:
      '/rest/v1/leads' +

      '?created_at=lt.2026-08-01T00:00:00' +

      '&reactivation_active=eq.true' +

      '&reactivation_stage=lt.4' +

      '&reactivation_next_at=lte.' +
      encodeURIComponent(new Date().toISOString()) +

      '&limit=10',


      method:'GET',


      headers: {

        'apikey':
        process.env.SUPABASE_ANON_KEY,

        'Authorization':
        `Bearer ${process.env.SUPABASE_ANON_KEY}`

      }


    });


    if (!Array.isArray(oldLeads)) {
      throw new Error(
        'Unexpected leads response: ' + JSON.stringify(oldLeads)
      );
    }


    console.log(
      'Reactivation leads found:',
      oldLeads.length
    );


    let sent = 0;
    let stopped = 0;


    for (const lead of oldLeads) {


      // STOP for leads who signed the proposal or are marked won
      if (isConverted(lead)) {

        await postJSON({

          hostname: supabaseURL.hostname,

          path: `/rest/v1/leads?id=eq.${lead.id}`,

          method: 'PATCH',

          headers: { ...authHeaders, 'Prefer': 'return=minimal' }

        }, {

          reactivation_active: false

        });

        stopped += 1;

        console.log(
          'Reactivation stopped (converted):',
          lead.email
        );

        continue;

      }



      const stage =
        lead.reactivation_stage || 0;



      const emailContent =
        generateReactivationContent(
          lead,
          stage
        );



      await sendEmail(

        lead.email,

        emailContent.subject,

        emailContent.html

      );




      /*
        Schedule next email timing

        Stage 0  -> after 3 days
        Stage 1  -> after 7 days
        Stage 2  -> after 14 days
        Stage 3  -> finish and move to nurture

      */


      if (stage >= 3) {



        // Move to normal 90-day nurture sequence

        const nextFollowup =
          new Date();


        nextFollowup.setDate(
          nextFollowup.getDate() + 5
        );



        await postJSON({

          hostname:
          supabaseURL.hostname,


          path:
          `/rest/v1/leads?id=eq.${lead.id}`,


          method:'PATCH',


          headers: {

            'Content-Type':
            'application/json',

            'apikey':
            process.env.SUPABASE_ANON_KEY,

            'Authorization':
            `Bearer ${process.env.SUPABASE_ANON_KEY}`,

            'Prefer':
            'return=representation'

          }


        }, {


          reactivation_active:false,


          followup_active:true,


          followup_stage:0,


          next_followup_at:
          nextFollowup.toISOString(),


          last_email_sent_at:
          new Date().toISOString()


        });



        console.log(
          'Moved to nurture:',
          lead.email
        );



      } else {



        const scheduleDays = {


          0:3,

          1:7,

          2:14


        };



        const nextDate =
          new Date();



        nextDate.setDate(

          nextDate.getDate()
          +
          (scheduleDays[stage] || 7)

        );




        await postJSON({

          hostname:
          supabaseURL.hostname,


          path:
          `/rest/v1/leads?id=eq.${lead.id}`,


          method:'PATCH',


          headers: {


            'Content-Type':
            'application/json',


            'apikey':
            process.env.SUPABASE_ANON_KEY,


            'Authorization':
            `Bearer ${process.env.SUPABASE_ANON_KEY}`,


            'Prefer':
            'return=representation'


          }


        }, {



          reactivation_stage:
          stage + 1,


          reactivation_next_at:
          nextDate.toISOString(),


          last_email_sent_at:
          new Date().toISOString()



        });



        console.log(
          'Reactivation email sent:',
          lead.email
        );

      }


      sent += 1;


    }



    return res.status(200).json({

      success:true,

      processed:oldLeads.length,

      sent,

      stopped

    });



  } catch(err) {


    console.error(
      'Reactivation error:',
      err
    );


    return res.status(500).json({

      error:err.message

    });


  }


};
