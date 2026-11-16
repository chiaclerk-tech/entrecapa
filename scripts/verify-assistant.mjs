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
  await page.screenshot({path:`/tmp/entrecapa-assistant-v4-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
}

if(process.env.LAYOUT_ONLY==='1'){
  await browser.close();
  console.log(`assistant v4: ${widths.length} local layout viewports passed`);
  process.exit(0);
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
await page.screenshot({path:'/tmp/entrecapa-assistant-v4-conversation-390.png',fullPage:true});
await page.close();

const therapist=await browser.newPage({viewport:{width:390,height:844}});
const therapistReplies=[];
therapist.on('response',async response=>{
  if(response.url().endsWith('/api/assistant')&&response.ok())therapistReplies.push(await response.json());
});
await therapist.goto(baseUrl,{waitUntil:'networkidle'});
await therapist.locator('#ecAssistantLauncher').click();
const therapistInput=therapist.locator('#ecAssistantInput');
const therapistSend=async value=>{
  const before=await therapist.locator('.ec-message.bot:not(.typing)').count();
  await therapistInput.fill(value);
  await therapist.locator('#ecAssistantForm button[type="submit"]').click();
  await therapist.waitForFunction(expected=>document.querySelectorAll('.ec-message.bot:not(.typing)').length>expected,before);
};
await therapistSend('Soy terapeuta y vendo sesiones, bonos y programas con varias plazas. ¿Pulso podría ayudarme?');
await therapistSend('Necesito cobrar, controlar inscripciones y compartir recursos. ¿Cuánto cuesta?');
assert.equal(therapistReplies.at(-1).recommended_offer,'pulso_pro');
assert.equal(therapistReplies.at(-1).include_price,true);
const therapistReply=await therapist.locator('.ec-message.bot:not(.typing)').last().textContent();
assert.match(therapistReply,/2\.450 € de implantación \+ 179 €\/mes/);
assert.match(therapistReply,/sin IVA/i);
assert.ok((therapistReply.match(/\?/g)||[]).length<=1,'therapist price reply asks more than one question');
await therapist.screenshot({path:'/tmp/entrecapa-assistant-v4-therapist-390.png',fullPage:true});
await therapist.close();

await browser.close();
console.log(`assistant v4: ${widths.length} viewports, consultative flow and priced Pulso recommendation passed`);
