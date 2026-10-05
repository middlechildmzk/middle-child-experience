export default async function handler(req,res){
  try{
    const host=process.env.VERCEL_URL||req.headers.host;
    const clientResponse=await fetch('https://'+host+'/app.js');
    const source=(await clientResponse.text())
      .replace(/^import\s+\{\s*createClient\s*\}[^;]+;\s*/,'');
    // Compile only. Do not execute browser code.
    new Function(source);
    const [playlists,track]=await Promise.all([
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-playlists'),
      fetch('https://myrtdfyjoxvtubusrrmf.supabase.co/functions/v1/bvss-track-lookup?q='+encodeURIComponent('Never Alone Middle Child'))
    ]);
    const playlistBody=await playlists.json().catch(()=>({}));
    const trackBody=await track.json().catch(()=>({}));
    res.status(200).json({
      ok:true,
      client_syntax:'valid',
      playlists_api:playlists.status,
      active_public_playlists:Array.isArray(playlistBody.playlists)?playlistBody.playlists.length:null,
      track_lookup_api:track.status,
      never_alone_recognized:Array.isArray(trackBody.results)&&trackBody.results.some(x=>x.spotify_track_id==='4CzteKxZWpQw81hZPbUXj1')
    });
  }catch(error){
    res.status(500).json({ok:false,error:String(error?.message||error)});
  }
}