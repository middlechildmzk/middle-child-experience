export default async function handler(req,res){
  const auth=req.headers.authorization||'';
  const upstream=await fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-network-admin',{
    method:req.method,
    headers:{Authorization:auth,'Content-Type':'application/json','User-Agent':'CuratorOS'},
    body:req.method==='POST'?JSON.stringify(req.body||{}):undefined
  });
  res.status(upstream.status).setHeader('Content-Type','application/json').send(await upstream.text());
}