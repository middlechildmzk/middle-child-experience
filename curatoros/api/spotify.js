export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const auth=req.headers.authorization||'';
  const upstream=await fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-spotify-owner',{
    method:'POST',
    headers:{Authorization:auth,'Content-Type':'application/json','User-Agent':'CuratorOS'},
    body:JSON.stringify(req.body||{})
  });
  res.status(upstream.status).setHeader('Content-Type','application/json').send(await upstream.text());
}
