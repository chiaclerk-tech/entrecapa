(()=>{
  'use strict';
  const root=document.getElementById('entrecapaAssistant');
  if(!root)return;
  const launcher=document.getElementById('ecAssistantLauncher');
  const panel=document.getElementById('ecAssistantPanel');
  const close=document.getElementById('ecAssistantClose');
  const messages=document.getElementById('ecAssistantMessages');
  const options=document.getElementById('ecAssistantOptions');
  const form=document.getElementById('ecAssistantForm');
  const input=document.getElementById('ecAssistantInput');
  const lead={business:'',need:'',goal:'',name:'',email:'',contact:'',availability:'',phone:''};
  let step='home';
  const infoCounts=new Map();
  let lastInfoAnswer='';

  const addMessage=(text,who='bot')=>{
    const item=document.createElement('div');
    item.className=`ec-message ${who}`;
    item.textContent=text;
    messages.appendChild(item);
    messages.scrollTop=messages.scrollHeight;
    return item;
  };
  const setOptions=(items=[])=>{
    options.replaceChildren();
    items.forEach(({label,value})=>{
      const button=document.createElement('button');
      button.type='button';button.textContent=label;
      button.addEventListener('click',()=>handle(value,label));
      options.appendChild(button);
    });
  };
  const ask=(text,next,items=[])=>{addMessage(text);step=next;setOptions(items);input.focus({preventScroll:true})};
  const validEmail=value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const resetLead=()=>Object.keys(lead).forEach(key=>lead[key]='');
  const startLead=()=>ask('Perfecto. No necesito que tengas la solución pensada. Empecemos por el contexto: ¿qué tipo de negocio, actividad o equipo tienes?','business');
  const homeOptions=()=>setOptions([
    {label:'Qué hace Entrecapa',value:'about'},
    {label:'Tengo un proceso que se atasca',value:'start'},
    {label:'Necesito una herramienta o web',value:'start'},
    {label:'Quiero hablar con Eloy',value:'meeting'}
  ]);
  const intro=()=>{
    addMessage('Hola. Soy el asistente piloto de Entrecapa. Puedo explicarte cómo trabajamos y ayudarte a preparar una primera conversación, sin intentar venderte una solución prefabricada.');
    addMessage('¿Qué te trae por aquí?');
    homeOptions();
  };
  const normalize=value=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ');
  const includesAny=(value,terms)=>terms.some(term=>value.includes(term));
  const classifyInfo=value=>{
    if(value==='about')return 'about';
    const q=normalize(value);
    if(includesAny(q,['precio','cuanto cuesta','tarifa','presupuesto','coste']))return 'price';
    if(includesAny(q,['inteligencia artificial',' ia ','chatbot','agente']))return 'ai';
    if(includesAny(q,['pagina web','sitio web','una web','diseno web']))return 'web';
    if(includesAny(q,['automat','proceso','repetitiv','tarea','integracion']))return 'automation';
    if(includesAny(q,['pulso','veinat','veinat','visionhscode','visionhsquery','producto','productos']))return 'products';
    if(includesAny(q,['como trabaj','metodo','metodologia','fases','proceso de trabajo']))return 'method';
    if(includesAny(q,['para quien','tipo de cliente','clientes','autonom','pyme','empresa','organizacion']))return 'audience';
    if(includesAny(q,['cuanto tarda','plazo','tiempo','duracion','cuando estaria']))return 'timing';
    if(includesAny(q,['mantenimiento','soporte','despues','dependencia']))return 'support';
    if(includesAny(q,['privacidad','datos','seguridad','confidencial']))return 'privacy';
    if(includesAny(q,['contact','reunion','reunir','cita','hablar con eloy','llamada']))return 'contact';
    if(includesAny(q,['que haceis','que hace entrecapa','a que os dedicais','como podeis ayudar','como ayudais','servicios']))return 'about';
    return 'generic';
  };
  const infoAnswers={
    about:[
      'Entrecapa diseña herramientas digitales, automatizaciones y productos propios para resolver fricciones concretas. Empezamos entendiendo el trabajo real, probamos una intervención pequeña y solo después construimos el sistema necesario.',
      'Dicho de forma más concreta: entramos cuando una tarea consume demasiado tiempo, la información está dispersa o varias herramientas no terminan de encajar. Podemos revisar el proceso, construir una solución y dejarla funcionando.',
      'No vendemos una tecnología cerrada. Conectamos personas, procesos y herramientas para que el trabajo avance con menos pasos y sin quitar a las personas el criterio.'
    ],
    price:[
      'No trabajamos con una tarifa única porque el alcance depende del problema. Primero acotamos la necesidad y, si encaja, Eloy plantea un siguiente paso y un presupuesto comprensible.',
      'El precio se define después de entender el alcance. Una primera conversación sirve para separar lo imprescindible de lo opcional y evitar presupuestar una solución más grande de lo necesario.'
    ],
    ai:[
      'Usamos IA cuando reduce fricción de forma verificable, no como reclamo ni para sustituir el criterio humano. Las reglas importantes, permisos y decisiones se mantienen controlados.',
      'Para Entrecapa, la IA es una pieza posible, no el producto entero. La acotamos a tareas donde pueda aportar velocidad sin inventar decisiones ni ocultar incertidumbre.'
    ],
    web:[
      'Podemos diseñar y construir una web cuando forma parte de una necesidad concreta: explicar mejor un proyecto, convertir visitas en conversaciones o conectar la presencia pública con una operativa real.',
      'Una web puede ser el encargo, pero no la tratamos como un escaparate aislado. Miramos qué debe entender o hacer la persona y cómo continuará el proceso después del primer contacto.'
    ],
    automation:[
      'Revisamos el trabajo tal como sucede, detectamos repeticiones, esperas e información dispersa y construimos solo la intervención necesaria. Puede ser una automatización, una herramienta pequeña o una conexión entre sistemas.',
      'Automatizar no significa sustituir todas tus herramientas. A menudo basta con ordenar una entrada, conectar dos pasos o preparar información para que una persona decida mejor.'
    ],
    products:[
      'Entrecapa combina proyectos para clientes con productos propios. En la web puedes ver Hola Psoriasis, Veïnat, VisionHSCode y VisionHSQuery; Pulso se está validando como núcleo para profesionales independientes.',
      'Nuestros productos nacen de problemas reales y se prueban con pilotos. No presentamos una idea como producto terminado: distinguimos demostradores, pilotos y herramientas profesionales.'
    ],
    method:[
      'Trabajamos en tres pasos: entender el contexto, hacer visible una solución pequeña y, solo si funciona, integrarla como sistema mantenible.',
      'Primero observamos el recorrido real. Después construimos un prototipo verificable y finalmente conectamos, documentamos y dejamos bajo control la solución aprobada.'
    ],
    audience:[
      'Trabajamos con autónomos, emprendedores, pymes, equipos y organizaciones que tienen una fricción concreta y quieren resolverla con una intervención proporcionada.',
      'El tamaño no es el criterio principal. Encaja mejor quien puede señalar una tarea, recorrido o información que hoy frena el trabajo y está dispuesto a probar una mejora concreta.'
    ],
    timing:[
      'El plazo depende del alcance. Preferimos acordar una primera versión pequeña y comprobable antes que prometer una fecha para un sistema todavía difuso.',
      'Después de la conversación inicial se puede definir qué debe probarse primero y cuánto necesita. Los plazos se vinculan a entregables verificables, no a una promesa abierta.'
    ],
    support:[
      'La implantación incluye dejar la solución conectada y documentada. La continuidad y el soporte se acuerdan con alcance claro para no crear una dependencia indefinida.',
      'Buscamos que la herramienta sea mantenible y quede bajo control del cliente. Si necesita acompañamiento posterior, se define de forma explícita.'
    ],
    privacy:[
      'Intentamos minimizar los datos, limitar accesos y dejar trazabilidad cuando el proyecto lo requiere. Este piloto no almacena la conversación ni envía nada hasta que la persona revisa y manda su correo.',
      'La privacidad se diseña según el proyecto. En este chat, tus respuestas permanecen en el navegador y solo pasan a un correo si decides abrirlo y enviarlo.'
    ],
    contact:[
      'Puedo ayudarte a preparar una primera conversación con Eloy. Te pediré solo negocio, necesidad, objetivo y una vía de contacto; al final revisarás el correo antes de enviarlo.',
      'Si quieres hablarlo, convertimos el contexto en un resumen breve para que Eloy llegue a la conversación preparado y tú no tengas que repetirlo todo.'
    ],
    generic:[
      'Puedo orientarte sobre qué hace Entrecapa, cómo trabaja, sus productos, automatización, webs, IA, plazos y forma de contacto. Si me cuentas tu situación, también puedo preparar un resumen para Eloy.',
      'No quiero responderte con una frase genérica. Reformula la pregunta con un poco más de contexto o dime qué tarea, proceso o información te gustaría mejorar.',
      'Eso puede depender mucho del caso. Cuéntame qué sucede hoy y qué te gustaría conseguir; con ese contexto podré orientarte mejor o preparar la conversación con Eloy.'
    ]
  };
  const answerInfo=value=>{
    const intent=classifyInfo(value);
    const variants=infoAnswers[intent];
    let index=infoCounts.get(intent)||0;
    let answer=variants[index%variants.length];
    if(answer===lastInfoAnswer)answer=variants[(index+1)%variants.length];
    infoCounts.set(intent,index+1);
    lastInfoAnswer=answer;
    return answer;
  };
  const buildEmail=()=>{
    const subject=lead.contact==='meeting'?'Solicitud de conversación desde la web':'Posible proyecto desde la web de Entrecapa';
    const body=[
      `Hola, soy ${lead.name}.`,
      '',
      'He preparado este resumen con el asistente de Entrecapa:',
      '',
      `Negocio o actividad: ${lead.business}`,
      `Fricción o necesidad: ${lead.need}`,
      `Resultado que busco: ${lead.goal}`,
      `Vía de contacto preferida: ${lead.contact==='meeting'?'Conversación / cita':lead.contact==='phone'?'Teléfono':'Correo electrónico'}`,
      lead.availability?`Disponibilidad orientativa: ${lead.availability}`:'',
      lead.phone?`Teléfono: ${lead.phone}`:'',
      `Correo: ${lead.email}`,
      '',
      'Podéis contactarme para valorar si encaja.'
    ].filter(Boolean).join('\n');
    return `mailto:info@entrecapa.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  const finish=()=>{
    const summary=`Gracias, ${lead.name}. He preparado este resumen:\n\n• ${lead.business}\n• Necesidad: ${lead.need}\n• Objetivo: ${lead.goal}\n\nTodavía no se ha enviado nada.`;
    addMessage(summary);
    const box=addMessage('Pulsa el botón para abrir un correo ya redactado. Podrás revisarlo y decidir si lo envías.');
    const mail=document.createElement('a');
    mail.className='ec-assistant-mail';mail.href=buildEmail();mail.textContent='Preparar correo →';
    box.appendChild(document.createElement('br'));box.appendChild(mail);
    step='done';
    setOptions([{label:'Corregir mis respuestas',value:'restart'},{label:'Seguir preguntando',value:'home'}]);
  };
  const handle=(value,label=value)=>{
    const text=String(value).trim();
    if(!text)return;
    if(step!=='home'||!['about','start','meeting','restart','home'].includes(text))addMessage(label,'user');
    if(text==='restart'){resetLead();messages.replaceChildren();step='home';intro();return}
    if(text==='home'){step='home';ask('Claro. Puedes preguntarme por Entrecapa o preparar una conversación con Eloy.','home');homeOptions();return}
    if(step==='home'){
      if(text==='about'){addMessage(answerInfo('about'));ask('¿Quieres saber algo concreto o contarme qué necesitas?','home');homeOptions();return}
      if(text==='start'){startLead();return}
      if(text==='meeting'){lead.contact='meeting';startLead();return}
      addMessage(answerInfo(text));
      ask('Si quieres, puedo ayudarte a convertir tu necesidad en un resumen breve para hablar con Eloy.','home',[{label:'Preparar la conversación',value:'start'},{label:'Tengo otra pregunta',value:'home'}]);return;
    }
    if(step==='business'){lead.business=text;ask('¿Qué tarea, proceso o situación te está quitando tiempo, dispersando información o frenando el trabajo?','need');return}
    if(step==='need'){lead.need=text;ask('¿Qué te gustaría que fuese distinto cuando esto estuviera resuelto? No hace falta describir la tecnología.','goal');return}
    if(step==='goal'){lead.goal=text;ask('¿Cómo te llamas?','name');return}
    if(step==='name'){lead.name=text;ask('¿Qué correo podemos usar para responderte?','email');return}
    if(step==='email'){
      if(!validEmail(text)){ask('Ese correo parece incompleto. Escríbelo de nuevo, por favor.','email');return}
      lead.email=text;
      if(lead.contact==='meeting'){ask('¿Qué días u horarios suelen venirte mejor para una primera conversación?','availability');return}
      ask('¿Cómo prefieres continuar?','contact',[{label:'Por correo',value:'email'},{label:'Quiero concertar una conversación',value:'meeting'},{label:'Prefiero una llamada',value:'phone'}]);return;
    }
    if(step==='contact'){
      lead.contact=text;
      if(text==='phone'){ask('Indica un teléfono y, si quieres, la franja que te viene mejor.','phone');return}
      if(text==='meeting'){ask('¿Qué días u horarios suelen venirte mejor?','availability');return}
      finish();return;
    }
    if(step==='availability'){lead.availability=text;finish();return}
    if(step==='phone'){lead.phone=text;finish();return}
    if(step==='done'){addMessage(answerInfo(text));homeOptions()}
  };
  const openPanel=()=>{panel.hidden=false;launcher.setAttribute('aria-expanded','true');if(!messages.children.length)intro();setTimeout(()=>input.focus({preventScroll:true}),50)};
  const closePanel=()=>{panel.hidden=true;launcher.setAttribute('aria-expanded','false');launcher.focus({preventScroll:true})};
  launcher.addEventListener('click',()=>panel.hidden?openPanel():closePanel());
  close.addEventListener('click',closePanel);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)closePanel()});
  form.addEventListener('submit',event=>{event.preventDefault();handle(input.value);input.value='';input.style.height='auto'});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit()}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,92)}px`});
})();
