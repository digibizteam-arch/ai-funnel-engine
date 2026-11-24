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



function generateReactivationContent(lead, stage) {

  const first =
    esc(String(lead.name || 'there').trim().split(/\s+/)[0] || 'there');

  const goal =
    esc(lead.goal || 'ang mga layunin mo');

  const problem =
    esc(lead.problem || 'ang mga hamong binanggit mo');

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
      subject: `${first}, may bago na akong ginagawa para sa mga financial advisor`,
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Noong sinagutan mo ang assessment ko, gusto mo ang <strong>${goal}</strong>, pero ang hamon mo ay <strong>${problem}</strong>.</p>
        <p>Mula noon, mas pinagtuunan ko na ang pagtulong sa mga financial advisor na makilala nang maayos online. Ito ang ginagawa ko ngayon:</p>
        <p>
          1. Isang AI short film na kuwento ng mga pinag-aalala ng mga kliyente mo<br>
          2. Personal advisor profile page na may lead capture<br>
          3. Follow-up emails para sa bawat bagong lead<br>
          4. AI sales chatbot na sinanay sa offer mo
        </p>
        <p>May bago na rin akong 2-minutong assessment na akma sa specialty mo, at libre ito.</p>
        ${button(quizLink, 'Take The New Assessment')}
      `)
    },

    {
      subject: 'Hindi kulang sa effort ang problema',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Maraming advisor ang nagpo-post at nagme-message nang tuloy-tuloy, pero ang hamon pa rin nila ay <strong>${problem}</strong>.</p>
        <p>Madalas, hindi kulang sa sipag. Kulang lang ang kuwentong nakakarelate ang prospect, at isang propesyonal na lugar kung saan ka nila makikilala.</p>
        <p>Sasabihin sa iyo ng bagong assessment kung saan ka maaaring nahihirapan at kung paano makakatulong ang AI film at advisor profile page. Walang ipinapangakong resulta, dahil nakadepende iyon sa positioning at consistency mo.</p>
        ${button(quizLink, 'Take The New Assessment')}
      `)
    },

    {
      subject: 'Nagbago na ba ang sitwasyon mo?',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Gusto ko lang kumustahin: ang <strong>${problem}</strong>, gumanda na ba, ganoon pa rin, o mas humirap?</p>
        <p>Kung gusto mong pag-usapan, mag-reply ka lang sa email na ito. Puwede ka ring kumuha ng bagong assessment para makita ang pinakabagong rekomendasyon para sa iyo.</p>
        ${button(quizLink, 'Take The New Assessment')}
      `)
    },

    {
      subject: `Quick check-in, ${first}`,
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Importante pa ba sa iyo ang <strong>${goal}</strong>?</p>
        <p>Kung oo, puwede nating pag-usapan kung paano ka makikilala nang mas propesyonal ng mga prospect mo, nang walang pilitan.</p>
        <p style="margin:16px 0;"><a href="${chatLink}" style="color:#0F766E;font-weight:bold;">Makipag-chat sa akin</a></p>
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
        <p>Noong sinagutan mo ang assessment ko, gusto mo ang <strong>${goal}</strong>.</p>
        <p>Gusto ko lang ipaalam na ang serbisyo ko ngayon ay nakatuon na sa mga financial advisor. Kung financial advisor ka, o may kakilala kang advisor na nahihirapang makakuha ng tamang prospects online, ito ang bagong libreng 2-minutong assessment namin.</p>
        <p>Kung hindi, walang problema. Salamat sa oras mo.</p>
        ${button(quizLink, 'See The New Assessment')}
      `)
    },

    {
      subject: 'Para sa mga financial advisor',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Ang ginagawa ko ngayon ay isang AI short film at personal profile page para sa mga financial advisor, para mas maayos silang makilala ng mga prospect nila.</p>
        <p>Kung may kakilala kang advisor na makikinabang dito, malaking tulong kung ibabahagi mo ang link na ito.</p>
        ${button(quizLink, 'See The New Assessment')}
      `)
    },

    {
      subject: 'Kumusta ka na?',
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Kumusta na ang <strong>${problem}</strong>? Kung gusto mong magkuwento, mag-reply ka lang sa email na ito.</p>
        <p>Kung financial advisor ka, nandito pa rin ang libreng assessment.</p>
        ${button(quizLink, 'See The New Assessment')}
      `)
    },

    {
      subject: `Quick check-in, ${first}`,
      html: emailShell(`
        <p>Hi ${first},</p>
        <p>Salamat sa pagsagot sa assessment ko noon. Kung financial advisor ka o may kakilala kang advisor, bukas pa rin ang libreng assessment.</p>
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
