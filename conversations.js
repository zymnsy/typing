// 英会話ロールプレイ（speak_en.html）の会話データ
// 追加するときは、この配列にオブジェクトを1つ足すだけ。
//   who : 'you'（自分が言う側） / 'partner'（相手役＝機械が話す側）
//   en  : 英文（判定に使う）  ja : 日本語訳  kana : カタカナ読み（ヒント用・省略可）
// 画面の「会話を追加」から貼り付けた分はブラウザ（localStorage）に保存されるので、ここには入らない。
window.CONVERSATIONS = [
  {
    id: "kuromon-market-interview",
    title: "黒門市場インタビュー",
    subtitle: "27行・声かけからお礼までを通して話す",
    roles: { you: "あなた（聞き手）", partner: "相手（観光客）" },
    intro: "大阪の黒門市場で外国人観光客に「値段は高すぎないか」を聞くYouTubeインタビュー。あなたが聞き手、相手が観光客です。",
    lines: [
      { who: "you",     en: "Hi, excuse me! Sorry to bother you. Do you have a minute?", ja: "すみません！お邪魔してごめんなさい。少しお時間ありますか？", kana: "ハイ、エクスキューズミー！ソーリー トゥ バザー ユー。ドゥ ユー ハヴ ア ミニット？" },
      { who: "partner", en: "Uh, sure. What's up?", ja: "ええ、いいですよ。どうしました？", kana: "アー、シュア。ワッツ アップ？" },
      { who: "you",     en: "I'm making a YouTube video about Kuromon Market, and I'm talking to visitors about their experience here.", ja: "黒門市場についてのYouTube動画を作っていて、ここに来た人に感想を聞いています。", kana: "アイム メイキング ア ユーチューブ ヴィディオ アバウト クロモン マーケット、アンド アイム トーキング トゥ ヴィジターズ アバウト ゼア イクスピアリエンス ヒア。" },
      { who: "you",     en: "Would you mind answering a few quick questions on camera?", ja: "カメラの前でいくつか簡単な質問に答えていただけませんか？", kana: "ウッジュー マインド アンサリング ア フュー クイック クエスチョンズ オン キャメラ？" },
      { who: "partner", en: "Oh, okay. Sure, why not?", ja: "ああ、いいですよ。もちろん。", kana: "オウ、オウケイ。シュア、ワイ ノット？" },
      { who: "you",     en: "Thank you so much! It'll only take a couple of minutes.", ja: "ありがとうございます！2〜3分で終わります。", kana: "サンキュー ソウ マッチ！イトル オンリー テイク ア カポー オブ ミニッツ。" },
      { who: "you",     en: "So, where are you from?", ja: "それで、どちらから来られたんですか？", kana: "ソウ、ウェア アー ユー フロム？" },
      { who: "partner", en: "I'm from Australia. Melbourne.", ja: "オーストラリアです。メルボルンから。", kana: "アイム フロム オーストレイリア。メルバン。" },
      { who: "you",     en: "Oh, nice! Is this your first time in Japan?", ja: "いいですね！日本は初めてですか？", kana: "オウ、ナイス！イズ ディス ユア ファースト タイム イン ジャパン？" },
      { who: "partner", en: "No, it's my second time. But it's my first time in Osaka.", ja: "いいえ、2回目です。でも大阪は初めてです。", kana: "ノウ、イッツ マイ セカンド タイム。バット イッツ マイ ファースト タイム イン オウサカ。" },
      { who: "you",     en: "How are you liking Osaka so far?", ja: "ここまで大阪はどうですか？", kana: "ハウ アー ユー ライキング オウサカ ソウ ファー？" },
      { who: "partner", en: "I love it. The food is amazing.", ja: "最高です。食べ物がすごくおいしい。", kana: "アイ ラヴ イット。ザ フード イズ アメイジング。" },
      { who: "you",     en: "What did you get here today?", ja: "今日はここで何を買いましたか？", kana: "ワット ディジュー ゲット ヒア トゥデイ？" },
      { who: "partner", en: "I had a wagyu skewer and some fresh scallops.", ja: "和牛の串焼きと、新鮮なホタテを食べました。", kana: "アイ ハド ア ワギュー スキューア アンド サム フレッシュ スカロップス。" },
      { who: "you",     en: "Oh, that sounds good! How much was the wagyu?", ja: "おいしそうですね！和牛はいくらでしたか？", kana: "オウ、ザット サウンズ グッド！ハウ マッチ ワズ ザ ワギュー？" },
      { who: "partner", en: "I think it was around 3,000 yen.", ja: "たしか3,000円くらいだったと思います。", kana: "アイ シンク イット ワズ アラウンド スリー サウザンド イェン。" },
      { who: "you",     en: "How do you feel about the prices here?", ja: "ここの値段、どう感じますか？", kana: "ハウ ドゥ ユー フィール アバウト ザ プライシズ ヒア？" },
      { who: "you",     en: "Do you think they're a bit high?", ja: "ちょっと高いと思いませんか？", kana: "ドゥ ユー シンク ゼア ア ビット ハイ？" },
      { who: "partner", en: "Hmm, not really. I mean, it's a bit pricey, but it's a tourist spot, so I kind of expected it.", ja: "うーん、そうでもないです。少し高めだけど観光地だから、まあ想定内でした。", kana: "フム、ノット リアリー。アイ ミーン、イッツ ア ビット プライシー、バット イッツ ア トゥーリスト スポット、ソウ アイ カインド オブ イクスペクティッド イット。" },
      { who: "partner", en: "Actually, I think Nishiki Market in Kyoto was the most expensive.", ja: "むしろ京都の錦市場が一番高かったと思います。", kana: "アクチュアリー、アイ シンク ニシキ マーケット イン キョウト ワズ ザ モウスト イクスペンシヴ。" },
      { who: "partner", en: "Everything there felt really overpriced.", ja: "あそこは何もかも本当に割高に感じました。", kana: "エヴリシング ゼア フェルト リアリー オウヴァープライスト。" },
      { who: "you",     en: "Oh, really? That's interesting. What made Nishiki feel more expensive?", ja: "へえ、そうなんですか。おもしろいですね。錦市場のどこが高く感じましたか？", kana: "オウ、リアリー？ザッツ インタレスティング。ワット メイド ニシキ フィール モア イクスペンシヴ？" },
      { who: "partner", en: "The portions were small, and the prices were almost double.", ja: "量が少なくて、値段はほぼ倍でした。", kana: "ザ ポーションズ ワー スモール、アンド ザ プライシズ ワー オールモウスト ダブル。" },
      { who: "you",     en: "I see. So would you say Kuromon is still worth it?", ja: "なるほど。じゃあ黒門市場はそれでも来る価値があると思いますか？", kana: "アイ シー。ソウ ウッジュー セイ クロモン イズ スティル ワース イット？" },
      { who: "partner", en: "Yeah, I think so. The quality is great, and it's a fun experience.", ja: "ええ、そう思います。品質はいいし、楽しい体験ですから。", kana: "イェア、アイ シンク ソウ。ザ クオリティ イズ グレイト、アンド イッツ ア ファン イクスピアリエンス。" },
      { who: "you",     en: "Thank you so much for your time! Enjoy the rest of your trip!", ja: "お時間ありがとうございました！残りの旅行も楽しんでください！", kana: "サンキュー ソウ マッチ フォー ユア タイム！エンジョイ ザ レスト オブ ユア トリップ！" },
      { who: "partner", en: "Thanks, you too! Good luck with your video!", ja: "ありがとう、あなたもね！動画がんばってください！", kana: "サンクス、ユー トゥー！グッド ラック ウィズ ユア ヴィディオ！" }
    ]
  },
  {
    id: "kuromon-market-kirikaeshi",
    title: "黒門市場・切り返し4本",
    subtitle: "4行・答えが想定と違った時の一言を単発で",
    roles: { you: "あなた（聞き手）", partner: "相手（観光客）" },
    intro: "相手の答えが想定と違った時の切り返し。相手役は無く、あなたの一言を4つ続けて言う練習です。",
    lines: [
      { who: "you", en: "What's the most surprising price you've seen here?", ja: "（高いと同意された時）ここで見た中で一番驚いた値段は何でしたか？", kana: "ワッツ ザ モウスト サプライジング プライス ユーヴ シーン ヒア？" },
      { who: "you", en: "Honestly, a lot of locals say it's mostly for tourists now.", ja: "（日本人も来るのか聞かれた時）正直、今はほとんど観光客向けだと言う地元の人が多いです。", kana: "オネストリー、ア ロット オブ ロウカルズ セイ イッツ モウストリー フォー トゥーリスツ ナウ。" },
      { who: "you", en: "No problem at all. Have a great day!", ja: "（撮影を断られた時）まったく問題ありません。良い一日を！", kana: "ノウ プロブレム アット オール。ハヴ ア グレイト デイ！" },
      { who: "you", en: "Sorry, could you say that one more time?", ja: "（聞き取れなかった時）すみません、もう一度言っていただけますか？", kana: "ソーリー、クッジュー セイ ザット ワン モア タイム？" }
    ]
  }
];
