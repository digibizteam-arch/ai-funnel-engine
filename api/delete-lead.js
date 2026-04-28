const https = require('https');

function deleteRequest(options) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                // Supabase returns 204 No Content on a successful delete
                if (res.statusCode === 204 || res.statusCode === 200) {
                    resolve({ success: true });
                } else {
                    reject(new Error('Delete failed: ' + data.slice(0, 200)));
                }
            });
        });
        req.on('error', reject);
        req.end(); // No body needed for DELETE
    });
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { lead_id } = req.body;

    if (!lead_id) {
        return res.status(400).json({ error: 'Missing lead_id' });
    }

    try {
        const supabaseURL = new URL(process.env.SUPABASE_URL);

        await deleteRequest({
            hostname: supabaseURL.hostname,
            path: `/rest/v1/leads?id=eq.${lead_id}`,
            method: 'DELETE',
            headers: {
                'apikey': process.env.SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
                'Prefer': 'return=minimal'
            }
        });

        return res.status(200).json({ success: true, message: 'Lead deleted' });
    } catch (err) {
        console.error('Supabase delete error:', err.message);
        return res.status(500).json({ error: 'Failed to delete lead: ' + err.message });
    }
};
