export default async function handler(req,res){
  const token=String(req.query.token||'');
  const upstream=await fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-submission-status?token='+encodeURIComponent(token),{headers:{'User-Agent':'CuratorOS'}});
  res.status(upstream.status).setHeader('Content-Type','application/json').send(await upstream.text());
}