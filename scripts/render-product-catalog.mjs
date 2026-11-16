import fs from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import playwright from '/root/.openclaw/workspace/node_modules/playwright/index.js';

const root=new URL('../',import.meta.url).pathname;
const source=`${root}docs/CATALOGO-COMERCIAL-DE-PRODUCTOS-2026.md`;
const bodyPath='/tmp/entrecapa-product-catalog-body.html';
const previewPath='/tmp/entrecapa-product-catalog.html';
const output='/root/.openclaw/workspace/exports/entrecapa-catalogo-comercial-productos-2026.pdf';

const converted=spawnSync('npx',['--yes','marked',source,'-o',bodyPath],{encoding:'utf8'});
if(converted.status!==0)throw new Error(converted.stderr||'No se pudo convertir el catálogo');
const body=await fs.readFile(bodyPath,'utf8');
const html=`<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Catálogo comercial de Entrecapa</title>
<style>
:root{--ink:#17201d;--muted:#596762;--green:#183f34;--mint:#dcebe4;--line:#ccd8d3;--paper:#fff}
*{box-sizing:border-box}html{background:#eef2ef}body{margin:0;color:var(--ink);background:var(--paper);font-family:Inter,Arial,sans-serif;font-size:9.15pt;line-height:1.36}
h1{margin:0 0 18pt;padding:34mm 18mm 22mm;min-height:100mm;color:white;background:linear-gradient(140deg,#102f28,#23634f);font-size:30pt;line-height:1.03;letter-spacing:-1.1pt;display:flex;align-items:flex-end}
h1+p{margin:-30mm 18mm 25mm;color:#eef8f3;position:relative;font-size:9.5pt}h1+p strong{color:#eef8f3}
h2{color:var(--green);font-size:16.5pt;line-height:1.15;margin:17pt 0 8pt;padding-top:4pt;border-top:1.5pt solid var(--green);break-after:avoid}
h3{color:var(--green);font-size:12pt;margin:12pt 0 5pt;break-after:avoid}h4{color:var(--green);font-size:10.5pt;margin:11pt 0 4pt;break-after:avoid}
p{margin:0 0 7pt}ul,ol{margin:4pt 0 9pt;padding-left:17pt}li{margin:0 0 2.5pt}strong{color:#102f28}hr{border:0;border-top:1pt solid var(--line);margin:13pt 0}
table{width:calc(100% - 36mm);table-layout:fixed;border-collapse:collapse;margin-top:8pt!important;margin-bottom:13pt!important;font-size:7.7pt;break-inside:auto}thead{display:table-header-group}tr{break-inside:avoid}th{text-align:left;color:white;background:var(--green);padding:5pt 5.5pt}td{vertical-align:top;padding:4.5pt 5.5pt;border-bottom:.7pt solid var(--line);overflow-wrap:anywhere}th:nth-child(1){width:17%}th:nth-child(2){width:30%}th:nth-child(3){width:37%}th:nth-child(4){width:16%}tbody tr:nth-child(even) td{background:#f4f8f6}
a{color:#17624c;text-decoration:none;overflow-wrap:anywhere}blockquote{margin:8pt 0;padding:8pt 10pt;background:var(--mint);border-left:3pt solid var(--green)}
main>*:not(h1):not(h1+p){margin-left:18mm;margin-right:18mm}@page{size:A4;margin:14mm 0 16mm}@media print{html,body{background:white}h1{margin-top:-14mm}}
</style></head><body><main>${body}</main></body></html>`;

await fs.writeFile(previewPath,html);
const browser=await playwright.chromium.launch({headless:true,executablePath:'/snap/bin/chromium',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1240,height:1754}});
await page.setContent(html,{waitUntil:'load'});
await page.pdf({path:output,format:'A4',printBackground:true,displayHeaderFooter:true,headerTemplate:'<div></div>',footerTemplate:'<div style="width:100%;padding:0 18mm;font:8px Arial;color:#697873;display:flex;justify-content:space-between"><span>ENTRECAPA · Catálogo comercial 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',margin:{top:'14mm',right:'0',bottom:'16mm',left:'0'}});
await page.screenshot({path:'/tmp/entrecapa-product-catalog-cover.png',fullPage:false});
await browser.close();
console.log(output);
