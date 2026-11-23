const http=require('node:http');
const {experiment}=require('./experiments.cjs');
const {accounts}=require('./accounts.cjs');
function createHandler(store){
return async function handler(req,res){
  const headers={'Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':process.env.FRONTEND_ORIGIN||'https://marcusnog.github.io','Cache-Control':'no-store'};
  function send(status,body){res.writeHead(status,headers);res.end(JSON.stringify(body));}
  if(req.method==='OPTIONS'){
    headers['Access-Control-Allow-Headers']='Authorization, Content-Type';
    headers['Access-Control-Allow-Methods']='GET, POST, PUT, OPTIONS';
    res.writeHead(204,headers);return res.end();
  }
  if(req.url.startsWith('/api/auth/')||req.url==='/api/me'||req.url==='/api/progress'||req.url.split('?')[0]==='/api/ranking'){
    try{await store.route(req,send);}catch(e){send(e.status||500,{error:e.status?e.message:'Erro ao acessar a conta.'});}return;
  }
  if(req.method!=='GET'){headers.Allow='GET';return send(405,{error:'Use GET.'});}
  if(req.url==='/api/health')return send(200,{status:'ok',service:'stackquest-api'});
  const path=/^\/api\/experimentos\/([a-z]+)\/([a-z]+)$/.exec(req.url);
  const data=path&&experiment(path[1],path[2]);
  if(!data)return send(404,{error:'Experimento desconhecido.'});
  headers['Cache-Control']='public, max-age=300';
  send(200,data);
};}
if(require.main===module)http.createServer(createHandler(accounts(process.env.DATA_FILE||'stackquest.sqlite'))).listen(Number(process.env.PORT||8080),'0.0.0.0');
module.exports={createHandler};
