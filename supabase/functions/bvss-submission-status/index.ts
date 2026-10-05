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
    const [{data:events},{data:routes},{data:placements}]=await Promise.all([
      supabase.from("bvss_submission_status_events").select("event_type,public_label,public_detail,created_at").eq("submission_id",s.id).order("created_at"),
      supabase.from("bvss_submission_routes")
        .select("id,status,decision,routed_at,decided_at,placement_id,bvss_playlists(slug,canonical_name,network_owner_type)")
        .eq("submission_id",s.id).order("routed_at"),
      supabase.from("bvss_playlist_placements")
        .select("id,route_id,status,scheduled_for,accepted_at,added_reported_at,verified_live_at,placed_at,actual_position,verification_source,verification_evidence,ended_at,end_reason")
        .eq("submission_id",s.id)
    ]);
    const placementByRoute=new Map((placements||[]).map((p:any)=>[p.route_id,p]));
    const sanitizedRoutes=(routes||[]).map((r:any)=>{
      const p:any=placementByRoute.get(r.id)||null;
      return {
        route_id:r.id,
        playlist_name:r.bvss_playlists?.canonical_name||"Playlist",
        playlist_slug:r.bvss_playlists?.slug||null,
        network_owner_type:r.bvss_playlists?.network_owner_type||"bvss",
        status:r.status,
        decision:r.decision,
        routed_at:r.routed_at,
        decided_at:r.decided_at,
        placement:p?{
          status:p.status,
          scheduled_for:p.scheduled_for,
          accepted_at:p.accepted_at,
          added_reported_at:p.added_reported_at,
          verified_live_at:p.verified_live_at,
          placed_at:p.placed_at,
          actual_position:p.actual_position,
          verification_source:p.verification_source,
          evidence:p.verification_evidence?{
            observed_at:p.verification_evidence.observed_at||p.verified_live_at||null,
            position:p.verification_evidence.position??p.actual_position??null,
            method:p.verification_evidence.method||p.verification_source||null,
            snapshot_id:p.verification_evidence.snapshot_id||null
          }:null,
          ended_at:p.ended_at,
          end_reason:p.end_reason
        }:null
      };
    });
    const acceptedRoutes=sanitizedRoutes.filter((route:any)=>route.decision==="accept").length;
    const activeRoutes=sanitizedRoutes.filter((route:any)=>["queued","opened","hold"].includes(route.status)).length;
    const liveRoutes=sanitizedRoutes.filter((route:any)=>route.placement?.status==="live").length;
    const pendingVerification=sanitizedRoutes.filter((route:any)=>route.placement?.status==="pending_verification").length;
    const displayStatus=liveRoutes>0
      ? "verified_live"
      : pendingVerification>0
        ? "pending_verification"
        : acceptedRoutes>0
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