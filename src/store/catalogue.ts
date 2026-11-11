import type { Personal, Product, ProductId, TierId } from './types';

/** Bundled catalogue. Prices are SAR including VAT. Live prices from the shop replace these when it is reachable. */
export const products: Record<ProductId, Product> = {
  kit: {
    id: 'kit', sku: 'WRK-KIT-SIG', word: 'أول يوم', ar: 'المجموعة',
    sub: 'كل ما يحتاجه في أول يوم، باسمه.',
    story: 'علبة سوداء طويلة. بطاقة باسمه، قلم، دفتر، ورسالة منك فوقها كلها. تُفتح مرة واحدة، وتبقى على المكتب.',
    price: 399,
    personal: ['name', 'date', 'msg', 'from'], mm: { w: 340, h: 150, d: 38 }, inKit: false, photos: 2,
    spec: ['المقاس|340 × 150 × 38 مم', 'العلبة|كرتون صلب، ملمس ناعم مطفي', 'بالداخل|هويّة، توقيع، تسعون، كلمة', 'الاسم|على البطاقة والقلم والدفتر'],
  },
  badge: {
    id: 'badge', sku: 'WRK-BADGE', word: 'هويّة', ar: 'البطاقة والحبل',
    sub: 'اسمه على صدره من أول يوم.',
    story: 'حافظة بطاقة من جلد أسود وحبل منسوج. بداخلها بطاقة اليوم الأول باسمه وتاريخ مباشرته، يلبسها إلى أن تصدر بطاقته الرسمية. بعدها تدخل بطاقة العمل مكانها، والحافظة تبقى معه.',
    price: 129, personal: ['name', 'date'], mm: { w: 62, h: 98, d: 5 }, inKit: true, photos: 5,
    spec: ['المقاس|62 × 98 × 5 مم', 'الحافظة|جلد طبيعي أسود، حواف مدهونة، خياطة كاملة', 'البطاقة|تناسب بطاقة العمل القياسية 54 × 86 مم', 'الحبل|شريط منسوج 12 مم، طوله 90 سم، بمشبك دوّار', 'الأمان|قفل مغناطيسي خلف الرقبة ينفصل عند الشد', 'الاسم|على بطاقة اليوم الأول، ومضغوط على ظهر الجلد'],
  },
  pen: {
    id: 'pen', sku: 'WRK-PEN', word: 'توقيع', ar: 'القلم',
    sub: 'أول شيء في أول يوم: توقيعك على العقد.',
    story: 'قلم من النحاس بطلاء أسود مطفي. يُفتح باللف، بلا صوت. الاسم محفور بالليزر في جسمه، فيظهر النحاس من تحت السواد.',
    price: 89, personal: ['name'], mm: { w: 140, h: 10, d: 10 }, inKit: true, photos: 5,
    spec: ['المقاس|140 × 10 مم', 'الوزن|حوالي 38 غ', 'الجسم|نحاس، طلاء أسود مطفي', 'الحركة|لفّ نصف دورة، بلا صوت', 'العبوة|مقاس باركر G2، تُستبدل من أي مكتبة', 'الاسم|حفر ليزر، عربي أو إنجليزي'],
  },
  notebook: {
    id: 'notebook', sku: 'WRK-NOTEBOOK', word: 'تسعون', ar: 'الدفتر',
    sub: 'دفتر أسود نحيف. تسعون صفحة.',
    story: 'دفتر نحيف بغلاف جلد أسود، يفتح من اليمين ويستوي على المكتب. تسعون صفحة منقّطة ومرقّمة، حوافها سوداء وداخلها عاجي. اسمه مضغوط في زاوية الغلاف، وتاريخ أول يوم مطبوع في رأس الصفحة الأولى.',
    price: 119, personal: ['name', 'date'], mm: { w: 100, h: 210, d: 8 }, inKit: true, photos: 5,
    spec: ['المقاس|100 × 210 × 8 مم', 'الغلاف|جلد طبيعي أسود، حواف مدهونة', 'الورق|عاجي 100 غ، منقّط 5 مم', 'الصفحات|90 صفحة مرقّمة، حواف سوداء', 'التجليد|مخيّط بالخيط، يفتح من اليمين، فاصل شريط', 'الاسم|مضغوط بدون لون على الغلاف'],
  },
  card: {
    id: 'card', sku: 'WRK-CARD', word: 'كلمة', ar: 'بطاقة الرسالة',
    sub: 'كلمة منك، تبقى معه.',
    story: 'بطاقة قطنية سميكة، اسمه وكلمتك مضغوطة فيها بالحبر الأسود. تحتها سطر فارغ، لو حبّيت تكتب شيئًا بخط يدك. تأتي في ظرف أسود.',
    price: 39, personal: ['name', 'msg', 'from'], mm: { w: 205, h: 95, d: 1 }, inKit: true, photos: 5,
    spec: ['المقاس|205 × 95 مم', 'الورق|قطن 600 غرام، غير مصقول', 'الطباعة|ضغط بالحبر الأسود، لون واحد', 'رسالتك|حتى 60 حرفًا', 'الظرف|ورق أسود غير مصقول، 212 × 101 مم'],
  },
  cardcase: {
    id: 'cardcase', sku: 'WRK-CARDCASE', word: 'تعارف', ar: 'حافظة البطاقات',
    sub: 'جيب لبطاقاتك، وجيب لبطاقات من تتعرّف عليهم.',
    story: 'حافظة من الجلد الأسود تُفتح مثل الكتاب العربي، من اليسار إلى اليمين. بداخلها جيبان يتسعان لمقاسَي البطاقات المستخدمة في السعودية. اسمه مضغوط في الزاوية من الخارج، بلا لون.',
    price: 139, personal: ['name'], mm: { w: 102, h: 68, d: 9 }, inKit: false, photos: 5,
    spec: ['المقاس|102 × 68 × 9 مم وهي مغلقة', 'الجلد|جلد طبيعي أسود، حواف مصبوغة باليد', 'الداخل|جيبان، وبطانة من جلد ناعم', 'البطاقات|90 × 50 و 85 × 55 مم، نحو 20 بطاقة', 'الإغلاق|بثنية الجلد نفسها، بلا مغناطيس', 'الاسم|ضغط حراري بلا لون'],
  },
  tray: {
    id: 'tray', sku: 'WRK-TRAY', word: 'مكان', ar: 'صينية المكتب',
    sub: 'أول شيء يجعل المكتب مكتبك.',
    story: 'في أول يوم يعطونك مكتبًا. هذه الصينية تُوضع عليه، وفيها حافة تمسك القلم في مكانه. قطعة واحدة من الجلد الأسود السميك بأربعة أزرار، تفتحها فتعود مسطّحة.',
    price: 169, personal: ['name'], mm: { w: 220, h: 126, d: 22 }, inKit: false, photos: 5,
    spec: ['المقاس|220 × 126 × 22 مم', 'مفتوحة|253 × 158 مم', 'الجلد|جلد طبيعي أسود 2.2 مم، باطنه مخملي', 'الأزرار|أربعة أزرار كبس بلون معدني داكن', 'مسند القلم|حافة مرتفعة على الجانب الطويل', 'الاسم|كبس حراري بلا لون داخل الزاوية'],
  },
  nameplate: {
    id: 'nameplate', sku: 'WRK-NAMEPLATE', word: 'اسم', ar: 'لوحة الاسم',
    sub: 'اسمك على مكتبك من أول يوم.',
    story: 'قطعة ألمنيوم مثلثة بثلاثة أوجه. وجه عليه الاسم بالعربية، ووجه بالحروف اللاتينية، والثالث فارغ. تجلس على وجهها الفارغ، فيقرأ الزائر اسمًا ويرى صاحب المكتب الآخر.',
    price: 189, personal: ['name', 'nameEn'], mm: { w: 200, h: 42, d: 36 }, inKit: false, photos: 5,
    spec: ['المقاس|طول 200 مم، ضلع 42 مم', 'المادة|ألمنيوم مبثوق', 'السطح|أنودة سوداء مطفية', 'الاسم|حفر ليزر بلون الألمنيوم', 'الأوجه|عربي، لاتيني، فارغ'],
  },
};

export const order: ProductId[] = ['kit', 'badge', 'pen', 'notebook', 'card', 'cardcase', 'tray', 'nameplate'];
export const pieces: ProductId[] = ['badge', 'pen', 'notebook', 'card', 'cardcase', 'tray', 'nameplate'];
export const sample: Personal = { name: 'نورة العتيبي', nameEn: 'Noura Alotaibi', msg: 'فخورين فيك.', from: 'أمك وأبوك', date: '' };

export const isProductId = (v: unknown): v is ProductId => typeof v === 'string' && v in products;

/* Photos: -0 is the overall still, the rest are close-ups. */
const photo: Record<ProductId, number[]> = {
  kit: [require('@/assets/products/kit-0.jpg'), require('@/assets/products/kit-1.jpg')],
  badge: [require('@/assets/products/badge-0.jpg'), require('@/assets/products/badge-2.jpg'), require('@/assets/products/badge-3.jpg'), require('@/assets/products/badge-4.jpg')],
  pen: [require('@/assets/products/pen-0.jpg'), require('@/assets/products/pen-2.jpg'), require('@/assets/products/pen-3.jpg'), require('@/assets/products/pen-4.jpg')],
  notebook: [require('@/assets/products/notebook-0.jpg'), require('@/assets/products/notebook-2.jpg'), require('@/assets/products/notebook-3.jpg'), require('@/assets/products/notebook-4.jpg')],
  card: [require('@/assets/products/card-0.jpg'), require('@/assets/products/card-2.jpg'), require('@/assets/products/card-3.jpg'), require('@/assets/products/card-4.jpg')],
  cardcase: [require('@/assets/products/cardcase-0.jpg'), require('@/assets/products/cardcase-2.jpg'), require('@/assets/products/cardcase-3.jpg'), require('@/assets/products/cardcase-4.jpg')],
  tray: [require('@/assets/products/tray-0.jpg'), require('@/assets/products/tray-2.jpg'), require('@/assets/products/tray-3.jpg'), require('@/assets/products/tray-4.jpg')],
  nameplate: [require('@/assets/products/nameplate-0.jpg'), require('@/assets/products/nameplate-2.jpg'), require('@/assets/products/nameplate-3.jpg'), require('@/assets/products/nameplate-4.jpg')],
};
export const photos = (id: ProductId) => photo[id];
export const thumb = (id: ProductId) => photo[id][0];

/** Captions for the close-ups (photos 1..3). */
export const captions: Partial<Record<ProductId, string[]>> = {
  badge: ['بطاقة اليوم الأول باسمه', 'بطاقة حقيقية في جيب حقيقي', 'مشبك دوّار ولسان من الجلد نفسه'],
  pen: ['الاسم محفور حتى النحاس.', 'نصف لفّة ويخرج الرأس. بلا صوت.', 'عبوة قياسية تُستبدل.'],
  notebook: ['الاسم مضغوط في الجلد', 'الصفحة الأولى، بتاريخ أول يوم', 'تسعون صفحة'],
  card: ['الاسم مضغوط في القطن', 'البطاقة والظرف', 'سطر فارغ لخط يدك'],
  cardcase: ['الاسم مضغوط في الجلد، يظهر مع الضوء.', 'مفتوحة. جيب لما تعطي، وجيب لما تأخذ.', 'خياطة دقيقة، وحافة الجيب مكوية.'],
  tray: ['الزاوية مثنية ويمسكها زر كبس', 'الاسم داخل الزاوية، حيث يشير القلم', 'تفتح الأزرار فتعود مسطّحة'],
  nameplate: ['الحروف محفورة حتى الألمنيوم', 'الوجه اللاتيني جهة صاحب المكتب', 'الوجه الثالث فارغ'],
};

export function priceOf(id: ProductId, tier: TierId | null, live?: Record<string, number>): number {
  const p = products[id];
  const t = tier && p.tiers ? p.tiers.find((x) => x.id === tier) : undefined;
  const sku = t ? t.sku : p.sku;
  return live?.[sku] ?? (t ? t.price : p.price);
}
export function skuOf(id: ProductId, tier: TierId | null): string {
  const p = products[id];
  const t = tier && p.tiers ? p.tiers.find((x) => x.id === tier) : undefined;
  return t ? t.sku : p.sku;
}
export function fromPrice(id: ProductId, live?: Record<string, number>): { price: number; from: boolean } {
  const p = products[id];
  if (!p.tiers) return { price: priceOf(id, null, live), from: false };
  return { price: Math.min(...p.tiers.map((t) => live?.[t.sku] ?? t.price)), from: true };
}
