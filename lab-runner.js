// User programs run in a short-lived worker inside an opaque-origin frame.
function runProgram(source, requests) {
  const workerSource = `onmessage = async event => {
    const {source, requests} = event.data;
    try {
      const handler = new Function('"use strict";\\n' + source + '\\nreturn handle;')();
      const responses = [];
      for (const request of requests) {
        const response = await handler(request);
        if (!response || !Number.isInteger(response.status) || response.status < 100 || response.status > 599)
          throw Error("O handler precisa retornar {status, body} com um status HTTP válido.");
        responses.push({status:response.status, body:String(response.body ?? "").slice(0, 1600)});
      }
      postMessage({responses});
    } catch(error) { postMessage({error:String(error.message || error).slice(0,500)}); }
  };`;
  return new Promise((resolve,reject)=>{
    const frame=document.createElement('iframe');
    frame.hidden=true;
    frame.title='Executor isolado de JavaScript';
    frame.sandbox='allow-scripts';
    const channel=new MessageChannel();
    const timer=setTimeout(()=>finish({error:'O programa excedeu o limite de execução.'}),4000);
    function finish(result){
      clearTimeout(timer);channel.port1.close();frame.remove();
      if(result?.error||!Array.isArray(result?.responses)) reject(Error(result?.error||'Resposta inválida do executor.'));
      else resolve(result.responses);
    }
    channel.port1.onmessage=event=>finish(event.data);
    frame.srcdoc='<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\' \'unsafe-eval\'; worker-src blob:; connect-src \'none\'"><script>onmessage=e=>{if(e.source!==parent||!e.ports[0])return;onmessage=null;const port=e.ports[0];const url=URL.createObjectURL(new Blob([e.data.worker],{type:"text/javascript"}));const w=new Worker(url);URL.revokeObjectURL(url);const end=v=>{w.terminate();port.postMessage(v)};w.onmessage=m=>end(m.data);w.onerror=()=>end({error:"Falha na execução do handler."});setTimeout(()=>end({error:"Tempo de execução excedido."}),1600);w.postMessage(e.data.job)};<\/script>';
    frame.onload=()=>frame.contentWindow.postMessage({worker:workerSource,job:{source,requests}},'*',[channel.port2]);
    document.body.append(frame);
  });
}
