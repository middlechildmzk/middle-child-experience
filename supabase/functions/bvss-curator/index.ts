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
  if(!secret||!publishable) throw new Error("supabase_keys_unavailable");
  const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
  if(!token) return {error:"missing_auth",status:401};
  const userClient=createClient(Deno.env.get("SUPABASE_URL")!,publishable,{auth:{persistSession:false}});
  const {data:{user},error}=await userClient.auth.getUser(token);
  if(error||!user) return {error:"invalid_auth",status:401};
  const db=createClient(Deno.env.get("SUPABASE_URL")!,secret,{auth:{persistSession:false}});
  return {db,user};
}
const clean=(v:unknown,max=200)=>typeof v==="string"?v.trim().slice(0,max):"";
const list=(v:unknown,maxItems=12,maxLen=80)=>Array.isArray(v)?v.map(x=>clean(x,maxLen)).filter(Boolean).slice(0,maxItems):[];
const slugify=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70);
const playlistId=(url:string)=>{
  const m=url.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]{22})(?:\?.*)?$/i);
  return m?m[1]:null;
};
const code=()=>("CURATOROS-"+crypto.randomUUID().replace(/-/g,"").slice(0,7).toUpperCase());
// Transition-function error codes -> HTTP status.
const httpFor=(e:string)=>["route_not_found","placement_not_found"].includes(e)?404:e==="curator_not_approved"||e==="not_bvss_route"||e==="invalid_actor"?403:["already_decided","route_withdrawn","invalid_route_state","invalid_placement_state","track_already_placed_on_playlist","only_live_can_complete","only_unverified_can_cancel"].includes(e)?409:400;
async function rpc(db:any,fn:string,args:Record<string,unknown>,h:Record<string,string>){
  const {data,error}=await db.rpc(fn,args);
  if(error) throw error;
  if(!data?.ok) return new Response(JSON.stringify({error:data?.error||"transition_failed",status:data?.status}),{status:httpFor(String(data?.error||"")),headers:h});
  return new Response(JSON.stringify(data),{headers:h});
}

async function profileFor(db:any,userId:string){
  const {data,error}=await db.from("bvss_curator_profiles").select("*").eq("user_id",userId).maybeSingle();
  if(error) throw error;
  return data;
}

async function provisionIdentity(db:any,userId:string,displayName:string,handle:string){
  const {data,error}=await db.rpc("curatoros_provision_curator_identity",{
    p_user_id:userId,p_display_name:displayName,p_handle:handle
  });
  if(error) throw error;
  if(!data?.ok) throw new Error(data?.error||"identity_provision_failed");
  return data;
}

Deno.serve(async(req)=>{
  const h=headers(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  try{
    const a:any=await auth(req);
    if(a.error) return new Response(JSON.stringify({error:a.error}),{status:a.status,headers:h});
    const {db,user}=a;
    const profile=await profileFor(db,user.id);

    if(req.method==="GET"){
      if(!profile) return new Response(JSON.stringify({profile:null,playlists:[],claims:[],routes:[],facts:null}),{headers:h});
      const [{data:playlists},{data:claims},{data:facts},{data:entitlement},{data:usage}]=await Promise.all([
        db.from("bvss_playlists")
          .select("id,slug,spotify_playlist_id,spotify_url,canonical_name,subtitle,description,cover_asset_url,primary_genre,secondary_genres,moods,anchor_artists,submission_status,verification_status,network_routing_enabled,public_status,website_status,lifecycle_state,created_at")
          .eq("curator_id",profile.id).order("created_at"),
        db.from("bvss_curator_playlist_claims").select("*").eq("curator_id",profile.id).order("submitted_at",{ascending:false}),
        db.from("bvss_curator_public_facts").select("*").eq("curator_id",profile.id).maybeSingle(),
        db.from("bvss_curator_entitlements").select("*").eq("curator_id",profile.id).maybeSingle(),
        db.from("bvss_curator_usage_monthly").select("*").eq("curator_id",profile.id).maybeSingle()
      ]);
      let routes:any[]=[];
      if(profile.status==="approved"){
        const {data,error}=await db.from("bvss_submission_routes")
          .select("id,status,route_type,match_score,match_reasons,routed_at,first_opened_at,decided_at,decision,playlist_id,bvss_playlists(slug,canonical_name),bvss_submissions(id,artist_name,song_title,release_state,spotify_url,source_url,source_platform,artwork_url,release_date,genre,moods,comparable_artists,is_explicit,notes,private_stream_url,download_external_url,download_source,download_permission,artist_socials,submitted_at)")
          .eq("curator_id",profile.id)
          .in("status",["queued","opened","hold","accepted"])
          .order("routed_at",{ascending:false}).limit(250);
        if(error) throw error;
        routes=data||[];
      }
      return new Response(JSON.stringify({profile,playlists:playlists||[],claims:claims||[],routes,facts:facts||null,entitlement:entitlement||null,usage:usage||null}),{headers:h});
    }

    if(req.method!=="POST") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});
    const body=await req.json();
    const action=clean(body.action,50);

    if(action==="apply"){
      const display_name=clean(body.display_name,100);
      const handle=slugify(clean(body.handle,80)||display_name);
      const contact_email=clean(body.contact_email,254).toLowerCase()||String(user.email||"").toLowerCase();
      const bio=clean(body.bio,1200)||null;
      const website_url=clean(body.website_url,300)||null;
      const spotify_profile_url=clean(body.spotify_profile_url,300)||null;
      const genres=list(body.genres,12,80);
      const moods=list(body.moods,12,80);
      const social_links=body.social_links&&typeof body.social_links==="object"?body.social_links:{};
      if(!display_name||!handle||!contact_email.includes("@")) return new Response(JSON.stringify({error:"missing_required_fields"}),{status:400,headers:h});
      const values:any={
        user_id:user.id,handle,display_name,contact_email,bio,website_url,spotify_profile_url,
        social_links,genres,moods,terms_version:"curator-beta-2026-09",terms_accepted_at:new Date().toISOString()
      };
      let result;
      if(profile){
        values.status=profile.status==="rejected"?"pending":profile.status;
        const {data,error}=await db.from("bvss_curator_profiles").update(values).eq("id",profile.id).select("*").single();
        if(error) throw error; result=data;
      } else {
        const {data,error}=await db.from("bvss_curator_profiles").insert(values).select("*").single();
        if(error){ if(error.code==="23505") return new Response(JSON.stringify({error:"handle_unavailable"}),{status:409,headers:h}); throw error; }
        result=data;
      }
      const identity=await provisionIdentity(db,user.id,result.display_name,result.handle);
      return new Response(JSON.stringify({ok:true,profile:result,identity}),{status:201,headers:h});
    }

    const current=profile||await profileFor(db,user.id);
    if(!current) return new Response(JSON.stringify({error:"application_required"}),{status:403,headers:h});

    if(action==="update_profile"){
      const patch:any={};
      for(const [key,max] of [["display_name",100],["bio",1200],["website_url",300],["spotify_profile_url",300]] as const){
        if(body[key]!==undefined) patch[key]=clean(body[key],max)||null;
      }
      if(body.genres!==undefined) patch.genres=list(body.genres,12,80);
      if(body.moods!==undefined) patch.moods=list(body.moods,12,80);
      if(body.social_links&&typeof body.social_links==="object") patch.social_links=body.social_links;
      if(current.status==="approved") patch.public_profile=true;
      const {data,error}=await db.from("bvss_curator_profiles").update(patch).eq("id",current.id).select("*").single();
      if(error) throw error;
      return new Response(JSON.stringify({ok:true,profile:data}),{headers:h});
    }

    if(action==="add_playlist"){
      const [{data:entitlement},{count:registeredCount}]=await Promise.all([
        db.from("bvss_curator_entitlements").select("max_registered_playlists").eq("curator_id",current.id).maybeSingle(),
        db.from("bvss_playlists").select("id",{count:"exact",head:true}).eq("curator_id",current.id)
      ]);
      const maxPlaylists=entitlement?.max_registered_playlists||5;
      if((registeredCount||0)>=maxPlaylists)
        return new Response(JSON.stringify({error:"playlist_limit_reached",limit:maxPlaylists}),{status:409,headers:h});
      const spotify_url=clean(body.spotify_url,320);
      const spid=playlistId(spotify_url);
      const canonical_name=clean(body.canonical_name,140);
      const primary_genre=clean(body.primary_genre,100);
      const description=clean(body.description,800);
      const secondary_genres=list(body.secondary_genres,10,80);
      const moods=list(body.moods,10,80);
      const activities=list(body.activities,10,80);
      const anchor_artists=list(body.anchor_artists,10,100);
      if(!spid||!canonical_name||!primary_genre) return new Response(JSON.stringify({error:"playlist_fields_invalid"}),{status:400,headers:h});
      const slug=(slugify(current.handle+"-"+canonical_name).slice(0,76)+"-"+spid.slice(0,5)).replace(/-+/g,"-");
      const {data:p,error:pErr}=await db.from("bvss_playlists").insert({
        slug,spotify_playlist_id:spid,spotify_uri:"spotify:playlist:"+spid,spotify_url:"https://open.spotify.com/playlist/"+spid,
        canonical_name,subtitle:clean(body.subtitle,160)||primary_genre,description,
        primary_genre,secondary_genres,moods,activities,seo_keywords:[primary_genre,...secondary_genres],
        anchor_artists,target_track_count:Number(body.target_track_count||60),
        public_status:"private",submission_status:"paused",update_cadence:clean(body.update_cadence,40)||"weekly",
        middle_child_eligible:false,subflower_eligible:false,website_status:"hidden",lifecycle_state:"experimental",
        curation_philosophy:clean(body.curation_philosophy,1200)||"Independent curator playlist participating in the BVSS FVM curator network beta.",
        submission_criteria:clean(body.submission_criteria,1200)||"Tracks are considered independently by the curator. Placement is never guaranteed.",
        display_order:1000,network_owner_type:"partner",curator_id:current.id,verification_status:"pending",
        network_routing_enabled:false,source_metadata:{curator_beta:true,submitted_by:user.id}
      }).select("id,slug,spotify_playlist_id,spotify_url,canonical_name,verification_status").single();
      if(pErr){ if(pErr.code==="23505") return new Response(JSON.stringify({error:"playlist_already_registered"}),{status:409,headers:h}); throw pErr; }
      const verification_code=code();
      const {data:claim,error:cErr}=await db.from("bvss_curator_playlist_claims").insert({
        curator_id:current.id,playlist_id:p.id,verification_code,status:"pending"
      }).select("*").single();
      if(cErr) throw cErr;

      // Link the founding-beta playlist to the canonical ArtistOS identity/property graph.
      const identity=current.professional_profile_id&&current.workspace_id
        ? {professional_profile_id:current.professional_profile_id,workspace_id:current.workspace_id}
        : await provisionIdentity(db,user.id,current.display_name,current.handle);
      const propertyKey="spotify:playlist:"+spid;
      let property:any=null;
      const {data:existingProperty,error:existingPropertyErr}=await db.from("properties")
        .select("id").eq("canonical_property_key",propertyKey).maybeSingle();
      if(existingPropertyErr) throw existingPropertyErr;
      if(existingProperty){
        property=existingProperty;
      }else{
        const {data:newProperty,error:propertyErr}=await db.from("properties").insert({
          workspace_id:identity.workspace_id,
          created_by:user.id,
          name:canonical_name,
          property_type:"spotify_playlist",
          platform:"spotify",
          url:"https://open.spotify.com/playlist/"+spid,
          platform_url:"https://open.spotify.com/playlist/"+spid,
          spotify_playlist_id:spid,
          canonical_property_key:propertyKey,
          genre_tags:[primary_genre,...secondary_genres],
          activity_status:"unknown",
          verification_status:"unverified",
          evidence_strength:1,
          source:"curatoros_founding_beta",
          relationship_stage:"identified"
        }).select("id").single();
        if(propertyErr) throw propertyErr;
        property=newProperty;
      }
      await db.from("bvss_playlists").update({property_id:property.id}).eq("id",p.id);
      const {error:claimLinkErr}=await db.from("property_claims").insert({
        property_id:property.id,
        claimant_user_id:user.id,
        professional_profile_id:identity.professional_profile_id,
        claimant_workspace_id:identity.workspace_id,
        verification_method:"website_token",
        evidence_url:"https://open.spotify.com/playlist/"+spid,
        evidence_notes:"CuratorOS description challenge: "+verification_code,
        status:"pending"
      });
      if(claimLinkErr&&claimLinkErr.code!=="23505") throw claimLinkErr;

      return new Response(JSON.stringify({
        ok:true,playlist:{...p,property_id:property.id},claim,
        instructions:"Temporarily add "+verification_code+" to the Spotify playlist description, then return here and request verification. CuratorOS approval is required before the playlist can receive submissions."
      }),{status:201,headers:h});
    }

    if(action==="request_verification"){
      const playlist_id=clean(body.playlist_id,80);
      const {data,error}=await db.from("bvss_curator_playlist_claims")
        .update({status:"pending",notes:"Curator requested verification at "+new Date().toISOString()})
        .eq("playlist_id",playlist_id).eq("curator_id",current.id)
        .select("id,status,verification_code,submitted_at").maybeSingle();
      if(error) throw error;
      if(!data) return new Response(JSON.stringify({error:"claim_not_found"}),{status:404,headers:h});
      return new Response(JSON.stringify({ok:true,claim:data,message:"Verification request is queued for CuratorOS review."}),{headers:h});
    }

    if(action==="update_playlist_criteria"){
      const playlist_id=clean(body.playlist_id,80);
      const primary_genre=clean(body.primary_genre,80);
      const secondary_genres=list(body.secondary_genres,8,80);
      const moods=list(body.moods,12,60);
      const hard_no_tags=list(body.hard_no_tags,12,80);
      const review_sla_hours=body.review_sla_hours==null||body.review_sla_hours===""?null:Number(body.review_sla_hours);
      const max_open_routes=Number(body.max_open_routes||100);
      const route_cooldown_days=Number(body.route_cooldown_days??30);
      if(!playlist_id||!primary_genre) return new Response(JSON.stringify({error:"playlist_and_primary_genre_required"}),{status:400,headers:h});
      if(review_sla_hours!==null&&(!Number.isInteger(review_sla_hours)||review_sla_hours<1||review_sla_hours>720))
        return new Response(JSON.stringify({error:"invalid_review_sla"}),{status:400,headers:h});
      if(!Number.isInteger(max_open_routes)||max_open_routes<1||max_open_routes>10000)
        return new Response(JSON.stringify({error:"invalid_max_open_routes"}),{status:400,headers:h});
      if(!Number.isInteger(route_cooldown_days)||route_cooldown_days<0||route_cooldown_days>365)
        return new Response(JSON.stringify({error:"invalid_cooldown"}),{status:400,headers:h});
      const {data:playlist,error}=await db.from("bvss_playlists").update({
        primary_genre,secondary_genres,moods,hard_no_tags,
        accepts_unreleased:Boolean(body.accepts_unreleased),
        accepts_explicit:Boolean(body.accepts_explicit),
        review_sla_hours,max_open_routes,route_cooldown_days,
        submission_criteria:clean(body.submission_criteria,1200)||null,
        updated_at:new Date().toISOString()
      }).eq("id",playlist_id).eq("curator_id",current.id)
        .select("id,slug,canonical_name,primary_genre,secondary_genres,moods,hard_no_tags,accepts_unreleased,accepts_explicit,review_sla_hours,max_open_routes,route_cooldown_days,submission_criteria")
        .maybeSingle();
      if(error) throw error;
      if(!playlist) return new Response(JSON.stringify({error:"playlist_not_found"}),{status:404,headers:h});
      return new Response(JSON.stringify({ok:true,playlist}),{headers:h});
    }

    if(action==="set_playlist_status"){
      if(current.status!=="approved") return new Response(JSON.stringify({error:"curator_not_approved"}),{status:403,headers:h});
      const playlist_id=clean(body.playlist_id,80);
      const submission_status=clean(body.submission_status,20);
      if(!["open","paused"].includes(submission_status)) return new Response(JSON.stringify({error:"invalid_submission_status"}),{status:400,headers:h});
      const {data:playlist,error:pErr}=await db.from("bvss_playlists")
        .select("id,verification_status").eq("id",playlist_id).eq("curator_id",current.id).maybeSingle();
      if(pErr) throw pErr;
      if(!playlist) return new Response(JSON.stringify({error:"playlist_not_found"}),{status:404,headers:h});
      if(playlist.verification_status!=="verified") return new Response(JSON.stringify({error:"playlist_not_verified"}),{status:409,headers:h});
      const open=submission_status==="open";
      const {data,error}=await db.from("bvss_playlists").update({
        submission_status,network_routing_enabled:open
      }).eq("id",playlist_id).eq("curator_id",current.id)
        .select("id,canonical_name,submission_status,network_routing_enabled").single();
      if(error) throw error;
      return new Response(JSON.stringify({ok:true,playlist:data}),{headers:h});
    }

    if(action==="open_route"){
      if(current.status!=="approved") return new Response(JSON.stringify({error:"curator_not_approved"}),{status:403,headers:h});
      const route_id=clean(body.route_id,80);
      const {data,error}=await db.from("bvss_submission_routes")
        .update({status:"opened",first_opened_at:new Date().toISOString()})
        .eq("id",route_id).eq("curator_id",current.id).eq("status","queued")
        .select("id,status,first_opened_at").maybeSingle();
      if(error) throw error;
      return new Response(JSON.stringify({ok:true,route:data}),{headers:h});
    }

    if(action==="review_route"){
      if(current.status!=="approved") return new Response(JSON.stringify({error:"curator_not_approved"}),{status:403,headers:h});
      const hold=clean(body.hold_until,40);
      const sched=clean(body.scheduled_for,10);
      return rpc(db,"bvss_decide_route",{
        p_route_id:clean(body.route_id,80)||null,
        p_actor:{kind:"curator",user_id:user.id,curator_id:current.id,label:current.display_name},
        p_decision:clean(body.decision,20),
        p_reasons:list(body.reasons,8,40),
        p_notes:clean(body.notes,2001)||null,
        p_hold_until:hold||null,
        p_target_position:body.target_position!=null&&body.target_position!==""?Number(body.target_position):null,
        p_scheduled_for:sched||null
      },h);
    }

    if(action==="report_added"){
      if(current.status!=="approved") return new Response(JSON.stringify({error:"curator_not_approved"}),{status:403,headers:h});
      return rpc(db,"bvss_report_placement_added",{
        p_placement_id:clean(body.placement_id,80)||null,
        p_actor:{kind:"curator",user_id:user.id,curator_id:current.id,label:current.display_name}
      },h);
    }

    if(action==="report"){
      const category=clean(body.category,80);
      const detail=clean(body.detail,3000);
      if(!category||!detail) return new Response(JSON.stringify({error:"report_fields_required"}),{status:400,headers:h});
      const {data,error}=await db.from("bvss_network_reports").insert({
        reporter_user_id:user.id,curator_id:current.id,
        playlist_id:clean(body.playlist_id,80)||null,submission_id:clean(body.submission_id,80)||null,
        category,detail
      }).select("id,status,created_at").single();
      if(error) throw error;
      return new Response(JSON.stringify({ok:true,report:data}),{status:201,headers:h});
    }

    return new Response(JSON.stringify({error:"unknown_action"}),{status:400,headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"curator_request_failed",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});