/* Loaded when opening sync, or reconnecting after the user enabled it. No typing document writes. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {getFirestore,collection,query,where,documentId,onSnapshot,doc,setDoc} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {firebaseConfig} from './firebase-config.js';
const app=initializeApp(firebaseConfig,'conversation-studio'),auth=getAuth(app),db=getFirestore(app),local=window.ConversationRecords;
const prefix='conversation_v1__';let user=null,unsubscribe=null,ready=false,generation=0,pending=new Map(),known=new Map(),flushing=false;
// Avoid publishing the owner's email in the static app. This UI check is not a security boundary;
// authenticated, owner-scoped Firestore rules are still required and must be audited before release.
const ownerEmailDigest='1803460cec71cc0390313e4e1ffbbfffe0212660383e5b5f3d94f2f44b2fd3db';
const status=(text,state='idle')=>window.dispatchEvent(new CustomEvent('conversation-cloud-status',{detail:{text,state,email:user?.email||''}}));
function fail(e){status(e.code==='permission-denied'?'保存権限がありません。本人専用ルールの確認が必要です。端末の記録は残っています。':e.code==='auth/unauthorized-domain'?'このURLでのログインが許可されていません。Firebaseの許可ドメインを確認してください。':`同期できませんでした（${e.code||e.message}）。端末の記録は残っています。`,'error');}
async function flush(){
  if(!ready||!user||flushing)return;flushing=true;const token=generation;
  try{status('記録を同期しています…','busy');for(const [id,record] of pending){if(token!==generation||!ready)break;
    await setDoc(doc(db,'users',user.uid,'data',prefix+id),{app:'conversation-studio',version:1,type:record.type,updatedAt:record.updatedAt,json:JSON.stringify(record)});
    if(pending.get(id)===record)pending.delete(id);known.set(id,record.updatedAt);
  }if(token===generation)status(`同期済み · ${new Date().toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}`,'ok');}catch(e){fail(e);}finally{flushing=false;}
}
local.subscribe((record,source)=>{if(source==='cloud')return;pending.set(record.id,record);if(ready)flush();});
onAuthStateChanged(auth,async account=>{
  const token=++generation;unsubscribe?.();unsubscribe=null;ready=false;user=account;known=new Map();pending=new Map();
  if(!user){status('未接続 · 記録はこの端末に保存しています');return;}
  // This installation is for its owner only. Firestore rules remain the authority.
  const emailBytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(String(user.email||'').trim().toLowerCase()));
  if(token!==generation)return;
  const digest=Array.from(new Uint8Array(emailBytes),n=>n.toString(16).padStart(2,'0')).join('');
  if(digest!==ownerEmailDigest||!user.emailVerified){await signOut(auth);status('タイピングと同じご本人のGoogleアカウントでログインしてください。','error');return;}
  await local.ready;if(token!==generation)return;
  status('クラウドの記録を確認しています…','busy');
  const q=query(collection(db,'users',user.uid,'data'),where(documentId(),'>=',prefix),where(documentId(),'<',prefix+'\uf8ff'));
  // One subscription; no timer polling. Documents outside the conversation prefix are never read.
  let queue=Promise.resolve();
  unsubscribe=onSnapshot(q,{includeMetadataChanges:true},snapshot=>{queue=queue.then(async()=>{
    if(token!==generation)return;
    for(const change of snapshot.docChanges()){
      if(change.type==='removed')continue;const value=change.doc.data();if(value.app!=='conversation-studio'||typeof value.json!=='string')continue;
      const r=JSON.parse(value.json);if(!local.valid(r)||prefix+r.id!==change.doc.id)continue;
      known.set(r.id,r.updatedAt);if(pending.get(r.id)?.updatedAt<=r.updatedAt)pending.delete(r.id);await local.put(r,'cloud');
    }
    if(!ready&&!snapshot.metadata.fromCache){for(const r of local.list())if(!known.has(r.id)||known.get(r.id)<r.updatedAt)pending.set(r.id,r);ready=true;}
    window.dispatchEvent(new Event('conversation-cloud-updated'));await flush();
  }).catch(fail);},fail);
});
window.ConversationCloud={login:async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider());}catch(e){fail(e);}},logout:async()=>{generation++;ready=false;unsubscribe?.();unsubscribe=null;pending.clear();await signOut(auth);},sync:flush};
window.dispatchEvent(new Event('conversation-cloud-ready'));
