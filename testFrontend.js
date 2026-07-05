
async function test() {
  const htmlRes = await fetch('https://pcon-seven.vercel.app/');
  const html = await htmlRes.text();
  const match = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (match) {
    const jsUrl = 'https://pcon-seven.vercel.app' + match[1];
    const jsRes = await fetch(jsUrl);
    const js = await jsRes.text();
    console.log(js.includes('pcon.onrender.com') ? 'RENDER_URL_FOUND' : 'RENDER_URL_MISSING');
  } else {
    console.log('NO_JS_FOUND');
  }
}
test().catch(console.error);
