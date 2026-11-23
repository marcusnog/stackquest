const {DatabaseSync}=require('node:sqlite');
const {randomBytes,scrypt,timingSafeEqual,createHash}=require('node:crypto');
const {promisify}=require('node:util');
const derive=promisify(scrypt);
const digest=s=>createHash('sha256').update(s).digest('hex');
const expiry=7*24*3600*1000;
const progressKey=/^stackquest\.(?:missao\.v1\.[1-6]-[1-3]|lab\.v1\.(?:vps|deploy|cloud|k8s)|db\.v1\.(?:checkout|sessoes|catalogo|relacoes|telemetria|analitica))$/;
function failure(status,message){return Object.assign(new Error(message),{status});}
async function json(req,max){
  if(req.headers['content-type']?.split(';')[0]!=='application/json')throw failure(415,'Envie JSON.');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>max)throw failure(413,'Registro grande demais.');chunks.push(chunk);}
  try{const value=JSON.parse(Buffer.concat(chunks));if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value;}
  catch{throw failure(400,'JSON inválido.');}
}
function accounts(filename){
  const db=new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, verifier TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
    CREATE TABLE IF NOT EXISTS progress(user_id INTEGER NOT NULL REFERENCES users(id),key TEXT NOT NULL, value TEXT NOT NULL,version INTEGER NOT NULL, PRIMARY KEY(user_id,key));`);
  const rates=new Map();let hashing=0;
  function throttle(req){
    const ip=String(req.headers['x-forwarded-for']||req.socket.remoteAddress).split(',').at(-1).trim();
    const now=Date.now();
    for(const [key,v] of rates)if(v.end<=now)rates.delete(key);
    const rate=rates.get(ip)||{n:0,end:now+600000};rates.set(ip,rate);
    if(++rate.n>35||hashing>=3)throw failure(429,'Muitas tentativas. Tente novamente mais tarde.');
  }
  function identity(req){
    const token=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization||'')?.[1];
    const session=token&&db.prepare('SELECT u.id,u.name FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').get(digest(token),Date.now());
    if(!session)throw failure(401,'Entre novamente na sua conta.');
    return {user:session,hash:digest(token)};
  }
  function snapshot(user){
    return {name:user.name,records:db.prepare('SELECT key,value,version FROM progress WHERE user_id=?').all(user.id)};
  }
  async function route(req,send){
    if(req.method==='POST'&&['/api/auth/register','/api/auth/login'].includes(req.url)){
      const body=await json(req,2048);
      const name=typeof body.name==='string'?body.name.trim().toLowerCase():'';
      if(!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(name)||typeof body.password!=='string'||body.password.length<12||body.password.length>128)throw failure(400,'Use um usuário de 3 a 32 caracteres e uma senha de 12 a 128 caracteres.');
      throttle(req);hashing++;
      try{
        const creating=req.url.endsWith('/register');
        let user=db.prepare('SELECT * FROM users WHERE name=?').get(name);
        const salt=creating?randomBytes(16).toString('hex'):user?.salt||'a3d0d1d27b4bd64c774fe604009c651c';
        const key=await derive(body.password,salt,32,{N:32768,r:8,p:3,maxmem:64*1024*1024});
        if(creating){
          const result=db.prepare('INSERT OR IGNORE INTO users(name,salt,verifier) VALUES(?,?,?)').run(name,salt,key.toString('hex'));
          if(!result.changes)throw failure(409,'Esse nome de usuário já está em uso.');
          user={id:result.lastInsertRowid,name};
        }else if(!user||!timingSafeEqual(Buffer.from(user.verifier,'hex'),key))throw failure(401,'Usuário ou senha incorretos.');
        const token=randomBytes(32).toString('base64url');
        db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
        db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+expiry);
        send(creating?201:200,{...snapshot(user),token});
      }finally{hashing--;}
      return;
    }
    const {user,hash}=identity(req);
    if(req.method==='GET'&&req.url==='/api/me')return send(200,snapshot(user));
    if(req.method==='POST'&&req.url==='/api/auth/logout'){
      db.prepare('DELETE FROM sessions WHERE hash=?').run(hash);return send(200,{ok:true});
    }
    if(req.method==='PUT'&&req.url==='/api/progress'){
      const {key,value,version}=await json(req,520000);
      if(typeof key!=='string'||!progressKey.test(key)||typeof value!=='string'||!Number.isSafeInteger(version)||version<0)throw failure(400,'Registro inválido.');
      let obj;try{obj=JSON.parse(value);}catch{}
      if(!obj||typeof obj!=='object'||Array.isArray(obj))throw failure(400,'Progresso inválido.');
      const current=db.prepare('SELECT version,value FROM progress WHERE user_id=? AND key=?').get(user.id,key);
      if(current?.value===value)return send(200,{version:current.version});
      if((current?.version||0)!==version)return send(409,{error:'Este item mudou em outro dispositivo.',current});
      db.prepare('INSERT INTO progress VALUES(?,?,?,?) ON CONFLICT(user_id,key) DO UPDATE SET value=excluded.value,version=excluded.version').run(user.id,key,value,version+1);
      return send(200,{version:version+1});
    }
    throw failure(404,'Rota desconhecida.');
  }
  return {route,close:()=>db.close()};
}
module.exports={accounts};
