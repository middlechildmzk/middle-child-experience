
const allowed = new Set(["https://bvssfvm.com","https://www.bvssfvm.com","http://localhost:3000"]);
const previewOrigin = /^https:\/\/middle-child-experience-[a-z0-9-]+-middlechildmzks-projects\.vercel\.app$/i;

function allowedOrigin(origin:string|null){
  if (!origin) return "https://bvssfvm.com";
  return allowed.has(origin) || previewOrigin.test(origin) ? origin : "https://bvssfvm.com";
}

function cors(origin:string|null){
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin),
    "Access-Control-Allow-Headers":"content-type",
    "Access-Control-Allow-Methods":"GET, OPTIONS",
    "Vary":"Origin",
    "Content-Type":"application/json",
    "Cache-Control":"no-store"
  };
}

const clean=(v:string|null,max=300)=>typeof v==="string"?v.trim().slice(0,max):"";

function spotifyTrackId(input:string){
  const m=input.match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?track\/([A-Za-z0-9]{22})(?:\?.*)?$/i);
  return m?.[1] || null;
}

function decodeHtml(v:string){
  return v.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">");
}

async function resolveSpotify(url:string){
  const id=spotifyTrackId(url);
  if(!id) return {error:"invalid_spotify_track_url",status:400};

  const canonical="https://open.spotify.com/track/"+id;
  const o=await fetch("https://open.spotify.com/oembed?url="+encodeURIComponent(canonical),{
    headers:{"User-Agent":"BVSSFVM/1.0"}
  });
  if(!o.ok) return {error:"spotify_lookup_failed",status:o.status};
  const embed=await o.json();

  let artist_name:string|null=null;
  let release_date:string|null=null;
  let explicit:boolean|null=null;
  let description:string|null=null;

  try{
    const page=await fetch(canonical,{headers:{"User-Agent":"Mozilla/5.0 BVSSFVM/1.0"}});
    if(page.ok){
      const html=await page.text();
      const desc=html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i);
      description=desc?.[1]?decodeHtml(desc[1]):null;

      const musicAlbum=html.match(/<meta[^>]+name=["']music:album["'][^>]+content=["']([^"']*)["']/i);
      void musicAlbum;

      const artistJson=html.match(/"artists"\s*:\s*\[\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i);
      artist_name=artistJson?.[1]?decodeHtml(artistJson[1]):null;

      const dateJson=html.match(/"release_date"\s*:\s*"([^"]+)"/i)
        || html.match(/"releaseDate"\s*:\s*"([^"]+)"/i);
      release_date=dateJson?.[1]||null;

      const explicitJson=html.match(/"explicit"\s*:\s*(true|false)/i);
      explicit=explicitJson ? explicitJson[1].toLowerCase()==="true" : null;
    }
  }catch{}

  if(!artist_name && description){
    const by=description.match(/(?:song|single|track)\s+by\s+([^·|]+?)(?:\s+on\s+Spotify|\.|$)/i)
      || description.match(/^([^·]+?)\s*[·•-]\s*/);
    artist_name=by?.[1]?.trim()||null;
  }

  return {
    status:200,
    track:{
      source:"spotify",
      spotify_track_id:id,
      spotify_url:canonical,
      title:embed.title || null,
      artist_name,
      artwork_url:embed.thumbnail_url || null,
      release_date,
      is_explicit:explicit,
      embed_url:"https://open.spotify.com/embed/track/"+id
    }
  };
}

async function spotifyToken(){
  const clientId=Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret=Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if(!clientId||!clientSecret) return null;
  const basic=btoa(clientId+":"+clientSecret);
  const res=await fetch("https://accounts.spotify.com/api/token",{
    method:"POST",
    headers:{
      "Authorization":"Basic "+basic,
      "Content-Type":"application/x-www-form-urlencoded"
    },
    body:"grant_type=client_credentials"
  });
  if(!res.ok) return null;
  const body=await res.json();
  return body.access_token as string;
}

function spotifyCredentialsConfigured(){
  return Boolean(Deno.env.get("SPOTIFY_CLIENT_ID") && Deno.env.get("SPOTIFY_CLIENT_SECRET"));
}

function soundchartsCredentialsConfigured(){
  return Boolean(
    (Deno.env.get("SOUNDCHARTS_APP_ID") && Deno.env.get("SOUNDCHARTS_API_KEY")) ||
    (Deno.env.get("SOUNDCHARTS_CLIENT_ID") && Deno.env.get("SOUNDCHARTS_CLIENT_SECRET"))
  );
}

async function soundchartsHeaders(){
  const appId=Deno.env.get("SOUNDCHARTS_APP_ID");
  const apiKey=Deno.env.get("SOUNDCHARTS_API_KEY");
  if(appId&&apiKey) return {"x-app-id":appId,"x-api-key":apiKey};

  const clientId=Deno.env.get("SOUNDCHARTS_CLIENT_ID");
  const clientSecret=Deno.env.get("SOUNDCHARTS_CLIENT_SECRET");
  if(!clientId||!clientSecret) return null;
  const params=new URLSearchParams({grant_type:"client_credentials"});
  const teamId=Deno.env.get("SOUNDCHARTS_TEAM_ID");
  if(teamId) params.set("team_id",teamId);
  const tokenResponse=await fetch("https://account.soundcharts.com/oauth/token",{
    method:"POST",
    headers:{
      "authorization":"Basic "+btoa(clientId+":"+clientSecret),
      "content-type":"application/x-www-form-urlencoded"
    },
    body:params
  });
  if(!tokenResponse.ok) return null;
  const token=await tokenResponse.json().catch(()=>null);
  return token?.access_token ? {"authorization":"Bearer "+token.access_token} : null;
}

function spotifyIdFromIdentifier(item:any){
  const direct=typeof item?.identifier==="string" ? item.identifier.trim() : "";
  if(/^[A-Za-z0-9]{22}$/.test(direct)) return direct;
  const url=typeof item?.url==="string" ? item.url : "";
  return spotifyTrackId(url);
}

async function searchSoundcharts(q:string){
  const headers=await soundchartsHeaders();
  if(!headers) return {error:"spotify_search_unconfigured",configured:false,status:503};

  const search=await fetch(
    "https://customer.api.soundcharts.com/api/v2/song/search/"+encodeURIComponent(q)+"?limit=8",
    {headers}
  );
  if(search.status===403) return {error:"soundcharts_song_search_not_entitled",configured:false,status:503};
  if(search.status===404) return {status:200,configured:true,results:[]};
  if(!search.ok) return {error:"soundcharts_song_search_failed",configured:true,status:search.status};

  const body=await search.json().catch(()=>({}));
  const candidates=(body?.items||[]).slice(0,8);
  const results:any[]=[];

  await Promise.all(candidates.map(async(raw:any)=>{
    const song=raw?.song||raw;
    const uuid=typeof song?.uuid==="string" ? song.uuid : "";
    if(!uuid) return;

    const idsRes=await fetch(
      "https://customer.api.soundcharts.com/api/v2/song/"+encodeURIComponent(uuid)+"/identifiers?platform=spotify&onlyDefault=true&limit=5",
      {headers}
    );
    if(!idsRes.ok) return;
    const idsBody=await idsRes.json().catch(()=>({}));
    const identifier=(idsBody?.items||[]).find((x:any)=>x?.platformCode==="spotify") || (idsBody?.items||[])[0];
    const spotifyId=spotifyIdFromIdentifier(identifier);
    if(!spotifyId) return;

    results.push({
      source:"spotify",
      spotify_track_id:spotifyId,
      spotify_url:"https://open.spotify.com/track/"+spotifyId,
      title:song?.name||null,
      artist_name:song?.creditName||null,
      artwork_url:song?.imageUrl||null,
      release_date:song?.releaseDate||null,
      is_explicit:null,
      album_name:null
    });
  }));

  return {status:200,configured:true,results:results.slice(0,8)};
}

async function searchSpotify(q:string){
  const token=await spotifyToken();
  if(token){
    const res=await fetch("https://api.spotify.com/v1/search?type=track&limit=8&q="+encodeURIComponent(q),{
      headers:{"Authorization":"Bearer "+token}
    });
    if(res.ok){
      const body=await res.json();
      return {
        status:200,
        configured:true,
        results:(body.tracks?.items||[]).map((t:any)=>({
          source:"spotify",
          spotify_track_id:t.id,
          spotify_url:t.external_urls?.spotify||("https://open.spotify.com/track/"+t.id),
          title:t.name,
          artist_name:(t.artists||[]).map((a:any)=>a.name).join(", "),
          artwork_url:t.album?.images?.[0]?.url||null,
          release_date:t.album?.release_date||null,
          is_explicit:Boolean(t.explicit),
          album_name:t.album?.name||null
        }))
      };
    }
  }

  if(soundchartsCredentialsConfigured()) return searchSoundcharts(q);
  return {error:"spotify_search_unconfigured",configured:false,status:503};
}

Deno.serve(async(req)=>{
  const h=cors(req.headers.get("origin"));
  if(req.method==="OPTIONS") return new Response("ok",{headers:h});
  if(req.method!=="GET") return new Response(JSON.stringify({error:"method_not_allowed"}),{status:405,headers:h});

  try{
    const u=new URL(req.url);
    const url=clean(u.searchParams.get("url"),500);
    const q=clean(u.searchParams.get("q"),160);

    if(url){
      const result:any=await resolveSpotify(url);
      return new Response(JSON.stringify(result.track?{ok:true,track:result.track}:{ok:false,error:result.error}),{status:result.status,headers:h});
    }

    if(q){
      if(q.length<2) return new Response(JSON.stringify({ok:true,results:[],configured:true}),{headers:h});
      const result:any=await searchSpotify(q);
      return new Response(JSON.stringify(result.results?{ok:true,configured:result.configured,results:result.results}:{ok:false,configured:result.configured,error:result.error}),{status:result.status,headers:h});
    }

    return new Response(JSON.stringify({
      ok:true,
      spotify_text_search_configured:spotifyCredentialsConfigured()||soundchartsCredentialsConfigured()
    }),{headers:h});
  }catch(e){
    return new Response(JSON.stringify({ok:false,error:"track_lookup_failed",detail:e instanceof Error?e.message:String(e)}),{status:500,headers:h});
  }
});
