export default async function handler(req,res){
  const q=String(req.query.q||'').trim();
  const upstream=await fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-track-lookup?q='+encodeURIComponent(q),{headers:{'User-Agent':'CuratorOS'}});
  res.status(upstream.status).setHeader('Content-Type','application/json').send(await upstream.text());
}