(function(root){
  function summary(lines,role,results){
    const rows=lines.map((line,index)=>({line,index,...results[index]})).filter(r=>r.line.role===role);
    const attempted=rows.filter(r=>r.kind==='passed'||r.kind==='skipped');
    const score=attempted.length?Math.round(attempted.reduce((sum,r)=>sum+(r.kind==='skipped'?0:Number(r.score)||0),0)/attempted.length*100):0;
    const words=new Map();for(const r of attempted)for(const word of r.troubleWords||r.missing||[])words.set(word,(words.get(word)||0)+1);
    return {score,total:rows.length,attempted:attempted.length,passed:rows.filter(r=>r.kind==='passed').length,skipped:rows.filter(r=>r.kind==='skipped').length,
      firstTry:rows.filter(r=>r.kind==='passed'&&r.attempts===1).length,retries:rows.filter(r=>r.attempts>1).length,
      weak:attempted.filter(r=>r.kind==='skipped'||r.attempts>1||r.score<.96||(r.troubleWords||[]).length),words:[...words.entries()].sort((a,b)=>b[1]-a[1])};
  }
  const api={summary};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.ConversationScore=api;
})(globalThis);
