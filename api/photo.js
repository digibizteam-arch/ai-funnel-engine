'use strict';

// ---------------------------------------------------------------
// GET /api/photo?id=<lead id>
//
// Serves the profile photo an advisor uploaded when their demo was
// generated, as a normal image link. That photo is saved inside the
// demo page as a very long inline image, which is awkward to paste
// into DashNex or directory.html. This short link points to the same
// photo, so one link can be used in both places.
//
// - Only the image is ever returned, never any other lead data.
// - If the advisor did not upload a photo (or anything goes wrong),
//   the visitor is sent to the sample photo instead of a broken image.
// ---------------------------------------------------------------

const https = require('https');

const DEFAULT_PHOTO_PATH = '/advisors/default.jpg';
const PHOTO_IN_HTML = /<img src="data:image\/jpeg;base64,([A-Za-z0-9+/]+={0,2})"/;
const MAX_PHOTO_BYTES = 400000;

function getJSON(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (response) => {
      let raw = '';
      response.on('data', (chunk) => { raw += chunk; });
      response.on('end', () => {
        if (response.statusCode >= 400) return reject(new Error('HTTP ' + response.statusCode));
        try { resolve(raw.trim() ? JSON.parse(raw) : []); }
        catch (_) { reject(new Error('Invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('Request timed out')));
    req.end();
  });
}

function useSamplePhoto(res, seconds) {
  res.statusCode = 302;
  res.setHeader('Location', DEFAULT_PHOTO_PATH);
  res.setHeader('Cache-Control', seconds ? `public, max-age=${seconds}` : 'no-store');
  res.end();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.statusCode = 405;
    res.setHeader('Allow', 'GET, HEAD');
    return res.end();
  }

  const id = String((req.query && req.query.id) || '').trim();

  // Lead ids are short letters, numbers and dashes. Anything else is not a real id.
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return useSamplePhoto(res, 300);

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return useSamplePhoto(res, 0);

  try {
    const supabaseURL = new URL(process.env.SUPABASE_URL);
    const key = process.env.SUPABASE_ANON_KEY;

    const rows = await getJSON({
      hostname: supabaseURL.hostname,
      path: `/rest/v1/leads?id=eq.${encodeURIComponent(id)}&select=demo_html&limit=1`,
      method: 'GET',
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });

    const html = Array.isArray(rows) && rows[0] && typeof rows[0].demo_html === 'string' ? rows[0].demo_html : '';
    const match = PHOTO_IN_HTML.exec(html);
    if (!match) return useSamplePhoto(res, 300);

    const bytes = Buffer.from(match[1], 'base64');
    const isJpeg = bytes.length > 4 && bytes.length <= MAX_PHOTO_BYTES &&
      bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (!isJpeg) return useSamplePhoto(res, 300);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Content-Length', String(bytes.length));
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch (err) {
    console.error('Photo lookup failed:', err.message);
    return useSamplePhoto(res, 0);
  }
};
