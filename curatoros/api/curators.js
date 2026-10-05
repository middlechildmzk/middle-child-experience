export default async function handler(req,res){
  const url=new URL('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-curators-public');
  if(req.query.handle) url.searchParams.set('handle',String(req.query.handle));
  const upstream=await fetch(url,{headers:{'User-Agent':'CuratorOS'}});
  res.status(upstream.status).setHeader('Content-Type','application/json').send(await upstream.text());
}