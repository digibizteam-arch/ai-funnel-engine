module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).json({
    supabase_url: process.env.SUPABASE_URL,
    supabase_key: process.env.SUPABASE_ANON_KEY
  });
};
