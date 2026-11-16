import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/assistant.js';

const origin='https://www.entrecapa.com';
const request=body=>new Request('https://www.entrecapa.com/api/assistant',{
  method:'POST',
  headers:{origin,'content-type':'application/json'},
  body:JSON.stringify(body)
});

let captured;
const env={AI:{run:async(model,input)=>{
  captured={model,input};
  return {response:{
    reply:'Sí, claro. Cuéntame un poco más de tu negocio: ¿qué te gustaría mejorar?',
    stage:'discover',
    offer_contact:false,
    lead_summary:{business:'emprendedor',need:'',goal:''}
  }};
}}};

const success=await onRequestPost({
  request:request({messages:[{role:'user',content:'Soy emprendedor. ¿Podéis ayudarme?'}]}),
  env
});
assert.equal(success.status,200);
assert.equal(success.headers.get('cache-control'),'no-store');
const successBody=await success.json();
assert.match(successBody.reply,/sí, claro/i);
assert.equal(successBody.stage,'discover');
assert.ok(captured.model.includes('llama-3.3-70b'));
assert.equal(captured.input.response_format.type,'json_schema');
assert.match(captured.input.messages[0].content,/Contesta primero y de forma directa/);
assert.match(captured.input.messages[0].content,/Una pregunta por turno como máximo/);

const foreign=await onRequestPost({
  request:new Request('https://www.entrecapa.com/api/assistant',{
    method:'POST',headers:{origin:'https://example.com','content-type':'application/json'},body:'{}'
  }),
  env
});
assert.equal(foreign.status,403);

const invalid=await onRequestPost({request:request({messages:[]}),env});
assert.equal(invalid.status,400);

console.log('assistant API: schema, prompt, origin and input validation passed');
