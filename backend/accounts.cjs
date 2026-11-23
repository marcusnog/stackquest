const {DatabaseSync}=require('node:sqlite');
const {randomBytes,scrypt,timingSafeEqual,createHash}=require('node:crypto');
const {promisify}=require('node:util');
const {communities}=require('./communities.cjs');
const derive=promisify(scrypt);
const digest=s=>createHash('sha256').update(s).digest('hex');
const expiry=7*24*3600*1000;
const progressKey=/^stackquest\.(?:preferencias\.v1\.aparencia|missao\.v1\.(?:[1-9]|1[01])-[1-3]|lab\.v1\.(?:vps|deploy|cloud|k8s)|db\.v1\.(?:checkout|sessoes|catalogo|relacoes|telemetria|analitica))$/;
function failure(status,message){return Object.assign(new Error(message),{status});}
async function json(req,max){
  if(req.headers['content-type']?.split(';')[0]!=='application/json')throw failure(415,'Envie JSON.');
  let size=0;const chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>max)throw failure(413,'Registro grande demais.');chunks.push(chunk);}
  try{const value=JSON.parse(Buffer.concat(chunks));if(!value||Array.isArray(value)||typeof value!=='object')throw Error();return value;}
  catch{throw failure(400,'JSON inválido.');}
}
function accounts(filename,{clientId=process.env.GITHUB_CLIENT_ID,clientSecret=process.env.GITHUB_CLIENT_SECRET,githubFetch=fetch}={}){
  const redirectUri='https://marcusnog.github.io/stackquest/github-callback.html';
  const db=new DatabaseSync(filename);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;
    CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, verifier TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(hash TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires);
    CREATE TABLE IF NOT EXISTS github_identities(github_id TEXT PRIMARY KEY,user_id INTEGER UNIQUE NOT NULL REFERENCES users(id));
    CREATE TABLE IF NOT EXISTS progress(user_id INTEGER NOT NULL REFERENCES users(id),key TEXT NOT NULL, value TEXT NOT NULL,version INTEGER NOT NULL, PRIMARY KEY(user_id,key));`);
  const rates=new Map();let hashing=0;
  const communityRoute=communities(db,{json,failure});
  // Index the completion flags so a public read never scans saved code, diagrams or notes.
  const activityXP=`CASE
    WHEN key GLOB 'stackquest.missao.v1.*' AND json_extract(value,'$.date') GLOB '????-??-??' THEN 100
    WHEN key GLOB 'stackquest.lab.v1.*' AND json_extract(value,'$.schema')=1
      AND json_type(value,'$.files')='object' AND json_type(value,'$.cluster')='object'
      AND json_type(value,'$.earned')='true' THEN 200
    WHEN key GLOB 'stackquest.db.v1.*' AND json_type(value,'$.trials')='array'
      AND json_type(value,'$.accepted')='object' AND json_type(value,'$.accepted.date')='text' THEN 50
    ELSE 0 END`;
  db.exec(`CREATE INDEX IF NOT EXISTS progress_ranking_v1 ON progress(user_id, ${activityXP}) WHERE ${activityXP}>0`);
  const standings=db.prepare(`WITH totals AS (
    SELECT user_id, SUM(${activityXP}) AS xp FROM progress WHERE ${activityXP}>0 GROUP BY user_id
  ), ranked AS (
    SELECT u.name, t.xp, RANK() OVER (ORDER BY t.xp DESC) AS position
    FROM totals t JOIN users u ON u.id=t.user_id
  )
  SELECT (SELECT COUNT(*) FROM ranked) AS total,
    (SELECT json_group_array(json_object('name',name,'xp',xp,'position',position))
      FROM (SELECT * FROM ranked ORDER BY xp DESC,name LIMIT ? OFFSET ?)) AS entries,
    (SELECT json_object('name',name,'xp',xp,'position',position) FROM ranked WHERE name=?) AS mine`);
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
    return {name:user.name,githubLinked:!!db.prepare('SELECT 1 FROM github_identities WHERE user_id=?').get(user.id),records:db.prepare('SELECT key,value,version FROM progress WHERE user_id=?').all(user.id)};
  }
  function login(user){
    const token=randomBytes(32).toString('base64url');
    db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(token),user.id,Date.now()+expiry);
    return {...snapshot(user),token};
  }
  async function githubIdentity(code,verifier){
    let token,profile;
    try{
      const response=await githubFetch('https://github.com/login/oauth/access_token',{
        method:'POST',headers:{Accept:'application/json'},signal:AbortSignal.timeout(6000),
        body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code,code_verifier:verifier})
      });
      if(!response.ok)throw failure(502,'O GitHub está indisponível. Tente novamente.');
      token=(await response.json()).access_token;
      if(typeof token!=='string'||!token)throw failure(401,'Autorização inválida ou expirada. Tente entrar novamente.');
      const res=await githubFetch('https://api.github.com/user',{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','User-Agent':'StackQuest'},signal:AbortSignal.timeout(6000)});
      if(!res.ok)throw failure(502,'Não foi possível consultar seu perfil no GitHub.');
      profile=await res.json();
    }catch(e){throw e.status?e:failure(502,'Não foi possível conectar ao GitHub.');}
    if(!Number.isSafeInteger(profile?.id)||profile.id<1||typeof profile.login!=='string'||!/^[-a-zA-Z0-9]{1,39}$/.test(profile.login))throw failure(502,'Perfil do GitHub inválido.');
    return {id:String(profile.id),name:profile.login.toLowerCase().slice(0,32)};
  }
  async function route(req,send){
    if(req.method==='GET'&&req.url==='/api/auth/github/config')
      return send(200,clientId&&clientSecret?{enabled:true,clientId,redirectUri}:{enabled:false});
    if(req.method==='POST'&&['/api/auth/github/login','/api/auth/github/link'].includes(req.url)){
      if(!clientId||!clientSecret)throw failure(503,'A entrada pelo GitHub ainda não está disponível.');
      const link=req.url.endsWith('/link');
      if(link)identity(req);
      const {code,verifier}=await json(req,2048);
      if(typeof code!=='string'||!/^[a-zA-Z0-9_-]{1,256}$/.test(code)||typeof verifier!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(verifier))throw failure(400,'Autorização inválida.');
      throttle(req);
      const gh=await githubIdentity(code,verifier);
      db.exec('BEGIN IMMEDIATE');
      try{
        let user=db.prepare('SELECT u.id,u.name FROM users u JOIN github_identities g ON u.id=g.user_id WHERE g.github_id=?').get(gh.id);
        if(link){
          const current=identity(req).user;
          if(user && user.id!==current.id)throw failure(409,'Este GitHub já está vinculado a outra conta StackQuest.');
          if(!user && db.prepare('SELECT 1 FROM github_identities WHERE user_id=?').get(current.id))throw failure(409,'Esta conta já possui um GitHub vinculado.');
          if(!user)db.prepare('INSERT INTO github_identities VALUES(?,?)').run(gh.id,current.id);
        }else if(!user){
          let name=gh.name.length>=3?gh.name:'gh-'+gh.name;
          if(db.prepare('SELECT 1 FROM users WHERE name=?').get(name)){
            name='gh-'+gh.id;
            while(db.prepare('SELECT 1 FROM users WHERE name=?').get(name))name='gh-'+randomBytes(8).toString('hex');
          }
          const result=db.prepare("INSERT INTO users(name,salt,verifier) VALUES(?,'','')").run(name);
          user={id:result.lastInsertRowid,name};
          db.prepare('INSERT INTO github_identities VALUES(?,?)').run(gh.id,user.id);
        }
        const result=link?{githubLinked:true}:login(user);
        db.exec('COMMIT');
        return send(200,result);
      }catch(e){db.exec('ROLLBACK');throw e;}
    }
    if(req.method==='GET'&&req.url.split('?')[0]==='/api/ranking'){
      const pageText=new URL(req.url,'http://localhost').searchParams.get('page')??'1';
      if(!/^[1-9]\d{0,7}$/.test(pageText))throw failure(400,'Página inválida.');
      const name=req.headers.authorization?identity(req).user.name:null;
      const page=Number(pageText),pageSize=25;
      const row=standings.get(pageSize,(page-1)*pageSize,name);
      return send(200,{page,pageSize,total:row.total,entries:JSON.parse(row.entries),mine:JSON.parse(row.mine)});
    }
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
        }else if(!user?.verifier||!timingSafeEqual(Buffer.from(user.verifier,'hex'),key))throw failure(401,'Usuário ou senha incorretos.');
        send(creating?201:200,login(user));
      }finally{hashing--;}
      return;
    }
    const {user,hash}=identity(req);
    if(/^\/api\/communities(?:[/?]|$)/.test(req.url))return communityRoute(req,send,user);
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
