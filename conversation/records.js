/* Immutable practice sessions + versioned lessons. Browser storage, optional local mirror, portable backup. */
(() => {
  const DB='conversation-records-v1', STORE='records';
  let dbPromise, records=new Map(), listeners=new Set(),writeQueue=Promise.resolve();
  const device=localStorage.getItem('conversation-device-id')||crypto.randomUUID();localStorage.setItem('conversation-device-id',device);
  function valid(r){
    if(!r||typeof r.id!=='string'||!/^[a-zA-Z0-9_-]{1,180}$/.test(r.id)||!['session','lesson','progress','catalog'].includes(r.type)||!Number.isFinite(r.updatedAt)||!r.data||typeof r.data!=='object'||new TextEncoder().encode(JSON.stringify(r)).length>=750000)return false;
    const d=r.data;
    if(r.type==='catalog')return typeof d.lessonId==='string'&&d.lessonId.length>0&&d.lessonId.length<=150&&['active','archived','deleted'].includes(d.state);
    if(r.type==='session')return typeof d.title==='string'&&typeof d.lessonId==='string'&&['A','B'].includes(d.role)&&['conversation','review'].includes(d.kind)&&Number.isFinite(d.finishedAt)&&Number.isFinite(d.score)&&d.score>=0&&d.score<=100&&Array.isArray(d.lines)&&d.lines.length<=300&&d.lines.every(l=>l&&['A','B'].includes(l.role)&&typeof l.en==='string')&&Array.isArray(d.results)&&d.results.length<=d.lines.length;
    if(r.type==='progress'){
      if(!(typeof d.key==='string'&&d.key.includes(':flow2')&&d.value&&Number.isInteger(d.value.index)&&d.value.index>=0&&typeof d.value.signature==='string'&&Array.isArray(d.value.results)))return false;
      if(d.value.reviewLesson){try{return !!ConversationCore.validateLesson(d.value.reviewLesson)&&typeof d.value.reviewSource==='string';}catch{return false;}}
      return true;
    }
    try{return !!ConversationCore.validateLesson(d);}catch{return false;}
  }
  function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}));}
  async function all(){const d=await db();return new Promise((resolve,reject)=>{const req=d.transaction(STORE).objectStore(STORE).getAll();req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
  function put(record,source='local'){const task=writeQueue.then(()=>writeRecord(record,source));writeQueue=task.catch(()=>{});return task;}
  async function writeRecord(record,source='local'){
    if(!valid(record))throw new Error('保存する記録の形式またはサイズを確認してください。');
    const old=records.get(record.id);if(old&&(old.updatedAt>record.updatedAt||JSON.stringify(old)===JSON.stringify(record)))return false;
    const d=await db();await new Promise((resolve,reject)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(record);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});
    records.set(record.id,record);listeners.forEach(fn=>fn(record,source));
    if(source!=='mirror'&&location.hostname==='localhost')mirror(record);return true;
  }
  async function mirror(record){try{const r=await fetch('api/records',{method:'POST',headers:{'Content-Type':'application/json','X-Conversation-App':'1'},body:JSON.stringify(record)});if(!r.ok)throw new Error('mirror');window.dispatchEvent(new CustomEvent('conversation-mirror',{detail:true}));}catch{window.dispatchEvent(new CustomEvent('conversation-mirror',{detail:false}));}}
  const ready=(async()=>{
    for(const r of await all())if(valid(r))records.set(r.id,r);
    if(location.hostname==='localhost')try{const response=await fetch('api/records',{headers:{'X-Conversation-App':'1'}});if(response.ok){const list=await response.json();for(const r of list)if(valid(r))await put(r,'mirror');}}catch{}
  })();
  const api={device,ready,list:type=>[...records.values()].filter(r=>!type||r.type===type),subscribe:fn=>{listeners.add(fn);return ()=>listeners.delete(fn);},put,
    async add(type,data,id){await ready;const recordId=id||`${type}-${crypto.randomUUID()}`;const record={id:recordId,type,updatedAt:Math.max(Date.now(),(records.get(recordId)?.updatedAt||0)+1),device,data};await put(record);return record;},
    async export(){await ready;return JSON.stringify({format:'conversation-studio-backup',version:1,exportedAt:new Date().toISOString(),records:api.list()},null,2);},
    async restore(text){const obj=JSON.parse(text);if(obj.format!=='conversation-studio-backup'||!Array.isArray(obj.records)||obj.records.length>50000)throw new Error('英会話リハーサルのバックアップを選んでください。');if(obj.records.some(r=>!valid(r)))throw new Error('バックアップに不正な記録が含まれています。');await ready;let n=0;for(const r of obj.records)if(await put(r))n++;return n;},
    valid
  };window.ConversationRecords=api;
})();
