import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.QA_BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({
  executablePath: process.env.QA_CHROMIUM_PATH || undefined,
  args: ['--no-sandbox','--disable-dev-shm-usage'],
});
await mkdir('test-results/astra-qa', {recursive:true});
test.after(async()=>browser.close());
const paths = ['/free-spotify-playlist-submission','/learn', ...['how-to-get-on-spotify-playlists','free-spotify-promotion','spotify-promotion-scams','find-spotify-playlist-curators','how-to-pitch-playlist-curators','best-free-music-promotion-sites','how-to-get-more-spotify-streams','best-spotify-playlist-submission-sites'].map(slug=>'/learn/'+slug), '/submit?playlist=liquid-dnb'];
for (const width of [1440,375,390,768]) {
  test(`responsive layouts and navigation at ${width}px`, async()=>{
    const page = await browser.newPage({viewport:{width,height:900}});
    const submissionPosts=[];
    page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('bvss-submit'))submissionPosts.push(r.url());});
    for(const path of paths){
      const response=await page.goto(base+path,{waitUntil:'domcontentloaded'});
      assert.equal(response.status(),200);
      await page.getByRole('heading',{level:1}).waitFor();
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
      assert.equal(overflow,false,`document overflow ${path}`);
      await page.screenshot({path:`test-results/astra-qa/${width}-${path.split('?')[0].replaceAll('/','_')}.png`,fullPage:true});
    }
    const nav=page.getByRole('navigation',{name:'Primary navigation'});
    if(width<=850){
      const open=page.getByRole('button',{name:'Open navigation menu'});
      assert.equal(await nav.isVisible(),false);
      await open.press('Enter');
      assert.equal(await page.getByRole('button',{name:'Close navigation menu'}).getAttribute('aria-expanded'),'true');
      for(const name of ['Music','Artist','Licensing','Playlists','Curators','About','Learn','Submit'])assert.equal(await nav.getByRole('link',{name,exact:true}).isVisible(),true);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Music');
      const focus=await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle);
      assert.notEqual(focus,'none');
      await page.keyboard.press('Escape');
      assert.equal(await nav.isVisible(),false);
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Open navigation menu');
      await open.press('Space');
      await page.getByRole('heading',{level:1}).click();
      assert.equal(await nav.isVisible(),false);
      await open.press('Enter');
      await nav.getByRole('link',{name:'Learn',exact:true}).click();
      await page.waitForURL(base+'/learn');
      assert.equal(await nav.isVisible(),false);
    }else{
      assert.equal(await nav.isVisible(),true);
      assert.equal(await page.getByRole('button',{name:'Open navigation menu'}).isVisible(),false);
    }
    assert.equal(submissionPosts.length,0);
    await page.close();
  });
}
test('P1 filters deduplicate and two real selections survive release-mode switches',async()=>{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const posts=[];
  page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('bvss-submit'))posts.push(r.url());});
  for(const [owner,slug,name] of [['BVSS FVM','liquid-dnb','Liquid DnB 2026 | Melodic Drum & Bass'],['CuratorOS','curatoros-dreamy-ethereal','Dreamy & Ethereal']]){
    await page.goto(base+'/free-spotify-playlist-submission');
    for(const label of ['Genre','Mood','Moment']){
      const values=await page.getByRole('combobox',{name:label,exact:true}).locator('option').allTextContents();
      const keys=values.map(v=>v.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim());
      assert.equal(new Set(keys).size,keys.length,`duplicate ${label}`);
    }
    await page.getByRole('combobox',{name:'Curator',exact:true}).selectOption(owner);
    await page.locator(`a[href="/submit?playlist=${slug}"]`).click();
    await page.waitForURL(base+'/submit?playlist='+slug);
    const selected=page.getByRole('note',{name:'Selected playlist'});
    assert.match(await selected.innerText(),new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
    const group=page.getByRole('group',{name:'Release status'});
    assert.equal(await page.getByRole('tablist').count(),0);
    for(const mode of ['Unreleased','Released']){
      await group.getByRole('button',{name:mode,exact:true}).press('Enter');
      assert.equal(await group.getByRole('button',{name:mode,exact:true}).getAttribute('aria-pressed'),'true');
      assert.ok((await selected.innerText()).includes(name));
    }
    await group.getByRole('button',{name:'Unreleased',exact:true}).click();
    await page.getByRole('textbox',{name:'Artist',exact:true}).fill('QA Artist');
    await page.getByRole('textbox',{name:'Song title',exact:true}).fill('QA Track');
    await page.getByRole('textbox',{name:'Private listening / download link',exact:true}).fill('https://example.com/qa-listen');
    if(owner==='BVSS FVM'){
      const consent=page.getByRole('checkbox',{name:/Also send to matched CuratorOS playlists/});
      assert.equal(await consent.isVisible(),true);
      assert.match(await page.locator('.compact-network-opt-in').innerText(),/in-house CuratorOS team/);
    }else{
      assert.match(await page.locator('.submission-policy').innerText(),/CuratorOS · In-house curation team/);
    }
    // P14 selection must remain checked when the expanded form is shown.
    const selection=page.locator('.playlist-choice').filter({hasText:name}).locator('input[type="checkbox"]');
    assert.equal(await selection.count(),1);
    assert.equal(await selection.isChecked(),true);
  }
  assert.equal(posts.length,0,'never create a production submission');
  await page.close();
});
test('landing/hub social images are valid PNGs with correct dimensions',async()=>{
  const page=await browser.newPage();
  for(const path of ['/free-spotify-playlist-submission','/learn']){
    await page.goto(base+path,{waitUntil:'domcontentloaded'});
    const title=await page.locator('meta[property="og:title"]').getAttribute('content');
    assert.ok(title.includes(path==='/learn'?'Spotify Promotion':'Free Spotify'));
    assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'),'summary_large_image');
    const image=await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const url=new URL(image,base);url.host=new URL(base).host;url.protocol=new URL(base).protocol;
    const response=await page.request.get(url.toString());
    assert.equal(response.status(),200);
    assert.match(response.headers()['content-type'],/image\/png/);
    const buffer=await response.body();
    assert.equal(buffer.readUInt32BE(16),1200);assert.equal(buffer.readUInt32BE(20),630);
  }
  await page.close();
});
test('200% text zoom and half-width reflow keep navigation usable',async()=>{
  const page=await browser.newPage({viewport:{width:640,height:900}});
  await page.goto(base+'/learn');
  await page.addStyleTag({content:'html {font-size:200% !important}'});
  await page.getByRole('button',{name:'Open navigation menu'}).press('Enter');
  assert.equal(await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Submit',exact:true}).isVisible(),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  await page.screenshot({path:'test-results/astra-qa/200-percent-text-reflow.png',fullPage:true});
  await page.close();
});
