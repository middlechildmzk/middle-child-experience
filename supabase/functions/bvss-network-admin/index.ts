import { createClient } from "npm:@supabase/supabase-js@2";

const origins=new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
function headers(origin:string|null){
  return {
    "Content-Type":"application/json","Cache-Control":"no-store",
    "Access-Control-Allow-Origin":origin&&origins.has(origin)?origin:"https://bvssfvm.com",
    "Access-Control-Allow-Headers":"authorization, content-type",
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS","Vary":"Origin"
  };
}
function keys(){
  const s=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const p=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
  return {secret:s.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),publishable:p.default||Deno.env.get("SUPABASE_ANON_KEY")};
}
async function auth(req:Request){
  const {secret,publishable}=keys();
  if(!secret||!publishable) throw new Error("keys_unavailable");
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token) return {error:"missing_auth",status:401};
  const client=createClient(Deno.env.get("SUPABASE_URL")!,publishable,{auth:{persistSession:false}});
  const {data:{user},error}=await client.auth.getUser(token);
  if(error||!user) return {error:"invalid_auth",status:401};
  const db=createClient(Deno.env.get("SUPABASE_URL")!,secret,{auth:{persistSession:false}});
  const {data:admin}=await db.from("bvss_admin_users").select("role").eq("user_id",user.id).maybeSingle();
  if(!admin) return {error:"not_authorized",status:403};
  return {db,user,role:admin.role};
}
const clean=(v:unknown,max=1000)=>typeof v==="string"?v.trim().slice(0,max):"";

async function payload(db:any){
  const [
    {data:curators,error:cErr},
    {data:claims,error:clErr},
    {data:reports,error:rErr},
    {data:facts,error:fErr}
  ]=await Promise.all([
    db.from("bvss_curator_profiles")
      .select("id,user_id,handle,display_name,contact_email,bio,website_url,spotify_profile_url,social_links,genres,moods,status,plan,public_profile,application_notes,terms_accepted_at,approved_at,created_at")
      .in("status",["pending","approved","suspended"]).order("created_at"),
    db.from("bvss_curator_playlist_claims")
      .select("id,curator_id,playlist_id,verification_code,verification_method,status,submitted_at,verified_at,notes,bvss_curator_profiles(handle,display_name,status),bvss_playlists(slug,canonical_name,spotify_url,primary_genre,verification_status)")
      .in("status",["pending","verified"]).order("submitted_at",{ascending:false}),
    db.from("bvss_network_reports")
      .select("id,reporter_user_id,curator_id,playlist_id,submission_id,category,detail,status,created_at")
      .in("status",["open","reviewing"]).order("created_at",{ascending:false}),
    db.from("bvss_curator_public_facts").select("*").order("display_name")
  ]);
  if(cErr) throw cErr;if(clErr) throw clErr;if(rErr) throw rErr;if(fErr) throw fErr;
  return {curators:curators||[],claims:claims||[],reports:reports||[],facts:facts||[]};
}

Deno.serve(async(req)=>{
  const h=headers(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  try{
    const a:any=await auth(req);
    if(a.error) return new Response(JSON.stringify({error:a.error}),{status:a.status,headers:h});
    const {db,user}=a;
    if(req.method==="GET") return new Response(JSON.stringify(await payload(db)),{headers:h});
    if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});

    const body=await req.json();
    const action=clean(body.action,60);

    if(action==="approve_curator"||action==="reject_curator"||action==="suspend_curator"){
      const curator_id=clean(body.curator_id,80);
      const status=action==="approve_curator"?"approved":action==="reject_curator"?"rejected":"suspended";
      const patch:any={status,application_notes:clean(body.notes,2000)||null};
      if(status==="approved"){patch.approved_at=new Date().toISOString();patch.approved_by=user.id;patch.public_profile=true;patch.suspended_at=null;patch.suspension_reason=null;}
      if(status==="suspended"){patch.suspended_at=new Date().toISOString();patch.suspension_reason=clean(body.notes,2000)||"Suspended by BVSS FVM";}
      const {data,error}=await db.from("bvss_curator_profiles").update(patch).eq("id",curator_id).select("id,handle,display_name,status,public_profile").maybeSingle();
      if(error) throw error;
      if(!data) return new Response(JSON.stringify({error:"curator_not_found"}),{status:404,headers:h});
      if(status==="approved"){
        await db.from("bvss_curator_entitlements").upsert({
          curator_id,plan:"beta",max_registered_playlists:5,max_monthly_routes:500,
          can_download_permitted_audio:true,analytics_level:"basic",
          features:{network_beta:true,playlist_verification:true,artist_downloads:true}
        },{onConflict:"curator_id"});
      }
      if(status==="suspended"){
        await db.from("bvss_playlists").update({network_routing_enabled:false,submission_status:"paused",website_status:"hidden"}).eq("curator_id",curator_id);
      }
      return new Response(JSON.stringify({ok:true,curator:data}),{headers:h});
    }

    if(action==="verify_claim"||action==="reject_claim"){
      const claim_id=clean(body.claim_id,80);
      const {data:claim,error:clErr}=await db.from("bvss_curator_playlist_claims")
        .select("id,curator_id,playlist_id,status,bvss_curator_profiles(status)")
        .eq("id",claim_id).maybeSingle();
      if(clErr) throw clErr;
      if(!claim) return new Response(JSON.stringify({error:"claim_not_found"}),{status:404,headers:h});
      if(action==="verify_claim"&&(claim.bvss_curator_profiles as any)?.status!=="approved")
        return new Response(JSON.stringify({error:"approve_curator_first"}),{status:409,headers:h});

      const verified=action==="verify_claim";
      const now=new Date().toISOString();
      const {error:uErr}=await db.from("bvss_curator_playlist_claims").update({
        status:verified?"verified":"rejected",verified_at:verified?now:null,verified_by:user.id,
        notes:clean(body.notes,2000)||null
      }).eq("id",claim.id);
      if(uErr) throw uErr;

      const playlistPatch:any=verified ? {
        verification_status:"verified",verified_at:now,verified_by:user.id,
        public_status:"public",website_status:"published",lifecycle_state:"active",
        submission_status:"open",network_routing_enabled:true
      } : {
        verification_status:"rejected",network_routing_enabled:false,submission_status:"paused",
        public_status:"private",website_status:"hidden"
      };
      const {data:playlist,error:pErr}=await db.from("bvss_playlists").update(playlistPatch)
        .eq("id",claim.playlist_id)
        .select("id,slug,canonical_name,verification_status,public_status,website_status,submission_status,network_routing_enabled").single();
      if(pErr) throw pErr;
      return new Response(JSON.stringify({ok:true,playlist}),{headers:h});
    }

    if(action==="resolve_report"){
      const report_id=clean(body.report_id,80);
      const status=clean(body.status,30);
      if(!["resolved","dismissed","reviewing"].includes(status)) return new Response(JSON.stringify({error:"invalid_report_status"}),{status:400,headers:h});
      const patch:any={status};
      if(["resolved","dismissed"].includes(status)){patch.resolved_at=new Date().toISOString();patch.resolved_by=user.id;}
      const {data,error}=await db.from("bvss_network_reports").update(patch).eq("id",report_id).select("id,status,resolved_at").maybeSingle();
      if(error) throw error;
      return new Response(JSON.stringify({ok:true,report:data}),{headers:h});
    }

    return new Response(JSON.stringify({error:"unknown_action"}),{status:400,headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"network_admin_failed",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});