import fs from 'node:fs';
import path from 'node:path';

export default async function handler(_req,res){
  try{
    const source=fs.readFileSync(path.join(process.cwd(),'app.js'),'utf8')
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