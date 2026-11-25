// Shared browser helpers: language, formatting, API access with an offline cache, header, toasts.
import { CITIES, DISTRICTS, TYPES, AMENITIES, NEAR, FINISH } from './shared.js';
import { logoSvg } from './art.js';
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const D = {
  en: {
    brand: 'Maskan', tagline: 'Find a home in Egypt', browse: 'Browse', brokers: 'Broker CRM', language: 'العربية', demoBar: 'Demo agency. Properties, people and prices are fictional.',
    buy: 'Buy', rent: 'Rent', sale: 'For sale', forRent: 'For rent', heroTitle: 'Find the right place in Egypt', heroSub: 'Search by area, price and what matters to you. No map needed: pick areas, add the ones nearby, and see how many homes each has.', search: 'Search', searchPh: 'Search by area, compound or reference',
    filters: 'Filters', clear: 'Clear all', results: 'results', result: 'result', showResults: 'Show results', sortBy: 'Sort', sort_newest: 'Newest', sort_price_asc: 'Price: low to high', sort_price_desc: 'Price: high to low', sort_area_desc: 'Largest area', sort_ppm_asc: 'Lowest price per m²',
    propType: 'Property type', location: 'Area', allCities: 'All of Egypt', includeNearby: 'Include nearby areas', nearbyHint: 'Adds the neighbouring areas to your search.', price: 'Price', min: 'Min', max: 'Max', bedrooms: 'Bedrooms', bathrooms: 'Bathrooms', any: 'Any', size: 'Area (m²)', finishing: 'Finishing', furnished: 'Furnished', installments: 'Instalment plan', amenities: 'Amenities', nearTo: 'Close to', savedOnly: 'Saved', saved: 'Saved', save: 'Save', unsave: 'Remove from saved',
    noResults: 'No properties match these filters.', noResultsHint: 'Try removing a filter or including nearby areas.', perMonth: '/ month', perM2: 'per m²', egp: 'EGP', beds: 'bd', baths: 'ba', bedsFull: 'Bedrooms', bathsFull: 'Bathrooms', m2: 'm²', floor: 'Floor', ref: 'Ref', reserved: 'Reserved', from: 'from', unitPerMonth: '/ mo',
    offline: 'You are offline. Showing the properties saved on this device.', online: 'Back online', loading: 'Loading...', loadFail: 'Could not load properties.',
    breadcrumbHome: 'All properties', gallery: 'Gallery', v_exterior: 'Exterior', v_living: 'Living room', v_bedroom: 'Bedroom', v_plan: 'Floor plan', imgNote: 'Illustrations, not photos.',
    overview: 'Overview', about: 'About this property', features: 'Features', closeTo: 'Close to', delivery: 'Delivery', compound: 'Compound', priceHistory: 'Price history', listedBy: 'Listed by', agentRole: 'Property consultant',
    areaInfo: 'Area', nearbyAreas: 'Nearby areas', seeInArea: 'More in', plan: 'Payment plan', downPct: 'Down payment', years: 'Years', downAmt: 'Down payment', monthlyAmt: 'Monthly instalment', planNote: 'Simple calculation without interest or fees. A real plan comes from the developer.', rentYear: 'Yearly rent', similar: 'Similar properties',
    inquiryTitle: 'Ask about this property', inquirySub: 'An agent calls you back. This is a demo: nobody will really call.', yourName: 'Your name', phone: 'Mobile number', phoneHint: 'Egyptian mobile, for example 010 1234 5678', message: 'Message (optional)', msgPh: 'I would like to see it this week...', viewPref: 'Preferred viewing time', vp_none: 'No preference', vp_morning: 'Morning', vp_afternoon: 'Afternoon', vp_evening: 'Evening', send: 'Send request', sending: 'Sending...',
    sentTitle: 'Request received', sentBody: 'will contact you on', sentMerged: 'We already had a request from this number, so we added this one to it.', queued: 'No connection. Your request is saved on this phone and will be sent automatically.', queuedTitle: 'Saved offline', again: 'Send another',
    errName: 'Enter your name', errPhone: 'Enter a valid Egyptian mobile number', errSend: 'Could not send', notFound: 'This property was not found or is no longer available.', backToSearch: 'Back to search',
    share: 'Copy link', copied: 'Link copied',
    // CRM
    crmTitle: 'Broker CRM', signIn: 'Sign in', chooseUser: 'Choose who you are', pin: 'PIN', enter: 'Enter', signOut: 'Sign out', roleManager: 'Manager', roleAgent: 'Agent', demoPins: 'Demo PINs are shown here on purpose: manager 2468, agents 1357. A real system uses real accounts.', wrongPin: 'Wrong PIN',
    n_dashboard: 'Dashboard', n_leads: 'Leads', n_viewings: 'Viewings', n_deals: 'Deals', n_listings: 'Listings', n_settings: 'Settings',
    kNew: 'New leads (7 days)', kViewings: 'Viewings this week', kPipeline: 'Open deals value', kEarned: 'Commission earned this month', kWeighted: 'Expected commission (weighted)', kOverdue: 'Follow-ups overdue', kConv: 'Win rate', kNoShow: 'No-show rate', yourShare: 'your share', officeTotal: 'office total',
    funnel: 'Lead stages', sources: 'Lead sources', upcoming: 'Upcoming viewings', dueNow: 'Follow-ups', nothing: 'Nothing here', team: 'Team', openLeads: 'Open leads', won: 'Won', openDeals: 'Open deals', earned: 'Earned', inPipeline: 'In pipeline',
    stage_new: 'New', stage_contacted: 'Contacted', stage_viewing: 'Viewing', stage_negotiation: 'Negotiation', stage_won: 'Won', stage_lost: 'Lost',
    src_website: 'Website', src_whatsapp: 'WhatsApp', src_facebook: 'Facebook', src_referral: 'Referral', src_walk_in: 'Walk-in',
    lost_price: 'Price too high', lost_location: 'Wrong location', lost_bought_elsewhere: 'Bought elsewhere', lost_no_answer: 'No answer', lost_not_ready: 'Not ready yet',
    addLead: 'Add lead', searchLeads: 'Search name or phone', allAgents: 'All agents', allSources: 'All sources', board: 'Board', list: 'List', leadName: 'Name', source: 'Source', budget: 'Budget (EGP)', interest: 'Interested in', agent: 'Agent', stageL: 'Stage', created: 'Created', nextAction: 'Next action', notes: 'Notes and activity', addNote: 'Add note', notePh: 'What happened? What did the client say?', post: 'Post', moveTo: 'Move to', assignTo: 'Assign to', lostReason: 'Why was it lost?', confirm: 'Confirm', cancel: 'Cancel', close: 'Close', save2: 'Save', overdue: 'Overdue', today: 'Today', tomorrow: 'Tomorrow', call: 'Call', setNext: 'Set next action', nextText: 'What to do', when: 'When',
    bookViewing: 'Book a viewing', property: 'Property', duration: 'Duration', minutes: 'min', book: 'Book', createDeal: 'Create a deal', offerPrice: 'Offer price (EGP)', suggested: 'Suggested properties', suggestedNone: 'No other properties match what this client asked for.', listedPrice: 'Listed', noListing: 'None',
    viewingsTitle: 'Viewings', past: 'Past', scheduled: 'Scheduled', done: 'Done', noShow: 'No-show', cancelled: 'Cancelled', markDone: 'Done', markNoShow: 'No-show', cancelV: 'Cancel', move: 'Move', newTime: 'New date and time', officeRules: 'Viewings run 10:00 to 20:00 Cairo time, closed on Fridays, 30 minutes between an agent\'s viewings.',
    dealsTitle: 'Deals', d_offer: 'Offer', d_reserved: 'Reserved', d_contract: 'Contract', d_closed: 'Closed', d_fell_through: 'Fell through', advance: 'Move to', fellThrough: 'Fell through', closeDeal: 'Close deal', managerCloses: 'Only the manager closes a deal', commission: 'Commission', agentShare: 'Agent share', officeShare: 'Office share', agreed: 'Agreed price', ledger: 'Commission ledger', closedOn: 'Closed', exportCsv: 'Export CSV', editPrice: 'Edit price', totalCommission: 'Total commission',
    listingsTitle: 'Listings', addListing: 'Add listing', published: 'Published', hidden: 'Hidden', status: 'Status', st_available: 'Available', st_reserved: 'Reserved', st_sold: 'Sold', st_rented: 'Rented', st_withdrawn: 'Withdrawn', publish: 'Publish', unpublish: 'Hide', editListingPrice: 'Change price', viewPublic: 'Public page', purpose: 'Purpose', type: 'Type', district: 'Area', areaM2: 'Area (m²)', bedsF: 'Bedrooms', bathsF: 'Bathrooms', compoundF: 'Compound (optional)', priceF: 'Price (EGP)', create: 'Create', mine: 'Mine',
    settingsTitle: 'Office settings', saleComm: 'Sale commission (% of price)', rentComm: 'Rent commission (months of rent)', split: 'Agent share of commission (%)', saveSettings: 'Save settings', settingsNote: 'Open deals are recalculated. Closed deals keep the rates they closed with.', resetDemo: 'Reset demo data', resetAsk: 'Reset all demo data to the starting state? This signs everyone out.', demoNotes: 'Demo notes', note1: 'Shared demo data: everyone sees the same agency. It resets every 6 hours.', note2: 'Sign-in uses public demo PINs. A real system needs real accounts and password rules.', note3: 'Roles are enforced on the server: agents only see their own leads, deals and viewings.',
    saved2: 'Saved', failed: 'Something went wrong', viewOnlyOffline: 'You are offline. The CRM shows the last saved data and cannot save changes.', signInFirst: 'Please sign in', justNow: 'just now', by: 'by', system: 'System', client: 'Client', dateTime: 'Date and time', amountHint: 'Check the amount',
  },
  ar: {
    brand: 'مسكن', tagline: 'ابحث عن بيتك في مصر', browse: 'تصفح', brokers: 'نظام السمسار', language: 'English', demoBar: 'وكالة تجريبية. العقارات والأشخاص والأسعار كلها خيالية.',
    buy: 'شراء', rent: 'إيجار', sale: 'للبيع', forRent: 'للإيجار', heroTitle: 'ابحث عن المكان المناسب في مصر', heroSub: 'ابحث بالمنطقة والسعر وما يهمك. من غير خريطة: اختر المناطق، أضف المناطق القريبة، وشوف عدد الوحدات في كل منطقة.', search: 'بحث', searchPh: 'ابحث بالمنطقة أو الكمبوند أو الرقم المرجعي',
    filters: 'الفلاتر', clear: 'مسح الكل', results: 'نتيجة', result: 'نتيجة', showResults: 'اعرض النتائج', sortBy: 'الترتيب', sort_newest: 'الأحدث', sort_price_asc: 'السعر: من الأقل', sort_price_desc: 'السعر: من الأعلى', sort_area_desc: 'الأكبر مساحة', sort_ppm_asc: 'الأقل سعرًا للمتر',
    propType: 'نوع العقار', location: 'المنطقة', allCities: 'كل مصر', includeNearby: 'شمل المناطق القريبة', nearbyHint: 'يضيف المناطق المجاورة لبحثك.', price: 'السعر', min: 'الأدنى', max: 'الأقصى', bedrooms: 'غرف النوم', bathrooms: 'الحمامات', any: 'أي', size: 'المساحة (م²)', finishing: 'التشطيب', furnished: 'مفروش', installments: 'نظام تقسيط', amenities: 'المميزات', nearTo: 'قريب من', savedOnly: 'المحفوظة', saved: 'المحفوظة', save: 'احفظ', unsave: 'إزالة من المحفوظة',
    noResults: 'لا توجد عقارات تطابق هذه الفلاتر.', noResultsHint: 'جرّب إزالة فلتر أو شمل المناطق القريبة.', perMonth: '/ شهر', perM2: 'للمتر', egp: 'ج.م', beds: 'غرف', baths: 'حمام', bedsFull: 'غرف النوم', bathsFull: 'الحمامات', m2: 'م²', floor: 'الدور', ref: 'رقم', reserved: 'محجوز', from: 'من', unitPerMonth: '/ شهر',
    offline: 'أنت غير متصل. نعرض العقارات المحفوظة على جهازك.', online: 'عاد الاتصال', loading: 'جاري التحميل...', loadFail: 'تعذر تحميل العقارات.',
    breadcrumbHome: 'كل العقارات', gallery: 'الصور', v_exterior: 'الواجهة', v_living: 'الريسبشن', v_bedroom: 'غرفة النوم', v_plan: 'المسقط', imgNote: 'رسومات توضيحية وليست صورًا حقيقية.',
    overview: 'نظرة عامة', about: 'عن العقار', features: 'المميزات', closeTo: 'قريب من', delivery: 'التسليم', compound: 'الكمبوند', priceHistory: 'تاريخ السعر', listedBy: 'المسؤول', agentRole: 'مستشار عقاري',
    areaInfo: 'المنطقة', nearbyAreas: 'مناطق قريبة', seeInArea: 'المزيد في', plan: 'نظام السداد', downPct: 'المقدم', years: 'عدد السنين', downAmt: 'قيمة المقدم', monthlyAmt: 'القسط الشهري', planNote: 'حساب مبسط بدون فوائد أو مصاريف. الخطة الحقيقية تأتي من المطور.', rentYear: 'الإيجار السنوي', similar: 'عقارات مشابهة',
    inquiryTitle: 'اسأل عن هذا العقار', inquirySub: 'مندوب هيتصل بك. هذا عرض تجريبي: لن يتصل بك أحد فعلًا.', yourName: 'اسمك', phone: 'رقم الموبايل', phoneHint: 'موبايل مصري، مثال 010 1234 5678', message: 'رسالة (اختياري)', msgPh: 'عايز أشوفها الأسبوع ده...', viewPref: 'الوقت المفضل للمعاينة', vp_none: 'بدون تفضيل', vp_morning: 'صباحًا', vp_afternoon: 'بعد الظهر', vp_evening: 'مساءً', send: 'إرسال الطلب', sending: 'جاري الإرسال...',
    sentTitle: 'تم استلام طلبك', sentBody: 'سيتواصل معك على', sentMerged: 'كان لدينا طلب سابق من هذا الرقم، فأضفنا هذا الطلب إليه.', queued: 'لا يوجد اتصال. طلبك محفوظ على هذا الجهاز وسيُرسل تلقائيًا.', queuedTitle: 'تم الحفظ بدون اتصال', again: 'إرسال طلب آخر',
    errName: 'اكتب اسمك', errPhone: 'اكتب رقم موبايل مصري صحيح', errSend: 'تعذر الإرسال', notFound: 'لم نجد هذا العقار أو لم يعد متاحًا.', backToSearch: 'العودة للبحث',
    share: 'نسخ الرابط', copied: 'تم نسخ الرابط',
    crmTitle: 'نظام السمسار', signIn: 'تسجيل الدخول', chooseUser: 'اختر من أنت', pin: 'الرقم السري', enter: 'دخول', signOut: 'خروج', roleManager: 'مدير', roleAgent: 'مندوب', demoPins: 'الأرقام السرية التجريبية ظاهرة هنا عمدًا: المدير 2468 والمناديب 1357. النظام الحقيقي يستخدم حسابات حقيقية.', wrongPin: 'الرقم السري غير صحيح',
    n_dashboard: 'لوحة التحكم', n_leads: 'العملاء', n_viewings: 'المعاينات', n_deals: 'الصفقات', n_listings: 'العقارات', n_settings: 'الإعدادات',
    kNew: 'عملاء جدد (٧ أيام)', kViewings: 'معاينات هذا الأسبوع', kPipeline: 'قيمة الصفقات المفتوحة', kEarned: 'عمولة هذا الشهر', kWeighted: 'العمولة المتوقعة (بالاحتمال)', kOverdue: 'متابعات متأخرة', kConv: 'نسبة النجاح', kNoShow: 'نسبة عدم الحضور', yourShare: 'نصيبك', officeTotal: 'إجمالي المكتب',
    funnel: 'مراحل العملاء', sources: 'مصادر العملاء', upcoming: 'المعاينات القادمة', dueNow: 'المتابعات', nothing: 'لا يوجد شيء هنا', team: 'الفريق', openLeads: 'عملاء مفتوحون', won: 'تمت', openDeals: 'صفقات مفتوحة', earned: 'المحصّل', inPipeline: 'قيد التنفيذ',
    stage_new: 'جديد', stage_contacted: 'تم التواصل', stage_viewing: 'معاينة', stage_negotiation: 'تفاوض', stage_won: 'تمت', stage_lost: 'خسارة',
    src_website: 'الموقع', src_whatsapp: 'واتساب', src_facebook: 'فيسبوك', src_referral: 'ترشيح', src_walk_in: 'زيارة مباشرة',
    lost_price: 'السعر مرتفع', lost_location: 'المنطقة غير مناسبة', lost_bought_elsewhere: 'اشترى من مكان آخر', lost_no_answer: 'لا يرد', lost_not_ready: 'غير جاهز بعد',
    addLead: 'إضافة عميل', searchLeads: 'ابحث بالاسم أو الرقم', allAgents: 'كل المناديب', allSources: 'كل المصادر', board: 'لوحة', list: 'قائمة', leadName: 'الاسم', source: 'المصدر', budget: 'الميزانية (ج.م)', interest: 'مهتم بـ', agent: 'المندوب', stageL: 'المرحلة', created: 'تاريخ الإضافة', nextAction: 'الإجراء القادم', notes: 'الملاحظات والنشاط', addNote: 'إضافة ملاحظة', notePh: 'إيه اللي حصل؟ العميل قال إيه؟', post: 'نشر', moveTo: 'انقل إلى', assignTo: 'عيّن إلى', lostReason: 'سبب الخسارة؟', confirm: 'تأكيد', cancel: 'إلغاء', close: 'إغلاق', save2: 'حفظ', overdue: 'متأخر', today: 'اليوم', tomorrow: 'غدًا', call: 'اتصال', setNext: 'حدد الإجراء القادم', nextText: 'المطلوب', when: 'الموعد',
    bookViewing: 'حجز معاينة', property: 'العقار', duration: 'المدة', minutes: 'دقيقة', book: 'احجز', createDeal: 'إنشاء صفقة', offerPrice: 'سعر العرض (ج.م)', suggested: 'عقارات مقترحة', suggestedNone: 'لا توجد عقارات أخرى تناسب طلب العميل.', listedPrice: 'المعروض', noListing: 'لا يوجد',
    viewingsTitle: 'المعاينات', past: 'السابقة', scheduled: 'مجدولة', done: 'تمت', noShow: 'لم يحضر', cancelled: 'ملغاة', markDone: 'تمت', markNoShow: 'لم يحضر', cancelV: 'إلغاء', move: 'تغيير الموعد', newTime: 'التاريخ والوقت الجديد', officeRules: 'المعاينات من ١٠ صباحًا حتى ٨ مساءً بتوقيت القاهرة، الجمعة إجازة، و٣٠ دقيقة بين معاينات المندوب الواحد.',
    dealsTitle: 'الصفقات', d_offer: 'عرض', d_reserved: 'محجوز', d_contract: 'تعاقد', d_closed: 'مغلقة', d_fell_through: 'لم تتم', advance: 'انقل إلى', fellThrough: 'لم تتم', closeDeal: 'إغلاق الصفقة', managerCloses: 'المدير فقط يغلق الصفقة', commission: 'العمولة', agentShare: 'نصيب المندوب', officeShare: 'نصيب المكتب', agreed: 'السعر المتفق عليه', ledger: 'سجل العمولات', closedOn: 'أُغلقت', exportCsv: 'تصدير CSV', editPrice: 'تعديل السعر', totalCommission: 'إجمالي العمولة',
    listingsTitle: 'العقارات', addListing: 'إضافة عقار', published: 'منشور', hidden: 'مخفي', status: 'الحالة', st_available: 'متاح', st_reserved: 'محجوز', st_sold: 'تم البيع', st_rented: 'تم التأجير', st_withdrawn: 'مسحوب', publish: 'نشر', unpublish: 'إخفاء', editListingPrice: 'تغيير السعر', viewPublic: 'الصفحة العامة', purpose: 'الغرض', type: 'النوع', district: 'المنطقة', areaM2: 'المساحة (م²)', bedsF: 'غرف النوم', bathsF: 'الحمامات', compoundF: 'الكمبوند (اختياري)', priceF: 'السعر (ج.م)', create: 'إنشاء', mine: 'عقاراتي',
    settingsTitle: 'إعدادات المكتب', saleComm: 'عمولة البيع (٪ من السعر)', rentComm: 'عمولة الإيجار (عدد شهور الإيجار)', split: 'نصيب المندوب من العمولة (٪)', saveSettings: 'حفظ الإعدادات', settingsNote: 'الصفقات المفتوحة يُعاد حسابها. الصفقات المغلقة تحتفظ بالنسب التي أُغلقت بها.', resetDemo: 'إعادة ضبط البيانات', resetAsk: 'إعادة كل بيانات العرض للوضع الأصلي؟ سيتم تسجيل خروج الجميع.', demoNotes: 'ملاحظات العرض', note1: 'البيانات مشتركة: الكل يرى نفس الوكالة. وتتجدد كل ٦ ساعات.', note2: 'الدخول بأرقام سرية تجريبية معلنة. النظام الحقيقي يحتاج حسابات حقيقية وقواعد لكلمات المرور.', note3: 'الصلاحيات مفروضة على الخادم: المندوب يرى عملاءه وصفقاته ومعايناته فقط.',
    saved2: 'تم الحفظ', failed: 'حدث خطأ', viewOnlyOffline: 'أنت غير متصل. النظام يعرض آخر بيانات محفوظة ولا يستطيع حفظ التغييرات.', signInFirst: 'سجّل الدخول أولًا', justNow: 'الآن', by: 'بواسطة', system: 'النظام', client: 'العميل', dateTime: 'التاريخ والوقت', amountHint: 'راجع المبلغ',
  },
};
export let lang = (() => {
  const q = new URLSearchParams(location.search).get('lang');
  if (q === 'ar' || q === 'en') { localStorage.setItem('maskan_lang', q); return q; }
  return localStorage.getItem('maskan_lang') || ((navigator.language || '').startsWith('ar') ? 'ar' : 'en');
})();
export const t = (k) => D[lang][k] ?? D.en[k] ?? k;
export function applyLang() { document.documentElement.lang = lang; document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'; }
applyLang();
export const toggleLang = () => { lang = lang === 'ar' ? 'en' : 'ar'; localStorage.setItem('maskan_lang', lang); const u = new URL(location.href); u.searchParams.delete('lang'); history.replaceState(null, '', u); applyLang(); };

export const nf = (n, d = 0) => new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
export const money = (n) => `${nf(n)} ${t('egp')}`;
export const moneyShort = (n) => { const a = Math.abs(n); const f = (v, u) => `${nf(Math.round(v * 10) / 10, v % 1 ? 1 : 0)}${u} ${t('egp')}`; return a >= 1e6 ? f(n / 1e6, lang === 'ar' ? ' مليون' : 'M') : a >= 1e3 ? f(n / 1e3, lang === 'ar' ? ' ألف' : 'K') : `${nf(n)} ${t('egp')}`; };
export const pick = (o) => (o && (o[lang] || o.en)) || '';
export const label = { type: (k) => TYPES[k]?.[lang] || k, district: (k) => DISTRICTS[k]?.[lang] || k, city: (k) => CITIES[k]?.[lang] || k, amenity: (k) => AMENITIES[k]?.[lang] || k, near: (k) => NEAR[k]?.[lang] || k, finish: (k) => FINISH[k]?.[lang] || k };
export const place = (l) => `${label.district(l.district)}, ${label.city(DISTRICTS[l.district].city)}`;
export const TZ = 'Africa/Cairo';
const loc = () => (lang === 'ar' ? 'ar-EG' : 'en-GB');
export const fmtTime = (ts) => new Intl.DateTimeFormat(loc(), { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(ts);
export const fmtDate = (ts) => new Intl.DateTimeFormat(loc(), { day: 'numeric', month: 'short', timeZone: TZ }).format(ts);
export const fmtDay = (ts) => new Intl.DateTimeFormat(loc(), { weekday: 'long', day: 'numeric', month: 'short', timeZone: TZ }).format(ts);
export const fmtDateTime = (ts) => `${fmtDate(ts)}, ${fmtTime(ts)}`;
// datetime-local inputs hold Cairo wall time (UTC+2, as the office rules do)
export const toLocalInput = (ts) => new Date(ts + 120 * 60000).toISOString().slice(0, 16);
export const fromLocalInput = (v) => (v ? Date.parse(v + ':00Z') - 120 * 60000 : NaN);

// ---------------------------------------------------------------- API
const KEY = 'maskan_cache_v1', TKEY = 'maskan_token';
let skew = 0; export const serverNow = () => Date.now() + skew;
export const token = () => localStorage.getItem(TKEY) || '';
export const setToken = (v) => (v ? localStorage.setItem(TKEY, v) : localStorage.removeItem(TKEY));
export async function load() {
  try {
    const r = await fetch('/api/data', { cache: 'no-store' }); if (!r.ok) throw new Error('http ' + r.status);
    const d = await r.json(); skew = d.serverTime - Date.now(); try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
    return { data: d, offline: r.headers.get('x-maskan-cache') === '1' };
  } catch {
    const c = localStorage.getItem(KEY); if (c) return { data: JSON.parse(c), offline: true };
    throw new Error('offline and nothing cached yet');
  }
}
export async function post(op) {
  const r = await fetch('/api/data', { method: 'POST', headers: { 'content-type': 'application/json', 'x-maskan-token': token() }, body: JSON.stringify({ op }) });
  const d = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(d.error || 'Server error'); e.status = r.status; throw e; }
  skew = d.serverTime - Date.now(); return d;
}
export const isNetErr = (e) => e instanceof TypeError || /Failed to fetch|NetworkError|Load failed/i.test(e?.message || '');
export function registerSW() { if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {}); }

// saved properties (heart button), kept on this device
export const favs = { get: () => { try { return JSON.parse(localStorage.getItem('maskan_favs') || '[]'); } catch { return []; } }, toggle(id) { const a = this.get(); const i = a.indexOf(id); i >= 0 ? a.splice(i, 1) : a.push(id); localStorage.setItem('maskan_favs', JSON.stringify(a)); return i < 0; }, has(id) { return this.get().includes(id); } };

export function toast(msg, bad) { let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.append(el); } el.textContent = msg; el.className = 'show' + (bad ? ' bad' : ''); clearTimeout(toast.h); toast.h = setTimeout(() => (el.className = ''), 3200); }

export function header(active, extra = '') {
  return `<header class="top"><a class="brand" href="/">${logoSvg}<span>${t('brand')}</span></a><nav><a href="/" class="${active === 'home' ? 'on' : ''}">${t('browse')}</a><a href="/crm" class="${active === 'crm' ? 'on' : ''}">${t('brokers')}</a></nav><div class="top-r">${extra}<button class="lang" id="langBtn" type="button">${t('language')}</button></div></header><div class="demo-bar">${t('demoBar')}</div>`;
}
export function bindLang(rerender) { const b = $('#langBtn'); if (b) b.onclick = () => { toggleLang(); rerender(); }; }
