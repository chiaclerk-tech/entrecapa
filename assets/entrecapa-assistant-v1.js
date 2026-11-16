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
  const answerInfo=value=>{
    const q=value.toLowerCase();
    if(q.includes('precio')||q.includes('cuánto')||q.includes('cuanto'))return 'No trabajamos con una tarifa única porque el alcance depende del problema. Primero acotamos la necesidad y, si encaja, Eloy te plantea un siguiente paso y un presupuesto comprensible.';
    if(q.includes('ia')||q.includes('inteligencia'))return 'Usamos IA cuando reduce fricción de forma verificable, no como reclamo ni para sustituir el criterio humano. Las reglas importantes, permisos y decisiones se mantienen controlados.';
    if(q.includes('web'))return 'Podemos diseñar y construir una web cuando forma parte de una necesidad concreta: explicar mejor un proyecto, convertir visitas en conversaciones o conectar la presencia pública con una operativa real.';
    if(q.includes('automat')||q.includes('proceso'))return 'Revisamos el trabajo tal como sucede, detectamos repeticiones, esperas e información dispersa y construimos solo la intervención necesaria. Puede ser una automatización, una herramienta pequeña o una conexión entre sistemas.';
    if(q.includes('pulso'))return 'Pulso es un producto en desarrollo para profesionales independientes: conecta servicios, clientes, reservas, pagos y comunicaciones. Se valida mediante pilotos antes de abrirse como producto.';
    if(q.includes('veïnat')||q.includes('veinat'))return 'Veïnat es un piloto para comunidades y administradores en Cataluña. Reúne documentos, incidencias, juntas y decisiones en un expediente común y portable.';
    if(q.includes('vision'))return 'VisionHSCode y VisionHSQuery son productos del ámbito aduanero. Transforman información dispersa y consultas complejas en recorridos más claros y trazables, siempre con revisión profesional cuando corresponde.';
    return 'Entrecapa diseña herramientas digitales, automatizaciones y productos propios para resolver fricciones concretas. Empezamos entendiendo el trabajo real, probamos una intervención pequeña y solo después construimos el sistema necesario.';
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
