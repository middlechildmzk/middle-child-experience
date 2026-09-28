import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins=new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
const bucket="bvss-submission-audio";
function headers(origin:string|null){
  return {
    "Content-Type":"application/json",
    "Cache-Control":"no-store",
    "Access-Control-Allow-Origin":origin&&allowedOrigins.has(origin)?origin:"https://bvssfvm.com",
    "Access-Control-Allow-Headers":"authorization, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin"
  };
}
function keys(){
  const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const publishableKeys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
  return {
    secret:secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    publishable:publishableKeys.default||Deno.env.get("SUPABASE_ANON_KEY")
  };
}
function admin(){
  const {secret}=keys();
  if(!secret) throw new Error("secret_key_unavailable");
  return createClient(Deno.env.get("SUPABASE_URL")!,secret,{auth:{persistSession:false}});
}
async function auth(req:Request){
  const {publishable}=keys();
  if(!publishable) return null;
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token) return null;
  const client=createClient(Deno.env.get("SUPABASE_URL")!,publishable,{auth:{persistSession:false}});
  const {data:{user},error}=await client.auth.getUser(token);
  return error?null:user;
}
const clean=(v:unknown,max=240)=>typeof v==="string"?v.trim().slice(0,max):"";
const allowedMime=new Set(["audio/mpeg","audio/wav","audio/x-wav","audio/wave","audio/flac","audio/x-flac","audio/mp4","audio/x-m4a","audio/aac"]);
async function requesterHash(req:Request){
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
  const ua=req.headers.get("user-agent")||"unknown";
  const raw=new TextEncoder().encode(ip+"|"+ua+"|bvss-public");
  const digest=await crypto.subtle.digest("SHA-256",raw);
  return Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,"0")).join("");
}
function ext(name:string,mime:string){
  const fromName=(name.split(".").pop()||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  if(["mp3","wav","flac","m4a","aac"].includes(fromName)) return fromName;
  if(mime==="audio/mpeg") return "mp3";
  if(mime.includes("wav")) return "wav";
  if(mime.includes("flac")) return "flac";
  if(mime==="audio/aac") return "aac";
  return "m4a";
}

Deno.serve(async(req)=>{
  const h=headers(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});
  try{
    const body=await req.json();
    const action=clean(body.action,50);
    const db=admin();

    if(action==="init_upload"){
      const filename=clean(body.filename,180);
      const mime=clean(body.content_type,100).toLowerCase();
      const size=Number(body.size||0);
      if(!filename||!allowedMime.has(mime)) return new Response(JSON.stringify({error:"unsupported_audio_type"}),{status:400,headers:h});
      if(!Number.isFinite(size)||size<=0||size>104857600) return new Response(JSON.stringify({error:"file_size_invalid","max_bytes":104857600}),{status:400,headers:h});
      const requester_hash=await requesterHash(req);
      const since=new Date(Date.now()-60*60*1000).toISOString();
      const {count,error:countErr}=await db.from("bvss_public_rate_limits")
        .select("id",{count:"exact",head:true})
        .eq("requester_hash",requester_hash).eq("action","media_upload_slot").gte("occurred_at",since);
      if(countErr) throw countErr;
      if((count||0)>=8) return new Response(JSON.stringify({error:"rate_limited",retry_after_seconds:3600}),{status:429,headers:h});
      await db.from("bvss_public_rate_limits").insert({requester_hash,action:"media_upload_slot"});

      const id=crypto.randomUUID();
      const path="incoming/"+id+"."+ext(filename,mime);
      const {data,error}=await db.storage.from(bucket).createSignedUploadUrl(path);
      if(error) throw error;
      const {error:recordErr}=await db.from("bvss_media_uploads").insert({
        object_path:path,original_filename:filename,content_type:mime,file_size_bytes:size,requester_hash
      });
      if(recordErr) throw recordErr;
      return new Response(JSON.stringify({ok:true,path,token:data.token,signed_url:data.signedUrl,max_bytes:104857600}),{headers:h});
    }

    if(action==="download"){
      const user=await auth(req);
      if(!user) return new Response(JSON.stringify({error:"auth_required"}),{status:401,headers:h});
      const submissionId=clean(body.submission_id,80);
      if(!submissionId) return new Response(JSON.stringify({error:"submission_required"}),{status:400,headers:h});

      const [{data:adminRow},{data:curator}]=await Promise.all([
        db.from("bvss_admin_users").select("role").eq("user_id",user.id).maybeSingle(),
        db.from("bvss_curator_profiles").select("id,status").eq("user_id",user.id).maybeSingle()
      ]);

      let authorized=Boolean(adminRow);
      if(!authorized&&curator?.status==="approved"){
        const [{data:route},{data:entitlement}]=await Promise.all([
          db.from("bvss_submission_routes")
            .select("id").eq("submission_id",submissionId).eq("curator_id",curator.id)
            .in("status",["queued","opened","hold","accepted"]).maybeSingle(),
          db.from("bvss_curator_entitlements")
            .select("can_download_permitted_audio").eq("curator_id",curator.id).maybeSingle()
        ]);
        authorized=Boolean(route&&entitlement?.can_download_permitted_audio);
      }
      if(!authorized) return new Response(JSON.stringify({error:"not_authorized"}),{status:403,headers:h});

      const {data:s,error:sErr}=await db.from("bvss_submissions")
        .select("id,artist_name,song_title,download_source,download_object_path,download_external_url,download_permission")
        .eq("id",submissionId).maybeSingle();
      if(sErr) throw sErr;
      if(!s||!s.download_permission) return new Response(JSON.stringify({error:"download_not_permitted"}),{status:403,headers:h});

      let url:string|null=null;
      if(s.download_source==="upload"&&s.download_object_path){
        const safe=(s.artist_name+" - "+s.song_title).replace(/[^a-z0-9 _-]/gi,"").slice(0,100)||"submission";
        const {data,error}=await db.storage.from(bucket).createSignedUrl(s.download_object_path,900,{download:safe});
        if(error) throw error;
        url=data.signedUrl;
      } else if(s.download_source==="external"&&s.download_external_url){
        url=s.download_external_url;
      }
      if(!url) return new Response(JSON.stringify({error:"download_unavailable"}),{status:404,headers:h});

      await db.from("bvss_submission_download_events").insert({
        submission_id:s.id,
        curator_id:curator?.id||null,
        reviewer_user_id:user.id,
        metadata:{source:s.download_source}
      });
      return new Response(JSON.stringify({ok:true,url,expires_in:s.download_source==="upload"?900:null}),{headers:h});
    }

    return new Response(JSON.stringify({error:"unknown_action"}),{status:400,headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"media_request_failed",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});