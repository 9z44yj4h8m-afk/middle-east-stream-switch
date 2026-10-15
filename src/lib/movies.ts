// Featured full-length movies. Only official uploads by the rights holders on YouTube,
// each checked for full length and for allowing playback on other sites.
export type Movie = {
  id: string;
  youtubeId: string;
  title: string;
  duration: string;
  description: string;
  source: string;
  lang: "عربي" | "عالمي";
};

export const movies: Movie[] = [
  { id: "sabaa-el-bermbah", youtubeId: "gGaozLyl-y4", title: "سبع البرمبة", duration: "1:38:57", description: "كوميديا بطولة رامز جلال ومحمد ثروت وبيومي فؤاد.", source: "Rotana Studios", lang: "عربي" },
  { id: "oaa-weshak", youtubeId: "1obs9eMxNAI", title: "اوعى وشك", duration: "1:45:57", description: "كوميديا بطولة أحمد رزق وأحمد عيد.", source: "Rotana Studios", lang: "عربي" },
  { id: "bank-el-haz", youtubeId: "omnLea1B3jc", title: "بنك الحظ", duration: "1:50:12", description: "كوميديا بطولة محمد ممدوح وأكرم حسني ومحمد ثروت.", source: "Rotana Studios", lang: "عربي" },
  { id: "omar-salma-2", youtubeId: "gr8ExWtFglY", title: "عمر وسلمى 2", duration: "1:40:39", description: "رومانسي كوميدي بطولة تامر حسني.", source: "روتانا سينما", lang: "عربي" },
  { id: "kheir-w-baraka", youtubeId: "1LZvuOn9zEQ", title: "خير وبركة", duration: "1:41:24", description: "كوميديا بطولة علي ربيع ومحمد عبد الرحمن.", source: "روتانا سينما", lang: "عربي" },
  { id: "kalem-mama", youtubeId: "CUFlewlkV54", title: "كلم ماما", duration: "1:26:52", description: "كوميديا عائلية بطولة عبلة كامل وحسن حسني ومنة شلبي.", source: "السبكي للإنتاج الفني", lang: "عربي" },
  { id: "1408", youtubeId: "ELOQ0O2kKGU", title: "1408 (2007)", duration: "1:44:24", description: "رعب وتشويق بطولة جون كيوزاك وصامويل ل. جاكسون.", source: "Lionsgate Movies", lang: "عالمي" },
  { id: "southpaw", youtubeId: "y_6zrQZRJr8", title: "Southpaw (2015)", duration: "2:03:57", description: "دراما رياضية عن ملاكم يبدأ من جديد، بطولة جيك جيلنهال.", source: "Lionsgate Movies", lang: "عالمي" },
  { id: "paper-man", youtubeId: "BDdyKWZrdng", title: "Paper Man", duration: "1:50:46", description: "كوميديا درامية بطولة رايان رينولدز وجيف دانيالز.", source: "Shout! Studios", lang: "عالمي" },
  // Sent by the site owner.
  { id: "big-legend", youtubeId: "oBNFGtxOrKc", title: "أسطورة كبيرة", duration: "فيلم كامل", description: "فيلم أكشن مع ترجمة عربية.", source: "Bigtime - أفلام مجانية", lang: "عالمي" },
  { id: "hazel", youtubeId: "hZntpjaJ92c", title: "هيزل وقلبها المحب", duration: "فيلم كامل", description: "فيلم إثارة ودراما من قصة حقيقية، مترجم كامل.", source: "Tuhaf Film", lang: "عالمي" },
  { id: "boyka-action", youtubeId: "_TbLOphqpA4", title: "فيلم أكشن جديد (بويكا)", duration: "فيلم كامل", description: "فيلم أكشن جديد مترجم بجودة عالية.", source: "هشام الجعفري", lang: "عالمي" },
  { id: "revenge", youtubeId: "yg_s2NwYyQ8", title: "الانتقام", duration: "فيلم كامل", description: "فيلم أكشن مترجم.", source: "Adilo tube", lang: "عالمي" },
  {"id": "u-Rl7eSVyTako", "youtubeId": "Rl7eSVyTako", "title": "The Mother's Monster", "duration": "فيلم كامل", "description": "فيلم كامل مترجم عربي.", "source": "STORY", "lang": "عالمي"},
  {"id": "u-cmaGPde_3Dc", "youtubeId": "cmaGPde_3Dc", "title": "سر في دمي", "duration": "فيلم كامل", "description": "نسخة جديدة كاملة.", "source": "بيت الأفلام الرومانسية", "lang": "عالمي"},
  {"id": "u-RqxLUnGNDtY", "youtubeId": "RqxLUnGNDtY", "title": "لا تدعني أذهب", "duration": "فيلم كامل", "description": "فيلم دراما جميل كامل.", "source": "Alwan Cinema | ألوان السينما", "lang": "عالمي"},
  {"id": "u-8qJ91leSEzs", "youtubeId": "8qJ91leSEzs", "title": "BUTCHER", "duration": "فيلم كامل", "description": "فيلم أكشن كامل بجودة عالية.", "source": "ZED Drama", "lang": "عالمي"},
  {"id": "u-VivXCI0aciw", "youtubeId": "VivXCI0aciw", "title": "إثارة وجريمة وأكشن", "duration": "فيلم كامل", "description": "فيلم إثارة وجريمة أجنبي، نسخة كاملة.", "source": "moviesland", "lang": "عالمي"},
  {"id": "u-WoXq5yLYIUc", "youtubeId": "WoXq5yLYIUc", "title": "وريث العائلة", "duration": "فيلم كامل", "description": "متنمر السجن يرهب نزيلًا لا يعلم أنه وريث العائلة. أكشن.", "source": "مسرح الأكشن", "lang": "عالمي"},
  {"id": "u-Cq5qZwFOEKI", "youtubeId": "Cq5qZwFOEKI", "title": "خريف العمر", "duration": "فيلم كامل", "description": "فيلم درامي بدقة Full HD مترجم.", "source": "SKY Films", "lang": "عالمي"},
  {"id": "u-OkXXz_cnXMU", "youtubeId": "OkXXz_cnXMU", "title": "آفا", "duration": "فيلم كامل", "description": "فيلم أكشن وتشويق كامل.", "source": "Front Row Filmed Entertainment", "lang": "عالمي"},
  {"id": "u-7qEv5jEsVrQ", "youtubeId": "7qEv5jEsVrQ", "title": "الأكشن الحربي", "duration": "فيلم كامل", "description": "فيلم أكشن حربي مترجم.", "source": "Cinema Fight", "lang": "عالمي"},
  {"id": "u-2FQDFGG4jLs", "youtubeId": "2FQDFGG4jLs", "title": "مغامرة للبقاء", "duration": "فيلم كامل", "description": "أكشن مترجم: مغامرة خطيرة للبقاء على قيد الحياة.", "source": "ملك الأفلام – Movie King", "lang": "عالمي"},
  {"id": "u-eRNQsR5L7D0", "youtubeId": "eRNQsR5L7D0", "title": "مغامرات جديدة", "duration": "فيلم كامل", "description": "فيلم مغامرات كامل مترجم HD.", "source": "Phoenicia Entertainment | أفلام فينيسيا للترفيه", "lang": "عالمي"},
  {"id": "u-UH-xxHm-I9o", "youtubeId": "UH-xxHm-I9o", "title": "Nobody Was Alive When We Landed", "duration": "فيلم كامل", "description": "خيال علمي وفضاء كامل 4K.", "source": "Epic AI Films", "lang": "عالمي"},
  {"id": "u-nKezOmbWyAU", "youtubeId": "nKezOmbWyAU", "title": "Yesterday's Girl", "duration": "فيلم كامل", "description": "إثارة وخيال علمي كامل.", "source": "Studio Dome", "lang": "عالمي"},
  {"id": "u-gli--gNr73A", "youtubeId": "gli--gNr73A", "title": "رعب حقيقي", "duration": "فيلم كامل", "description": "فيلم رعب كامل مترجم، ليس لأصحاب القلوب الضعيفة.", "source": "karalp_كارالب", "lang": "عالمي"},
  {"id": "u--v129AWc21A", "youtubeId": "-v129AWc21A", "title": "8 LEGS", "duration": "فيلم كامل", "description": "فيلم رعب كامل.", "source": "Sastra Film", "lang": "عالمي"},
  {"id": "u-kpfPFL1gkGk", "youtubeId": "kpfPFL1gkGk", "title": "لعنة الـ 66 عامًا", "duration": "فيلم كامل", "description": "لعنة تستيقظ كل 66 عامًا. رعب مترجم.", "source": "فيلم فورمونا", "lang": "عالمي"},
  {"id": "u-fIhM9MiEN50", "youtubeId": "fIhM9MiEN50", "title": "Daddy Daughter Trip", "duration": "فيلم كامل", "description": "كوميدي عائلي كامل.", "source": "Movie Central", "lang": "عالمي"},
  {"id": "u-E1DGrezdv7c", "youtubeId": "E1DGrezdv7c", "title": "Diamond Dog Caper", "duration": "فيلم كامل", "description": "مغامرة وكوميديا كامل.", "source": "Filmorae", "lang": "عالمي"},
  {"id": "u-cTxCh8TVCHE", "youtubeId": "cTxCh8TVCHE", "title": "خطة عائلية", "duration": "فيلم كامل", "description": "كوميديا وتشويق مترجم كامل.", "source": "Entertainment For Best Movies Channel", "lang": "عالمي"},
  {"id": "u-u-2vwVStSmw", "youtubeId": "u-2vwVStSmw", "title": "حب في الممنوع", "duration": "فيلم كامل", "description": "رومانسي وإثارة.", "source": "Art Makers Production", "lang": "عالمي"},
  {"id": "u-CJ994GUAoow", "youtubeId": "CJ994GUAoow", "title": "هروب اضطراري", "duration": "فيلم كامل", "description": "أكشن ومغامرة بطولة أحمد السقا وأمير كرارة.", "source": "Oscar Comedy", "lang": "عربي"},
  {"id": "u-Tdnbax8-xbA", "youtubeId": "Tdnbax8-xbA", "title": "يا أنا يا خالتي", "duration": "فيلم كامل", "description": "كوميدي بطولة محمد هنيدي ودنيا سمير غانم.", "source": "Rotana Comedy", "lang": "عربي"},
  {"id": "u-N1fJULIHmug", "youtubeId": "N1fJULIHmug", "title": "تيمور وشفيقة", "duration": "فيلم كامل", "description": "رومانسية ودراما بطولة أحمد السقا ومنى زكي.", "source": "سكت شات Sketshat", "lang": "عربي"},
  {"id": "u-Aqtsayw6izA", "youtubeId": "Aqtsayw6izA", "title": "دليفري الحارة", "duration": "فيلم كامل", "description": "كوميدي بطولة علي ربيع ومحمد عبد الرحمن.", "source": "Screen 2000 plus", "lang": "عربي"},
  {"id": "u-w-UUTyGw5tg", "youtubeId": "w-UUTyGw5tg", "title": "جوازة مشاغبة", "duration": "فيلم كامل", "description": "كوميدي بطولة تامر حسني وهنا الزاهد.", "source": "Night TV", "lang": "عربي"},
  {"id": "u-WAN-ER2M0es", "youtubeId": "WAN-ER2M0es", "title": "جوازة تحت المراقبة", "duration": "فيلم كامل", "description": "كوميديا بطولة حسن الرداد وإيمي سمير غانم.", "source": "حسن الرداد - Hassan El Raddad", "lang": "عربي"},
  {"id": "u-vEjbLoMz1fE", "youtubeId": "vEjbLoMz1fE", "title": "أنا مش فاهم حاجة", "duration": "فيلم كامل", "description": "كوميديا بطولة علي ربيع.", "source": "Ali Rabee - علي ربيع", "lang": "عربي"},
  {"id": "u-31hoobKhT4Q", "youtubeId": "31hoobKhT4Q", "title": "صاحب صاحبه", "duration": "فيلم كامل", "description": "كوميديا بطولة محمد هنيدي وأشرف عبد الباقي.", "source": "Golden Screen EG", "lang": "عربي"},
  {"id": "u-LpyB4FR01ZY", "youtubeId": "LpyB4FR01ZY", "title": "وش إجرام", "duration": "فيلم كامل", "description": "كوميديا وإثارة بطولة محمد هنيدي.", "source": "Cinema X", "lang": "عربي"},
  {"id": "u-N44v79zQSTs", "youtubeId": "N44v79zQSTs", "title": "واحدة تانية", "duration": "فيلم كامل", "description": "كوميدي بطولة هنا الزاهد.", "source": "Kmedia Plus", "lang": "عربي"},
  {"id": "u-x6B4PTvh_Io", "youtubeId": "x6B4PTvh_Io", "title": "عبود على الحدود", "duration": "فيلم كامل", "description": "بطولة علاء ولي الدين وأحمد حلمي وكريم عبد العزيز.", "source": "El Nasr Film Co. - شركة أفلام النصر", "lang": "عربي"},
  {"id": "u-oCKr6w_Nok8", "youtubeId": "oCKr6w_Nok8", "title": "النصابين الثلاثة", "duration": "فيلم كامل", "description": "كوميديا بطولة أحمد حلمي.", "source": "Ahmed Helmy", "lang": "عربي"},
  {"id": "u-sLXkhu2q73o", "youtubeId": "sLXkhu2q73o", "title": "جعلتني مجرمًا", "duration": "فيلم كامل", "description": "بطولة أحمد حلمي وغادة عادل.", "source": "Reel Movies", "lang": "عربي"},
  {"id": "u-KrRjh5F2K70", "youtubeId": "KrRjh5F2K70", "title": "شهر عسل بالعافية", "duration": "فيلم كامل", "description": "كوميديا وإثارة بطولة كريم محمود عبد العزيز وميرنا جميل.", "source": "Masha Entertainment plus", "lang": "عربي"},
  {"id": "u-lFeTyAL2R8E", "youtubeId": "lFeTyAL2R8E", "title": "الراجل ده هيجنني", "duration": "فيلم كامل", "description": "كوميديا بطولة مي عز الدين وماجد الكدواني.", "source": "F.M Production", "lang": "عربي"},
  {"id": "u-Tvhepb52flI", "youtubeId": "Tvhepb52flI", "title": "الضائعات", "duration": "فيلم كامل", "description": "إثارة بطولة مي عز الدين ومي عمر.", "source": "The Scene - المشهد", "lang": "عربي"},
  {"id": "u-cJhPX4xDHXM", "youtubeId": "cJhPX4xDHXM", "title": "البطاريق", "duration": "فيلم كامل", "description": "فيلم كوميدي.", "source": "Elkomy Films", "lang": "عربي"},
];
