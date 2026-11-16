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
  const submit=form.querySelector('button[type="submit"]');
  const conversation=[];
  let leadSummary={business:'',need:'',goal:''};
  let busy=false;

  const addMessage=(text,who='bot',extra='')=>{
    const item=document.createElement('div');
    item.className=`ec-message ${who}${extra?` ${extra}`:''}`;
    item.textContent=text;
    messages.appendChild(item);
    messages.scrollTop=messages.scrollHeight;
    return item;
  };

  const setOptions=(items=[])=>{
    options.replaceChildren();
    items.forEach(({label,message})=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=label;
      button.addEventListener('click',()=>send(message||label));
      options.appendChild(button);
    });
  };

  const setBusy=value=>{
    busy=value;
    input.disabled=value;
    submit.disabled=value;
    submit.textContent=value?'…':'Enviar';
  };

  const showTyping=()=>addMessage('Escribiendo…','bot','typing');

  const buildMail=()=>{
    const parts=[
      'Hola, Eloy:',
      '',
      'He estado hablando con el asistente de Entrecapa y me gustaría valorar si mi caso encaja.',
      '',
      leadSummary.business?`Negocio o actividad: ${leadSummary.business}`:'',
      leadSummary.need?`Necesidad: ${leadSummary.need}`:'',
      leadSummary.goal?`Resultado que busco: ${leadSummary.goal}`:'',
      '',
      'Podéis contactarme para continuar la conversación.'
    ].filter((line,index,array)=>line||array[index-1]!=='' );
    return `mailto:info@entrecapa.com?subject=${encodeURIComponent('Posible proyecto desde la web de Entrecapa')}&body=${encodeURIComponent(parts.join('\n'))}`;
  };

  const showContact=()=>{
    if(options.querySelector('.ec-assistant-mail'))return;
    options.replaceChildren();
    const mail=document.createElement('a');
    mail.className='ec-assistant-mail';
    mail.href=buildMail();
    mail.textContent='Preparar correo para Eloy →';
    options.appendChild(mail);
    const continueButton=document.createElement('button');
    continueButton.type='button';
    continueButton.textContent='Seguir hablando';
    continueButton.addEventListener('click',()=>{options.replaceChildren();input.focus({preventScroll:true})});
    options.appendChild(continueButton);
  };

  const requestReply=async()=>{
    const response=await fetch('/api/assistant',{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({messages:conversation.slice(-12)})
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'No he podido responder ahora mismo.');
    return data;
  };

  const send=async raw=>{
    const text=String(raw||'').trim();
    if(!text||busy)return;
    setOptions();
    addMessage(text,'user');
    conversation.push({role:'user',content:text});
    input.value='';
    input.style.height='auto';
    setBusy(true);
    const typing=showTyping();
    try{
      const data=await requestReply();
      typing.remove();
      addMessage(data.reply);
      conversation.push({role:'assistant',content:data.reply});
      if(data.lead_summary){
        for(const key of ['business','need','goal']){
          const value=String(data.lead_summary[key]||'').trim();
          if(value&&!/^(desconocid[oa]|sin especificar)$/i.test(value))leadSummary[key]=value;
        }
      }
      if(data.offer_contact)showContact();
    }catch(error){
      typing.remove();
      addMessage(error.message||'No he podido responder ahora mismo. Inténtalo de nuevo en unos segundos.','bot','error');
      conversation.pop();
      setOptions([{label:'Intentarlo de nuevo',message:text}]);
    }finally{
      setBusy(false);
      input.focus({preventScroll:true});
    }
  };

  const intro=()=>{
    addMessage('Hola. Soy el asistente de Entrecapa. Puedo ayudarte a ver si lo que necesitas encaja con nosotros y, si tiene sentido, preparar una conversación con Eloy.');
    addMessage('Cuéntame: ¿qué te gustaría mejorar?');
    setOptions([
      {label:'Tengo un negocio y una idea'},
      {label:'Hay un proceso que se atasca'},
      {label:'Quiero saber qué hacéis'}
    ]);
  };

  const openPanel=()=>{
    panel.hidden=false;
    launcher.setAttribute('aria-expanded','true');
    if(!messages.children.length)intro();
    setTimeout(()=>input.focus({preventScroll:true}),50);
  };
  const closePanel=()=>{
    panel.hidden=true;
    launcher.setAttribute('aria-expanded','false');
    launcher.focus({preventScroll:true});
  };

  launcher.addEventListener('click',()=>panel.hidden?openPanel():closePanel());
  close.addEventListener('click',closePanel);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden)closePanel()});
  form.addEventListener('submit',event=>{event.preventDefault();send(input.value)});
  input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit()}});
  input.addEventListener('input',()=>{input.style.height='auto';input.style.height=`${Math.min(input.scrollHeight,92)}px`});
})();
