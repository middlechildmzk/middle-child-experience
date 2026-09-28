import { createClient } from "npm:@supabase/supabase-js@2";

const origins=new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
function headers(origin:string|null){
  return {
    "Content-Type":"application/json","Cache-Control":"public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    "Access-Control-Allow-Origin":origin&&origins.has(origin)?origin:"https://bvssfvm.com",
    "Access-Control-Allow-Methods":"GET, OPTIONS","Vary":"Origin"
  };
}
function db(){
  const s=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const key=s.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!key) throw new Error("secret_key_unavailable");
  return createClient(Deno.env.get("SUPABASE_URL")!,key,{auth:{persistSession:false}});
}
Deno.serve(async(req)=>{
  const h=headers(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  if(req.method!=="GET") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});
  try{
    const supabase=db();
    const url=new URL(req.url);
    const handle=(url.searchParams.get("handle")||"").trim().toLowerCase();
    let q=supabase.from("bvss_curator_public_facts")
      .select("curator_id,handle,display_name,bio,website_url,spotify_profile_url,social_links,genres,moods,verified_playlist_count,reviews_completed,accepted_count,rejected_count,held_count,median_response_hours,active_placements")
      .eq("status","approved").eq("public_profile",true).order("display_name");
    if(handle) q=q.eq("handle",handle).limit(1);
    const {data,error}=await q;
    if(error) throw error;
    if(handle){
      const curator=data?.[0];
      if(!curator) return new Response(JSON.stringify({error:"not_found"}),{status:404,headers:h});
      const {data:playlists,error:pErr}=await supabase.from("bvss_public_curator_playlists")
        .select("*").eq("curator_handle",handle).order("canonical_name");
      if(pErr) throw pErr;
      return new Response(JSON.stringify({curator,playlists:playlists||[]}),{headers:h});
    }
    return new Response(JSON.stringify({curators:data||[],count:data?.length||0}),{headers:h});
  }catch(e){
    return new Response(JSON.stringify({error:"curator_directory_unavailable",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});