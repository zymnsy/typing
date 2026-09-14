(() => {
  'use strict';
  const $=id=>document.getElementById(id), C=ConversationCore, KEY='conversation-studio-v1';
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const synth=window.speechSynthesis;
  let saved={};
  try {saved=JSON.parse(localStorage.getItem(KEY)||'{}')||{};} catch {}
  let custom=[];
  for(const l of Array.isArray(saved.custom)?saved.custom:[]) {try{custom.push(C.validateLesson(l));}catch{}}
  const progress=saved.progress&&typeof saved.progress==='object'?saved.progress:{};
  const prepare=l=>l.id==='kuromon-followups'?l:C.groupTurns(l);
  let lessons=[...BUILTIN_LESSONS,...custom].map(prepare), lesson=null,index=0,results=[],phase='idle';
  let active=false,epoch=0,rec=null,stream=null,context=null,analyser=null,meterFrame=0;
  let finalText='',interimText='',sessionFinal='',lastVoice=0,lastResult=0,checkTimer=0,finishTimer=0,ttsTimer=0;
  let voiceList=[],utterance=null,finishRequested=false,restartTimer=0,hasFinal=false,attempts=0;
  let noiseFloor=.008,meterLevel=0,noticeTimer=0,autoFinalizing=false,retryNoted=false;
  let recognitionRelease=Promise.resolve(),recognitionRequest=0,recognitionReady=false,healthTimer=0;
  let recognitionLaunchAt=0,recognitionVoiceMs=0,recognitionFirstVoiceAt=0,recoveryAttempts=0,lastMeterTick=0,resumingAudio=false;
  const Records=window.ConversationRecords;
  let sessionId='',sessionStarted=0,sessionRecorded=false,reviewSource=null,turnTrouble=new Set(),lastSummary=null,cloudLoaded=false;
  let manageState='active',manageBusy=false;
  let speechPrimed=false;
  function primeMobileSpeech(){
    // WebKit unlocks later speech when speak() is first called inside a user gesture.
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    if(!ios||!synth||speechPrimed)return;
    const silent=new SpeechSynthesisUtterance(' ');silent.volume=0;
    try{synth.speak(silent);synth.cancel();speechPrimed=true;}catch{}
  }
  const defaults={role:'A',difficulty:'medium',voice:'',rate:'1',gap:'700',auto:true,translation:true,'scene-toggle':true};
  const config={...defaults,...(saved.config||{})};
  if(config.flowVersion!==2){Object.assign(config,{flowVersion:2,auto:true,rate:'1',gap:'700'});}
  for(const key of Object.keys(defaults)){if(!$(key))continue;if(typeof defaults[key]==='boolean')$(key).checked=Boolean(config[key]);else $(key).value=String(config[key]);}
  for(const key of ['difficulty','rate','gap'])if(!$(key).value)$(key).value=defaults[key];
  function notify(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,6500);}
  function persist(){try{localStorage.setItem(KEY,JSON.stringify({custom,progress,config}));return true;}catch{notify('ブラウザに保存できませんでした。教材を書き出してバックアップしてください。');return false;}}
  function escapeHTML(text){return String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function signature(){return JSON.stringify(lesson.lines.map(l=>[l.role,l.en]));}
  function progressKey(){return `${lesson.id}:${$('role').value}:flow2`;}
  function saveProgress(durable=false){if(!lesson)return;const key=progressKey();progress[key]={index,results,signature:signature(),sessionId,sessionStarted,updatedAt:Date.now(),...(reviewSource?{reviewLesson:lesson,reviewSource}:{})};persist();if(durable&&Records)Records.add('progress',{key,value:progress[key]},'progress-'+safeId(key)+'-'+Records.device).catch(e=>notify(e.message));}
  function safeId(s){return String(s).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,120);}
  function current(){return lesson?.lines[index];}
  function mine(){return current()?.role===$('role').value;}
  function status(text){$('status').textContent=text;}
  function phaseLabel(){return {idle:'準備できました',connecting:'マイクを接続中',listening:'あなたの声を聞いています',speaking:'英語で読み上げ中',paused:'一時停止',review:'聞き取りを確認',finished:'練習完了',checking:'聞き取りを確定中'}[phase]||'';}
  function lessonState(id){return Records?.list('catalog').filter(r=>r.data.lessonId===id).sort((a,b)=>b.updatedAt-a.updatedAt)[0]?.data.state||'active';}
  function showHome(){
    if(lesson)saveProgress(true);stopAll();lesson=null;reviewSource=null;phase='idle';
    $('studio').hidden=true;$('manager').hidden=true;$('library').hidden=false;$('mobile-session-bar').hidden=true;document.body.classList.remove('in-practice');renderLibrary();
    window.scrollTo({top:0});$('home-title').focus({preventScroll:true});
  }
  function renderLibrary(){
    $('lesson-list').innerHTML='';
    const sessions=Records?.list('session')||[],today=new Date().toLocaleDateString('sv-SE');
    $('home-stats').innerHTML=[['練習できる会話',lessons.filter(l=>lessonState(l.id)==='active').length],['今日の練習',sessions.filter(r=>new Date(r.data.finishedAt).toLocaleDateString('sv-SE')===today).length],['これまでの練習',sessions.length]].map(([label,n])=>`<div><strong>${n}</strong><span>${label}</span></div>`).join('');
    const drafts=Object.values(progress).filter(p=>p.reviewLesson&&p.index<p.reviewLesson.lines.length&&lessonState(p.reviewSource)==='active').sort((a,b)=>b.updatedAt-a.updatedAt);
    const items=[...lessons.filter(l=>lessonState(l.id)==='active'),...drafts.slice(0,1).map(p=>p.reviewLesson)];
    items.forEach((l,i)=>{
      const search=$('lesson-search').value.trim().toLowerCase();if(search&&!(l.title+' '+l.description).toLowerCase().includes(search))return;
      const card=document.createElement('article');card.className='lesson-card';
      const runs=Records?.list('session').filter(r=>r.data.lessonId===l.id&&r.data.kind==='conversation')||[];
      const role=l.roles[config.role]?config.role:'A',p=progress[`${l.id}:${role}:flow2`],resume=p&&p.index<l.lines.length&&(p.index>0||p.sessionStarted);
      card.dataset.lessonId=l.id;
      card.innerHTML=`<span class="index">${String(i+1).padStart(2,'0')}<small>${l.id.startsWith('review-')?'中断した復習':l.id.startsWith('custom-')?'追加した教材':'会話の練習'}</small></span><h3>${escapeHTML(l.title)}</h3><p>${escapeHTML(l.description)}</p><span class="meta">${l.lines.length} ターン · 練習 ${runs.length} 回${runs.length?' · ベスト '+Math.max(...runs.map(r=>r.data.score||0))+'点':''}${resume?' · 続き '+(p.index+1)+' ターン目':''}</span><button class="${i===0?'primary':'secondary'}">${resume?'続きから練習 →':'この場面を開く →'}</button>`;
      card.querySelector('button').onclick=()=>openLesson(l.id);$('lesson-list').append(card);
    });
    if(!$('lesson-list').children.length)$('lesson-list').innerHTML='<div class="panel empty-state"><h3>表示する教材がありません。</h3><p>検索条件を変えるか、「教材を追加」「教材を管理」から選んでください。</p></div>';
  }
  function renderManager(){
    const selected=new Set([...$('manage-list').querySelectorAll('input:checked')].map(el=>el.value));
    for(const b of $('manage-tabs').querySelectorAll('button')){const n=lessons.filter(l=>lessonState(l.id)===b.dataset.state).length;b.textContent=({active:'練習中',archived:'アーカイブ',deleted:'ごみ箱'}[b.dataset.state])+` ${n}`;b.setAttribute('aria-pressed',b.dataset.state===manageState);}
    $('manage-list').innerHTML='';const q=$('manage-search').value.toLowerCase().trim();
    for(const l of lessons.filter(l=>lessonState(l.id)===manageState&&(!q||l.title.toLowerCase().includes(q)))){
      const row=document.createElement('article');row.className='manage-row';
      row.innerHTML=`<label class="manage-pick"><input type="checkbox" value="${escapeHTML(l.id)}" aria-label="${escapeHTML(l.title)}を選択" ${selected.has(l.id)?'checked':''}><span><strong>${escapeHTML(l.title)}</strong><small>${l.lines.length} ターン · 練習 ${Records.list('session').filter(r=>r.data.lessonId===l.id&&r.data.kind==='conversation').length} 回</small></span></label><div class="helper-actions">${manageState==='active'?'<button class="secondary small" data-action="archived">アーカイブ</button>':'<button class="secondary small" data-action="active">トップに戻す</button>'}${manageState!=='deleted'?'<button class="text-button small" data-action="deleted">削除</button>':''}</div>`;
      row.querySelector('input').onchange=updateManageSelection;row.querySelectorAll('button').forEach(b=>{b.disabled=manageBusy;b.onclick=()=>changeCatalog([l.id],b.dataset.action);});$('manage-list').append(row);
    }
    if(!$('manage-list').children.length)$('manage-list').innerHTML='<div class="panel empty-state">ここにはまだ教材がありません。</div>';
    $('bulk-archive').hidden=manageState!=='active';$('bulk-restore').hidden=manageState==='active';$('bulk-delete').hidden=manageState==='deleted';updateManageSelection();
  }
  function updateManageSelection(){const all=[...$('manage-list').querySelectorAll('input')],n=all.filter(x=>x.checked).length;$('manage-selected').textContent=`${n} 件選択`;$('manage-all').checked=all.length>0&&n===all.length;$('manage-all').indeterminate=n>0&&n<all.length;for(const id of ['bulk-archive','bulk-restore','bulk-delete'])$(id).disabled=!n||manageBusy;}
  async function changeCatalog(ids,state){
    if(manageBusy)return;manageBusy=true;renderManager();
    try{for(const id of ids){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(id)),key='catalog-'+Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,'0')).join('');await Records.add('catalog',{lessonId:id,state},key);}
      $('manage-status').textContent=`${ids.length} 件を${{active:'トップに戻しました',archived:'アーカイブしました',deleted:'ごみ箱に移しました。復元できます'}[state]}。`;renderLibrary();
    }catch(e){$('manage-status').textContent='保存できませんでした。'+e.message;}finally{manageBusy=false;renderManager();}
  }
  function loadProgress(){const p=progress[progressKey()];sessionId='';sessionStarted=0;sessionRecorded=false;if(p&&p.signature===signature()&&Number.isInteger(p.index)&&p.index>=0&&p.index<=lesson.lines.length){index=p.index;results=Array.isArray(p.results)?p.results:[];sessionId=p.sessionId||'';sessionStarted=p.sessionStarted||0;}else{index=0;results=[];}sessionRecorded=!!sessionId&&!!Records?.list('session').some(r=>r.id===sessionId);}
  function openLesson(id){
    stopAll();const draft=Object.values(progress).find(p=>p.reviewLesson?.id===id);reviewSource=draft?.reviewSource||null;lesson=draft?.reviewLesson||lessons.find(l=>l.id===id)||lessons[0];config.lastLesson=lesson.id;
    const roles=[...new Set(lesson.lines.map(l=>l.role))];
    $('role').innerHTML=roles.map(r=>`<option value="${r}">${escapeHTML(lesson.roles[r])}</option>`).join('');
    $('role').value=roles.includes(config.role)?config.role:roles[0];
    loadProgress();$('library').hidden=true;$('manager').hidden=true;$('studio').hidden=false;
    $('lesson-title').textContent=lesson.title;$('lesson-description').textContent=lesson.description;
    $('session-count').textContent=`${lesson.lines.length} ターンの会話`;
    phase=index>=lesson.lines.length?'finished':'idle';clearTranscript();renderLine();window.scrollTo({top:0});
  }
  function clearTranscript(){finalText='';interimText='';sessionFinal='';hasFinal=false;finishRequested=false;autoFinalizing=false;retryNoted=false;lastVoice=performance.now();lastResult=lastVoice;$('heard').textContent='聞き取った英語がここに表示されます。';$('feedback').textContent='';}
  function renderLine(){
    if(!$('studio').hidden)$('manager').hidden=true;
    const line=current();$('progress-label').textContent=`${Math.min(index,lesson.lines.length)} / ${lesson.lines.length} ターン`;
    $('scene').hidden=!$('scene-toggle').checked||!lesson.id.startsWith('kuromon');
    $('conversation-history').innerHTML=index>0?`<div class="history-bubble"><span>${lesson.lines[index-1].role===$('role').value?'あなた':'相手'}${results[index-1]?.kind==='passed'?' · 聞き取りOK':''}</span><p lang="en">${escapeHTML(lesson.lines[index-1].en)}</p></div>`:'';
    $('progress-fill').style.width=`${index/lesson.lines.length*100}%`;
    $('result').hidden=!!line;document.querySelector('.conversation').hidden=!line;$('line-notes').hidden=!line;
    if(!line){showResult();updateControls();renderScript();return;}
    $('speaker').textContent=`${mine()?'あなたの番':'相手の番'} · ${lesson.roles[line.role]}`;
    $('speaker').classList.toggle('partner',!mine());$('line-number').textContent=`${index+1} / ${lesson.lines.length}`;
    $('english').innerHTML=line.en.split(/(\s+)/).map(w=>/^\s+$/.test(w)?w:`<span class="word">${escapeHTML(w)}</span>`).join('');
    $('japanese').textContent=line.ja;$('japanese').hidden=!$('translation').checked;
    renderNotes(line);
    $('hint-box').hidden=true;$('hint-text').textContent=line.hint||'この教材には読みのヒントがありません。「ゆっくり聞く」で音を確認してください。教材を書き出し、hint に読みを追加して取り込めます。';
    const next=lesson.lines[index+1];$('next-preview').innerHTML=next?`<span>UP NEXT · ${next.role===$('role').value?'あなた':'相手'}</span>${escapeHTML(next.en)}`:'';
    updateControls();renderScript();
  }
  function renderNotes(line){
    const notes=window.ConversationNotes?.forLine(line)||{},labels={words:'単語',phrases:'熟語・言い回し',grammar:'文法の形'};
    const item=n=>`<div class="note-item"><strong lang="en">${escapeHTML(n.term)}</strong>${n.yomi?'<small>'+escapeHTML(n.yomi)+'</small>':''}<p>${escapeHTML(n.desc)}</p></div>`;
    $('notes-content').innerHTML=Object.entries(labels).map(([key,label])=>`<div><h3>${label}</h3>${notes[key]?.length?notes[key].slice(0,3).map(item).join('')+(notes[key].length>3?`<details><summary>ほか ${notes[key].length-3} 件を見る</summary>${notes[key].slice(3).map(item).join('')}</details>`:''):'<p class="small muted">この文に登録された解説はありません。</p>'}</div>`).join('');
  }
  function updateControls(){
    const practiceVisible=!$('studio').hidden&&!!current();$('mobile-session-bar').hidden=!practiceVisible;document.body.classList.toggle('in-practice',practiceVisible);$('mobile-toggle').textContent=active?'一時停止':phase==='paused'?'会話を再開':'会話を始める';
    $('mode-label').textContent=phaseLabel();$('start').hidden=active||phase==='finished';
    $('start').textContent=['paused','review'].includes(phase)?'会話を再開':'会話を始める';
    $('pause').hidden=!active;$('done').hidden=$('auto').checked||!(active&&mine()&&['listening','review'].includes(phase));
    $('retry').hidden=!(current()&&mine()&&(active||phase==='review'));
    $('done').disabled=phase==='checking';$('role').disabled=active;
    $('skip').disabled=phase==='connecting'&&!stream;
    $('reconnect-mic').hidden=!current()||!mine()||phase==='speaking'||(!active&&phase!=='paused'&&phase!=='review');
    if(!active||phase==='speaking')$('mic-health').textContent='マイク：停止中';
    $('listen-indicator').classList.toggle('active',phase==='listening');
    $('model').disabled=phase==='connecting'||phase==='checking';$('slow-model').disabled=$('model').disabled;
    $('voice-preview').disabled=active;
    $('replay-partner').disabled=!current()||!mine()||!lesson.lines.slice(0,index).some(l=>l.role!==$('role').value)||phase==='connecting'||phase==='checking';
    $('scene').dataset.phase=phase;
    $('scene-state').textContent=phase==='speaking'?'英語で話しています':phase==='listening'?'あなたの話を待っています':'観光客との会話';
    $('flow-status').textContent=$('auto').checked?'ボタンは不要です。言い直しも、そのまま話してください。':'手動モードです。「言い終わりました」で判定します。';
  }
  function renderScript(){
    $('script-list').innerHTML='';lesson.lines.forEach((l,i)=>{
      const li=document.createElement('li');if(i===index)li.className='current';
      const r=results[i];li.innerHTML=`<button>${i+1} · ${l.role===$('role').value?'あなた':'相手'}${r?.kind==='passed'?' / 済':r?.kind==='skipped'?' / スキップ':''}</button><span lang="en">${escapeHTML(l.en)}</span>`;
      li.querySelector('button').onclick=()=>{stopAll();index=i;clearTranscript();phase='idle';renderLine();saveProgress();status('このセリフから始められます。');document.querySelector('.conversation').scrollIntoView({block:'center',behavior:'smooth'});};$('script-list').append(li);
    });
  }
  function highlight(text){
    if(!current())return;
    const a=C.assess(current().en,text,$('difficulty').value);let offset=0;
    for(const span of $('english').querySelectorAll('.word')){const n=C.tokens(span.textContent).length;const match=n>0&&a.matched.slice(offset,offset+n).every(Boolean);span.classList.toggle('matched',match);span.classList.toggle('pending',!!text&&!match);offset+=n;}
    const matched=a.matched.filter(Boolean).length;
    $('feedback').textContent=text?`${matched} / ${a.expected.length} 語を確認${interimText?'（聞き取り中・変わることがあります）':''}`:'';
    return a;
  }
  function detachRecognition(){
    recognitionRequest++;recognitionReady=false;
    clearTimeout(restartTimer);clearTimeout(finishTimer);finishRequested=false;
    if(rec){
      const old=rec;rec=null;
      old.onresult=old.onstart=old.onerror=old.onspeechstart=old.onspeechend=null;
      // abort() is asynchronous. Keep the next session behind the actual shutdown.
      // Some failed services omit end; use a bounded fallback so recovery remains possible.
      recognitionRelease=new Promise(resolve=>{
        let ended=false;const done=()=>{if(ended)return;ended=true;clearTimeout(timeout);old.onend=null;setTimeout(resolve,180);};
        const timeout=setTimeout(done,1800);old.onend=done;try{old.abort();}catch{done();}
      });
    }
  }
  function cancelTurn(){epoch++;clearInterval(checkTimer);clearInterval(healthTimer);clearTimeout(ttsTimer);detachRecognition();if(synth)synth.cancel();utterance=null;if(stream)stream.getAudioTracks().forEach(t=>t.enabled=false);}
  function stopAll(){active=false;cancelTurn();if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}cancelAnimationFrame(meterFrame);if(context){context.close().catch(()=>{});context=null;}analyser=null;meterLevel=0;$('meter-fill').style.width='0%';}
  async function connectMic(){
    if(!Recognition)throw new Error('このブラウザは音声認識に対応していません。ChromeまたはEdgeで開いてください。お手本とスキップは利用できます。');
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('マイクを利用できません。起動用ファイルから localhost で開いてください。');
    if(stream&&stream.getAudioTracks().every(t=>t.readyState==='live'))return;
    if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
    const token=epoch;
    const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(token!==epoch||!active){acquired.getTracks().forEach(t=>t.stop());return;}
    stream=acquired;const Audio=window.AudioContext||window.webkitAudioContext;
    if(!Audio)throw new Error('このブラウザでは無音の確認ができません。ChromeまたはEdgeで開いてください。');
    context=new Audio();await context.resume();if(token!==epoch||!active)return;
    analyser=context.createAnalyser();analyser.fftSize=1024;context.createMediaStreamSource(stream).connect(analyser);
    const data=new Float32Array(analyser.fftSize);noiseFloor=.008;lastMeterTick=performance.now();
    const draw=()=>{if(!analyser)return;analyser.getFloatTimeDomainData(data);const rms=Math.sqrt(data.reduce((s,v)=>s+v*v,0)/data.length);meterLevel=rms;
      const now=performance.now(),dt=Math.min(100,now-lastMeterTick);lastMeterTick=now;
      if(phase==='listening'||phase==='checking') {if(rms>Math.max(.014,noiseFloor*2.8)){lastVoice=now;if(recognitionReady){recognitionVoiceMs+=dt;if(!recognitionFirstVoiceAt)recognitionFirstVoiceAt=now;}}else noiseFloor=noiseFloor*.995+Math.min(rms,.025)*.005;}
      $('meter-fill').style.width=`${Math.min(100,rms*650)}%`;meterFrame=requestAnimationFrame(draw);
    };draw();
    stream.getAudioTracks().forEach(t=>t.addEventListener('ended',()=>{if(active){pause();status('マイクが切断されました。接続して再開してください。');}}));
  }
  async function start(){
    primeMobileSpeech();
    if(active||!current())return;if(!sessionId){sessionId='session-'+crypto.randomUUID();sessionStarted=Date.now();sessionRecorded=false;}active=true;phase='connecting';updateControls();status('マイクへの接続を待っています。');
    const token=epoch;
    try{await connectMic();if(!active||token!==epoch)return;enterTurn();}catch(e){if(token!==epoch)return;stopAll();phase='paused';updateControls();status(micError(e));}
  }
  function micError(e){if(e.name==='NotAllowedError')return 'マイクが許可されていません。アドレスバーのマイク設定で許可し、再開してください。';if(e.name==='NotFoundError')return 'マイクが見つかりません。接続してから再開してください。';if(e.name==='NotReadableError')return 'マイクを使用できません。他のアプリの使用状況を確認してください。';return e.message||'マイクに接続できませんでした。';}
  function enterTurn(){
    cancelTurn();clearTranscript();attempts=0;turnTrouble=new Set();renderLine();if(!current()){finish();return;}
    if(!active)return;if(mine())listen();else speak(current().en,false,()=>advance('partner'));
  }
  function listen(keep=false){
    if(!active||!current())return;
    detachRecognition();if(!keep)clearTranscript();autoFinalizing=false;
    phase='connecting';lastVoice=performance.now();lastResult=lastVoice;recoveryAttempts=0;recognitionVoiceMs=0;recognitionLaunchAt=lastVoice;
    if(stream)stream.getAudioTracks().forEach(t=>t.enabled=true);
    status('音声認識を準備しています。開始の表示をお待ちください。');updateControls();
    createRecognition();clearInterval(checkTimer);checkTimer=setInterval(checkAuto,120);
    clearInterval(healthTimer);healthTimer=setInterval(checkRecognitionHealth,300);
  }
  function recoverRecognition(message,countFailure=true){
    if(!active||!mine()||!['listening','connecting'].includes(phase))return;
    if(countFailure&&++recoveryAttempts>3){pause();status('音声認識との接続が戻りませんでした。「マイクを接続し直す」で再開できます。通信やブラウザのマイク設定も確認してください。');return;}
    detachRecognition();interimText='';autoFinalizing=false;phase='connecting';recognitionLaunchAt=performance.now();
    $('heard').textContent=finalText||'聞き取りを再開しています…';highlight(finalText);status(message);updateControls();
    const token=epoch;restartTimer=setTimeout(()=>{if(token===epoch&&active)createRecognition();},countFailure?Math.min(1600,350*Math.max(1,recoveryAttempts)):200);
  }
  function checkRecognitionHealth(){
    if(!active||!mine()||!['listening','connecting'].includes(phase))return;
    const now=performance.now();
    if(context?.state==='suspended'&&!resumingAudio){
      resumingAudio=true;const audio=context;Promise.resolve(audio.resume()).catch(()=>{if(context===audio&&active){pause();status('マイクの動作が止まりました。「マイクを接続し直す」を押してください。');}}).finally(()=>{resumingAudio=false;});
    }
    if(!recognitionReady){
      $('mic-health').textContent='音声認識：接続中';
      if(now-recognitionLaunchAt>6500)recoverRecognition('認識の開始が遅れているため、接続し直しています。');
      return;
    }
    const sound=now-lastVoice<1000&&recognitionVoiceMs>80;
    $('mic-health').textContent=`マイク：${sound?'音が届いています':'声を待っています'} · 文字認識：${now-lastResult<1800&&finalText+interimText?'受信中':'待機中'}`;
    // Meter input with no recognition result is a service failure, not a pronunciation score.
    if(recognitionFirstVoiceAt&&now-recognitionFirstVoiceAt>10000&&recognitionVoiceMs>600){recoverRecognition('マイクに音は届いていますが、文字が返ってきません。音声認識を接続し直します。');return;}
    if(now-lastResult>6000&&recognitionVoiceMs<80)$('mic-health').textContent='声を待っています。話してもバーが動かない時は、マイクやミュートを確認してください。';
  }
  async function reconnectMic(){
    if(!current()||!mine())return;
    stopAll();active=true;phase='connecting';updateControls();status('マイクと音声認識を接続し直しています。');const token=epoch;
    if(!sessionId){sessionId='session-'+crypto.randomUUID();sessionStarted=Date.now();sessionRecorded=false;}
    try{await connectMic();if(token!==epoch||!active)return;listen(true);}catch(e){if(token!==epoch)return;stopAll();phase='paused';updateControls();status(micError(e));}
  }
  async function createRecognition(){
    const token=epoch,request=++recognitionRequest;
    await recognitionRelease;
    if(!active||token!==epoch||request!==recognitionRequest||!['listening','connecting'].includes(phase))return;
    if(context?.state==='suspended'){try{await context.resume();}catch{if(token===epoch){pause();status('マイクを再開できません。「マイクを接続し直す」を押してください。');}return;}}
    if(!active||token!==epoch||request!==recognitionRequest)return;
    const r=new Recognition();rec=r;sessionFinal=finalText;let skippedChunks=0;
    recognitionLaunchAt=performance.now();recognitionVoiceMs=0;recognitionFirstVoiceAt=0;recognitionReady=false;
    r.lang=voiceList.find(v=>v.voiceURI===$('voice').value)?.lang||'en-US';r.continuous=true;r.interimResults=true;r.maxAlternatives=3;
    const markReady=()=>{if(token!==epoch||rec!==r||recognitionReady)return;recognitionReady=true;phase='listening';lastVoice=performance.now();lastResult=lastVoice;status('認識を開始しました。あなたの番です。話してください。');updateControls();};
    r.onstart=markReady;
    r.onresult=e=>{
      if(token!==epoch||rec!==r)return;
      markReady();recoveryAttempts=0;recognitionVoiceMs=0;recognitionFirstVoiceAt=0;
      const chunks=sessionFinal?[sessionFinal]:[];let interim='';
      for(let k=0;k<e.results.length;k++){
        const result=e.results[k];let chosen=result[0].transcript,best=-1;
        for(let a=0;a<result.length;a++){const candidate=result[a].transcript;const score=C.bestTranscript(current().en,[...chunks,candidate],$('difficulty').value).assessment.score;if(score>best){best=score;chosen=candidate;}}
        if(result.isFinal)chunks.push(chosen);else interim+=' '+chosen;
      }
      const selected=C.bestTranscript(current().en,chunks,$('difficulty').value);
      if(selected.offset>skippedChunks&&finalText){if(!retryNoted)attempts++;rememberTrouble(C.assess(current().en,finalText,$('difficulty').value));skippedChunks=selected.offset;}
      finalText=selected.text;interimText=interim.trim();hasFinal=!!finalText;lastResult=performance.now();retryNoted=false;
      const text=(finalText+' '+interimText).trim();$('heard').textContent=text||'聞き取り中…';highlight(text);
      if(phase==='listening')status('聞いています。途中で止まっても、続きを話せます。');
    };
    r.onspeechstart=()=>{if(token===epoch&&rec===r)lastVoice=performance.now();};
    // Web Audio supplies the actual last sound time. A late speechend must not add another pause.
    r.onspeechend=()=>{};
    r.onerror=e=>{
      if(token!==epoch||rec!==r)return;
      if(['aborted','no-speech','network'].includes(e.error)){
        if(finishRequested){clearTimeout(finishTimer);finishRequested=false;const automatic=autoFinalizing;detachRecognition();interimText='';if(automatic)evaluateAutomatic();else evaluateManual();return;}
        const rapid=performance.now()-recognitionLaunchAt<2000;
        recoverRecognition(e.error==='network'?'音声認識の通信が途切れました。自動で接続し直しています。':'音声認識を再開しています。少しお待ちください。',e.error!=='no-speech'||rapid);return;
      }
      const errors={'not-allowed':'音声認識が許可されていません。ブラウザのマイク設定を確認してください。','service-not-allowed':'このブラウザで音声認識を利用できません。Chromeなど別の対応ブラウザでお試しください。','network':'音声認識に接続できません。ネット接続を確認して再開してください。','audio-capture':'マイクを読み取れません。接続を確認してください。','language-not-supported':'選んだ英語に音声認識が対応していません。別の英語の声を選んでください。'};
      pause();status(errors[e.error]||`音声認識を停止しました（${e.error}）。再開かスキップで続けられます。`);
    };
    r.onend=()=>{
      if(token!==epoch||rec!==r)return;rec=null;recognitionReady=false;
      if(finishRequested){clearTimeout(finishTimer);finishRequested=false;interimText='';if(autoFinalizing)evaluateAutomatic();else evaluateManual();return;}
      interimText='';$('heard').textContent=finalText||'まだ声を待っています。';highlight(finalText);
      if(active&&['listening','connecting'].includes(phase))recoverRecognition('音声認識をつなぎ直しています。続きから話せます。',performance.now()-recognitionLaunchAt<2000);
    };
    try{r.start();}catch(e){if(e.name==='InvalidStateError'){recoverRecognition('前の音声認識の終了を待っています。まもなく再開します。');}else{pause();status('音声認識を開始できませんでした。「マイクを接続し直す」で再開できます。');}}
  }
  function checkAuto(){
    if(!active||phase!=='listening'||!recognitionReady||!$('auto').checked||!current()||context?.state!=='running')return;
    const now=performance.now(),quiet=now-lastVoice>=Number($('gap').value),stable=now-lastResult>=180;
    const full=(finalText+' '+interimText).trim(), a=C.assess(current().en,full,$('difficulty').value);
    if(a.complete&&quiet&&stable){
      if(interimText){requestAutomaticFinal();return;}
      if(hasFinal){advance('passed',a);return;}
    }
    if(a.complete)status('聞き取れました。言い終わりを待っています。');
    else if(hasFinal&&!interimText&&quiet&&now-lastResult>1800&&!retryNoted){retryNoted=true;if(a.heard.length>=a.expected.length*.65){attempts++;rememberTrouble(a);}status('続き、または最初から言い直してください。そのまま聞いています。');if(attempts>=2)$('hint-box').hidden=false;}
  }
  function rememberTrouble(a){const last=a.heard.length>=a.expected.length*.9?a.expected.length:a.matched.lastIndexOf(true);a.expected.forEach((word,i)=>{if(!a.matched[i]&&i<=last)turnTrouble.add(word);});}
  function requestAutomaticFinal(){
    if(!rec||finishRequested)return;autoFinalizing=true;finishRequested=true;phase='checking';clearInterval(checkTimer);updateControls();status('返答の準備をしています…');
    try{rec.stop();}catch{detachRecognition();interimText='';evaluateAutomatic();return;}
    finishTimer=setTimeout(()=>{detachRecognition();interimText='';evaluateAutomatic();},1600);
  }
  function evaluateAutomatic(){
    if(!active||!current())return;autoFinalizing=false;
    const a=C.assess(current().en,finalText,$('difficulty').value);
    if(a.complete&&performance.now()-lastVoice>=Number($('gap').value)&&context?.state==='running'){advance('passed',a);return;}
    listen(true);status('もう少し聞かせてください。続きや言い直しをそのまま話せます。');
  }
  function manualDone(){
    if(!active||!mine()||!['listening','review'].includes(phase))return;
    if(phase==='review'){listen();return;}
    phase='checking';finishRequested=true;clearInterval(checkTimer);updateControls();status('最後の聞き取りを確定しています…');
    if(rec){try{rec.stop();}catch{detachRecognition();evaluateManual();return;}finishTimer=setTimeout(()=>{detachRecognition();interimText='';evaluateManual();},2200);}
    else{finishRequested=false;evaluateManual();}
  }
  function evaluateManual(){
    if(!active||!current())return;
    const a=C.assess(current().en,finalText,$('difficulty').value);highlight(finalText);$('heard').textContent=finalText||'まだ英語を聞き取れていません。';
    if(a.pass){advance('passed',a);return;}
    phase='review';detachRecognition();if(stream)stream.getAudioTracks().forEach(t=>t.enabled=false);attempts++;a.missing.forEach(w=>turnTrouble.add(w));updateControls();
    status('もう一度試せます。難しければヒントやスキップを使ってください。');
    $('feedback').textContent=finalText?`確認できなかった語：${a.missing.slice(0,14).join(' / ')||'余分な語が含まれています。最初からもう一度お試しください。'}`:'声が認識されませんでした。マイク・通信を確認して「もう一度言う」を押してください。';
    if(attempts>=2)$('hint-box').hidden=false;
  }
  function speak(text,slow,onComplete){
    cancelTurn();phase='speaking';updateControls();status(current()&&!mine()?'相手が話しています。':'英語のお手本を読み上げています。');
    const token=epoch;
    if(!synth||!voiceList.length){speechFailed('英語の音声が見つかりません。端末に英語音声を追加するか、別のブラウザで開いてください。');return;}
    utterance=new SpeechSynthesisUtterance(text);utterance.voice=voiceList.find(v=>v.voiceURI===$('voice').value)||voiceList[0];utterance.lang=utterance.voice.lang;utterance.rate=slow?.68:Number($('rate').value);utterance.volume=1;
    utterance.onboundary=e=>{if(token!==epoch)return;let offset=0;for(const span of $('english').querySelectorAll('.word')){span.classList.toggle('speaking',e.charIndex>=offset&&e.charIndex<offset+span.textContent.length);offset+=span.textContent.length+1;}};
    utterance.onend=()=>{if(token!==epoch)return;clearTimeout(ttsTimer);$('english').querySelectorAll('.speaking').forEach(s=>s.classList.remove('speaking'));utterance=null;ttsTimer=setTimeout(()=>{if(token===epoch)onComplete?.();},220);};
    utterance.onerror=e=>{if(token!==epoch)return;speechFailed(`英語音声を再生できませんでした（${e.error}）。別の声を選んで再開できます。`);};
    // Some engines never dispatch end/error. Leave a visible retry path rather than silently advancing.
    ttsTimer=setTimeout(()=>{if(token===epoch)speechFailed('音声の終了を確認できませんでした。別の声で再試行するか、スキップしてください。');},Math.max(25000,C.tokens(text).length/utterance.rate*1500));
    if(synth.paused)synth.resume();synth.speak(utterance);
  }
  function speechFailed(message){stopAll();phase='paused';updateControls();status(message);}
  function model(slow=false){
    if(!current())return;const wasActive=active;
    speak(current().en,slow,()=>{if(wasActive&&active){if(mine())listen();else advance('partner');}else{phase='idle';updateControls();status('お手本を聞きました。準備ができたら始めてください。');}});
  }
  function advance(kind,assessment){
    if(!current())return;const wasActive=active;
    if(!sessionId){sessionId='session-'+crypto.randomUUID();sessionStarted=Date.now();sessionRecorded=false;}
    const measured=assessment||(mine()?C.assess(current().en,finalText,$('difficulty').value):null);
    if(measured&&kind==='skipped'&&finalText)rememberTrouble(measured);
    results[index]={kind,heard:mine()?finalText:'',missing:measured?.missing||[],attempts:attempts+1,score:kind==='passed'?measured?.score||0:0,troubleWords:[...new Set([...turnTrouble,...(kind==='passed'?measured?.missing||[]:[])])]};
    cancelTurn();index++;saveProgress();clearTranscript();
    if(!current()){finish();return;}
    phase=wasActive?'connecting':'idle';renderLine();
    if(wasActive)enterTurn();else status('準備ができたら、ここから始められます。');
  }
  function pause(){if(lesson)saveProgress(true);stopAll();phase='paused';updateControls();status('一時停止しました。このセリフの最初から再開します。');}
  function finish(){stopAll();phase='finished';saveProgress(true);renderLine();saveSession();$('result').scrollIntoView({behavior:'smooth',block:'center'});}
  async function saveSession(){
    if(!Records||!sessionId||sessionRecorded)return;sessionRecorded=true;$('record-status').textContent='練習の記録を保存しています…';
    const data={lessonId:lesson.id,title:lesson.title,role:$('role').value,difficulty:$('difficulty').value,startedAt:sessionStarted,finishedAt:Date.now(),kind:reviewSource?'review':'conversation',sourceId:reviewSource,lines:lesson.lines,results,score:lastSummary.score};
    try{await Records.add('session',data,sessionId);$('record-status').textContent='練習の記録を端末に保存しました。';renderLibrary();}catch(e){sessionRecorded=false;$('record-status').textContent='記録を保存できませんでした。保存画面からバックアップしてください。';notify(e.message);}
  }
  function showResult(){
    const s=ConversationScore.summary(lesson.lines,$('role').value,results);lastSummary=s;
    $('session-score').textContent=s.score;$('result-summary').textContent=`${s.passed} セリフで聞き取りを確認しました。スキップ ${s.skipped} セリフ。${s.attempted<s.total?'未実施のセリフは平均に含めていません。':''}スキップは0点として平均しています。`;
    $('session-stats').innerHTML=[['自分のセリフ',s.attempted],['一度でOK',s.firstTry],['言い直した文',s.retries],['スキップ',s.skipped]].map(([name,n])=>`<div><small>${name}</small><strong>${n}</strong></div>`).join('');
    $('review-list').innerHTML='';for(const r of s.weak){const label=document.createElement('label');label.className='review-option';label.innerHTML=`<input type="checkbox" checked value="${r.index}"><span><strong lang="en">${escapeHTML(r.line.en)}</strong><small>${r.kind==='skipped'?'スキップ':Math.round((r.score||0)*100)+'点 · '+r.attempts+'回目'}${r.troubleWords?.length?' · 確認したい語：'+escapeHTML(r.troubleWords.join(', ')):''}</small></span>`;$('review-list').append(label);}
    if(!s.weak.length)$('review-list').innerHTML='<p class="small muted">今回、復習候補の文はありません。</p>';
    $('word-review').innerHTML=s.words.length?'<p class="small">単語を選んで復習できます。</p>'+s.words.map(([word,n])=>`<label class="word-chip"><input type="checkbox" checked value="${escapeHTML(word)}">${escapeHTML(word)}<small> ${n}文</small></label>`).join(''):'';
    $('review-sentences').disabled=!s.weak.length;$('review-words').disabled=!s.words.length;$('next-preview').textContent='';
    $('record-status').textContent=sessionRecorded?'練習の記録を保存済みです。':'';
  }
  function startReview(words=false){
    const selected=[...$(words?'word-review':'review-list').querySelectorAll('input:checked')].map(x=>x.value);if(!selected.length){notify('復習するものを選んでください。');return;}
    const origin=reviewSource||lesson.id;
    const reviewLines=words?selected.map(word=>({role:'A',en:word,ja:'この単語を声に出してください。',hint:''})):selected.map(i=>({...lesson.lines[Number(i)],role:'A'}));
    stopAll();lesson={id:'review-'+crypto.randomUUID(),title:words?'苦手な単語の復習':'選んだ文章の復習',description:'聞き取れたら自動で次へ進みます。お手本とスキップも使えます。',roles:{A:'あなた'},lines:reviewLines};reviewSource=origin;index=0;results=[];sessionId='';sessionStarted=0;sessionRecorded=false;
    $('role').innerHTML='<option value="A">あなた</option>';$('lesson-title').textContent=lesson.title;$('lesson-description').textContent=lesson.description;$('session-count').textContent=`${reviewLines.length} 項目`;phase='idle';clearTranscript();renderLine();start();
  }
  function loadVoices(){
    const selected=$('voice').value||config.voice;
    voiceList=(synth?.getVoices()||[]).filter(v=>/^en[-_]/i.test(v.lang)).sort((a,b)=>voiceRank(b)-voiceRank(a));
    $('voice').innerHTML=voiceList.length?voiceList.map(v=>`<option value="${escapeHTML(v.voiceURI)}">${escapeHTML(v.name)} · ${escapeHTML(v.lang)}</option>`).join(''):'<option value="">英語音声を読み込み中…</option>';
    if(voiceList.some(v=>v.voiceURI===selected))$('voice').value=selected;
    $('capability').textContent=Recognition?'対応する英語音声を選んで試聴できます。聞き取りには通信が必要な場合があります。':'このブラウザは音声認識に未対応です。Chrome / Edgeで開いてください。';
  }
  function voiceRank(v){return (/natural|neural/i.test(v.name)?50:0)+(/google/i.test(v.name)?30:0)+(/^en-US$/i.test(v.lang)?10:0);}
  function getImported(){return C.parseLesson($('import-text').value,$('import-title').value.trim());}
  function absorbRecords(){
    if(!Records)return;
    for(const record of Records.list('lesson')){try{const l=C.validateLesson(record.data);if(!custom.some(x=>x.id===l.id))custom.push(l);}catch{}}
    for(const record of Records.list('progress')){const {key,value}=record.data;if(typeof key==='string'&&key.includes(':flow2')&&value&&(!progress[key]||(value.updatedAt||0)>(progress[key].updatedAt||0)))progress[key]=value;}
    lessons=[...BUILTIN_LESSONS,...custom].map(prepare);persist();if(!active){renderLibrary();if(!$('manager').hidden)renderManager();}
  }
  function download(text,name){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function renderHistory(){
    const sessions=Records.list('session').sort((a,b)=>b.data.finishedAt-a.data.finishedAt),reviews=sessions.filter(r=>r.data.kind==='review');
    const dates=new Set(sessions.map(r=>new Date(r.data.finishedAt).toLocaleDateString('sv-SE',{timeZone:'Asia/Tokyo'})));
    $('history-summary').innerHTML=[['会話の練習',sessions.length-reviews.length],['復習',reviews.length],['練習した日',dates.size]].map(([name,n])=>`<div><small>${name}</small><strong>${n}</strong></div>`).join('');
    $('history-list').innerHTML='';for(const record of sessions){const row=document.createElement('article');row.className='history-row';const d=record.data;row.innerHTML=`<div><strong>${escapeHTML(d.title)}</strong><small>${new Date(d.finishedAt).toLocaleString('ja-JP')} · ${d.kind==='review'?'復習':'会話'} · ${escapeHTML(d.difficulty)}</small></div><strong>${Number(d.score)||0}点</strong><button class="secondary small">結果・復習を見る</button>`;row.querySelector('button').onclick=()=>{stopAll();lesson={id:d.lessonId,title:d.title,description:'保存した練習結果',roles:{A:'聞き手',B:'相手'},lines:d.lines};results=d.results;index=d.lines.length;sessionId=record.id;sessionStarted=d.startedAt;sessionRecorded=true;reviewSource=d.sourceId||null;$('role').innerHTML='<option value="A">聞き手</option><option value="B">相手</option>';$('role').value=d.role;$('lesson-title').textContent=d.title;$('lesson-description').textContent='保存した練習結果';$('library').hidden=true;$('studio').hidden=false;phase='finished';renderLine();$('history-dialog').close();$('result').scrollIntoView({block:'center'});};$('history-list').append(row);}
    if(!sessions.length)$('history-list').innerHTML='<p class="muted">会話を最後まで練習すると、ここに記録が残ります。</p>';
  }
  async function loadCloud(){if(cloudLoaded)return;cloudLoaded=true;try{await import('./cloud.js?v=3');}catch{cloudLoaded=false;$('cloud-state').textContent='同期機能を読み込めませんでした。通信を確認してください。';}}
  function preview(){try{const l=getImported();$('import-error').textContent='';$('import-preview').innerHTML=`<strong>${l.lines.length} セリフ · A: ${l.lines.filter(x=>x.role==='A').length} / B: ${l.lines.filter(x=>x.role==='B').length}</strong>`+l.lines.slice(0,6).map(l=>`<p>${l.role} · ${escapeHTML(l.en)}<br>${escapeHTML(l.ja)}</p>`).join('');return l;}catch(e){$('import-error').textContent=e.message;$('import-preview').textContent='';return null;}}
  $('add-lesson').onclick=()=>{$('import-dialog').showModal();};$('close-import').onclick=()=>$('import-dialog').close();
  $('lesson-search').oninput=renderLibrary;
  $('preview-import').onclick=preview;
  $('import-file').onchange=async e=>{const file=e.target.files[0];if(!file)return;if(file.size>1000000){$('import-error').textContent='1MB以内のファイルにしてください。';return;}try{$('import-text').value=await file.text();if(!$('import-title').value)$('import-title').value=file.name.replace(/\.[^.]+$/,'');preview();}catch{$('import-error').textContent='ファイルを読み込めませんでした。';}};
  $('import-form').onsubmit=e=>{e.preventDefault();const l=preview();if(!l)return;l.id='custom-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2));custom.push(l);lessons=[...BUILTIN_LESSONS,...custom].map(prepare);if(!persist()){custom.pop();lessons=[...BUILTIN_LESSONS,...custom].map(prepare);return;}Records?.add('lesson',l,'lesson-'+l.id).catch(e=>notify(e.message));$('import-dialog').close();$('import-form').reset();$('import-preview').textContent='';renderLibrary();openLesson(l.id);notify('教材を保存しました。次回もこのブラウザで使えます。');};
  $('export-lesson').onclick=()=>{if(!lesson)return;const blob=new Blob([JSON.stringify(lesson,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=lesson.title.replace(/[\\/:*?"<>|]/g,'_')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('start').onclick=start;$('pause').onclick=pause;$('done').onclick=manualDone;
  $('reconnect-mic').onclick=reconnectMic;
  $('retry').onclick=()=>{if(!current())return;if(!active){start();return;}if(finalText){if(!retryNoted)attempts++;rememberTrouble(C.assess(current().en,finalText,$('difficulty').value));}cancelTurn();clearTranscript();renderLine();listen();};
  $('skip').onclick=()=>advance('skipped');$('model').onclick=()=>model(false);$('slow-model').onclick=()=>model(true);$('hint').onclick=()=>$('hint-box').hidden=!$('hint-box').hidden;
  $('replay-partner').onclick=()=>{if(!current()||!mine())return;const previous=lesson.lines.slice(0,index).findLast(l=>l.role!==$('role').value);if(!previous)return;const wasActive=active;speak(previous.en,false,()=>{if(wasActive&&active)listen(true);else{phase='idle';updateControls();status('相手の返答を聞き直しました。');}});};
  $('back').onclick=showHome;$('exit-practice').onclick=showHome;$('manager-back').onclick=showHome;$('mobile-exit').onclick=showHome;$('mobile-toggle').onclick=()=>active?pause():start();
  document.querySelector('.brand').onclick=e=>{e.preventDefault();showHome();};
  $('manage-open').onclick=async()=>{await Records.ready;showHome();$('library').hidden=true;$('manager').hidden=false;renderManager();$('manager-title').focus();};
  $('manage-search').oninput=renderManager;$('manage-tabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{manageState=b.dataset.state;$('manage-list').innerHTML='';$('manage-status').textContent='';renderManager();});
  $('manage-all').onchange=()=>{$('manage-list').querySelectorAll('input').forEach(el=>el.checked=$('manage-all').checked);updateManageSelection();};
  for(const [id,state] of [['bulk-archive','archived'],['bulk-restore','active'],['bulk-delete','deleted']])$(id).onclick=()=>changeCatalog([...$('manage-list').querySelectorAll('input:checked')].map(el=>el.value),state);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape'||document.querySelector('dialog[open]'))return;if(!$('studio').hidden||!$('manager').hidden){e.preventDefault();showHome();notify('トップに戻りました。途中の位置を保存し、マイクを停止しました。');}});
  $('restart').onclick=()=>{stopAll();index=0;results=[];sessionId='';sessionStarted=0;sessionRecorded=false;phase='idle';saveProgress();clearTranscript();renderLine();document.querySelector('.conversation').scrollIntoView({block:'center'});start();};
  $('finish-today').onclick=()=>$('back').click();$('review-sentences').onclick=()=>startReview(false);$('review-words').onclick=()=>startReview(true);
  $('history-open').onclick=async()=>{if(active)pause();await Records.ready;renderHistory();$('history-dialog').showModal();};$('history-close').onclick=()=>$('history-dialog').close();
  $('sync-open').onclick=()=>{if(active)pause();$('sync-dialog').showModal();loadCloud();};$('sync-close').onclick=()=>$('sync-dialog').close();
  $('cloud-login').onclick=async()=>{config.cloudEnabled=true;persist();await loadCloud();window.ConversationCloud?.login();};$('cloud-sync').onclick=()=>window.ConversationCloud?.sync();$('cloud-logout').onclick=()=>{config.cloudEnabled=false;persist();window.ConversationCloud?.logout();};
  window.addEventListener('conversation-cloud-status',e=>{const d=e.detail;$('cloud-state').textContent=d.text;$('cloud-account').textContent=d.email;$('cloud-logout').hidden=!d.email;$('cloud-sync').disabled=!d.email;$('cloud-login').hidden=!!d.email;});
  window.addEventListener('conversation-cloud-updated',absorbRecords);
  window.addEventListener('conversation-mirror',e=>$('local-save-status').textContent=e.detail?'端末＋このPCのデータベースに保存':'端末に保存（PCのデータベースは未接続）');
  $('backup-export').onclick=async()=>{try{for(const l of custom)if(!Records.list('lesson').some(r=>r.data.id===l.id))await Records.add('lesson',l,'lesson-'+l.id);download(await Records.export(),'英会話リハーサル_バックアップ_'+new Date().toISOString().slice(0,10)+'.json');$('backup-status').textContent='教材と全履歴を書き出しました。';}catch(e){$('backup-status').textContent=e.message;}};
  $('backup-import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>50000000)throw new Error('50MB以内のバックアップを選んでください。');const n=await Records.restore(await file.text());absorbRecords();$('backup-status').textContent=`${n} 件を追加・更新しました。既存の記録も残しています。`;}catch(e){$('backup-status').textContent=e.message;}};
  $('scene-image').onerror=()=>{$('scene-error').hidden=false;};$('scene-image').onload=()=>{$('scene-error').hidden=true;};$('scene-retry').onclick=()=>{$('scene-image').src='scene-kuromon.png?v=3&retry='+Date.now();};
  if($('scene-image').complete&&!$('scene-image').naturalWidth)$('scene-retry').click();
  $('role').onchange=()=>{stopAll();config.role=$('role').value;loadProgress();persist();phase=index>=lesson.lines.length?'finished':'idle';clearTranscript();renderLine();};
  for(const key of ['difficulty','voice','rate','gap','auto','translation','scene-toggle'])$(key).addEventListener('change',()=>{config[key]=typeof defaults[key]==='boolean'?$(key).checked:$(key).value;persist();$('rate-value').textContent=`${Number($('rate').value).toFixed(2).replace(/0$/,'')}倍`;if(key==='translation')$('japanese').hidden=!$('translation').checked;if(key==='scene-toggle')$('scene').hidden=!$('scene-toggle').checked||!lesson?.id.startsWith('kuromon');if(active&&key==='voice'){pause();status('声を変更しました。再開すると新しい声で練習します。');}updateControls();});
  $('rate').oninput=()=>$('rate-value').textContent=`${Number($('rate').value).toFixed(2).replace(/0$/,'')}倍`;
  $('voice-preview').onclick=()=>{if(!voiceList.length){notify('英語音声が見つかりません。Chrome / Edgeや端末の英語音声を確認してください。');return;}speak('Hi! Take your time. I am ready when you are.',false,()=>{phase='idle';updateControls();status('選んだ声で練習できます。');});};
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&(active||phase==='speaking'))pause();});
  window.addEventListener('pagehide',()=>{saveProgress();stopAll();});
  loadVoices();if(synth)synth.addEventListener('voiceschanged',loadVoices);setTimeout(loadVoices,1000);
  $('rate').oninput();persist();$('studio').hidden=true;$('library').hidden=false;renderLibrary();
  if(config.cloudEnabled)loadCloud();
  Records.ready.then(()=>{absorbRecords();for(const l of custom)if(!Records.list('lesson').some(r=>r.data.id===l.id))Records.add('lesson',l,'lesson-'+l.id).catch(e=>notify(e.message));}).catch(()=>notify('端末の記録データベースを開けませんでした。ブラウザの保存設定を確認してください。'));
  Records.subscribe(r=>{if(['catalog','session'].includes(r.type)&&!active){renderLibrary();if(!$('manager').hidden)renderManager();}});
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
