const https = require('https');

function postJSON(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(new Error('Parse fail')); } });
    });
    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { lead } = req.body;
  if (!lead) return res.status(400).json({ error: 'Missing lead data' });

  const prompt = `You are an elite funnel strategist. Generate a complete client acquisition strategy for:

Role: ${lead.role || lead.business_name || 'Business owner'}
Offer: ${lead.offer_name || 'Service'}
Ideal Client: ${lead.ideal_client || 'Not specified'}
Main Problem: ${lead.problem || lead.challenge || 'Not specified'}
Goal: ${lead.goal || 'Not specified'}
Transformation: ${lead.offer_transform || 'Not specified'}
Buying Intent: ${lead.buying_intent || 'warm'}
Opportunity Score: ${lead.opportunity_score || '5'}/10

Use ## headings for these exact sections:
## Primary Headline
One powerful 8-12 word headline targeting their ideal client's exact pain

## Pain Points to Address
3 specific bullet points their ideal client feels daily

## Recommended Funnel Structure
5 numbered steps with page name and purpose

## Follow-up Message Day 2
Full ready-to-use message (warm, value-first, conversational)

## Follow-up Message Day 7
Full ready-to-use message (gentle urgency, outcome-focused)

## Closing Notes
2-3 sentences on the best approach to close this specific lead

Premium tone. Specific to their niche. No fluff. No clichés.`;

  try {
    const aiRes = await postJSON({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
    }, {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.75,
      max_tokens: 800
    });

    if (aiRes.error) return res.status(500).json({ error: aiRes.error.message });
    const strategy = aiRes.choices?.[0]?.message?.content?.trim();
    return res.status(200).json({ strategy });
  } catch(err) {
    return res.status(500).json({ error: err.message });
  }
};
