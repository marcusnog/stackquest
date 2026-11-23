function communities(db,{json,failure}){
  db.exec(`CREATE TABLE IF NOT EXISTS communities (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE, owner INTEGER NOT NULL REFERENCES users(id), UNIQUE(owner,name));
    CREATE TABLE IF NOT EXISTS community_members (
    community INTEGER NOT NULL REFERENCES communities(id), user INTEGER NOT NULL REFERENCES users(id), PRIMARY KEY(community,user));
    CREATE TABLE IF NOT EXISTS libraries (
    id INTEGER PRIMARY KEY, community INTEGER NOT NULL REFERENCES communities(id), name TEXT NOT NULL COLLATE NOCASE, UNIQUE(community,name));
    CREATE TABLE IF NOT EXISTS library_items (
    library INTEGER NOT NULL REFERENCES libraries(id), title TEXT NOT NULL, url TEXT NOT NULL, UNIQUE(library,url));`);
  function label(value,max,field){
    if(typeof value!=='string'||!value.trim()||value.trim().length>max)throw failure(400,field+' deve ter entre 1 e '+max+' caracteres.');
    return value.trim();
  }
  function item(value){
    const title=label(value?.title,160,'O título do material');
    let url;
    try{url=new URL(label(value.url,2048,'O endereço'));}catch{}
    if(!url||url.href.length>2048||!['https:','http:'].includes(url.protocol)||url.username||url.password)
      throw failure(400,'Cada material precisa de um link HTTP ou HTTPS válido.');
    return {title,url:url.href};
  }
  function transaction(write){
    db.exec('BEGIN IMMEDIATE');
    try{const result=write();db.exec('COMMIT');return result;}
    catch(e){db.exec('ROLLBACK');throw e;}
  }
  const addItem=db.prepare('INSERT OR IGNORE INTO library_items(library,title,url) VALUES(?,?,?)');
  return async function route(req,send,user){
    const url=new URL(req.url,'http://localhost');
    const path=/^\/api\/communities(?:\/([1-9]\d{0,14})(?:\/(join|libraries)(?:\/([1-9]\d{0,14})(\/items)?)?)?)?$/.exec(url.pathname);
    if(!path)throw failure(404,'Endereço desconhecido.');
    const [,id,action,library,itemsPath]=path;
    if(!id && req.method==='GET'){
      const page=Number(url.searchParams.get('page')||1);
      if(!Number.isSafeInteger(page)||page<1||page>1000000)throw failure(400,'Página inválida.');
      const rows=db.prepare(`SELECT c.id,c.name,u.name AS owner,m.user IS NOT NULL AS member
        FROM communities c JOIN users u ON u.id=c.owner LEFT JOIN community_members m ON m.community=c.id AND m.user=?
        ORDER BY member DESC,c.id DESC LIMIT 26 OFFSET ?`).all(user.id,(page-1)*25);
      return send(200,{communities:rows.slice(0,25),more:rows.length>25});
    }
    if(!id && req.method==='POST'){
      const name=label((await json(req,2048)).name,80,'O nome da comunidade');
      const created=transaction(()=>{
        const row=db.prepare('INSERT OR IGNORE INTO communities(name,owner) VALUES(?,?)').run(name,user.id);
        if(!row.changes)throw failure(409,'Você já criou uma comunidade com esse nome.');
        db.prepare('INSERT INTO community_members VALUES(?,?)').run(row.lastInsertRowid,user.id);
        return row.lastInsertRowid;
      });
      return send(201,{id:created});
    }
    const group=db.prepare('SELECT id,name FROM communities WHERE id=?').get(id??null);
    if(!group)throw failure(404,'Comunidade não encontrada.');
    if(action==='join'&&!library&&req.method==='POST'){
      db.prepare('INSERT OR IGNORE INTO community_members VALUES(?,?)').run(id,user.id);
      return send(200,{id:group.id});
    }
    if(!db.prepare('SELECT 1 FROM community_members WHERE community=? AND user=?').get(id,user.id))
      throw failure(403,'Entre na comunidade para acessar as bibliotecas.');
    if(!action&&req.method==='GET'){
      const libraries=db.prepare(`SELECT l.id,l.name,(SELECT count(*) FROM library_items i WHERE i.library=l.id) AS count
        FROM libraries l WHERE l.community=? ORDER BY l.name,l.id`).all(id);
      return send(200,{...group,libraries});
    }
    if(action==='libraries'&&!library&&req.method==='POST'){
      const data=await json(req,1048576),name=label(data.name,80,'O nome da biblioteca');
      if(!Array.isArray(data.items)||data.items.length>200)throw failure(400,'Envie uma lista com até 200 materiais.');
      const items=data.items.map(item);
      if(new Set(items.map(i=>i.url)).size!==items.length)throw failure(400,'A biblioteca contém links repetidos.');
      const created=transaction(()=>{
        const row=db.prepare('INSERT OR IGNORE INTO libraries(community,name) VALUES(?,?)').run(id,name);
        if(!row.changes)throw failure(409,'Já existe uma biblioteca com esse nome nesta comunidade.');
        for(const entry of items)addItem.run(row.lastInsertRowid,entry.title,entry.url);
        return row.lastInsertRowid;
      });
      return send(201,{id:created});
    }
    const collection=action==='libraries'&&library&&db.prepare('SELECT id,name FROM libraries WHERE id=? AND community=?').get(library,id);
    if(!collection)throw failure(404,'Biblioteca não encontrada.');
    if(!itemsPath&&req.method==='GET')return send(200,{...collection,items:db.prepare('SELECT title,url FROM library_items WHERE library=? ORDER BY rowid').all(library)});
    if(itemsPath&&req.method==='POST'){
      const entry=item(await json(req,16384));
      transaction(()=>{
        if(db.prepare('SELECT count(*) AS n FROM library_items WHERE library=?').get(library).n>=200)throw failure(409,'Esta biblioteca já tem 200 materiais.');
        if(!addItem.run(library,entry.title,entry.url).changes)throw failure(409,'Este link já está na biblioteca.');
      });
      return send(201,{ok:true});
    }
    throw failure(404,'Endereço desconhecido.');
  };
}
module.exports={communities};
