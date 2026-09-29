import { createClient } from "npm:@supabase/supabase-js@2";
import { assessMetric } from "../_shared/source-health.ts";

// Follower assessment for a rollup/playlist row, recomputed at request time
// from the provider measurement timestamp (see _shared/source-health.ts).
function assessFollowers(p:any){
  const h=p.follower_health;
  const same=h&&h.last_provider_measured_at&&p.follower_count_observed_at
    &&new Date(h.last_provider_measured_at).getTime()===new Date(p.follower_count_observed_at).getTime();
  return assessMetric({
    value:p.current_follower_count==null?null:Number(p.current_follower_count),
    measuredAt:p.follower_count_observed_at||null,
    previousValue:same&&h.previous_value!=null?Number(h.previous_value):null,
    previousMeasuredAt:same?h.previous_provider_measured_at:null,
    requestStatus:h?.last_request_status,
    consecutiveUnchanged:same?Number(h.consecutive_unchanged_measurements||0):0,
  },new Date());
}

const HEALTH_COLUMNS="playlist_id,last_request_status,last_provider_measured_at,last_value,previous_provider_measured_at,previous_value,consecutive_unchanged_measurements,freshness_state,confidence,value_state,reason,last_attempt_at";

async function attachFollowerHealth(admin:any, rows:any[], idKey:string){
  if(!rows.length) return rows;
  const {data,error}=await admin.from("bvss_playlist_source_status").select(HEALTH_COLUMNS)
    .eq("provider","soundcharts").eq("metric","followers").in("playlist_id",rows.map((r:any)=>r[idKey]));
  if(error) return rows; // provenance migration not applied yet
  const byId=new Map((data||[]).map((row:any)=>[row.playlist_id,row]));
  return rows.map((r:any)=>({...r,follower_health:byId.get(r[idKey])||null}));
}

function jsonHeaders(origin?: string | null){
  const allowed = new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
  return {
    "Content-Type":"application/json",
    "Cache-Control":"no-store",
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : "https://bvssfvm.com",
    "Access-Control-Allow-Headers":"authorization, content-type",
    "Access-Control-Allow-Methods":"GET, POST, OPTIONS",
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

async function auth(req:Request){
  const {secret,publishable}=keys();
  if(!secret||!publishable) throw new Error("Supabase keys unavailable");
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token) return {error:"missing_auth",status:401};
  const userClient=createClient(Deno.env.get("SUPABASE_URL")!,publishable,{auth:{persistSession:false}});
  const {data:{user},error}=await userClient.auth.getUser(token);
  if(error||!user) return {error:"invalid_auth",status:401};
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,secret,{auth:{persistSession:false}});
  const {data:adminRow}=await admin.from("bvss_admin_users").select("role").eq("user_id",user.id).maybeSingle();
  if(!adminRow) return {error:"not_authorized",status:403};
  return {admin,user,role:adminRow.role};
}

function ageDays(value:string|null|undefined){
  if(!value) return null;
  const ms=Date.now()-new Date(value).getTime();
  return Number.isFinite(ms)?Math.max(0,Math.floor(ms/86400000)):null;
}

function cadenceLimit(cadence:string|null|undefined){
  const c=(cadence||"weekly").toLowerCase();
  if(c.includes("daily")) return 2;
  if(c.includes("biweekly")||c.includes("bi-weekly")) return 18;
  if(c.includes("monthly")) return 40;
  return 10;
}

function buildActions(playlists:any[], integrations:any[]){
  const actions:any[]=[];
  for(const p of playlists||[]){
    const stale=ageDays(p.last_editorial_update_at);
    if(Number(p.submissions_waiting||0)>0){
      actions.push({
        priority:"high",type:"review_queue",playlist_slug:p.slug,playlist_name:p.canonical_name,
        title:"Review "+p.submissions_waiting+" waiting submission"+(Number(p.submissions_waiting)===1?"":"s"),
        detail:"Clear the curator queue while the submission context is fresh."
      });
    }
    if(stale==null || stale>cadenceLimit(p.update_cadence)){
      actions.push({
        priority:stale==null?"medium":"high",type:"editorial_refresh",playlist_slug:p.slug,playlist_name:p.canonical_name,
        title:"Editorial refresh due",
        detail:stale==null?"No editorial update has been recorded yet.":stale+" days since the last recorded playlist refresh."
      });
    }
    if(p.current_track_count==null){
      actions.push({
        priority:"medium",type:"track_baseline",playlist_slug:p.slug,playlist_name:p.canonical_name,
        title:"Record track-count baseline",
        detail:"Track inventory is not measured yet. Add a baseline now; Spotify sync can replace manual entry later."
      });
    }
    if(p.current_follower_count==null){
      actions.push({
        priority:"medium",type:"follower_baseline",playlist_slug:p.slug,playlist_name:p.canonical_name,
        title:"Record follower baseline",
        detail:"Follower history cannot start until the first observed count is stored."
      });
    } else {
      const a=assessFollowers(p);
      const when=p.follower_count_observed_at?String(p.follower_count_observed_at).slice(0,10):"unknown";
      if(a.valueState==="unmeasured_zero"){
        actions.push({
          priority:"medium",type:"follower_unconfirmed",playlist_slug:p.slug,playlist_name:p.canonical_name,
          title:"Confirm follower count",
          detail:"The provider last measured "+when+" and reports 0 with nothing to corroborate it, so it shows as Measuring. Record a manual baseline from the Spotify app if the playlist has followers."
        });
      } else if(a.valueState==="stale"){
        actions.push({
          priority:"high",type:"follower_stale",playlist_slug:p.slug,playlist_name:p.canonical_name,
          title:"Follower data is stale",
          detail:"Last provider measurement was "+when+". The stored count is shown as out of date until a fresh measurement arrives."
        });
      } else if(a.valueState==="anomalous"){
        actions.push({
          priority:"low",type:"follower_anomaly",playlist_slug:p.slug,playlist_name:p.canonical_name,
          title:"Spot-check a large follower change",
          detail:a.reason+" Growth metrics skip this value until it is confirmed."
        });
      }
    }
  }

  const integrationMap=new Map((integrations||[]).map((i:any)=>[i.provider,i]));
  const hasFollowerFeed=["spotontrack","soundcharts","chartmetric"].some((name)=>integrationMap.get(name)?.status==="ready");
  if(!hasFollowerFeed){
    actions.push({
      priority:"medium",type:"integration",playlist_slug:null,playlist_name:null,
      title:"Connect an automated follower-history source",
      detail:"SpotOnTrack, Soundcharts or Chartmetric can replace manual follower snapshots when credentials are available."
    });
  }
  if(integrationMap.get("google_search_console")?.status!=="ready"){
    actions.push({
      priority:"medium",type:"integration",playlist_slug:null,playlist_name:null,
      title:"Connect Google Search Console",
      detail:"Search impressions, queries, clicks and average position are currently unmeasured."
    });
  }

  const rank:any={high:0,medium:1,low:2};
  return actions.sort((a,b)=>(rank[a.priority]??9)-(rank[b.priority]??9)||String(a.playlist_name||"").localeCompare(String(b.playlist_name||"")));
}

async function fetchMetricHistory(admin:any){
  const rows:any[]=[];
  const pageSize=1000;
  for(let from=0;from<50000;from+=pageSize){
    const {data,error}=await admin.from("bvss_playlist_metric_snapshots")
      .select("playlist_id,metric_date,followers,track_count,source,observed_at")
      .order("metric_date",{ascending:true})
      .order("observed_at",{ascending:true})
      .range(from,from+pageSize-1);
    if(error) throw error;
    rows.push(...(data||[]));
    if(!data || data.length<pageSize) break;
  }
  return rows;
}

async function dashboard(admin:any){
  const since30=new Date(Date.now()-30*86400000).toISOString();
  const [
    {data:playlistsRaw,error:pErr},
    {data:subs,error:sErr},
    {data:integrations,error:iErr},
    history,
    {data:webEvents,error:wErr},
    {data:recentSubmissions,error:rsErr},
    {data:trackEvents,error:tErr},
    {data:syncRuns,error:srErr}
  ]=await Promise.all([
    admin.from("bvss_playlist_daily_rollup").select("*").eq("lifecycle_state","active").order("canonical_name"),
    admin.from("bvss_submissions")
      .select("id,artist_name,email,song_title,release_state,spotify_url,spotify_track_id,source_url,source_platform,artwork_url,private_stream_url,download_source,download_permission,release_date,genre,moods,comparable_artists,is_explicit,notes,status,submission_source,submitted_at,updated_at")
      .in("status",["pending","in_review","hold"]).order("submitted_at",{ascending:true}).limit(200),
    admin.from("bvss_integrations").select("provider,status,capabilities,last_sync_at,notes,updated_at").order("provider"),
    fetchMetricHistory(admin),
    admin.from("bvss_web_events")
      .select("event_name,playlist_id,path,referrer_host,utm,occurred_at")
      .gte("occurred_at",since30).order("occurred_at",{ascending:false}).limit(5000),
    admin.from("bvss_submissions")
      .select("id,status,submission_source,submitted_at")
      .gte("submitted_at",since30).order("submitted_at",{ascending:false}).limit(5000),
    admin.from("bvss_playlist_track_events")
      .select("id,playlist_id,spotify_track_id,event_type,old_position,new_position,event_at,source,metadata,bvss_playlists(slug,canonical_name)")
      .order("event_at",{ascending:false}).limit(300),
    admin.from("bvss_sync_runs")
      .select("id,provider,sync_type,status,playlist_id,requested_at,completed_at,records_seen,records_written,error_summary,metadata")
      .order("requested_at",{ascending:false}).limit(100)
  ]);
  if(pErr) throw pErr; if(sErr) throw sErr; if(iErr) throw iErr; if(wErr) throw wErr; if(rsErr) throw rsErr; if(tErr) throw tErr; if(srErr) throw srErr;
  const playlists=await attachFollowerHealth(admin, playlistsRaw||[], "playlist_id");

  const pids=(subs||[]).map((s:any)=>s.id);
  let matches:any[]=[];
  if(pids.length){
    const {data,error}=await admin.from("bvss_submission_matches")
      .select("submission_id,score,reasons,rank,playlist_id,bvss_playlists(slug,canonical_name)")
      .in("submission_id",pids).order("rank");
    if(error) throw error;
    matches=data||[];
  }
  const matchBy=new Map<string,any[]>();
  for(const m of matches){
    const a=matchBy.get(m.submission_id)||[];
    a.push(m);
    matchBy.set(m.submission_id,a);
  }
  const queue=(subs||[]).map((s:any)=>({...s,suggested_matches:matchBy.get(s.id)||[]}));

  const historyBy:Record<string,any[]>={};
  for(const point of history||[]){
    (historyBy[point.playlist_id] ||= []).push(point);
  }

  const totals=(playlists||[]).reduce((acc:any,p:any)=>{
    acc.playlists+=1;
    const a=assessFollowers(p);
    if(a.displayValue!=null&&(a.valueState==="measured"||a.valueState==="anomalous")){
      acc.followers_known_playlists+=1;
      acc.followers+=a.displayValue;
    }
    if(a.freshness==="fresh"&&a.valueState==="measured") acc.followers_fresh_playlists+=1;
    if(a.valueState==="unmeasured_zero"||a.valueState==="unavailable"||a.valueState==="stale") acc.followers_unconfirmed_playlists+=1;
    if(p.current_track_count!=null) acc.track_count_known_playlists+=1;
    acc.submissions_waiting+=Number(p.submissions_waiting||0);
    acc.active_placements+=Number(p.active_placements||0);
    acc.own_artist_placements+=Number(p.own_artist_placements||0);
    acc.pageviews_30d+=Number(p.pageviews_30d||0);
    acc.spotify_clicks_30d+=Number(p.spotify_clicks_30d||0);
    acc.search_impressions_30d+=Number(p.search_impressions_30d||0);
    acc.search_clicks_30d+=Number(p.search_clicks_30d||0);
    return acc;
  },{
    playlists:0,followers:0,followers_known_playlists:0,followers_fresh_playlists:0,followers_unconfirmed_playlists:0,track_count_known_playlists:0,submissions_waiting:0,
    active_placements:0,own_artist_placements:0,pageviews_30d:0,spotify_clicks_30d:0,
    search_impressions_30d:0,search_clicks_30d:0
  });

  const attributionByPlaylist=new Map<string,any>();
  for(const p of playlists||[]){
    attributionByPlaylist.set(p.playlist_id,{
      playlist_id:p.playlist_id,
      slug:p.slug,
      canonical_name:p.canonical_name,
      views:0,
      spotify_clicks:0,
      submit_starts:0,
      submit_completes:0
    });
  }
  const trafficMap=new Map<string,any>();
  for(const event of webEvents||[]){
    if(event.playlist_id && attributionByPlaylist.has(event.playlist_id)){
      const row=attributionByPlaylist.get(event.playlist_id);
      if(event.event_name==="playlist_view") row.views+=1;
      if(event.event_name==="spotify_click") row.spotify_clicks+=1;
      if(event.event_name==="submit_start") row.submit_starts+=1;
      if(event.event_name==="submit_complete") row.submit_completes+=1;
    }
    const utmSource=event.utm && typeof event.utm==="object" && typeof event.utm.utm_source==="string"
      ? event.utm.utm_source.trim().slice(0,120)
      : "";
    const source=utmSource || event.referrer_host || "direct / unknown";
    const traffic=trafficMap.get(source)||{source,events:0,views:0,spotify_clicks:0,submit_starts:0,submit_completes:0};
    traffic.events+=1;
    if(event.event_name==="playlist_view") traffic.views+=1;
    if(event.event_name==="spotify_click") traffic.spotify_clicks+=1;
    if(event.event_name==="submit_start") traffic.submit_starts+=1;
    if(event.event_name==="submit_complete") traffic.submit_completes+=1;
    trafficMap.set(source,traffic);
  }
  const playlist_attribution=Array.from(attributionByPlaylist.values()).map((row:any)=>({
    ...row,
    spotify_ctr:row.views?row.spotify_clicks/row.views:null,
    submission_rate:row.views?row.submit_completes/row.views:null
  })).sort((a:any,b:any)=>b.views-a.views||b.spotify_clicks-a.spotify_clicks||a.canonical_name.localeCompare(b.canonical_name));

  const sourceMap=new Map<string,any>();
  for(const submission of recentSubmissions||[]){
    const source=submission.submission_source||"unknown";
    const row=sourceMap.get(source)||{source,total:0,accepted:0,rejected:0,hold:0,pending:0};
    row.total+=1;
    if(submission.status==="accepted") row.accepted+=1;
    else if(submission.status==="rejected") row.rejected+=1;
    else if(submission.status==="hold") row.hold+=1;
    else row.pending+=1;
    sourceMap.set(source,row);
  }

  const {data:legacyPlaylists,error:legacyErr}=await admin.from("bvss_playlists")
    .select("id,slug,spotify_playlist_id,spotify_url,canonical_name,description,cover_asset_url,primary_genre,source_metadata,current_follower_count,follower_count_observed_at,current_track_count")
    .eq("lifecycle_state","experimental")
    .eq("website_status","hidden")
    .order("display_order");
  if(legacyErr) throw legacyErr;

  return {
    totals,
    playlists:playlists||[],
    metrics_history:historyBy,
    queue,
    integrations:integrations||[],
    actions:buildActions(playlists||[],integrations||[]),
    playlist_attribution,
    traffic_sources:Array.from(trafficMap.values()).sort((a:any,b:any)=>b.events-a.events),
    submission_sources:Array.from(sourceMap.values()).sort((a:any,b:any)=>b.total-a.total),
    track_events:trackEvents||[],
    sync_runs:syncRuns||[],
    legacy_playlists:await attachFollowerHealth(admin, legacyPlaylists||[], "id")
  };
}

Deno.serve(async(req)=>{
  const headers=jsonHeaders(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers});
  try{
    const a:any=await auth(req);
    if(a.error) return new Response(JSON.stringify({error:a.error}),{status:a.status,headers});
    const admin=a.admin;

    if(req.method==="GET"){
      return new Response(JSON.stringify(await dashboard(admin)),{headers});
    }
    if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers});

    const body=await req.json();
    const action=typeof body.action==="string"?body.action:"";

    if(action==="record_metric"){
      const playlist_slug=String(body.playlist_slug||"").trim();
      const followerRaw=body.followers;
      const trackRaw=body.track_count;
      const followers=followerRaw==null||followerRaw===""?null:Number(followerRaw);
      const track_count=trackRaw==null||trackRaw===""?null:Number(trackRaw);
      if(!playlist_slug || (followers==null && track_count==null))
        return new Response(JSON.stringify({error:"metric_value_required"}),{status:400,headers});
      if((followers!=null&&(!Number.isInteger(followers)||followers<0))||(track_count!=null&&(!Number.isInteger(track_count)||track_count<0)))
        return new Response(JSON.stringify({error:"invalid_metric_value"}),{status:400,headers});

      const {data:p,error:pErr}=await admin.from("bvss_playlists")
        .select("id,slug,canonical_name,current_follower_count,current_track_count")
        .eq("slug",playlist_slug).maybeSingle();
      if(pErr) throw pErr;
      if(!p) return new Response(JSON.stringify({error:"playlist_not_found"}),{status:404,headers});

      const today=new Date().toISOString().slice(0,10);
      const observed_at=new Date().toISOString();
      // A person reading the Spotify app is a measurement taken now: the
      // measurement and retrieval times are the same moment by definition.
      const snapshot:any={
        playlist_id:p.id,metric_date:today,followers,track_count,source:"manual_admin",
        source_ref:a.user.id,observed_at,
        provider_measured_at:observed_at,retrieved_at:observed_at,measurement_basis:"manual",
        raw_data:{entered_by:a.user.email||a.user.id,method:"playlist_os_manual_baseline"}
      };
      const {error:sErr}=await admin.from("bvss_playlist_metric_snapshots")
        .upsert(snapshot,{onConflict:"playlist_id,metric_date,source"});
      if(sErr) throw sErr;

      const patch:any={updated_at:observed_at};
      if(followers!=null){
        patch.current_follower_count=followers;
        patch.follower_count_source="manual_admin";
        patch.follower_count_observed_at=observed_at;
      }
      if(track_count!=null) patch.current_track_count=track_count;
      const {error:uErr}=await admin.from("bvss_playlists").update(patch).eq("id",p.id);
      if(uErr) throw uErr;

      return new Response(JSON.stringify({ok:true,playlist:p.canonical_name,followers,track_count,observed_at}),{headers});
    }

    if(action==="mark_updated"){
      const playlist_slug=String(body.playlist_slug||"").trim();
      if(!playlist_slug) return new Response(JSON.stringify({error:"playlist_required"}),{status:400,headers});
      const at=new Date().toISOString();
      const {data,error}=await admin.from("bvss_playlists")
        .update({last_editorial_update_at:at,updated_at:at})
        .eq("slug",playlist_slug).select("slug,canonical_name,last_editorial_update_at").maybeSingle();
      if(error) throw error;
      if(!data) return new Response(JSON.stringify({error:"playlist_not_found"}),{status:404,headers});
      return new Response(JSON.stringify({ok:true,playlist:data}),{headers});
    }

    if(action==="review"){
      const submission_id=String(body.submission_id||"");
      const decision=String(body.decision||"");
      const playlist_slug=body.playlist_slug?String(body.playlist_slug):null;
      if(!submission_id||!["hold","accept","reject"].includes(decision))
        return new Response(JSON.stringify({error:"invalid_review"}),{status:400,headers});

      let playlist_id=null;
      if(playlist_slug){
        const {data:p}=await admin.from("bvss_playlists").select("id").eq("slug",playlist_slug).maybeSingle();
        playlist_id=p?.id||null;
      }
      if(decision==="accept"&&!playlist_id)
        return new Response(JSON.stringify({error:"accept_requires_playlist"}),{status:400,headers});

      const {error:rErr}=await admin.from("bvss_submission_reviews").insert({
        submission_id,decision,playlist_id,reviewer_id:a.user.id,reviewer_label:a.user.email||null,
        target_position:body.target_position||null,rotation_notes:body.rotation_notes||null,review_notes:body.review_notes||null
      });
      if(rErr) throw rErr;

      const next=decision==="accept"?"accepted":decision==="reject"?"rejected":"hold";
      const {error:uErr}=await admin.from("bvss_submissions").update({status:next}).eq("id",submission_id);
      if(uErr) throw uErr;

      if(decision==="accept"){
        const {data:s}=await admin.from("bvss_submissions").select("spotify_track_id").eq("id",submission_id).single();
        const {error:pErr}=await admin.from("bvss_playlist_placements").insert({
          submission_id,playlist_id,spotify_track_id:s?.spotify_track_id||null,target_position:body.target_position||null,
          notes:body.rotation_notes||null
        });
        if(pErr) throw pErr;
      }
      return new Response(JSON.stringify({ok:true,status:next}),{headers});
    }

    if(action==="remove_placement"){
      const placement_id=String(body.placement_id||"");
      if(!placement_id) return new Response(JSON.stringify({error:"placement_required"}),{status:400,headers});
      const {error}=await admin.from("bvss_playlist_placements").update({removed_at:new Date().toISOString()}).eq("id",placement_id);
      if(error) throw error;
      return new Response(JSON.stringify({ok:true}),{headers});
    }

    return new Response(JSON.stringify({error:"unknown_action"}),{status:400,headers});
  }catch(e){
    return new Response(JSON.stringify({error:"admin_request_failed",detail:e instanceof Error?e.message:String(e)}),{status:500,headers});
  }
});