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

  const first    = esc(String(lead.name || 'there').trim().split(/\s+/)[0] || 'there');
  const goal     = esc(lead.goal || 'getting more of the right prospects online');
  const problem  = esc(lead.problem || 'turning your posts into real conversations');
  const diagnosis = esc(analysis.diagnosis || '');
  const solution = esc(analysis.solution_name || 'an AI Film and Advisor Profile Prospect-Attraction System');

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
        subject: `${lead.name ? String(lead.name).trim().split(/\s+/)[0] : 'Hi'}, your prospect-attraction diagnosis is still waiting`,
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Noong sinagutan mo ang assessment, ito ang gusto mong mangyari:</p>
          <p><strong>${goal}</strong></p>
          <p>At ito ang isa sa pinakamalaking hamon mo:</p>
          <p><strong>${problem}</strong></p>
          ${diagnosis ? `<p>Ito ang napansin ko sa mga sagot mo:</p><p>${diagnosis}</p>` : ''}
          <p>Nandito pa rin ang buong diagnosis mo, at puwede mo akong tanungin tungkol dito anytime.</p>
          ${button(chatLink, 'Continue My Conversation')}
        `)
      },
      {
        subject: 'Bakit hindi nagiging usapan ang mga post mo?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Maraming advisors ang nagpo-post nang tuloy-tuloy sa Facebook at nagme-message sa Messenger, pero hindi pa rin nagiging usapan ang mga ito.</p>
          <p>Madalas, hindi kulang sa effort. Kulang lang ang kuwentong nakakarelate ang prospect, at isang professional na lugar kung saan nila makikilala ka at makakapag-message sila.</p>
          <p>Doon pumapasok ang <strong>${solution}</strong>: isang AI short film na tumatalakay sa totoong pinag-aalala ng mga kliyente mo, at isang personal advisor profile page na puwede mong i-link sa kahit anong post.</p>
          <p>Wala akong ipinapangako na bilang ng leads o kliyente, dahil nakadepende iyon sa positioning at consistency mo. Pero mas propesyonal at mas madaling makilala ka.</p>
          ${button(chatLink, 'Ask Me How It Works')}
        `)
      },
      {
        subject: 'Isang professional na tahanan para sa kuwento mo',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Isipin mo: may isang link na puwede mong ilagay sa bawat post, story, o chat. Pagbukas ng prospect, nakikita nila agad ang profile mo, kung ano ang pinakamagaling mong gawin, at kung paano ka kakausapin.</p>
          <p>Iyon ang advisor profile page. Kasama nito ang lead capture, para may mapagsulatan ang interesadong prospect.</p>
          <p>Kung gusto mong makita kung paano ito babagay sa specialty mo, tanungin mo lang ako sa chat.</p>
          ${button(chatLink, 'Continue My Conversation')}
        `)
      }
    ],

    // ---------- Has a demo page, has not opened the chat ----------
    demo: [
      {
        subject: `${lead.name ? String(lead.name).trim().split(/\s+/)[0] : 'Hi'}, nakita mo na ba ang advisor profile page mo?`,
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Sa assessment mo, sinabi mong gusto mo ang <strong>${goal}</strong>, pero ang hamon mo ay <strong>${problem}</strong>.</p>
          <p>Kaya ginawan kita ng sample advisor profile page para makita mo kung paano ka lalabas sa mga prospect mo.</p>
          <p style="margin:16px 0;"><a href="${demoLink}" style="color:#0F766E;font-weight:bold;">Buksan ang demo profile page mo</a></p>
          <p>Demo pa lang ito. Kung gusto mong maging sarili mo na ang page na ito, pumunta ka lang sa chat at doon natin pag-usapan ang susunod na hakbang.</p>
          ${button(chatLink, 'I Want This As My Own Page')}
        `)
      },
      {
        subject: 'Ano ang kasama kapag naging sarili mo na ito?',
        html: emailShell(`
          <p>Hi ${first},</p>
          ${diagnosis ? `<p>Ito ang lumabas sa assessment mo:</p><p>${diagnosis}</p>` : ''}
          <p>Para masagot iyon, ito ang kasama kapag naging sarili mo na ang demo page mo:</p>
          <p>
            1. Isang AI short film na nakabase sa specialty mo at sa pinag-aalala ng mga kliyente mo<br>
            2. Personal advisor profile page na may lead capture at call-to-action buttons<br>
            3. Follow-up at nurture email sequence para sa bawat bagong lead<br>
            4. AI sales chatbot na sinanay sa offer mo
          </p>
          <p>Hindi ako nangangako ng followers, booked calls, o kliyente. Ang sinisiguro lang namin ay maayos at propesyonal ang pagpapakilala sa iyo online.</p>
          ${button(chatLink, 'Ask About The Next Step')}
        `)
      },
      {
        subject: 'Isang mabilis na tanong tungkol sa profile page mo',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Ang hamon mo ay <strong>${problem}</strong>. Gusto ko lang itanong: tama ba ang specialty at paraan ng pagpapakilala na nakita mo sa demo page mo?</p>
          <p>Kung may gusto kang baguhin o may tanong ka, mag-reply ka lang sa email na ito o dumiretso sa chat. Doon ko rin ipapaliwanag kung paano ito magiging sarili mo.</p>
          <p style="margin:16px 0;"><a href="${demoLink}" style="color:#0F766E;font-weight:bold;">Tingnan ulit ang demo page</a></p>
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
          <p>Nasimulan na natin ang usapan tungkol sa <strong>${problem}</strong>, at nandoon pa rin ang lahat ng napag-usapan natin.</p>
          ${diagnosis ? `<p>Paalala sa lumabas sa assessment mo:</p><p>${diagnosis}</p>` : ''}
          <p>Kung may natitira kang tanong, puwede mo itong ituloy kung saan tayo huminto.</p>
          ${button(chatLink, 'Continue My Chat')}
        `)
      },
      {
        subject: 'Ano ang pinakakinakabahan mo?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Natural na may mga tanong o alinlangan bago magdesisyon, lalo na kung ang gusto mo ay <strong>${goal}</strong>. Baka ito ay tungkol sa oras, sa proseso, o kung babagay ba ito sa specialty mo.</p>
          <p>Kung ano man iyon, sabihin mo lang sa chat o mag-reply ka sa email na ito. Sasagutin kita nang tapat, kahit hindi mo pa ito kukunin.</p>
          ${button(chatLink, 'Ask My Question')}
        `)
      },
      {
        subject: 'Gusto mo ba ng mabilis na proposal?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Para masagot ang <strong>${problem}</strong>, puwede kitang gawan ng mabilis na proposal sa chat para makita mo kung ano mismo ang kasama sa AI Marketing System for Financial Advisors. Mga 30 segundo lang ito.</p>
          <p>Walang obligasyon ang pagtingin. Ikaw pa rin ang magdedesisyon.</p>
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
          <p>Nandito pa rin ang proposal mo para sa <strong>AI Marketing System for Financial Advisors</strong>, na ginawa para sagutin ang <strong>${problem}</strong>. Puwede mo itong balikan anumang oras at basahin nang dahan-dahan.</p>
          ${button(proposalLink, 'Review My Proposal')}
        `)
      },
      {
        subject: 'May tanong ka ba tungkol sa proposal mo?',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Kung may hindi malinaw sa proposal, o may gusto kang linawin bago magdesisyon, mag-reply ka lang sa email na ito o dumaan sa chat.</p>
          <p>Kasama sa proposal: AI short film, advisor profile page na may lead capture, follow-up email sequence, at AI sales chatbot.</p>
          <p style="margin:16px 0;"><a href="${chatLink}" style="color:#0F766E;font-weight:bold;">Magtanong sa chat</a></p>
          ${button(proposalLink, 'Review My Proposal')}
        `)
      },
      {
        subject: 'Bumalik tayo sa assessment mo',
        html: emailShell(`
          <p>Hi ${first},</p>
          <p>Ang hinahanap mo ay <strong>${goal}</strong>, at ang pinakamalaking hamon mo ay <strong>${problem}</strong>.</p>
          <p>Ang proposal mo ay ginawa para sagutin mismo iyon, para mas maayos at mas propesyonal kang makilala ng mga prospect mo.</p>
          <p>Kung handa ka na, puwede mong pirmahan ang proposal. Kung may gusto ka pang linawin muna, pumunta ka lang sa chat at pag-usapan natin.</p>
          <p style="margin:16px 0;"><a href="${chatLink}" style="color:#0F766E;font-weight:bold;">Magtanong sa chat</a></p>
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
