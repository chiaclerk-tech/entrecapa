import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:8790';
const widths=[1440,390,320];
const browser=await chromium.launch({headless:true});

for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
  const errors=[];
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
  const response=await page.goto(baseUrl,{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('#ecAssistantPanel').isHidden(),true);
  await page.locator('#ecAssistantLauncher').click();
  await page.locator('#ecAssistantPanel').waitFor({state:'visible'});
  assert.equal(await page.locator('.ec-message.bot').count(),2);
  assert.equal(await page.locator('#ecAssistantOptions button').count(),3);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=0,`horizontal overflow ${overflow}px at ${width}`);
  const panel=await page.locator('#ecAssistantPanel').boundingBox();
  assert.ok(panel&&panel.x>=0&&panel.x+panel.width<=width+0.5,`panel outside viewport at ${width}`);
  await page.screenshot({path:`/tmp/entrecapa-assistant-v3-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
}

const page=await browser.newPage({viewport:{width:390,height:844}});
const apiReplies=[];
page.on('response',async response=>{
  if(response.url().endsWith('/api/assistant')&&response.ok())apiReplies.push(await response.json());
});
await page.goto(baseUrl,{waitUntil:'networkidle'});
await page.locator('#ecAssistantLauncher').click();
const input=page.locator('#ecAssistantInput');
const send=async value=>{
  const before=await page.locator('.ec-message.bot:not(.typing)').count();
  await input.fill(value);
  await page.locator('#ecAssistantForm button[type="submit"]').click();
  await page.waitForFunction(expected=>document.querySelectorAll('.ec-message.bot:not(.typing)').length>expected,before);
};

await send('Soy emprendedor. ¿Podéis ayudarme?');
const firstReply=await page.locator('.ec-message.bot:not(.typing)').last().textContent();
assert.match(firstReply,/sí|claro|ayudar/i);
assert.match(firstReply,/\?/);

await send('Tengo una pequeña asesoría y perdemos tiempo copiando datos de correos a varias hojas.');
const secondReply=await page.locator('.ec-message.bot:not(.typing)').last().textContent();
assert.notEqual(firstReply,secondReply);
assert.ok((secondReply.match(/\?/g)||[]).length<=1,'more than one question in a turn');

await send('Quiero que todo entre por un único sitio y que el equipo no repita trabajo.');
await page.locator('.ec-assistant-mail').waitFor({state:'visible',timeout:15000});
const href=await page.locator('.ec-assistant-mail').getAttribute('href');
assert.ok(href.startsWith('mailto:info@entrecapa.com?'));
assert.equal(apiReplies.length,3);
assert.equal(apiReplies.at(-1).offer_contact,true);
assert.equal(await page.locator('#ecAssistantMessages script').count(),0);
await page.screenshot({path:'/tmp/entrecapa-assistant-v3-conversation-390.png',fullPage:true});
await browser.close();
console.log(`assistant v3: ${widths.length} viewports and live conversational flow passed`);
