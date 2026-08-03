const https = require('https');

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
    from: 'Angel Scott <angel@ascottdigitalbiz.com>',
    to: [to],
    subject,
    html
  });
}
function generateFollowupContent(lead, stage) {

  let analysis = {};

  try {
    analysis = lead.full_analysis
      ? JSON.parse(lead.full_analysis)
      : {};
  } catch (e) {
    console.log("Full analysis parse failed");
  }


  const goal = lead.goal || "growing your business";
  const problem = lead.problem || "generating consistent results";

  const diagnosis = analysis.diagnosis || "";
  const solution = analysis.solution_name || "a better conversion system";


  const chatLink =
    `https://ai-funnel-engine.vercel.app/chat?id=${lead.id}`;


  const templates = {


    0: {
      subject: "Have You Reviewed Your Funnel Diagnosis?",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      When you completed your assessment, you shared that your goal is:
      </p>

      <p><strong>${goal}</strong></p>

      <p>
      You also mentioned that one of your biggest challenges is:
      </p>

      <p><strong>${problem}</strong></p>

      <p>
      After reviewing your answers, one thing became clear:
      </p>

      <p>
      ${diagnosis}
      </p>

      <p>
      Your recommended next step is:
      <strong>${solution}</strong>
      </p>

      <br>

      <a href="${chatLink}">
      Continue My Strategy Session
      </a>
      `
    },


    1: {
      subject: "You Might Be Solving The Wrong Problem",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      One thing stood out from your assessment.
      </p>

      <p>
      Many business owners try to solve problems like:
      <strong>${problem}</strong>
      </p>

      <p>
      But the real issue is often not the effort.
      It's having the right system that turns attention into opportunities.
      </p>

      <p>
      Your assessment pointed toward:
      <strong>${solution}</strong>
      </p>

      <br>

      <a href="${chatLink}">
      Continue My Strategy Session
      </a>
      `
    },


    2: {
      subject: "What Happens If Nothing Changes?",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      A question worth considering:
      </p>

      <p>
      What happens if the challenge you identified:
      </p>

      <p>
      <strong>${problem}</strong>
      </p>

      <p>
      stays the same for the next 6 to 12 months?
      </p>

      <p>
      The goal is not just to fix a problem.
      It's to create a system that supports the future you want.
      </p>

      <a href="${chatLink}">
      Review My Strategy
      </a>
      `
    },


    3: {
      subject: "The Real Bottleneck Behind Growth",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      After analyzing your answers, the biggest opportunity is not simply getting more attention.
      </p>

      <p>
      It's creating a predictable process that guides prospects from interest to decision.
      </p>

      <p>
      That is where:
      <strong>${solution}</strong>
      comes in.
      </p>

      <a href="${chatLink}">
      Continue My Strategy Session
      </a>
      `
    },


    4: {
      subject: "A Possible Path Forward For Your Business",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      Based on your assessment, the direction is clear.
      </p>

      <p>
      The goal is:
      <strong>${goal}</strong>
      </p>

      <p>
      And the solution is creating a system that removes the bottleneck.
      </p>

      <a href="${chatLink}">
      See My Recommended Plan
      </a>
      `
    },


    5: {
      subject: "What If Your System Worked Automatically?",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      Imagine having a process that consistently helps turn interested people into conversations.
      </p>

      <p>
      That is the purpose of a properly designed funnel system.
      </p>

      <a href="${chatLink}">
      Continue My Strategy Session
      </a>
      `
    },


    6: {
      subject: "Is Solving This Still A Priority?",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      I wanted to check in.
      </p>

      <p>
      Is improving:
      <strong>${goal}</strong>
      still a priority for you?
      </p>

      <a href="${chatLink}">
      Yes, Show Me The Next Step
      </a>
      `
    },


    7: {
      subject: "Should We Close Your Strategy File?",

      html: `
      <h2>Hi ${lead.name},</h2>

      <p>
      It's been a while since your assessment.
      </p>

      <p>
      Before we close your strategy file, I wanted to ask:
      </p>

      <p>
      Is achieving:
      <strong>${goal}</strong>
      still important?
      </p>

      <a href="${chatLink}">
      I'm Still Interested
      </a>
      `
    }

  };


  return templates[stage] || templates[0];
}
module.exports = async function handler(req, res) {

  try {

    const supabaseURL = new URL(process.env.SUPABASE_URL);

    // Get all leads due for follow-up
    const dueLeads = await postJSON({
      hostname: supabaseURL.hostname,
      path:
        '/rest/v1/leads' +
        '?followup_active=eq.true' +
        '&next_followup_at=lte.' + encodeURIComponent(new Date().toISOString()),
      method: 'GET',
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    });

    console.log('Due leads found:', dueLeads.length);

    for (const lead of dueLeads) {

      const analysis = lead.full_analysis
        ? JSON.parse(lead.full_analysis)
        : {};

      const chatLink =
        `${req.headers.origin || 'https://ai-funnel-engine.vercel.app'}/chat?id=${lead.id}`;

      const emailContent = generateFollowupContent(
  lead,
  lead.followup_stage || 0
);

const subject = emailContent.subject;
const html = emailContent.html;

      await sendEmail(
        lead.email,
        subject,
        html
      );

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 7);

      await postJSON({
        hostname: supabaseURL.hostname,
        path: `/rest/v1/leads?id=eq.${lead.id}`,
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          'Prefer': 'return=representation'
        }
      }, {
        followup_stage: (lead.followup_stage || 0) + 1,
        last_email_sent_at: new Date().toISOString(),
        next_followup_at: nextDate.toISOString()
      });

      console.log('Follow-up sent to:', lead.email);
    }

    return res.status(200).json({
      success: true,
      processed: dueLeads.length
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      error: err.message
    });
  }
};
