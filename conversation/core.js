(function (root) {
  'use strict';
  const contractions = {"i'm":"i am","you're":"you are","we're":"we are","they're":"they are","it's":"it is","that's":"that is","what's":"what is","here's":"here is","there's":"there is","i've":"i have","you've":"you have","we've":"we have","they've":"they have","i'll":"i will","you'll":"you will","it'll":"it will","don't":"do not","doesn't":"does not","didn't":"did not","isn't":"is not","aren't":"are not","wasn't":"was not","weren't":"were not","can't":"cannot","couldn't":"could not","wouldn't":"would not","won't":"will not","let's":"let us","i'd":"i would"};
  Object.assign(contractions,{"where's":"where is","how's":"how is","who's":"who is","he's":"he is","she's":"she is","we'll":"we will","they'll":"they will","you'd":"you would",gonna:'going to',wanna:'want to',gotta:'got to',ok:'okay'});
  function numberWords(n){
    const ones=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
    const tens=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    if(n<20)return ones[n];if(n<100)return tens[Math.floor(n/10)]+(n%10?' '+ones[n%10]:'');
    if(n<1000)return ones[Math.floor(n/100)]+' hundred'+(n%100?' '+numberWords(n%100):'');
    if(n<1000000)return numberWords(Math.floor(n/1000))+' thousand'+(n%1000?' '+numberWords(n%1000):'');return String(n);
  }
  function tokens(text) {
    return String(text).normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'")
      .replace(/\b\d{1,3}(?:,\d{3})+\b/g,n=>n.replace(/,/g,''))
      .replace(/\b\d+\b/g,n=>numberWords(Number(n)))
      .replace(/\b[a-z]+(?:'[a-z]+)?\b/g, w => contractions[w] || w)
      .replace(/\bcan not\b/g,'cannot').match(/[a-z]+(?:'[a-z]+)?|\d+/g) || [];
  }
  function groupTurns(lesson){
    const lines=[];
    for(const l of lesson.lines){const prev=lines.at(-1);if(prev&&prev.role===l.role&&prev.en.length+l.en.length<1900){prev.en+=' '+l.en;prev.ja+=' '+l.ja;prev.hint+=' '+l.hint;if(prev.notes||l.notes)prev.notes=Object.fromEntries(['words','phrases','grammar'].map(k=>[k,[...(prev.notes?.[k]||[]),...(l.notes?.[k]||[])]]));}else lines.push({...l});}
    return {...lesson,lines};
  }
  // Keep breathing-pause chunks, but also allow a fresh complete retry without a button.
  function bestTranscript(expected,chunks,difficulty='medium'){
    let best={text:'',offset:0,assessment:assess(expected,'',difficulty)};
    for(let i=Math.max(0,chunks.length-24);i<chunks.length;i++){
      const text=chunks.slice(i).join(' ').trim(), a=assess(expected,text,difficulty);
      if(a.score>best.assessment.score||(a.score===best.assessment.score&&a.matched.filter(Boolean).length>=best.assessment.matched.filter(Boolean).length))best={text,offset:i,assessment:a};
    }return best;
  }
  // Ordered alignment. Substitutions, deletions and repeated extra words all cost a word.
  function assess(expected, heard, difficulty = 'medium') {
    const a = tokens(expected), b = tokens(heard).slice(-700);
    const dp = Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
    for(let i=0;i<=a.length;i++) dp[i][0]=i;
    for(let j=0;j<=b.length;j++) dp[0][j]=j;
    for(let i=1;i<=a.length;i++) for(let j=1;j<=b.length;j++)
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
    const matched = Array(a.length).fill(false);
    let i=a.length,j=b.length;
    while(i||j) {
      if(i&&j&&dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)) {matched[i-1]=a[i-1]===b[j-1]; i--;j--;}
      else if(i&&dp[i][j]===dp[i-1][j]+1) i--; else j--;
    }
    const score = a.length ? Math.max(0,1-dp[a.length][b.length]/a.length) : 0;
    const threshold = {easy:.65,medium:.82,strict:.96}[difficulty] || .82;
    const lastCount = a.length>5 ? 2 : 1;
    const ending = a.length>0 && matched.slice(-lastCount).every(Boolean);
    return {score,matched,expected:a,heard:b,pass:b.length>0&&score>=threshold,complete:b.length>0&&score>=threshold&&ending,missing:a.filter((_,k)=>!matched[k])};
  }
  function csvRows(text) {
    const rows=[];let row=[],field='',quoted=false;
    text=String(text).replace(/^\uFEFF/,'');
    for(let i=0;i<text.length;i++) {
      const c=text[i];
      if(c==='"') {if(quoted&&text[i+1]==='"'){field+='"';i++;} else if(quoted||!field) quoted=!quoted; else field+=c;}
      else if(c===','&&!quoted){row.push(field);field='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field='';}
      else field+=c;
    }
    if(quoted)throw new Error('CSVの引用符が閉じられていません。');
    row.push(field);if(row.some(v=>v.trim()))rows.push(row);return rows;
  }
  function validateNotes(notes){
    if(notes==null)return undefined;
    if(typeof notes!=='object'||Array.isArray(notes))throw new Error('解説は words / phrases / grammar の配列で指定してください。');
    const out={};for(const key of ['words','phrases','grammar']){
      if(notes[key]==null){out[key]=[];continue;}
      if(!Array.isArray(notes[key])||notes[key].length>12)throw new Error('解説は種類ごとに12件以内にしてください。');
      out[key]=notes[key].map(n=>{if(!n||typeof n.term!=='string'||typeof n.desc!=='string')throw new Error('解説には term と desc が必要です。');return {term:n.term.slice(0,120),desc:n.desc.slice(0,800),yomi:String(n.yomi||'').slice(0,120)};});
    }return out;
  }
  function validateLesson(value) {
    if(!value||typeof value.title!=='string'||!value.title.trim())throw new Error('教材名を入力してください。');
    if(!Array.isArray(value.lines)||!value.lines.length||value.lines.length>300)throw new Error('セリフは1〜300行にしてください。');
    const lines=value.lines.map((l,i)=>{
      if(l&&!l.role)l={...l,role:l.who==='you'?'A':l.who==='partner'?'B':undefined,hint:l.hint||l.kana};
      if(!l||!['A','B'].includes(l.role))throw new Error(`${i+1}行目：話者を A または B にしてください。`);
      if(typeof l.en!=='string'||!tokens(l.en).length||l.en.length>2000)throw new Error(`${i+1}行目：英語のセリフを1〜2000文字で入力してください。`);
      return {role:l.role,en:l.en.trim(),ja:String(l.ja||'').slice(0,2000),hint:String(l.hint||'').slice(0,2000),...(l.notes?{notes:validateNotes(l.notes)}:{})};
    });
    return {id:typeof value.id==='string'?value.id.slice(0,150):'',title:value.title.trim().slice(0,100),description:String(value.description||'追加した会話教材').slice(0,500),roles:{A:String(value.roles?.A||value.roles?.you||'聞き手').slice(0,50),B:String(value.roles?.B||value.roles?.partner||'相手').slice(0,50)},lines};
  }
  function parseLesson(text,title) {
    if(text.length>1000000)throw new Error('教材は1MB以内にしてください。');
    const trimmed=text.trim();
    if(trimmed.startsWith('{'))return validateLesson({...JSON.parse(trimmed),...(title?{title}:{})});
    let lines;
    if(/^\s*"?(role|speaker|ja|en)"?\s*,/i.test(trimmed.replace(/^\uFEFF/,''))) {
      const rows=csvRows(trimmed), heads=rows.shift().map(v=>v.trim().toLowerCase());
      if(!heads.includes('en'))throw new Error('CSVに en 列が必要です。');
      lines=rows.filter(r=>r[heads.indexOf('show')]!=='0').map((r,i)=>{
        const get=k=>r[heads.indexOf(k)]||'';let role=get('role')||get('speaker');const ja=get('ja');
        if(!role){if(/^あなた[：:]/.test(ja))role='A';else if(/^相手[：:]/.test(ja))role='B';}
        if(!role)throw new Error(`${i+2}行目：role 列に A / B を指定してください（日本語の「あなた：」「相手：」でも可）。`);
        let notes;if(get('notes')){try{notes=JSON.parse(get('notes'));}catch{throw new Error(`${i+2}行目：notes 列のJSONを確認してください。`);}}
        return {role:role.trim().toUpperCase(),en:get('en'),ja:ja.replace(/^(あなた|相手)[：:]/,''),hint:get('hint'),...(notes?{notes}:{})};
      });
    } else {
      lines=trimmed.split(/\r?\n/).filter(v=>v.trim()).filter(line=>{const m=line.match(/^(?:タイトル|題名|title)\s*[:：]\s*(.+)$/i);if(m){title=title||m[1].trim();return false;}return true;}).map((line,i)=>{
        line=line.replace(/｜/g,'|').replace(/^(あなた|自分|相手|A|B|Y|P|you|me|partner)\s*[:：]\s*/i,(_,role)=>(/^(あなた|自分|A|Y|you|me)$/i.test(role)?'A':'B')+' | ');
        const [role,en,ja='',hint='']=line.split('|').map(v=>v.trim());
        if(!en)throw new Error(`${i+1}行目：「A | 英文 | 日本語 | 読みのヒント」の形にしてください。`);
        return {role:role.toUpperCase(),en,ja,hint};
      });
    }
    return validateLesson({title:title||'追加した会話',lines});
  }
  const api={tokens,assess,csvRows,parseLesson,validateLesson,groupTurns,bestTranscript};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.ConversationCore=api;
})(globalThis);
