import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const baseUrl=process.env.BASE_URL||'http://127.0.0.1:8788';
const widths=[1440,390,320];
const browser=await chromium.launch({headless:true});

for(const width of widths){
  const page=await browser.newPage({viewport:{width,height:width===1440?900:844}});
  const errors=[];
  page.on('pageerror',error=>errors.push(`page: ${error.message}`));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`)});
  const response=await page.goto(baseUrl,{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('#entrecapaAssistant').count(),1);
  assert.equal(await page.locator('#ecAssistantPanel').isHidden(),true);
  await page.locator('#ecAssistantLauncher').click();
  await page.locator('#ecAssistantPanel').waitFor({state:'visible'});
  assert.equal(await page.locator('.ec-message.bot').count(),2);
  assert.equal(await page.locator('#ecAssistantOptions button').count(),4);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  assert.ok(overflow<=0,`horizontal overflow ${overflow}px at ${width}`);
  const panel=await page.locator('#ecAssistantPanel').boundingBox();
  assert.ok(panel&&panel.x>=0&&panel.x+panel.width<=width+0.5,`panel outside viewport at ${width}`);
  await page.screenshot({path:`/tmp/entrecapa-assistant-${width}.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  await page.close();
}

const repeatPage=await browser.newPage({viewport:{width:390,height:844}});
await repeatPage.goto(baseUrl,{waitUntil:'networkidle'});
await repeatPage.locator('#ecAssistantLauncher').click();
await repeatPage.getByRole('button',{name:'Qué hace Entrecapa'}).click();
const repeatInput=repeatPage.locator('#ecAssistantInput');
await repeatInput.fill('¿Qué hacéis exactamente?');
await repeatPage.locator('#ecAssistantForm button[type="submit"]').click();
const repeatBots=repeatPage.locator('.ec-message.bot');
const firstAbout=await repeatBots.nth(2).textContent();
const secondAbout=await repeatBots.nth(4).textContent();
assert.notEqual(firstAbout,secondAbout,'repeated about question returned the same answer');
await repeatInput.fill('¿Qué hacéis exactamente?');
await repeatPage.locator('#ecAssistantForm button[type="submit"]').click();
const thirdAbout=await repeatBots.nth(6).textContent();
assert.notEqual(secondAbout,thirdAbout,'third repeated question returned the same answer');
await repeatPage.close();

const page=await browser.newPage({viewport:{width:390,height:844}});
await page.goto(baseUrl,{waitUntil:'networkidle'});
await page.locator('#ecAssistantLauncher').click();
await page.getByRole('button',{name:'Tengo un proceso que se atasca'}).click();
const input=page.locator('#ecAssistantInput');
for(const value of ['Estudio de arquitectura','Los encargos llegan por varios canales y repetimos datos','Quiero una entrada única y preparar mejor cada reunión','Ana Prueba','ana@example.com']){
  await input.fill(value);
  await page.locator('#ecAssistantForm button[type="submit"]').click();
}
await page.getByRole('button',{name:'Quiero concertar una conversación'}).click();
await input.fill('Martes o jueves por la tarde');
await page.locator('#ecAssistantForm button[type="submit"]').click();
const mail=page.locator('.ec-assistant-mail');
await mail.waitFor({state:'visible'});
const href=await mail.getAttribute('href');
assert.ok(href.startsWith('mailto:info@entrecapa.com?'));
const decoded=decodeURIComponent(href);
for(const marker of ['Estudio de arquitectura','Los encargos llegan por varios canales','Ana Prueba','ana@example.com','Martes o jueves por la tarde'])assert.ok(decoded.includes(marker),`missing ${marker}`);
assert.equal(await page.locator('text=Todavía no se ha enviado nada.').count(),1);
assert.equal(await page.locator('#ecAssistantMessages script').count(),0);
await page.screenshot({path:'/tmp/entrecapa-assistant-complete-390.png',fullPage:true});
await browser.close();
console.log(`assistant: ${widths.length} viewports and complete lead flow passed`);
