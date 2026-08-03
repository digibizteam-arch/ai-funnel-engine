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

      const subject =
        `Quick Follow-Up About Your Funnel Strategy`;

      const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;margin:auto;padding:20px">

        <h2>Hi ${lead.name},</h2>

        <p>
          A few days ago you completed the Funnel Assessment.
        </p>

        <p>
          One thing that stood out was your goal:
          <strong>${lead.goal || 'Grow your business'}</strong>
        </p>

        <p>
          You also mentioned your biggest challenge is:
          <strong>${lead.problem || 'Generating consistent results'}</strong>
        </p>

        <p>
          Based on your diagnosis, the recommended solution was:
        </p>

        <p>
          <strong>${lead.solution_name || 'A Better Funnel System'}</strong>
        </p>

        <p>
          Most business owners never solve the real bottleneck because they stay focused on tactics instead of fixing the system behind the problem.
        </p>

        <div style="margin-top:30px;text-align:center;">
          <a
            href="${chatLink}"
            style="
              background:#0F766E;
              color:white;
              padding:15px 25px;
              border-radius:8px;
              text-decoration:none;
              display:inline-block;
              font-weight:bold;
            ">
            Continue My Strategy Session
          </a>
        </div>

      </div>
      `;

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
