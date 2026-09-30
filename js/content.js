// Built-in reference content: works offline and needs no Sheet.

// [category, English, Japanese, romaji]
export const PHRASES = [
  ['Basics', 'Hello', 'こんにちは', 'konnichiwa'],
  ['Basics', 'Good morning', 'おはようございます', 'ohayō gozaimasu'],
  ['Basics', 'Good evening', 'こんばんは', 'konbanwa'],
  ['Basics', 'Thank you very much', 'ありがとうございます', 'arigatō gozaimasu'],
  ['Basics', 'Excuse me / sorry (to get attention)', 'すみません', 'sumimasen'],
  ['Basics', "Sorry (I'm apologising)", 'ごめんなさい', 'gomen nasai'],
  ['Basics', 'Yes', 'はい', 'hai'],
  ['Basics', 'No', 'いいえ', 'iie'],
  ["Basics", "No thank you / I'm fine", '大丈夫です', 'daijōbu desu'],
  ['Basics', 'Please (when asking for something)', 'お願いします', 'onegai shimasu'],
  ['Basics', 'Do you speak English?', '英語を話せますか？', 'eigo o hanasemasu ka?'],
  ["Basics", "I don't understand", 'わかりません', 'wakarimasen'],
  ["Basics", "I don't speak Japanese", '日本語が話せません', 'nihongo ga hanasemasen'],
  ['Basics', 'Could you say that again?', 'もう一度お願いします', 'mō ichido onegai shimasu'],
  ['Basics', 'Could you write it down?', '書いてもらえますか？', 'kaite moraemasu ka?'],
  ['Basics', 'Can I take a photo?', '写真を撮ってもいいですか？', 'shashin o tottemo ii desu ka?'],
  ['Basics', 'Could you take a photo of us?', '写真を撮っていただけますか？', 'shashin o totte itadakemasu ka?'],
  ['Basics', 'Goodbye', 'さようなら', 'sayōnara'],

  ['Food', 'Table for two, please', '二人です', 'futari desu'],
  ['Food', 'Do you have an English menu?', '英語のメニューはありますか？', 'eigo no menyū wa arimasu ka?'],
  ['Food', 'The menu, please', 'メニューをお願いします', 'menyū o onegai shimasu'],
  ['Food', 'What do you recommend?', 'おすすめは何ですか？', 'osusume wa nan desu ka?'],
  ['Food', 'This one, please', 'これをください', 'kore o kudasai'],
  ['Food', 'Two of these, please', 'これを二つください', 'kore o futatsu kudasai'],
  ['Food', 'Water, please', 'お水をください', 'omizu o kudasai'],
  ['Food', 'Two beers, please', 'ビールを二つください', 'bīru o futatsu kudasai'],
  ['Food', 'Cheers!', '乾杯！', 'kanpai!'],
  ['Food', 'Before eating (“I humbly receive”)', 'いただきます', 'itadakimasu'],
  ['Food', 'Thank you for the meal (when leaving)', 'ごちそうさまでした', 'gochisōsama deshita'],
  ['Food', "It's delicious!", 'おいしいです！', 'oishii desu!'],
  ['Food', 'Not spicy, please', '辛くしないでください', 'karaku shinaide kudasai'],
  ['Food', 'How long is the wait?', 'どのくらい待ちますか？', 'dono kurai machimasu ka?'],
  ['Food', 'To take away, please', '持ち帰りでお願いします', 'mochikaeri de onegai shimasu'],
  ['Food', 'To eat here, please', '店内でお願いします', 'tennai de onegai shimasu'],
  ['Food', 'The bill, please', 'お会計をお願いします', 'okaikei o onegai shimasu'],
  ['Food', 'Can I pay by card?', 'カードで払えますか？', 'kādo de haraemasu ka?'],

  ['Getting around', 'Where is the station?', '駅はどこですか？', 'eki wa doko desu ka?'],
  ['Getting around', 'Where is the toilet?', 'トイレはどこですか？', 'toire wa doko desu ka?'],
  ['Getting around', 'Does this train go here? (point at the name)', 'この電車はここに行きますか？', 'kono densha wa koko ni ikimasu ka?'],
  ['Getting around', 'Which platform?', '何番線ですか？', 'nanbansen desu ka?'],
  ['Getting around', 'How long does it take?', 'どのくらいかかりますか？', 'dono kurai kakarimasu ka?'],
  ['Getting around', 'Can we walk there?', '歩いて行けますか？', 'aruite ikemasu ka?'],
  ['Getting around', 'Taxi: to this address, please', 'この住所までお願いします', 'kono jūsho made onegai shimasu'],
  ['Getting around', 'Taxi: to the station, please', '駅までお願いします', 'eki made onegai shimasu'],
  ['Getting around', 'Please stop here', 'ここで止めてください', 'koko de tomete kudasai'],
  ['Getting around', 'Where can I put large luggage?', '大きい荷物はどこに置けますか？', 'ōkii nimotsu wa doko ni okemasu ka?'],
  ['Getting around', 'Where are the coin lockers?', 'コインロッカーはどこですか？', 'koin rokkā wa doko desu ka?'],
  ["Getting around", "I've lost my ticket", '切符をなくしました', 'kippu o nakushimashita'],
  ["Getting around", "We're lost", '道に迷いました', 'michi ni mayoimashita'],

  ['Shopping', 'How much is this?', 'これはいくらですか？', 'kore wa ikura desu ka?'],
  ["Shopping", "I'm just looking", '見ているだけです', 'mite iru dake desu'],
  ['Shopping', 'Can I try this on?', '試着してもいいですか？', 'shichaku shitemo ii desu ka?'],
  ['Shopping', 'Do you have a bigger size?', '大きいサイズはありますか？', 'ōkii saizu wa arimasu ka?'],
  ['Shopping', 'Tax-free, please', '免税でお願いします', 'menzei de onegai shimasu'],
  ["Shopping", "No bag, thanks", '袋はいりません', 'fukuro wa irimasen'],
  ['Shopping', 'A bag, please', '袋をください', 'fukuro o kudasai'],

  ['Hotel', 'Check in, please — we have a reservation', 'チェックインをお願いします。予約しています。', 'chekku-in o onegai shimasu. yoyaku shite imasu.'],
  ['Hotel', 'Can you keep our bags?', '荷物を預かってもらえますか？', 'nimotsu o azukatte moraemasu ka?'],
  ['Hotel', "What's the Wi-Fi password?", 'Wi-Fiのパスワードは何ですか？', 'wai-fai no pasuwādo wa nan desu ka?'],
  ['Hotel', 'What time is breakfast?', '朝食は何時ですか？', 'chōshoku wa nanji desu ka?'],
  ['Hotel', 'What time is check-out?', 'チェックアウトは何時ですか？', 'chekku-auto wa nanji desu ka?'],
  ['Hotel', 'Could you call a taxi?', 'タクシーを呼んでもらえますか？', 'takushī o yonde moraemasu ka?'],
  ["Hotel", "We'd like to send our luggage ahead", '荷物を宅急便で送りたいです', 'nimotsu o takkyūbin de okuritai desu'],

  ['Help', 'Help!', '助けて！', 'tasukete!'],
  ['Help', 'Please call an ambulance', '救急車を呼んでください', 'kyūkyūsha o yonde kudasai'],
  ['Help', 'Please call the police', '警察を呼んでください', 'keisatsu o yonde kudasai'],
  ['Help', 'I feel unwell', '気分が悪いです', 'kibun ga warui desu'],
  ['Help', 'It hurts here', 'ここが痛いです', 'koko ga itai desu'],
  ['Help', 'Where is a hospital?', '病院はどこですか？', 'byōin wa doko desu ka?'],
  ['Help', 'Where is a pharmacy?', '薬局はどこですか？', 'yakkyoku wa doko desu ka?'],
  ['Help', 'Where is the police box?', '交番はどこですか？', 'kōban wa doko desu ka?'],
  ["Help", "I've lost my wallet", '財布をなくしました', 'saifu o nakushimashita'],
  ["Help", "I've lost my passport", 'パスポートをなくしました', 'pasupōto o nakushimashita'],
];

// General numbers. Personal ones (insurance, medical) come from the encrypted secrets.
export const SOS_NUMBERS = [
  { label: 'Ambulance / fire', tel: '119', note: 'Say 救急です (kyūkyū desu) for ambulance' },
  { label: 'Police', tel: '110', note: 'Non-urgent: find a 交番 kōban police box' },
  { label: 'Japan Visitor Hotline', tel: '050-3816-2787', note: '24h, English. Tourist help, disasters, medical referrals' },
  { label: 'AMDA medical info', tel: '03-6233-9266', note: 'Finds English-speaking doctors and hospitals' },
  { label: 'British Embassy Tokyo', tel: '+81-3-5211-1100', note: 'Lost passport, serious trouble. 24h' },
  { label: 'British Consulate Osaka', tel: '+81-6-6120-5600', note: 'Closer for Kansai / Hiroshima' },
];

export const FOOD = [
  ['Hiroshima-style okonomiyaki', 'Okonomi-mura, Hiroshima'],
  ['Grilled oysters', 'Miyajima'],
  ['Momiji manjū', 'Miyajima'],
  ['Takoyaki', 'Dotonbori, Osaka'],
  ['Kushikatsu (no double-dipping!)', 'Osaka'],
  ['Kaisendon at Omicho Market', 'Kanazawa'],
  ['Gold-leaf soft serve', 'Higashi Chaya, Kanazawa'],
  ['Kaiseki dinner', 'Ryokan, Yamanaka Onsen'],
  ['Yudōfu (tofu hot pot)', 'Arashiyama, Kyoto'],
  ['Nishiki Market snacks', 'Kyoto'],
  ['Matcha parfait', 'Kyoto'],
  ['Mitarashi dango', 'Kyoto'],
  ['Ramen', 'Tokyo'],
  ['Tsukemen', 'Tokyo'],
  ['Yakitori under the tracks', 'Yurakucho, Tokyo'],
  ['Tsukiji outer market breakfast', 'Tokyo, last morning'],
  ['Wagyu', 'Anywhere'],
  ['Tempura', 'Anywhere'],
  ['Tonkatsu', 'Anywhere'],
  ['Unagi', 'Anywhere'],
  ['Gyoza', 'Anywhere'],
  ['Karaage', 'Konbini or izakaya'],
  ['Tamago sando', 'Konbini'],
  ['Onigiri', 'Konbini'],
  ['Melon pan', 'Bakery or konbini'],
  ['Taiyaki', 'Street stall'],
  ['Ekiben on the shinkansen', 'Station'],
  ['Whisky highball', 'Izakaya'],
  ['Sake tasting', 'Kanazawa or Kyoto'],
];

// [emoji, title, bullet points]
export const HOWTO = [
  ['🚃', 'IC cards (Suica / ICOCA)', [
    'Add a Suica to Apple Wallet and tap the phone at the gates. It works with the screen locked (Express Mode).',
    'Top up in Wallet. If your card is refused, top up with cash at a station ticket machine or a konbini till.',
    'Works on local trains, subways and buses in every city on the trip, plus konbini and vending machines.',
    'Shinkansen and limited expresses need their own tickets (the ones you booked). IC is for local lines.',
  ]],
  ['🧳', 'Big luggage & forwarding', [
    'Tokaido/Sanyo shinkansen (Nozomi, Mizuho): bags over 160 cm (length+width+height) need a seat with an oversized baggage area, booked in advance.',
    'Takkyūbin sends bags hotel-to-hotel, usually next day. Ask at the front desk or a konbini. Check the arrival day before relying on it.',
    'Coin lockers take IC cards or ¥100 coins. Big stations fill up by late morning.',
  ]],
  ['♨️', 'Onsen', [
    'Wash and rinse properly at the seated showers before getting in.',
    'The small towel stays out of the water. On your head is fine.',
    'No swimwear. Tie long hair up.',
    'Public baths may refuse tattoos. Private baths (like the Kikuka bath at Yamanaka) are fine.',
    '男 = men, 女 = women. Curtain colours are not reliable.',
  ]],
  ['👘', 'Ryokan', [
    'Shoes off at the entrance. Slippers indoors, bare feet or socks on tatami.',
    'Separate toilet slippers live in the toilet. Leave them there.',
    'Yukata: left side over right (right over left is for funerals).',
    'Dinner and breakfast times are fixed. Be on time.',
  ]],
  ['💴', 'Cash & paying', [
    'Cards work in most city shops, but temples, shrines, markets and small restaurants are often cash only.',
    '7-Eleven (Seven Bank) and Japan Post ATMs take foreign cards.',
    'Put money in the little tray at the till, not in someone\'s hand.',
    "No tipping. It can cause real confusion.",
    'Keep ¥100 coins for lockers and ¥5 coins for shrine offerings (5 = go-en, “good luck”).',
  ]],
  ['🧾', 'Tax-free shopping', [
    'Spend ¥5,000 or more before tax in one shop on one day.',
    'Show your passport at the till. Look for 免税 / Tax Free signs.',
    'Consumables (cosmetics, snacks) get sealed in a bag. Don\'t open it until you\'ve left Japan.',
  ]],
  ['🚉', 'On trains', [
    'Queue at the marked lines on the platform. Let people off first.',
    'Phones on silent. No calls on board.',
    'Eating is fine on the shinkansen and not on local trains.',
    'Pink signs at rush hour mean women-only cars.',
  ]],
  ['⛩️', 'Shrines & temples', [
    'Bow at the torii. Walk to the side of the path (the middle is for the gods).',
    'Temizuya: rinse the left hand, then the right, then your mouth from your cupped hand. Never from the ladle.',
    'At a shrine: coin in, bow twice, clap twice, pray, bow once. At a temple: no clapping.',
    'Goshuin (temple stamps) need a goshuin-chō book. They\'re like eki stamps, but calligraphy.',
  ]],
  ['🗑️', 'Everyday manners', [
    'Hardly any public bins. Carry a bag and bin rubbish at a konbini.',
    'Don\'t eat while walking. Stand by the stall or vending machine.',
    'Chopsticks: never upright in rice, never pass food chopstick-to-chopstick.',
    'Escalators: stand left in Tokyo and Kanazawa, stand right in Osaka. Kyoto is mixed.',
  ]],
  ['🏪', 'Konbini questions', [
    '温めますか？ atatamemasu ka? “Shall I heat it?” — はい / 大丈夫です.',
    '袋いりますか？ fukuro irimasu ka? “Need a bag?”',
    'お箸は？ ohashi wa? “Chopsticks?”',
    'ポイントカードは？ pointo kādo wa? “Point card?” — 大丈夫です.',
  ]],
  ['🌀', 'Typhoons & earthquakes', [
    'October is still typhoon season. The Trip tab shows each day\'s forecast, and Now warns you the evening before.',
    'JR suspends shinkansen in bad weather. Refunds and changes are free when that happens.',
    'Install the Japan Tourism Agency\'s “Safety tips” app for English push alerts.',
    'Earthquake: drop, cover, hold on, away from windows. The hotel evacuation map is on the room door.',
  ]],
  ['🈯', 'Signs worth knowing', [
    '入口 entrance · 出口 exit · 非常口 emergency exit',
    '男 men · 女 women · お手洗い toilets',
    '押 push · 引 pull',
    '営業中 open · 準備中 closed (preparing)',
    '現金のみ cash only · 禁煙 no smoking',
    '駅 station · 改札 ticket gates · 乗り換え transfer',
  ]],
];

// Base cities: where weather comes from, and the Japanese names for the taxi card.
// `label` is which side of the map dot the name goes (r/l/t/b).
export const CITIES = {
  'Tokyo': { ja: '東京', lat: 35.681, lon: 139.767, label: 'b' },
  'Kanazawa': { ja: '金沢', lat: 36.561, lon: 136.656, label: 't' },
  'Yamanaka Onsen': { ja: '山中温泉', lat: 36.245, lon: 136.373, label: 'l' },
  'Hiroshima': { ja: '広島', lat: 34.397, lon: 132.475, label: 't' },
  'Osaka': { ja: '大阪', lat: 34.668, lon: 135.501, label: 'b' },
  'Kyoto': { ja: '京都', lat: 35.004, lon: 135.778, label: 'r' },
};

// Day-trip spots: shown as small dots on the map when a day's headline mentions them.
export const PLACES = {
  'Miyajima': { lat: 34.296, lon: 132.320, label: 'b' },
  'Himeji': { lat: 34.839, lon: 134.694, label: 't' },
  'Nara': { lat: 34.685, lon: 135.805, label: 'r' },
};

export const cityFor = text => Object.keys(CITIES).find(c => (text || '').includes(c)) || null;
