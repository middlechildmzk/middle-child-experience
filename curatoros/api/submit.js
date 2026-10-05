export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const upstream=await fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-submit',{method:'POST',headers:{'Content-Type':'application/json','User-Agent':req.headers['user-agent']||'CuratorOS'},body:JSON.stringify(req.body||{})});
  const text=await upstream.text(); let body;
  try{body=JSON.parse(text);if(body.status_token)body.status_url='/submissions/status?token='+body.status_token}catch{body={error:'invalid_upstream_response'}}
  res.status(upstream.status).json(body);
}