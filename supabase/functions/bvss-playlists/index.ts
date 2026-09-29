
import { createClient } from "npm:@supabase/supabase-js@2";

const allowed = new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
function headers(origin:string|null){
  const allow = origin && allowed.has(origin) ? origin : "https://bvssfvm.com";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Vary":"Origin",
    "Content-Type":"application/json",
    "Cache-Control":"no-store, max-age=0"
  };
}
function admin(){
  const keys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const key = keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key) throw new Error("Supabase secret key unavailable");
  return createClient(Deno.env.get("SUPABASE_URL")!, key, {auth:{persistSession:false}});
}
Deno.serve(async (req)=>{
  const h=headers(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  if(req.method!=="GET") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});
  try{
    const db=admin();
    const url=new URL(req.url);
    const slug=url.searchParams.get("slug");
    let q=db.from("bvss_playlists").select("id,slug,spotify_playlist_id,spotify_uri,spotify_url,canonical_name,subtitle,description,cover_asset_url,primary_genre,secondary_genres,moods,activities,seo_keywords,anchor_artists,target_track_count,current_track_count,current_follower_count,follower_count_source,follower_count_observed_at,last_editorial_update_at,submission_status,update_cadence,middle_child_eligible,subflower_eligible,lifecycle_state,curation_philosophy,submission_criteria,display_order,updated_at,network_owner_type,curator_id,verification_status,network_routing_enabled,bvss_curator_profiles(handle,display_name,status,public_profile)")
      .eq("public_status","public").eq("website_status","published").neq("lifecycle_state","archived").order("display_order");
    if(slug) q=q.eq("slug",slug).limit(1);
    const {data,error}=await q;
    if(error) throw error;
    if(slug && (!data || !data.length)) return new Response(JSON.stringify({error:"not_found"}),{status:404,headers:h});
    // Attach follower source health so pages can say "Measuring" or "Last
    // measured" instead of presenting stale or unconfirmed values as current.
    // Tolerates the provenance migration not being applied yet.
    if(data && data.length){
      const {data:health,error:healthError}=await db.from("bvss_playlist_source_status")
        .select("playlist_id,last_request_status,last_provider_measured_at,last_value,previous_provider_measured_at,previous_value,consecutive_unchanged_measurements,freshness_state,confidence,value_state,last_attempt_at")
        .eq("provider","soundcharts").eq("metric","followers").in("playlist_id",data.map((p:any)=>p.id));
      if(!healthError){
        const byPlaylist=new Map((health||[]).map((row:any)=>{const {playlist_id,...rest}=row;return [playlist_id,rest];}));
        for(const p of data as any[]) p.follower_health=byPlaylist.get(p.id)||null;
      }
    }
    if(slug){
      const playlist=data![0];
      const {data:tracks}=await db.from("bvss_playlist_tracks").select("spotify_track_id,track_name,artists,spotify_url,artwork_url,position,added_at")
        .eq("playlist_id",playlist.id).eq("is_active",true).order("position").limit(12);
      return new Response(JSON.stringify({playlist,highlights:tracks||[]}),{headers:h});
    }
    return new Response(JSON.stringify({playlists:data||[],count:data?.length||0}),{headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"playlist_registry_unavailable",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});
