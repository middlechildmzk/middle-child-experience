import { readFileSync } from 'node:fs';

export default async function handler(req,res){
  try{
    let raw;
    try{ raw=readFileSync(process.cwd()+'/app.js','utf8'); }
    catch{ raw=await (await fetch('https://curatoros-rho.vercel.app/app.js')).text(); }
    const source=raw.replace(/^import\s+\{\s*createClient\s*\}[^;]+;\s*/,'');
    // Compile only. Do not execute browser code.
    new Function(source);

    const [playlists,track,spotify,spotifyConfig]=await Promise.all([
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-playlists'),
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-track-lookup?q='+encodeURIComponent('Never Alone Middle Child')),
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-spotify-owner',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'curator_start'})
      }),
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-spotify-owner',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'configuration_status'})
      })
    ]);
    const playlistBody=await playlists.json().catch(()=>({}));
    const trackBody=await track.json().catch(()=>({}));
    const spotifyBody=await spotify.json().catch(()=>({}));
    const spotifyConfigBody=await spotifyConfig.json().catch(()=>({}));
    res.status(200).json({
      ok:true,
      client_syntax:'valid',
      playlists_api:playlists.status,
      active_public_playlists:Array.isArray(playlistBody.playlists)?playlistBody.playlists.length:null,
      track_lookup_api:track.status,
      never_alone_recognized:Array.isArray(trackBody.results)&&trackBody.results.some(x=>x.spotify_track_id==='4CzteKxZWpQw81hZPbUXj1'),
      spotify_owner_api:spotify.status,
      spotify_owner_auth_guard:spotify.status===401&&spotifyBody.error==='not_authenticated',
      spotify_app_configured:spotifyConfig.status===200&&spotifyConfigBody.spotify_app_configured===true,
      spotify_redirect_uri:spotifyConfigBody.redirect_uri||null
    });
  }catch(error){
    res.status(500).json({ok:false,error:String(error?.message||error)});
  }
}
