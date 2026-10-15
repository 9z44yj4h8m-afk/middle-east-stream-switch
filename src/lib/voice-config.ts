// Owner-editable voice-chat settings stored in site_settings("voice_chat"); defaults below are the fallback.
const femaleVoiceNames: Record<string, string> = {
  Despina: "دلال", Sulafat: "شوق", Achernar: "سديم", Callirrhoe: "نجد", Vindemiatrix: "ليلى", Leda: "موضي",
  Kore: "نورة", Aoede: "هيا", Zephyr: "ريم", Autonoe: "نوف", Erinome: "سارة", Laomedeia: "دانة", Gacrux: "الجوهرة", Pulcherrima: "أمل",
};
type VoiceOption = { id: string; female: boolean; label: string; name: string; providerId?: string; delivery?: string };
export const FEMALE_VOICE_PROFILES: VoiceOption[] = [
  { id: "female-hessa", female: true, name: "حصة", label: "طبقة منخفضة مخملية", providerId: "Gacrux", delivery: "طبقة نسائية منخفضة ورنانة ومخملية، دافئة وحنونة، بسرعة هادئة ولهجة أهل القصيم، دون همس" },
  { id: "female-lama", female: true, name: "لمى", label: "طبقة عالية وخفيفة", providerId: "Autonoe", delivery: "طبقة نسائية عالية وخفيفة ومشرقة، مرحة بابتسامة واضحة وطاقة لطيفة، سرعة متوسطة ولهجة أهل الرياض" },
  { id: "female-aseel", female: true, name: "أسيل", label: "نبرة هوائية هادئة", providerId: "Vindemiatrix", delivery: "نبرة نسائية هوائية رقيقة وحنونة، طبقة متوسطة وحديث بطيء ناعم مع وقفات قصيرة، بلهجة أهل الرياض، دون همس مبالغ" },
  { id: "female-reemah", female: true, name: "ريما", label: "رنانة وواثقة", providerId: "Pulcherrima", delivery: "نبرة نسائية صافية رنانة وواثقة، طبقة متوسطة منخفضة ونطق واضح، إيقاع متزن وحنون ولهجة أهل القصيم" },
  { id: "female-joud", female: true, name: "جود", label: "حيوية وسريعة", providerId: "Laomedeia", delivery: "نبرة بنت حيوية وعفوية، طبقة متوسطة عالية وإيقاع سريع طبيعي، ضحكة خفيفة وحنان ولهجة أهل القصيم" },
  { id: "female-rawan", female: true, name: "روان", label: "صافية بإلقاء متزن", providerId: "Erinome", delivery: "صوت نسائي صاف ودقيق، طبقة متوسطة وإلقاء متزن بجمل قصيرة ووقفات واضحة، نبرة حنونة ولهجة أهل الرياض" },
  // Approximate text-steered presets, not cloned identities; reference recordings are never shipped.
  { id: "female-hareer", female: true, name: "حرير", label: "سرد ناعم · تقريب ص1", providerId: "Sulafat", delivery: "أداء نسائي حنون دافئ للسرد، طبقة متوسطة قريبة من 210 هرتز دون إجبار، نطق عربي واضح وجمل متصلة بهدوء ووقفات رقيقة، دون خشونة أو مبالغة درامية؛ هذا أداء مستقل وليس تقليدا لهوية شخص" },
  { id: "female-layan", female: true, name: "ليان", label: "حديث لطيف · تقريب ص2", providerId: "Laomedeia", delivery: "أداء نسائي حنون محادثي لطيف وعفوي، طبقة متوسطة قريبة من 220 هرتز دون إجبار، سرعة متوسطة نشيطة وابتسامة مسموعة خفيفة، وصل الكلمات بسلاسة دون حدة أو همس؛ هذا أداء مستقل وليس تقليدا لهوية شخص" },
  { id: "female-raneem", female: true, name: "رنيم", label: "تشجيع هادئ · تقريب ص3", providerId: "Vindemiatrix", delivery: "أداء نسائي حنون مشجع وواثق بهدوء، طبقة متوسطة قريبة من 215 هرتز دون إجبار، وضوح ناعم وتشديد خفيف للكلمات المهمة مع وقفات قصيرة، دون صراخ أو نبرة إعلان؛ هذا أداء مستقل وليس تقليدا لهوية شخص" },
  { id: "female-jumana", female: true, name: "جمان", label: "إلقاء رقيق · تقريب audio_2", providerId: "Achernar", delivery: "أداء نسائي حنون رقيق وصاف، طبقة متوسطة عالية قريبة من 240 هرتز دون إجبار، إلقاء تعبيري متزن مع تنويع لطيف للنغمة ونهايات جمل هادئة، دون تصنع أو همس مبالغ؛ هذا أداء مستقل وليس تقليدا لهوية شخص" },
  // Young-girl, extra-soft and playful "spoiled" presets.
  { id: "girl-sama", female: true, name: "سما", label: "بنت صغيرة مرحة", providerId: "Leda", delivery: "صوت بنت صغيرة بريئة مرحة، طبقة عالية خفيفة وضحكة طفولية، كلام بسيط سريع بحماس لطيف ولهجة أهل الرياض" },
  { id: "girl-lulu", female: true, name: "لولو", label: "بنت صغيرة خجولة", providerId: "Achernar", delivery: "صوت بنت صغيرة خجولة وبريئة، طبقة عالية رقيقة وكلام هادئ متقطع بلطف وابتسامة، لهجة أهل القصيم" },
  { id: "girl-toota", female: true, name: "توته", label: "بنت صغيرة شقية", providerId: "Zephyr", delivery: "صوت بنت صغيرة شقية ومشرقة، طبقة عالية وحماس وضحك خفيف، تمدّ بعض الكلمات بعفوية طفولية ولهجة نجدية" },
  { id: "girl-dana", female: true, name: "دانه الصغيرة", label: "بنت صغيرة حنونة", providerId: "Aoede", delivery: "صوت بنت صغيرة حنونة وحالمة، طبقة عالية ناعمة وإيقاع بطيء لطيف كأنها تحكي قصة، لهجة أهل الرياض" },
  { id: "female-dalla", female: true, name: "دلوعة", label: "دلوعة مره · مايع", providerId: "Despina", delivery: "صوت بنت دلوعة جدا ومايع، تمطّ الكلمات وتطوّل آخر الحروف بدلع ومزح، نبرة مدللة ناعمة مع ضحكة خفيفة وغنج لطيف، طبقة متوسطة عالية ولهجة أهل الرياض" },
  { id: "female-ghanooj", female: true, name: "غنوج", label: "دلع ناعم", providerId: "Leda", delivery: "صوت بنت مدللة ناعمة، تتكلم بدلع ومد خفيف للكلمات وابتسامة مسموعة، إيقاع بطيء ونبرة مرحة ولهجة نجدية" },
  { id: "female-dalal2", female: true, name: "دلّول", label: "دلوعة مرحة", providerId: "Autonoe", delivery: "صوت بنت دلوعة مرحة كثيرة الضحك، تطوّل الكلمات بدلع وتغيّر نغمتها صعودا ونزولا، طبقة عالية ولهجة أهل القصيم" },
  { id: "female-nesma", female: true, name: "نسمة", label: "ناعمة جدا هامسة", providerId: "Vindemiatrix", delivery: "صوت بنت ناعم جدا وقريب من الهمس الرقيق، بطيء وحالم وحنون، طبقة متوسطة ولهجة أهل الرياض" },
  { id: "female-warda", female: true, name: "وردة", label: "ناعمة مخملية", providerId: "Sulafat", delivery: "صوت بنت مخملي ناعم دافئ، كلام هادئ ورقيق بحنان وابتسامة، طبقة متوسطة ولهجة نجدية" },
  { id: "female-shahd2", female: true, name: "شهد", label: "ناعمة عذبة", providerId: "Callirrhoe", delivery: "صوت بنت عذب صاف وناعم، إيقاع هادئ متزن ونهايات جمل رقيقة، لهجة أهل القصيم" },
  { id: "female-lojain", female: true, name: "لجين", label: "ناعمة مشرقة", providerId: "Kore", delivery: "صوت بنت ناعم مشرق ولطيف، طاقة خفيفة وابتسامة واضحة، سرعة متوسطة ولهجة أهل الرياض" },
  { id: "female-yara", female: true, name: "يارا", label: "شابة رقيقة", providerId: "Erinome", delivery: "صوت بنت شابة رقيقة وصافية، كلام لطيف حنون بإيقاع هادئ ولهجة نجدية" },
  { id: "female-raheel", female: true, name: "رهيل", label: "ناعمة دافئة · حديث مريح", providerId: "Despina", delivery: "صوت امرأة بالغة ناعم ودافئ، طبقة متوسطة منخفضة وحديث محادثي مريح، إيقاع متأن مع وصل الكلمات بسلاسة وابتسامة خفيفة، لهجة أهل الرياض، دون تمطيط أو همس" },
  { id: "female-areej", female: true, name: "أريج", label: "رقيقة صافية · وقفات لطيفة", providerId: "Achernar", delivery: "صوت امرأة بالغة رقيق وصاف، طبقة متوسطة عالية غير حادة، نطق واضح مع وقفات لطيفة بين الجمل ونهايات هادئة، لهجة أهل القصيم، دون أداء طفولي أو تصنع" },
  { id: "female-hatoon", female: true, name: "هتون", label: "مخملية هادئة · سرد حنون", providerId: "Gacrux", delivery: "صوت امرأة بالغة مخملي هادئ وحنون، طبقة منخفضة ناعمة وسرد متصل بإيقاع بطيء معتدل، تشديد خفيف للكلمات المهمة، لهجة نجدية، دون خشونة أو همس" },
  { id: "female-taleen", female: true, name: "تالين", label: "ناعمة مبتسمة · خفيفة ومشرقة", providerId: "Aoede", delivery: "صوت امرأة بالغة ناعم وخفيف ومشرق، طبقة متوسطة وابتسامة مسموعة طبيعية، إيقاع متوسط مع تنويع رقيق للنغمة، لهجة أهل الرياض، دون صراخ أو مبالغة أو أداء طفولي" },
  // 2026 additions: more young girls, spoiled and soft profiles.
  { id: "girl-nouf", female: true, name: "نوف", label: "بنت صغيرة مرحلة", providerId: "Kore", delivery: "صوت بنت صغيرة مرحلة مليانة حياة، طبقة عالية وضحكة عفوية، كلام سريع بحماس لطيف ولهجة أهل القصيم" },
  { id: "girl-reemas", female: true, name: "ريماس", label: "بنت صغيرة خفيفة", providerId: "Sulafat", delivery: "صوت بنت صغيرة خفيفة وحلوة، طبقة عالية ناعمة وكلام بسيط بابتسامة مسموعة ولهجة أهل الرياض" },
  { id: "female-joori", female: true, name: "جوري", label: "دلع حلو ومسمر", providerId: "Laomedeia", delivery: "صوت بنت دلوعة حلوة، تمطّ الكلمات بدلع لطيف وتطوّل آخر الحروف مع غنج خفيف، طبقة متوسطة عالية ولهجة نجدية" },
  { id: "female-haneena", female: true, name: "حنينة", label: "ناعمة حالمة", providerId: "Autonoe", delivery: "صوت بنت ناعم حالم وهادئ، طبقة متوسطة وإيقاع بطيء حالم كأنها تحكي قبل النوم، لهجة أهل الرياض" },
  { id: "female-sukkar", female: true, name: "سكر", label: "ناعمة حلوة", providerId: "Pulcherrima", delivery: "صوت بنت ناعم حلو ومسمر، نبرة دافئة حنونة مع ابتسامة واضحة وإيقاع متوسط مريح، لهجة أهل القصيم" },
  { id: "female-maha", female: true, name: "مها", label: "ناعمة واثقة", providerId: "Erinome", delivery: "صوت امرأة بالغة ناعم وواثق، طبقة متوسطة ونطق واضح بإيقاع متزن حنون، لهجة أهل الرياض، دون تصنع" },
  // Synthetic adult performances: regions and ages describe delivery, not real speaker identities.
  { id: "female-saudi-lateefa", female: true, name: "لطيفة", label: "سعودية · الرياض · شابة بالغة", providerId: "Despina", delivery: "أداء امرأة بالغة شابة ناعم وصاف وحنون، محادثة سعودية بلهجة أهل الرياض، طبقة متوسطة خفيفة وابتسامة طبيعية، نطق نقي وتنفس هادئ دون همس أو تصنع" },
  { id: "female-saudi-muneera", female: true, name: "منيرة", label: "سعودية · القصيم · ناضجة", providerId: "Sulafat", delivery: "أداء امرأة بالغة ناضجة دافئ وحنون، بلهجة أهل القصيم الطبيعية، طبقة متوسطة منخفضة ورنين ممتلئ، سرعة متأنية ووقفات قصيرة دون مبالغة في مخارج الحروف" },
  { id: "female-saudi-bayan", female: true, name: "بيان", label: "سعودية · جدة · شابة بالغة", providerId: "Aoede", delivery: "أداء امرأة بالغة شابة صاف وحنون بلهجة جدة الحجازية، طبقة متوسطة مشرقة وإيقاع محادثي سلس وابتسامة خفيفة، دون تحويل اللكنة إلى نجدية أو مبالغة مسرحية" },
  { id: "female-saudi-ibtisam", female: true, name: "ابتسام", label: "سعودية · مكة · ناضجة", providerId: "Callirrhoe", delivery: "أداء امرأة بالغة ناضجة هادئ وحنون بلهجة مكة الحجازية، صوت متوسط دافئ وواضح ووقفات مريحة ونهايات جمل طبيعية، دون همس أو إلقاء إعلاني" },
  { id: "female-saudi-lulwa", female: true, name: "لولوة", label: "سعودية · الشرقية · شابة بالغة", providerId: "Laomedeia", delivery: "أداء امرأة بالغة شابة رقيق وحنون بلهجة سعودية من المنطقة الشرقية، طبقة متوسطة عالية صافية وحديث عفوي متزن، وصل طبيعي للكلمات دون حدة أو تمطيط" },
  { id: "female-saudi-nawwarah", female: true, name: "نوّارة", label: "سعودية · أبها · ناضجة", providerId: "Kore", delivery: "أداء امرأة بالغة ناضجة صاف وواثق وحنون بلكنة سعودية جنوبية خفيفة من أبها، طبقة متوسطة مستقرة وسرعة معتدلة، حافظي على وضوح النص دون افتعال مفردات محلية أو كاريكاتير للهجة" },
  { id: "female-saudi-wadha", female: true, name: "وضحى", label: "سعودية · نجد · كبيرة بالغة", providerId: "Gacrux", delivery: "أداء امرأة بالغة كبيرة في السن بلهجة نجدية، طبقة منخفضة مخملية دافئة وحنونة وسرد هادئ مع وقفات طبيعية، دون ارتعاش مفتعل أو خشونة أو مبالغة في تمثيل العمر" },
  { id: "female-saudi-athir", female: true, name: "أثير", label: "سعودية · فصحى نقية · بالغة", providerId: "Erinome", delivery: "أداء امرأة بالغة بنطق عربي فصيح نقي وطابع سعودي لطيف، صوت صاف وناعم وحنون بطبقة متوسطة وإيقاع متزن، وضوح الحروف دون نبرة نشرات أو تبديل النص إلى العامية" },
  { id: "female-emirati-meera", female: true, name: "ميرة", label: "إماراتية · شابة بالغة", providerId: "Autonoe", delivery: "أداء امرأة بالغة شابة ناعم وحنون بلهجة إماراتية طبيعية، طبقة متوسطة مشرقة وإيقاع لطيف متزن، دون تحويل اللهجة إلى سعودية أو المبالغة في اللحن" },
  { id: "female-kuwaiti-dalal", female: true, name: "دلال الكويت", label: "كويتية · ناضجة", providerId: "Pulcherrima", delivery: "أداء امرأة بالغة ناضجة دافئ وواضح وحنون بلهجة كويتية طبيعية، طبقة متوسطة منخفضة ونبرة محادثية واثقة، دون صراخ أو تقليد شخصية معروفة" },
  { id: "female-egyptian-salma", female: true, name: "سلمى", label: "مصرية · شابة بالغة", providerId: "Leda", delivery: "أداء امرأة بالغة شابة صاف وحنون بلهجة مصرية قاهرية طبيعية، طبقة متوسطة خفيفة وحديث سلس بابتسامة، دون إدخال نطق خليجي أو افتعال ضحكات" },
  { id: "female-lebanese-ruba", female: true, name: "ربى", label: "لبنانية · ناضجة", providerId: "Vindemiatrix", delivery: "أداء امرأة بالغة ناضجة رقيق وحنون بلهجة لبنانية طبيعية، طبقة متوسطة ونغم محادثي خفيف ووقفات قصيرة، دون تمطيط مسرحي أو نطق خليجي" },
  { id: "female-jordanian-deema", female: true, name: "ديما", label: "أردنية · شابة بالغة", providerId: "Achernar", delivery: "أداء امرأة بالغة شابة رقيق وصاف وحنون بلهجة أردنية مدينية طبيعية، طبقة متوسطة عالية غير حادة ونطق واضح بإيقاع مريح، دون تصنع أو تغيير النص" },
  { id: "female-moroccan-kenza", female: true, name: "كنزة", label: "مغربية · ناضجة", providerId: "Zephyr", delivery: "أداء امرأة بالغة ناضجة مشرق وحنون، عربية واضحة بلكنة مغربية خفيفة مع الحفاظ على كلمات النص كما هي، طبقة متوسطة وإيقاع هادئ، دون ترجمة النص إلى الدارجة أو تقليد شخصية" },
];

// Panel categories: ordered groups shown as card sections in the voice studio.
export const FEMALE_VOICE_CATEGORIES = ["أصوات سعودية", "لهجات عربية", "أصوات أساسية", "أداء مميز", "بنات صغار", "أصوات دلع", "أصوات ناعمة"] as const;
const VOICE_CATEGORY: Record<string, string> = {
  "female-saudi-lateefa": "أصوات سعودية", "female-saudi-muneera": "أصوات سعودية", "female-saudi-bayan": "أصوات سعودية", "female-saudi-ibtisam": "أصوات سعودية",
  "female-saudi-lulwa": "أصوات سعودية", "female-saudi-nawwarah": "أصوات سعودية", "female-saudi-wadha": "أصوات سعودية", "female-saudi-athir": "أصوات سعودية",
  "female-emirati-meera": "لهجات عربية", "female-kuwaiti-dalal": "لهجات عربية", "female-egyptian-salma": "لهجات عربية", "female-lebanese-ruba": "لهجات عربية", "female-jordanian-deema": "لهجات عربية", "female-moroccan-kenza": "لهجات عربية",
  "female-hessa": "أصوات أساسية", "female-lama": "أصوات أساسية", "female-aseel": "أصوات أساسية",
  "female-reemah": "أصوات أساسية", "female-joud": "أصوات أساسية", "female-rawan": "أصوات أساسية",
  "female-hareer": "أداء مميز", "female-layan": "أداء مميز", "female-raneem": "أداء مميز", "female-jumana": "أداء مميز",
  "girl-sama": "بنات صغار", "girl-lulu": "بنات صغار", "girl-toota": "بنات صغار", "girl-dana": "بنات صغار",
  "girl-nouf": "بنات صغار", "girl-reemas": "بنات صغار",
  "female-dalla": "أصوات دلع", "female-ghanooj": "أصوات دلع", "female-dalal2": "أصوات دلع", "female-joori": "أصوات دلع",
  "female-nesma": "أصوات ناعمة", "female-warda": "أصوات ناعمة", "female-shahd2": "أصوات ناعمة", "female-lojain": "أصوات ناعمة",
  "female-yara": "أصوات ناعمة", "female-raheel": "أصوات ناعمة", "female-areej": "أصوات ناعمة", "female-hatoon": "أصوات ناعمة",
  "female-taleen": "أصوات ناعمة", "female-haneena": "أصوات ناعمة", "female-sukkar": "أصوات ناعمة", "female-maha": "أصوات ناعمة",
};
export function voiceCategory(id: string) {
  return VOICE_CATEGORY[id] ?? "أصوات أساسية";
}
export const VOICE_LIST: VoiceOption[] = [...[
  ["Puck", 0, "مرح"], ["Charon", 0, "رزين"], ["Fenrir", 0, "حماسي"], ["Orus", 0, "ثابت"], ["Enceladus", 0, "هادئ"], ["Iapetus", 0, "واضح"],
  ["Umbriel", 0, "مريح"], ["Algieba", 0, "ناعم"], ["Algenib", 0, "خشن"], ["Rasalgethi", 0, "مثقف"], ["Alnilam", 0, "قوي"], ["Schedar", 0, "متزن"],
  ["Achird", 0, "ودود"], ["Zubenelgenubi", 0, "عفوي"], ["Sadachbia", 0, "حيوي"], ["Sadaltager", 0, "عارف"],
  ["Kore", 1, "ثابتة"], ["Aoede", 1, "منعشة"], ["Leda", 1, "شابة"], ["Zephyr", 1, "مشرقة"], ["Despina", 1, "ناعمة"], ["Sulafat", 1, "دافئة"],
  ["Callirrhoe", 1, "هادئة"], ["Autonoe", 1, "مشرقة"], ["Erinome", 1, "واضحة"], ["Laomedeia", 1, "مرحة"], ["Achernar", 1, "رقيقة"],
  ["Gacrux", 1, "ناضجة"], ["Pulcherrima", 1, "واثقة"], ["Vindemiatrix", 1, "لطيفة"],
].map(([id, f, label]) => ({ id: id as string, female: f === 1, label: label as string, name: femaleVoiceNames[String(id)] ?? String(id) })), ...FEMALE_VOICE_PROFILES];

export function providerVoiceId(voice: string) {
  const option = VOICE_LIST.find((v) => v.id === voice);
  return option?.providerId ?? option?.id ?? "Leda";
}

export function voiceDelivery(voice: string) {
  const profile = FEMALE_VOICE_PROFILES.find((v) => v.id === voice);
  if (profile) return `قولي الكلام بصوت بنت ناعم وحنون، ${profile.delivery}، اقرئي الكلام التالي فقط`;
  return VOICE_LIST.some((v) => v.id === voice && v.female)
    ? "قولي الكلام بصوت بنت ناعم وعذب وحنون، بنبرة دافئة لطيفة ومريحة وابتسامة خفيفة، بهدوء طبيعي دون همس مبالغ أو تصنع، بلهجة سعودية نجدية كأهل الرياض والقصيم وبنطق واضح، اقرئي الكلام التالي فقط"
    : "قلها بصوت جميل دافئ وواضح، بلهجة سعودية نجدية أصيلة كأهل الرياض والقصيم، بنطق سعودي عفوي ودود";
}

export type VoiceChatConfig = {
  enabled: boolean;
  turnSeconds: number;
  maleVoices: string[];
  femaleVoices: string[];
  botVoices: Record<string, string>;
  openers: string[];
  recordings: { song: string; poem: string };
  clips: { id: string; name: string; path: string; enabled: boolean }[];
  /** One-off line the owner asks a bot to say immediately; served once per listener for 10 minutes. voice = explicit voice id or "" for auto. */
  say: { id: string; name: string; text: string; at: number; voice: string; sing?: boolean; melody?: string; rhythm?: string } | null;
};

export const defaultVoiceChat: VoiceChatConfig = {
  enabled: true,
  turnSeconds: 20,
  maleVoices: ["Puck", "Charon", "Fenrir", "Orus", "Algenib", "Enceladus"],
  femaleVoices: ["Kore", "Aoede", "Leda", "Zephyr", "Despina", "Sulafat"],
  botVoices: {},
  recordings: { song: "", poem: "" },
  clips: [],
  say: null,
  openers: [
    "هلا والله ومسهلا، نورتوا الغرفة الصوتية، حياكم الله كلكم، وش أخباركم اليوم؟ عساكم بخير وعافية",
    "يا هلا ويا مرحبا بالجميع، الله يمسيكم بالخير، وش رايكم نسولف شوي عن المسلسلات اللي تتابعونها هالأيام؟",
    "مساكم الله بالخير يا جماعة، حياكم في المغني لايف، تفضلوا وخذوا راحتكم والمايك يدور على الكل",
  ],
};

const known = new Set(VOICE_LIST.map((v) => v.id));
export function normalizeVoiceChat(v: unknown): VoiceChatConfig {
  const o = (v ?? {}) as Partial<VoiceChatConfig>;
  const list = (x: unknown, d: string[]) => { const a = Array.isArray(x) ? x.filter((i): i is string => typeof i === "string" && known.has(i)) : []; return a.length ? a : d; };
  const botVoices: Record<string, string> = {};
  for (const [k, val] of Object.entries(o.botVoices ?? {})) if (typeof val === "string" && known.has(val)) botVoices[k] = val;
  const openers = Array.isArray(o.openers) ? o.openers.filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.slice(0, 300)) : [];
  return {
    enabled: o.enabled !== false,
    turnSeconds: Math.min(40, Math.max(8, Number(o.turnSeconds) || 20)),
    maleVoices: list(o.maleVoices, defaultVoiceChat.maleVoices),
    femaleVoices: list(o.femaleVoices, defaultVoiceChat.femaleVoices),
    botVoices,
    clips: Array.isArray(o.clips) ? o.clips.filter((c) => c && typeof c.id === "string" && typeof c.name === "string" && typeof c.path === "string" && /^recordings\/[a-z0-9-]+\.(mp3|wav|m4a|ogg|webm)$/.test(c.path)).slice(0, 100).map((c) => ({ id: c.id.slice(0, 80), name: c.name.trim().slice(0, 40) || "تسجيل", path: c.path, enabled: c.enabled !== false })) : [],
    recordings: {
      song: typeof o.recordings?.song === "string" && /^recordings\/[a-z0-9-]+\.(mp3|wav|m4a|ogg|webm)$/.test(o.recordings.song) ? o.recordings.song : "",
      poem: typeof o.recordings?.poem === "string" && /^recordings\/[a-z0-9-]+\.(mp3|wav|m4a|ogg|webm)$/.test(o.recordings.poem) ? o.recordings.poem : "",
    },
    say: o.say && typeof o.say.id === "string" && typeof o.say.text === "string" && o.say.text.trim() ? { id: o.say.id.slice(0, 80), name: String(o.say.name ?? "").slice(0, 40), text: o.say.text.trim().slice(0, 400), at: Number(o.say.at) || 0, voice: typeof o.say.voice === "string" && known.has(o.say.voice) ? o.say.voice : "", sing: o.say.sing === true, melody: String(o.say.melody ?? "").slice(0, 20), rhythm: String(o.say.rhythm ?? "").slice(0, 20) } : null,
    openers: openers.length ? openers : defaultVoiceChat.openers,
  };
}

export const SING_DELIVERY = "غنيها بصوت ناعم عذب ورقيق جدا، بلحن هادئ حالم وطرب سعودي نجدي أصيل، مدّ الكلمات كأنك تغني";

export const MELODIES = [
  { id: "soft-gulf", label: "غناء نسائي خليجي ناعم" },
  { id: "najdi", label: "لحن نجدي طربي" }, { id: "samri", label: "لحن سامري" }, { id: "khaliji", label: "لحن خليجي رومانسي" },
  { id: "shaila", label: "شيلة حماسية" }, { id: "lullaby", label: "لحن هادي حنون (تهويدة)" },
] as const;
export const RHYTHMS = [
  { id: "slow", label: "إيقاع بطيء حالم" }, { id: "khabeeti", label: "رقصة خبيتي" }, { id: "dahha", label: "رقصة دحّة" },
  { id: "ardha", label: "رقصة عرضة" }, { id: "samri", label: "إيقاع سامري" }, { id: "happy", label: "إيقاع فرح سريع" },
] as const;
export const PRESET_SONGS = [
  { id: "layl", title: "يا ليل الرياض", melody: "khaliji", rhythm: "slow", text: "يا ليل الرياض طوّل سهرنا، والنجم يشهد على حب قلبي، يا ليل لا تروح خلنا، نسهر على صوت الحبيب" },
  { id: "qassim", title: "هلا بأهل القصيم", melody: "najdi", rhythm: "khabeeti", text: "هلا وغلا بأهل القصيم، يا زين طيبهم وكرمهم، هلا بالربع والنخل العظيم، والقلب يفرح بشوفهم" },
  { id: "salam", title: "سلامي للغالي", melody: "samri", rhythm: "dahha", text: "سلامي للغالي عدد المطر، وعدد ما هبّ نسيم السحر، يا اللي غيابك طال واشتقت لك، تعال نورّ ليالي القمر" },
  { id: "watan", title: "يا دارنا", melody: "shaila", rhythm: "ardha", text: "يا دارنا يا عز راسي وفخري، يا ديرة الأمجاد والطيب والجود، نفداك بالروح والعمر يجري، وانتي لنا عز ومجد ممدود" },
  { id: "k1", title: "يا راحلين (على طريقة خالد)", melody: "khalid", rhythm: "slow", text: "يا راحلين وقلبي معكم رحل، والدمع من عيني على الخد سال، يا ليت من فارقني يرجع ولو قبل، يشوف حالي بعده وش صار بالحال" },
  { id: "k2", title: "ليل الشوق (على طريقة خالد)", melody: "khalid", rhythm: "slow", text: "ليل الشوق طويل وأنا سهران، أعدّ النجوم وأذكر طيفك، يا اللي سكنت القلب والوجدان، كل ما غبت زاد الحنين ليفك" },
  { id: "k3", title: "عيونك نجد (على طريقة خالد)", melody: "khalid", rhythm: "dahha", text: "عيونك نجد وصوتك مطر، وضحكتك فجر بعد ليل طويل، يا ساكن الروح ما بك خطر، أنت الهوى وأنت الدرب والدليل" },
  { id: "k4", title: "صبرت (على طريقة خالد)", melody: "khalid", rhythm: "samri", text: "صبرت وقلت الزمان يدور، ويرجع لي اللي غاب عن عيني، والقلب رغم الجرح مسرور، يحلم بيوم يلقى الغالي جنبي" },
  { id: "nam", title: "نام يا حلو", melody: "lullaby", rhythm: "slow", text: "نام يا حلو نام، والقمر يحرسك، نام والليل سلام، والورد يحضنك" },
  { id: "matar", title: "يا مطر نجد", melody: "najdi", rhythm: "slow", text: "يا مطر نجد تعال وروّ الديار، واسقِ النخل والزرع والقلب المشتاق، يا مطر جيب الفرح للصغار، وخلّ الليل يحلى بلمّة الرفاق" },
  { id: "ghali", title: "يا غالي", melody: "khaliji", rhythm: "slow", text: "يا غالي يا نور عيني، يا أغلى من الدنيا وما فيها، تعال وطمّن ليالي، ترى الروح بدونك ما أحد يواسيها" },
  { id: "eid", title: "عيدنا فرحة", melody: "shaila", rhythm: "happy", text: "عيدنا فرحة وضحكة ونور، والأهل مجتمعين بالسرور، هلا بالعيد هلا بالزين، والقلب يرقص من الحبور" },
  { id: "sahra", title: "سهرة الربع", melody: "samri", rhythm: "samri", text: "يا هلا بالربع في ليلة سمر، والقهوة تدور والوجيه قمر، نغني ونفرح ونسولف سوا، ونسهر لين يطلع لنا الفجر" },
  { id: "bahr", title: "يا بحر الهوى", melody: "khaliji", rhythm: "khabeeti", text: "يا بحر الهوى خذني معك، ودّني لدار الحبيب، موجك يغني وأنا أسمعك، والشوق في قلبي عجيب" },
  { id: "umm", title: "يمه يا الغالية", melody: "lullaby", rhythm: "slow", text: "يمه يا الغالية يا نبع الحنان، دعواتك تحرسني في كل مكان، يمه يا ضي عيني وأماني، ما لي بالدنيا مثلك إنسان" },
] as const;
export function singDelivery(melody?: string, rhythm?: string) {
  const m = MELODIES.find((x) => x.id === melody)?.label ?? "لحن نجدي طربي";
  const r = RHYTHMS.find((x) => x.id === rhythm)?.label ?? "إيقاع بطيء حالم";
  if (melody === "soft-gulf") return `أدي الكلمات التالية فقط بغناء امرأة بالغة بصوت ناعم دافئ وصاف، بطابع خليجي عاطفي هادئ. استخدمي جملا لحنية متصلة مع مد محسوب للحركات، انتقالات سلسة بين النغمات وزخارف خفيفة عند نهاية الشطر، وتنفس طبيعي بين الأشطر. اجعلي النبض منتظما مع ${r}، واحفظي وضوح الكلمات دون تحويلها إلى حديث أو همس. ابتكري لحنا أصليا، دون تقليد هوية مغنية أو نسخ لحن تسجيل مرجعي. لا تقرئي تعليمات الأداء`;
  return `${SING_DELIVERY}. غنّها كأغنية حقيقية كاملة على ${m} مع ${r}، التزم بنغمة ثابتة وارفع وانزل الصوت مع اللحن، ومدّ آخر كل جملة`;
}

/** Retry only transient upstream errors; refusals and configuration errors are terminal. */
export async function speakWithFallback(apiKey: string, voice: string, text: string, directions: string[]) {
  let last: Response | null = null;
  const profile = FEMALE_VOICE_PROFILES.find((v) => v.id === voice);
  for (const [index, d] of directions.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** (index - 1)));
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-tts-preview",
        contents: [{ role: "user", parts: [{ text: [d, profile?.delivery, text].filter(Boolean).join(": ") }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: providerVoiceId(voice) } } } },
        stream_format: "audio",
      }),
    });
    if (res.ok || (res.status !== 429 && res.status < 500)) return res;
    last = res;
  }
  if (!last) throw new Error("No speech directions supplied");
  return last;
}
export const singFallbacks = (melody?: string, rhythm?: string) => melody === "soft-gulf"
  ? [singDelivery(melody, rhythm), singDelivery(melody, rhythm)]
  : [singDelivery(melody, rhythm), "غنيها بصوت بنت ناعم", "غنيها بصوت ناعم", ""];

