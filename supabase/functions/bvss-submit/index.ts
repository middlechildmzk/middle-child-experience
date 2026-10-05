import { createClient } from "npm:@supabase/supabase-js@2";

const allowed = new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
function cors(origin:string|null){
  return {
    "Access-Control-Allow-Origin":origin&&allowed.has(origin)?origin:"https://bvssfvm.com",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json"
  };
}
function db(){
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const key=keys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key) throw new Error("Supabase secret key unavailable");
  return createClient(Deno.env.get("SUPABASE_URL")!,key,{auth:{persistSession:false}});
}
const clean=(v:unknown,max=160)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=(v:unknown,maxItems=8,maxLen=80)=>Array.isArray(v)?v.map(x=>clean(x,maxLen)).filter(Boolean).slice(0,maxItems):[];
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const safeUrl=(v:unknown,max=500)=>{
  const s=clean(v,max); if(!s) return null;
  try{const u=new URL(s); return u.protocol==="https:"?u.toString():null;}catch{return null;}
};
async function sha256(value:string){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b)=>b.toString(16).padStart(2,"0")).join("");
}
async function requesterHash(req:Request){
  const ip=req.headers.get("cf-connecting-ip")||req.headers.get("x-forwarded-for")||"unknown";
  const ua=req.headers.get("user-agent")||"unknown";
  return sha256(ip+"|"+ua+"|bvss-public");
}
const socials=(v:unknown)=>{
  if(!v||typeof v!=="object"||Array.isArray(v)) return {};
  const out:any={};
  for(const [k,val] of Object.entries(v as Record<string,unknown>)){
    const key=clean(k,40).toLowerCase();
    const url=safeUrl(val,400);
    if(key&&url&&Object.keys(out).length<8) out[key]=url;
  }
  return out;
};

Deno.serve(async(req)=>{
  const h=cors(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});

  try{
    const body=await req.json();
    if(body.website && clean(body.website,200)) return new Response(JSON.stringify({ok:true}),{status:202,headers:h});

    const release_state=clean(body.release_state,20)==="unreleased"?"unreleased":"released";
    const artist_name=clean(body.artist_name);
    const email=clean(body.email,254).toLowerCase();
    const song_title=clean(body.song_title,200);
    const rawSpotify=clean(body.spotify_url,320);
    const genre_input=clean(body.genre,120);
    const moods_input=list(body.moods,8,60);
    const comparable_artists=list(body.comparable_artists,8,100);
    const notes=clean(body.notes,4000)||null;
    const release_date=clean(body.release_date,10)||null;
    const is_explicit=Boolean(body.is_explicit);
    const preferred_slugs=list(body.preferred_playlists,8,100);
    const origin_playlist=clean(body.origin_playlist,100);
    const artist_socials=socials(body.artist_socials);
    const private_stream_url=safeUrl(body.private_stream_url,500);
    const download_external_url=safeUrl(body.download_external_url,500);
    const download_object_path=clean(body.download_object_path,300)||null;
    const download_permission=Boolean(body.download_permission);
    const network_opt_in=Boolean(body.network_opt_in);
    const route_mode=clean(body.route_mode,30)==="selected_only"?"selected_only":"matched";
    const source_surface=clean(body.source_surface,40)==="curatoros"?"curatoros":"bvssfvm.com";
    const artwork_url=safeUrl(body.artwork_url,800);
    const identified_track=body.identified_track&&typeof body.identified_track==="object"&&!Array.isArray(body.identified_track)
      ? body.identified_track : {};

    if(!artist_name||!song_title||!genre_input||!email.includes("@"))
      return new Response(JSON.stringify({error:"missing_required_fields"}),{status:400,headers:h});

    if(release_date&&!/^\d{4}-\d{2}-\d{2}$/.test(release_date))
      return new Response(JSON.stringify({error:"invalid_release_date"}),{status:400,headers:h});
    if(download_object_path&&!download_object_path.startsWith("incoming/"))
      return new Response(JSON.stringify({error:"invalid_upload_path"}),{status:400,headers:h});

    let spotify_track_id:string|null=null;
    let spotify_url:string|null=null;
    if(rawSpotify){
      const m=rawSpotify.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})(?:\?.*)?$/i);
      if(!m) return new Response(JSON.stringify({error:"invalid_spotify_track_url"}),{status:400,headers:h});
      spotify_track_id=m[1];
      spotify_url="https://open.spotify.com/track/"+spotify_track_id;
    }

    if(release_state==="released"&&!spotify_url)
      return new Response(JSON.stringify({error:"released_track_requires_spotify"}),{status:400,headers:h});

    let download_source="none";
    if(download_permission&&download_object_path) download_source="upload";
    else if(download_permission&&download_external_url) download_source="external";

    if(release_state==="unreleased"&&!private_stream_url&&!download_object_path&&!download_external_url)
      return new Response(JSON.stringify({error:"unreleased_delivery_required"}),{status:400,headers:h});

    const supabase=db();
    const requester_hash=await requesterHash(req);
    const since=new Date(Date.now()-60*60*1000).toISOString();
    const {count:recentCount,error:rateErr}=await supabase.from("bvss_public_rate_limits")
      .select("id",{count:"exact",head:true})
      .eq("requester_hash",requester_hash).eq("action","music_submission").gte("occurred_at",since);
    if(rateErr) throw rateErr;
    if((recentCount||0)>=20)
      return new Response(JSON.stringify({error:"rate_limited",retry_after_seconds:3600}),{status:429,headers:h});
    await supabase.from("bvss_public_rate_limits").insert({requester_hash,action:"music_submission"});

    if(download_source==="upload"){
      const {data:upload,error:uploadErr}=await supabase.from("bvss_media_uploads")
        .select("id,status,expires_at").eq("object_path",download_object_path).maybeSingle();
      if(uploadErr) throw uploadErr;
      if(!upload||upload.status!=="pending"||new Date(upload.expires_at).getTime()<Date.now())
        return new Response(JSON.stringify({error:"upload_slot_invalid_or_expired"}),{status:400,headers:h});
    }

    const {data:preferred}=preferred_slugs.length
      ? await supabase.from("bvss_playlists")
          .select("id,slug,network_owner_type,curator_id,verification_status,network_routing_enabled")
          .in("slug",preferred_slugs)
      : {data:[] as any[]};
    const preferredIds=(preferred||[]).map((p:any)=>p.id);
    const preferredSet=new Set(preferredIds);

    let originPlaylist:any=null;
    if(origin_playlist){
      const {data}=await supabase.from("bvss_playlists").select("id,slug").eq("slug",origin_playlist).maybeSingle();
      originPlaylist=data||null;
    }

    const {data:playlists,error:playlistError}=await supabase.from("bvss_playlists")
      .select("id,slug,canonical_name,primary_genre,secondary_genres,moods,seo_keywords,anchor_artists,network_owner_type,curator_id,verification_status,network_routing_enabled,accepts_unreleased,accepts_explicit,hard_no_tags,max_open_routes,route_cooldown_days,network_organization_id")
      .eq("submission_status","open")
      .eq("lifecycle_state","active")
      .eq("website_status","published")
      .eq("verification_status","verified")
      .eq("network_routing_enabled",true);
    if(playlistError) throw playlistError;

    if(route_mode==="selected_only"){
      if(!preferred_slugs.length)
        return new Response(JSON.stringify({error:"route_selection_required",message:"Choose at least one playlist before submitting."}),{status:400,headers:h});
      const available=new Set((playlists||[]).map((p:any)=>p.slug));
      const unavailable=preferred_slugs.filter((slug)=>!available.has(slug));
      if(unavailable.length)
        return new Response(JSON.stringify({error:"route_unavailable",message:"One or more selected playlists are no longer accepting submissions.",unavailable}),{status:409,headers:h});
    }

    // Use the same live playlist vocabulary for both form inputs and routing.
    // This keeps arbitrary spelling/casing from silently breaking matches.
    const genreByKey=new Map<string,string>();
    const moodByKey=new Map<string,string>();
    for(const p of playlists||[]){
      for(const value of [p.primary_genre,...(p.secondary_genres||[])]){
        const label=clean(value,120); if(label&&!genreByKey.has(norm(label))) genreByKey.set(norm(label),label);
      }
      for(const value of p.moods||[]){
        const label=clean(value,60); if(label&&!moodByKey.has(norm(label))) moodByKey.set(norm(label),label);
      }
    }
    const genre=genreByKey.get(norm(genre_input))||null;
    if(!genre) return new Response(JSON.stringify({
      error:"unknown_genre",
      message:"Choose a genre from the approved suggestions so we can route the track correctly."
    }),{status:400,headers:h});

    const moods=Array.from(new Set(
      moods_input.map((value)=>moodByKey.get(norm(value))).filter((value):value is string=>Boolean(value))
    )).slice(0,8);

    if(route_mode==="selected_only"){
      const selected=(playlists||[]).filter((p:any)=>preferredSet.has(p.id));
      const selectedIds=selected.map((p:any)=>p.id);
      const [{data:openRoutes},{data:priorTrackRoutes}]=await Promise.all([
        selectedIds.length
          ? supabase.from("bvss_submission_routes").select("playlist_id").in("playlist_id",selectedIds).in("status",["queued","opened","hold"])
          : Promise.resolve({data:[] as any[]}),
        spotify_track_id&&selectedIds.length
          ? supabase.from("bvss_submission_routes")
              .select("playlist_id,routed_at,bvss_submissions!inner(spotify_track_id)")
              .in("playlist_id",selectedIds)
              .eq("bvss_submissions.spotify_track_id",spotify_track_id)
          : Promise.resolve({data:[] as any[]})
      ]);
      const openCount=new Map<string,number>();
      for(const route of openRoutes||[]) openCount.set(route.playlist_id,(openCount.get(route.playlist_id)||0)+1);
      const priorByPlaylist=new Map<string,string>();
      for(const route of priorTrackRoutes||[]){
        const prev=priorByPlaylist.get(route.playlist_id);
        if(!prev||new Date(route.routed_at).getTime()>new Date(prev).getTime()) priorByPlaylist.set(route.playlist_id,route.routed_at);
      }

      const materialTags=[genre,...moods,...comparable_artists].map(norm);
      const unavailable:any[]=[];
      for(const p of selected){
        const reasons:string[]=[];
        if(release_state==="unreleased"&&p.accepts_unreleased===false) reasons.push("unreleased_not_accepted");
        if(is_explicit&&p.accepts_explicit===false) reasons.push("explicit_not_accepted");
        const hard=(p.hard_no_tags||[]).map(norm).filter(Boolean);
        if(hard.some((tag:string)=>materialTags.includes(tag))) reasons.push("hard_no_rule");
        if((openCount.get(p.id)||0)>=Number(p.max_open_routes||100)) reasons.push("at_capacity");
        const prior=priorByPlaylist.get(p.id);
        if(prior&&Number(p.route_cooldown_days||0)>0&&new Date(prior).getTime()>Date.now()-Number(p.route_cooldown_days)*86400000) reasons.push("cooldown_active");
        if(reasons.length) unavailable.push({slug:p.slug,reasons});
      }

      const partnerSelected=selected.filter((p:any)=>p.network_owner_type==="partner"&&p.curator_id);
      if(partnerSelected.length){
        const curatorIds=Array.from(new Set(partnerSelected.map((p:any)=>p.curator_id)));
        const [{data:ents},{data:usage}]=await Promise.all([
          supabase.from("bvss_curator_entitlements").select("curator_id,max_monthly_routes").in("curator_id",curatorIds),
          supabase.from("bvss_curator_usage_monthly").select("curator_id,routes_this_month").in("curator_id",curatorIds)
        ]);
        const maxBy=new Map((ents||[]).map((e:any)=>[e.curator_id,Number(e.max_monthly_routes||0)]));
        const usedBy=new Map((usage||[]).map((u:any)=>[u.curator_id,Number(u.routes_this_month||0)]));
        for(const p of partnerSelected){
          if((maxBy.get(p.curator_id)||0)<=(usedBy.get(p.curator_id)||0)) unavailable.push({slug:p.slug,reasons:["curator_capacity"]});
        }
      }

      if(unavailable.length)
        return new Response(JSON.stringify({
          error:"route_unavailable",
          message:"One or more selected playlists cannot receive this track right now.",
          unavailable
        }),{status:409,headers:h});
    }

    const now=new Date().toISOString();
    const duplicate_fingerprint=await sha256([
      email,
      release_state,
      spotify_track_id||"",
      norm(artist_name),
      norm(song_title)
    ].join("|"));

    const source_url=spotify_url||private_stream_url||download_external_url||null;
    const source_platform=spotify_url
      ?"spotify"
      : private_stream_url
        ? (new URL(private_stream_url).hostname.replace(/^www\./,""))
        : download_external_url
          ? (new URL(download_external_url).hostname.replace(/^www\./,""))
          : download_object_path
            ? "bvss_upload"
            : null;

    const {data:submission,error:insertError}=await supabase.from("bvss_submissions").insert({
      artist_name,email,song_title,release_state,spotify_url,spotify_track_id,release_date,genre,moods,
      comparable_artists,is_explicit,notes,preferred_playlist_ids:preferredIds,
      submission_source:source_surface==="curatoros"
        ?"curatoros"
        :originPlaylist
          ?"bvssfvm.com/playlists/"+originPlaylist.slug
          :"bvssfvm.com",
      artist_socials,private_stream_url,download_source,download_object_path,
      download_external_url:download_source==="external"?download_external_url:null,
      download_permission:download_source!=="none"&&download_permission,
      network_opt_in,network_consent_at:network_opt_in?now:null,
      terms_version:"artist-submission-2026-09",
      submitter_ip_hash:requester_hash,
      source_url,
      source_platform,
      artwork_url,
      catalog_metadata:identified_track,
      identified_at:Object.keys(identified_track).length?now:null
    }).select("id,status,submitted_at,artist_status_token").single();

    if(insertError){
      if(insertError.code==="23505")
        return new Response(JSON.stringify({error:"duplicate_submission",message:"This song has already been submitted from this email."}),{status:409,headers:h});
      throw insertError;
    }

    if(download_source==="upload"&&download_object_path){
      const {error:claimErr}=await supabase.from("bvss_media_uploads").update({
        status:"claimed",submission_id:submission.id,claimed_at:now
      }).eq("object_path",download_object_path).eq("status","pending");
      if(claimErr) throw claimErr;
    }

    const ng=norm(genre);
    const nm=moods.map(norm);
    const na=comparable_artists.map(norm);
    const ranked=(playlists||[]).map((p:any)=>{
      let score=0; const reasons:string[]=[];
      if(preferredSet.has(p.id)){score+=35;reasons.push("artist selected this playlist");}
      if(norm(p.primary_genre)===ng){score+=35;reasons.push("primary genre match");}
      else if((p.secondary_genres||[]).some((g:string)=>norm(g)===ng)){score+=28;reasons.push("secondary genre match");}
      else if((p.seo_keywords||[]).some((k:string)=>norm(k).includes(ng)||ng.includes(norm(k)))){score+=18;reasons.push("genre/keyword overlap");}
      const moodHits=(p.moods||[]).map(norm).filter((x:string)=>nm.includes(x)).length;
      if(moodHits){score+=Math.min(24,moodHits*8);reasons.push(String(moodHits)+" mood match"+(moodHits>1?"es":""));}
      const artistHits=(p.anchor_artists||[]).map(norm).filter((x:string)=>na.includes(x)).length;
      if(artistHits){score+=Math.min(20,artistHits*10);reasons.push(String(artistHits)+" comparable-artist match"+(artistHits>1?"es":""));}
      return {...p,score:Math.min(100,score),reasons};
    }).filter((x:any)=>x.score>=15||(route_mode==="selected_only"&&preferredSet.has(x.id)))
      .sort((a:any,b:any)=>b.score-a.score||Number(preferredSet.has(b.id))-Number(preferredSet.has(a.id)))
      .slice(0,8);

    if(ranked.length){
      const matches=ranked.map((p:any,i:number)=>({
        submission_id:submission.id,playlist_id:p.id,score:p.score,reasons:p.reasons,rank:i+1,matcher_version:"network-v3"
      }));
      const {error:mErr}=await supabase.from("bvss_submission_matches").insert(matches);
      if(mErr) throw mErr;
    }

    const selectedRanked=route_mode==="selected_only"
      ? ranked.filter((p:any)=>preferredSet.has(p.id))
      : ranked;
    const bvssRoutes=(route_mode==="selected_only"
      ? selectedRanked.filter((p:any)=>p.network_owner_type==="bvss")
      : ranked.filter((p:any)=>p.network_owner_type==="bvss").slice(0,4));
    let partnerRoutes:any[]=[];
    if(network_opt_in){
      const candidates=(route_mode==="selected_only"?selectedRanked:ranked)
        .filter((p:any)=>p.network_owner_type==="partner"&&p.curator_id);
      const curatorIds=Array.from(new Set(candidates.map((p:any)=>p.curator_id)));
      const [{data:entitlements},{data:usage}]=curatorIds.length ? await Promise.all([
        supabase.from("bvss_curator_entitlements").select("curator_id,max_monthly_routes").in("curator_id",curatorIds),
        supabase.from("bvss_curator_usage_monthly").select("curator_id,routes_this_month").in("curator_id",curatorIds)
      ]) : [{data:[]},{data:[]}];
      const maxBy=new Map((entitlements||[]).map((e:any)=>[e.curator_id,Number(e.max_monthly_routes||0)]));
      const usedBy=new Map((usage||[]).map((u:any)=>[u.curator_id,Number(u.routes_this_month||0)]));
      partnerRoutes=candidates.filter((p:any)=>{
        const max=maxBy.get(p.curator_id)??0;
        const used=usedBy.get(p.curator_id)??0;
        return max>0&&used<max;
      });
      if(route_mode!=="selected_only") partnerRoutes=partnerRoutes.slice(0,4);
    }

    const routes=[...bvssRoutes,...partnerRoutes].map((p:any)=>({
      submission_id:submission.id,playlist_id:p.id,curator_id:p.curator_id||null,
      route_type:preferredSet.has(p.id)?"preferred":p.network_owner_type==="bvss"?"bvss_internal":"matched",
      status:"queued",match_score:p.score,match_reasons:p.reasons
    }));
    if(routes.length){
      const {error:rErr}=await supabase.from("bvss_submission_routes").insert(routes);
      if(rErr) throw rErr;
    }

    await supabase.from("bvss_submission_status_events").insert({
      submission_id:submission.id,event_type:"submitted",public_label:"Submission received",
      public_detail:source_surface==="curatoros"&&route_mode==="selected_only"
        ?"Your track was submitted to "+routes.length+" selected playlist route"+(routes.length===1?"":"s")+". Each curator decides independently."
        :network_opt_in
          ?"Your track entered the BVSS FVM review queue and may also be routed to approved independent curators when there is a strong fit."
          :"Your track entered the BVSS FVM review queue."
    });

    await supabase.from("bvss_web_events").insert({
      event_name:"submit_complete",path:"/submit",playlist_id:originPlaylist?.id||null,
      utm:originPlaylist
        ?{origin_playlist:originPlaylist.slug,network_opt_in,release_state,route_mode,source_surface}
        :{network_opt_in,release_state,route_mode,source_surface}
    });

    return new Response(JSON.stringify({
      ok:true,
      submission:{id:submission.id,status:submission.status,submitted_at:submission.submitted_at,release_state},
      status_token:submission.artist_status_token,
      status_url:"https://bvssfvm.com/submissions/status?token="+submission.artist_status_token,
      suggested_playlists:(route_mode==="selected_only"?selectedRanked:ranked).map((p:any)=>({
        slug:p.slug,name:p.canonical_name,score:p.score,reasons:p.reasons,
        network_owner_type:p.network_owner_type
      })),
      routed_to:{bvss:bvssRoutes.length,partner_curators:partnerRoutes.length},
      editorial_notice:"Matching and routing are administrative aids only. Placement is never guaranteed and every playlist decision remains editorial."
    }),{status:201,headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"submission_failed",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});