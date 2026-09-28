import { createClient } from "npm:@supabase/supabase-js@2";

function headers(){
  return {"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS"};
}
function db(){
  const s=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const key=s.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key) throw new Error("secret_key_unavailable");
  return createClient(Deno.env.get("SUPABASE_URL")!,key,{auth:{persistSession:false}});
}
Deno.serve(async(req)=>{
  const h=headers();
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  if(req.method!=="GET") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});
  try{
    const url=new URL(req.url);
    const token=(url.searchParams.get("token")||"").trim();
    if(!/^[0-9a-f-]{36}$/i.test(token)) return new Response(JSON.stringify({error:"invalid_token"}),{status:400,headers:h});
    const supabase=db();
    const {data:s,error}=await supabase.from("bvss_submissions")
      .select("id,artist_name,song_title,release_state,spotify_url,source_url,source_platform,release_date,genre,status,submitted_at,updated_at,network_opt_in,artist_status_token")
      .eq("artist_status_token",token).maybeSingle();
    if(error) throw error;
    if(!s) return new Response(JSON.stringify({error:"not_found"}),{status:404,headers:h});
    const [{data:events},{data:routes}]=await Promise.all([
      supabase.from("bvss_submission_status_events").select("event_type,public_label,public_detail,created_at").eq("submission_id",s.id).order("created_at"),
      supabase.from("bvss_submission_routes")
        .select("status,decision,routed_at,decided_at,bvss_playlists(canonical_name,network_owner_type)")
        .eq("submission_id",s.id).order("routed_at")
    ]);
    const sanitizedRoutes=(routes||[]).map((r:any)=>({
      playlist_name:r.bvss_playlists?.canonical_name||"Playlist",
      network_owner_type:r.bvss_playlists?.network_owner_type||"bvss",
      status:r.status,
      decision:r.decision,
      routed_at:r.routed_at,
      decided_at:r.decided_at
    }));
    const acceptedRoutes=sanitizedRoutes.filter((route:any)=>route.decision==="accept").length;
    const activeRoutes=sanitizedRoutes.filter((route:any)=>["queued","opened","hold"].includes(route.status)).length;
    const displayStatus=acceptedRoutes>0
      ? "accepted_by_curator"
      : activeRoutes>0
        ? "in_review"
        : s.status;

    return new Response(JSON.stringify({
      submission:{
        artist_name:s.artist_name,song_title:s.song_title,release_state:s.release_state,spotify_url:s.spotify_url,
        source_url:s.source_url,source_platform:s.source_platform,release_date:s.release_date,
        genre:s.genre,status:s.status,display_status:displayStatus,submitted_at:s.submitted_at,updated_at:s.updated_at,network_opt_in:s.network_opt_in
      },
      events:events||[],
      routes:sanitizedRoutes
    }),{headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"status_unavailable",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});