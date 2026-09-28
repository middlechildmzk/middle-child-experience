
import { createClient } from "npm:@supabase/supabase-js@2";

const allowed = new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
function cors(origin:string|null){
  const allow = origin && allowed.has(origin) ? origin : "https://bvssfvm.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers":"content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin",
    "Content-Type":"application/json"
  };
}
function db(){
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const key=keys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key) throw new Error("Supabase secret key unavailable");
  return createClient(Deno.env.get("SUPABASE_URL")!,key,{auth:{persistSession:false}});
}
const valid=new Set(["playlist_view","spotify_click","submit_start"]);

Deno.serve(async(req)=>{
  const h=cors(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});
  try{
    const body=await req.json();
    const event_name=typeof body.event_name==="string"?body.event_name:"";
    const path=typeof body.path==="string"?body.path.slice(0,300):"";
    const slug=typeof body.playlist_slug==="string"?body.playlist_slug.slice(0,100):null;
    if(!valid.has(event_name)||!path.startsWith("/")) return new Response(JSON.stringify({error:"invalid_event"}),{status:400,headers:h});
    const supabase=db();
    let playlist_id=null;
    if(slug){
      const {data}=await supabase.from("bvss_playlists").select("id").eq("slug",slug).maybeSingle();
      playlist_id=data?.id||null;
    }
    let referrer_host=null;
    if(typeof body.referrer==="string"){
      try{referrer_host=new URL(body.referrer).hostname.slice(0,200);}catch{}
    }
    const utm=body.utm && typeof body.utm==="object" ? body.utm : {};
    const {error}=await supabase.from("bvss_web_events").insert({event_name,playlist_id,path,referrer_host,utm});
    if(error) throw error;
    return new Response(JSON.stringify({ok:true}),{status:202,headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"event_not_recorded"}),{status:500,headers:h});
  }
});
