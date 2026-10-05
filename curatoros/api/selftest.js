export default async function handler(req,res){
  try{
    const host=req.headers['x-forwarded-host']||req.headers.host||'curatoros-rho.vercel.app';
    const proto=req.headers['x-forwarded-proto']||'https';
    const clientResponse=await fetch(proto+'://'+host+'/app.js');
    const source=(await clientResponse.text())
      .replace(/^import\s+\{\s*createClient\s*\}[^;]+;\s*/,'');
    // Compile only. Do not execute browser code.
    new Function(source);
    const [playlists,track,spotify]=await Promise.all([
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-playlists'),
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-track-lookup?q='+encodeURIComponent('Never Alone Middle Child')),
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-spotify-owner',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'curator_start'})
      })
    ]);
    const playlistBody=await playlists.json().catch(()=>({}));
    const trackBody=await track.json().catch(()=>({}));
    const spotifyBody=await spotify.json().catch(()=>({}));
    res.status(200).json({
      ok:true,
      client_syntax:'valid',
      playlists_api:playlists.status,
      active_public_playlists:Array.isArray(playlistBody.playlists)?playlistBody.playlists.length:null,
      track_lookup_api:track.status,
      never_alone_recognized:Array.isArray(trackBody.results)&&trackBody.results.some(x=>x.spotify_track_id==='4CzteKxZWpQw81hZPbUXj1'),
      spotify_owner_api:spotify.status,
      spotify_owner_auth_guard:spotify.status===401&&spotifyBody.error==='not_authenticated'
    });
  }catch(error){
    res.status(500).json({ok:false,error:String(error?.message||error)});
  }
}
