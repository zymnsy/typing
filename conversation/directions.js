// Based on the owner's 道案内2026_03_20_.csv. Visitor responses added for a complete dialogue.
BUILTIN_LESSONS.push({id:'street-directions',title:'道案内・街で声をかけられたら',description:'地図で現在地を示し、まっすぐ・右折・距離を伝えます。以前の道案内教材を会話にしました。',roles:{A:'道を案内する人',B:'道を尋ねる旅行者'},lines:[
  {role:'B',en:'Excuse me. Do you speak English?',ja:'すみません。英語を話せますか？',hint:'イクスキューズ ミー。ドゥー ユー スピーク イングリッシュ？'},
  {role:'A',en:'Just a little. How can I help you?',ja:'少しだけなら話せます。何かお困りですか？',hint:'ジャスタ リトル。ハウ キャナイ ヘルプ ユー？'},
  {role:'B',en:"I'm trying to find this building. Could you help me?",ja:'この建物を探しています。手伝っていただけますか？',hint:'アイム トライイン タ ファインド ディス ビルディング。クッジュー ヘルプ ミー？'},
  {role:'A',en:'Do you have a map?',ja:'地図はお持ちですか？',hint:'ドゥー ユー ハヴァ マップ？'},
  {role:'B',en:"Yes. Here's the map.",ja:'はい。こちらが地図です。',hint:'イェス。ヒアズ ザ マップ。'},
  {role:'A',en:"We're here.",ja:'いま私たちはここにいます。',hint:'ウィア ヒア。'},
  {role:'B',en:'Which way should I go?',ja:'どちらに進めばいいですか？',hint:'ウィッチ ウェイ シュダイ ゴウ？'},
  {role:'A',en:'Go straight for about 100 meters, then turn right at the intersection with a 7-Eleven on the left.',ja:'この道を約100メートルまっすぐ進み、左側にセブンイレブンがある交差点を右に曲がってください。',hint:'ゴウ ストレイト ファラバウト ワン ハンドレッド ミーターズ、ゼン ターン ライト アッ ジ インターセクション ウィザ セヴン イレヴン オン ザ レフト。'},
  {role:'B',en:'Okay. What should I do after that?',ja:'わかりました。そのあとはどうすればいいですか？',hint:'オウケイ。ワッ シュダイ ドゥー アフター ザット？'},
  {role:'A',en:'After that, walk for about 30 meters. You should see this building.',ja:'そのあと約30メートル歩くと、この建物が見えてくるはずです。',hint:'アフター ザット、ウォーク ファラバウト サーティ ミーターズ。ユー シュッド スィー ディス ビルディング。'},
  {role:'B',en:'Can I check that on my phone?',ja:'それをスマホで確認できますか？',hint:'キャナイ チェック ザット オン マイ フォウン？'},
  {role:'A',en:'Do you have internet access?',ja:'インターネットに接続できますか？',hint:'ドゥー ユー ハヴ インターネット アクセス？'},
  {role:'B',en:'Yes, I do. Thank you for your help.',ja:'はい、できます。助けてくださってありがとうございます。',hint:'イェス、アイ ドゥー。サンキュー ファ ユア ヘルプ。'},
  {role:'A',en:"You're welcome. Have a nice day.",ja:'どういたしまして。良い一日を。',hint:'ユア ウェルカム。ハヴァ ナイス デイ。'}
]});

// Beginner alternative: keep the original directions lesson and append as built-in lesson 06.
BUILTIN_LESSONS.push({
  "id": "street-directions-smalltalk",
  "title": "道案内・すぐそこですよ＋神戸で世間話",
  "description": "駅はすぐそこ。道を教えたあと、神戸の旅について短い世間話をする初級会話です。",
  "roles": {
    "A": "道を案内する人",
    "B": "道を尋ねる旅行者"
  },
  "lines": [
    {
      "role": "B",
      "en": "Excuse me. Where's the station?",
      "ja": "すみません。駅はどこですか？",
      "hint": "イクスキューズ ミー。ウェアズ ザ ステイション？"
    },
    {
      "role": "A",
      "en": "It's right over there, next to the convenience store.",
      "ja": "すぐそこですよ。コンビニの隣です。",
      "hint": "イッツ ライト オウヴァ ゼア、ネクストゥ ザ コンヴィーニエンス ストア。"
    },
    {
      "role": "B",
      "en": "Oh, I see it now. Thank you!",
      "ja": "あ、見えました。ありがとう！",
      "hint": "オウ、アイ スィー イット ナウ。サンキュー！"
    },
    {
      "role": "A",
      "en": "You're welcome. Is this your first time in Kobe?",
      "ja": "どういたしまして。神戸は初めてですか？",
      "hint": "ユア ウェルカム。イズ ディス ユア ファースト タイム イン コウベイ？"
    },
    {
      "role": "B",
      "en": "Yes, it is. I arrived yesterday.",
      "ja": "はい。昨日着きました。",
      "hint": "イェス、イット イズ。アイ アライヴド イェスタデイ。"
    },
    {
      "role": "A",
      "en": "How do you like it so far?",
      "ja": "今のところ、神戸はどうですか？",
      "hint": "ハウ ドゥー ユー ライク イット ソウ ファー？"
    },
    {
      "role": "B",
      "en": "I love it. The food is really good.",
      "ja": "とても気に入っています。食べ物がおいしいですね。",
      "hint": "アイ ラヴ イット。ザ フード イズ リアリー グッド。"
    },
    {
      "role": "A",
      "en": "I'm glad to hear that.",
      "ja": "それはよかったです。",
      "hint": "アイム グラッドゥ ヒア ザット。"
    },
    {
      "role": "B",
      "en": "Do you live around here?",
      "ja": "この辺りに住んでいるんですか？",
      "hint": "ドゥー ユー リヴ アラウンド ヒア？"
    },
    {
      "role": "A",
      "en": "Yes, I live nearby.",
      "ja": "はい、近くに住んでいます。",
      "hint": "イェス、アイ リヴ ニアバイ。"
    },
    {
      "role": "B",
      "en": "That's nice. Thanks again for your help.",
      "ja": "いいですね。教えてくれてありがとう。",
      "hint": "ザッツ ナイス。サンクス アゲン ファ ユア ヘルプ。"
    },
    {
      "role": "A",
      "en": "No problem. Enjoy your trip!",
      "ja": "どういたしまして。旅行を楽しんでください！",
      "hint": "ノウ プラブレム。エンジョイ ユア トリップ！"
    }
  ]
});
