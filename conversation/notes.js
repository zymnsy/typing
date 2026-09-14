/* Small, curated explanations. Only matching expressions are displayed; no model/API calls. */
(() => {
  const entries=[];
  function add(kind,pattern,term,yomi,desc){entries.push({kind,pattern,note:{term,yomi,desc}});}
  add('words',/\bmap\b/i,'map','マップ','地図。Do you have a map? で「地図はありますか？」。');
  add('words',/\bintersection\b/i,'intersection','インターセクション','交差点。道が交わる場所です。');
  add('words',/\bbuilding\b/i,'building','ビルディング','建物。this building は「この建物」。');
  add('words',/\bmeters?\b/i,'meter','ミーター','距離の「メートル」。100 meters は one hundred meters と読みます。');
  add('words',/\binternet access\b/i,'internet access','インターネット アクセス','インターネットに接続できること。道順を調べられるか確認します。');
  add('words',/\blatte\b/i,'latte','ラテイ','エスプレッソにミルクを加えた飲み物。日本語のラテより、後ろの音を少し伸ばします。');
  add('words',/\bmedium\b/i,'medium','ミーディアム','中くらいのサイズ。small / medium / large の順です。');
  add('words',/\biced\b/i,'iced','アイスト','氷で冷やした。飲み物の「アイス」に当たります。');
  add('words',/\boat milk\b/i,'oat milk','オウト ミルク','オーツ麦から作る植物性のミルク。');
  add('words',/\breservation\b/i,'reservation','レザヴェイション','予約。have a reservation で「予約しています」。');
  add('words',/\bpassport\b/i,'passport','パスポート','旅券。受付で提示をお願いされることがあります。');
  add('words',/\bbreakfast\b/i,'breakfast','ブレックファスト','朝食。lunch は昼食、dinner は夕食です。');
  add('words',/\bbags?\b/i,'bag','バッグ','かばん。複数なら bags と、最後に音を付けます。');
  add('words',/\bminutes?\b/i,'minute','ミニット','分。a minute は会話で「少しの時間」にもなります。');
  add('words',/\bprices?\b/i,'price','プライス','値段。prices は複数の商品の値段です。');
  add('words',/\bquality\b/i,'quality','クウォリティ','品質。物やサービスの質を表します。');
  add('phrases',/\bgo straight\b/i,'go straight','ゴウ ストレイト','まっすぐ進む。道案内でそのまま使える形です。');
  add('phrases',/\bturn right\b/i,'turn right','ターン ライト','右に曲がる。turn left にすれば左です。');
  add('phrases',/\bon the left\b/i,'on the left','オン ザ レフト','左側に。on the right は「右側に」。');
  add('phrases',/\bafter that\b/i,'after that','アフター ザット','そのあとで。順番に説明するときのつなぎ言葉です。');
  add('phrases',/\bhow can i help you\b/i,'How can I help you?','ハウ キャナイ ヘルプ ユー','「何かお困りですか？」。相手の用件を丁寧に聞けます。');
  add('phrases',/\bjust a little\b/i,'just a little','ジャスタ リトル','ほんの少し。英語を話せる量について答えています。');
  add('phrases',/\bto go\b/i,'to go','タ ゴウ','飲食店では「持ち帰りで」。for here は「店内で」。');
  add('phrases',/\bhere you are\b/i,'Here you are.','ヒア ユー アー','物を手渡す時の「はい、どうぞ」。');
  add('phrases',/\bin a moment\b/i,'in a moment','インナ モウメント','まもなく。少し待ってほしい時に使います。');
  add('phrases',/\bhave a nice day\b/i,'Have a nice day!','ハヴァ ナイス デイ','「良い一日を！」。別れ際のひと言です。');
  add('phrases',/\byou.re welcome\b/i,"You're welcome.",'ユア ウェルカム','お礼への返事。「どういたしまして」。');
  add('phrases',/\bof course\b/i,'Of course.','アヴ コース','「はい、もちろん」。お願いを快く受ける返答です。');
  add('grammar',/\bcould (i|you)\b/i,'Could I / Could you + 動詞？','','Could I have ...? は「〜をいただけますか」。Could you help ...? は「〜を手伝っていただけますか」。動詞は原形です。');
  add('grammar',/\bdo you have\b/i,'Do you have + 名詞？','','「〜を持っていますか／ありますか」。have の後ろを map、internet access などに替えられます。');
  add('grammar',/\b(go straight|turn right|walk for)\b/i,'動詞から始める道案内','','Go / Turn / Walk で「進んで／曲がって／歩いて」。at の後ろに曲がる場所を置けます。');
  add('grammar',/\bfor about\b/i,'for about + 距離','','for で進む距離、about で「およそ」。for about 100 meters は「約100メートル」。');
  add('grammar',/\byou should see\b/i,'You should see ...','','ここでの should は「〜のはず」。建物が見えてくる見込みを伝えています。');
  add('grammar',/\bwe.re here\b/i,"We're = We are",'ウィア ヒア','「私たちはここです」。地図上で現在地を示す言い方です。');
  add('grammar',/\bwould you like\b/i,'Would you like ...?','','丁寧に好みを尋ねます。hot or iced のように or で選択肢を並べられます。');
  add('grammar',/\bmay i\b/i,'May I + 動詞？','','「〜してもよろしいですか」。受付などで使う丁寧な許可の求め方です。');
  add('grammar',/\bis included\b/i,'be動詞 + 過去分詞','','is included は「含まれています」。Breakfast is included. なら朝食が料金に含まれます。');
  add('grammar',/\bwhat time does\b/i,'What time does ... start?','','「何時に始まりますか」。does を使うので start は原形です。');
  add('grammar',/\bcan i leave\b/i,'Can I + 動詞？','','「〜してもいいですか」。leave my bags here は「かばんをここに置いておく」。');
  function forLine(line){
    const out={words:[],phrases:[],grammar:[]};
    const push=(key,n)=>{if(!out[key].some(old=>old.term.toLowerCase()===n.term.toLowerCase()))out[key].push(n);};
    for(const key of Object.keys(out))for(const n of line.notes?.[key]||[])push(key,n);
    for(const [en,notes] of Object.entries(globalThis.INTERVIEW_NOTES||{}))if(line.en.toLowerCase().includes(en.toLowerCase()))for(const key of Object.keys(out))for(const n of notes[key])push(key,n);
    for(const e of entries)if(e.pattern.test(line.en))push(e.kind,e.note);
    // A one-word review can still use the original interview's vocabulary explanation.
    if(!/\s/.test(line.en.trim()))for(const notes of Object.values(globalThis.INTERVIEW_NOTES||{}))for(const n of notes.words)if(n.term.toLowerCase()===line.en.toLowerCase())push('words',n);
    return out;
  }
  globalThis.ConversationNotes={forLine};
})();
