"""Read-only import of the four agreed domains; never edits the team workbook.

Run with the bundled Python/openpyxl and an explicit workbook path. Selection
and quotation slices are reviewed code, not inferred from arbitrary new rows.
"""
import hashlib
import json
import sys
from pathlib import Path
import openpyxl

path = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
sheet_name = "التصنيف إلى مجالات"
sheet = openpyxl.load_workbook(path, data_only=True)[sheet_name]
assert sheet['A9'].value == 'الخلاف مع الصديق'
assert sheet['A9'].fill.fgColor.rgb == 'FFA2C4C9'
rows = []
branch = ''
domain = ''
for row in range(2, 25):
    domain = sheet[f'A{row}'].value or domain
    branch = sheet[f'B{row}'].value or branch
    rows.append({'row': row, 'domain': domain.strip(), 'branch': branch.strip(), 'cells': {
        f'{col}{row}': sheet[f'{col}{row}'].value for col in 'ABCDEFGHI'
        if sheet[f'{col}{row}'].value is not None
    }})
version = '2026-10-06.workbook-v3.four-domains'
snapshot = {'version': version, 'fileName': path.name,
    'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'sheet': sheet_name, 'domain': sheet['A9'].value,
    'selection': 'A2:I24; four team-selected domains',
    'rows': rows,
    'notes': ['G10 contains Quran (49:12) in the hadith column; classified as Quran without changing the quotation.',
              'Four selected domains are active; no sources outside the workbook are imported.',
              'External link verification and human review remain pending; presence in the workbook is not an approval claim.']}

# Exact excerpts from the selected cells, with prose/outer quotation marks removed.
specs = [
 ('conflict_anger_strength',13,'G13','I13','hadith','ليس الشديد بالصرعة، إنما الشديد الذي يملك نفسه عند الغضب','متفق عليه — كما في الإكسل',
  'القوة وقت الغضب إنك تمسك نفسك عن التصرف المؤذي.', 'إذا عصبت، وقف قبل ما تقول أو تسوي شيء يؤذي.'),
 ('conflict_do_not_rage',13,'G13','H13','hadith','لا تغضب','رواه البخاري — كما في الإكسل',
  'وقت الغضب، ننتبه لتصرفاتنا وما نندفع للأذى.', 'إذا عصبت، خذ لحظة قبل ما ترد.'),
 ('conflict_reconcile',15,'G15','H15','hadith','ألا أخبركم بأفضل من درجة الصيام والصلاة والصدقة؟ إصلاح ذات البين','رواه أبو داود والترمذي — المقتطف كما في الإكسل',
  'الإصلاح بين المتخاصمين عمل طيب وله أجر.', 'نقدر نساعد أصحابنا يتكلمون بهدوء، إذا كانوا موافقين.'),
 ('conflict_check_facts',10,'G10','H10','quran','إِنَّ بَعْضَ الظَّنِّ إِثْمٌ','الحجرات: 12',
  'نتأكد مما حدث قبل ما نحكم على الموقف أو نبني عليه ظنًّا.', 'إذا ما نعرف قصدهم، ما نتهمهم بشيء مو متأكدين منه.'),
 ('conflict_restraint',14,'F14','H14','quran','والكاظمين الغيظ والعافين عن الناس والله يحب المحسنين','آل عمران: 134',
  'كظم الغيظ يعني نمسك غضبنا عن الأذى، والعفو ما يلزمك تسكت عن الأذى أو ترجع الثقة فورًا.', 'تقدر تسامح، وتقول: ما أقبل يتكرر الشيء اللي يضايقني.'),
 ('conflict_no_estrangement',9,'G9','H9','hadith','لا يحل لمسلم أن يهجر أخاه فوق ثلاث ليال، يلتقيان فيصد هذا ويصد هذا، وخيرهما الذي يبدأ بالسلام','أخرجه البخاري ومسلم — النص كما في الإكسل',
  'في الخصام العادي، ما نستمر في المقاطعة أكثر من ثلاث ليال، ونقدر نبدأ بالسلام.', 'إذا كان مجرد زعل، تقدر تبدأ بسلام بسيط. إذا فيه أذى، سلامتك أولًا.'),
 ('conflict_greet',11,'G11','H11','hadith','يلتقيان فيصد هذا ويصد هذا، وخيرهما الذي يبدأ بالسلام','أخرجه البخاري ومسلم — المقتطف كما في الإكسل',
  'المبادرة بالسلام خطوة طيبة عند الخصام.', 'تقدر تبدأ بسلام بسيط، وما تحتاج تحل كل الخلاف مرة واحدة.'),
 ('conflict_respect',12,'F12','H12','quran','وَلَوْ شَاءَ رَبُّكَ لَجَعَلَ النَّاسَ أُمَّةً وَاحِدَةً ۖ وَلَا يَزَالُونَ مُخْتَلِفِينَ','هود: 118',
  'ممكن نختلف في الرأي ونسمع بعض باحترام.', 'مو لازم رأينا يكون واحد عشان نتكلم باحترام.')
]
# Each excerpt is asserted against its original cell below. URLs are workbook
# row references, not automatically verified verse-to-page matches.
extra = [
 ('choice_truth',2,'F2','H2','quran','يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَكُونُوا مَعَ الصَّادِقِينَ'),
 ('choice_company',2,'G2','I2','hadith','مثل الجليس الصالح والسوء كحامل المسك ونافخ الكير'),
 ('choice_cooperate',3,'F3','H3','quran','وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَىٰ'),
 ('choice_kind_words',4,'G4','H4','hadith','والكلمة الطيبة صدقة'),
 ('choice_no_mockery',5,'F5','H5','quran','لَا يَسْخَرْ قَوْمٌ مِّن قَوْمٍ عَسَىٰ أَن يَكُونُوا خَيْرًا مِّنْهُمْ'),
 ('choice_no_contempt',5,'G5','I5','hadith','بِحَسْبِ امْرِئٍ مِنَ الشَّرِّ أَنْ يَحْقِرَ أَخَاهُ المُسْلِمَ'),
 ('choice_peace',6,'G6','H6','hadith','أفشوا السلام بينكم'),
 ('choice_smile',7,'G7','H7','hadith','تبسمك في وجه أخيك لك صدقة'),
 ('choice_warmth',7,'G7','H7','hadith','لَا تَحْقِرَنَّ مِنَ المَعْرُوفِ شَيْئاً، وَلَوْ أَنْ تَلْقَى أَخَاكَ بِوَجْهٍ طَلْقٍ'),
 ('choice_good_company',8,'G8','H8','hadith','ورجلان تحابا في الله اجتمعا عليه وتفرقا عليه'),
 ('comparison_good',16,'G16','H16','hadith','لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيِه مَا يُحِبُّ لِنَفْسِهِ'),
 ('comparison_contentment',17,'F17','H17','quran','ولا تتمنوا ما فضل الله به بعضكم على بعض'),
 ('comparison_effort',17,'G17','I17','hadith','احرص على ما ينفعك واستعن بالله ولا تعجز'),
 ('comparison_gratitude',18,'F18','H18','quran','ولئن شكرتم لأزيدنكم'),
 ('comparison_blessings',18,'G18','I18','hadith','انْظُرُوا إِلَى مَنْ أَسْفَلَ مِنْكُمْ، وَلَا تَنْظُرُوا إِلَى مَنْ هُوَ فَوْقَكُمْ، فَهُوَ أَجْدَرُ أَنْ لَا تَزْدَرُوا نِعْمَةَ اللهِ عَلَيْكُمْ'),
 ('comparison_dignity',19,'F19','H19','quran','وَلَقَدْ كَرَّمْنَا بَنِي آدَمَ'),
 ('exclusion_patience',20,'F20','H20','quran','ادْفَعْ بِالَّتِي هِيَ أَحْسَنُ'),
 ('bullying_protection',21,'F21','H21','quran','وَالَّذِينَ إِذَا أَصَابَهُمُ الْبَغْيُ هُمْ يَنتَصِرُونَ'),
 ('bullying_strength',21,'G21','I21','hadith','الْمُؤْمِنُ الْقَوِيُّ خَيْرٌ وَأَحَبُّ إِلَى اللَّهِ مِنَ الْمُؤْمِنِ الضَّعِيفِ، وَفِي كُلٍّ خَيْرٌ'),
 ('bullying_witness',22,'G22','H22','hadith','المسلم أخو المسلم لا يظلمه ولا يُسْلِمُهُ'),
 ('bullying_humility',23,'F23','H23','quran','لَا يَسْخَرْ قَوْمٌ مِّن قَوْمٍ عَسَىٰ أَن يَكُونُوا خَيْرًا مِّنْهُمْ'),
 ('bullying_no_appearance',23,'G23','I23','hadith','مَا تَضْحَكُونَ؟ لَرِجْلُ عَبْدِ اللَّهِ أَثْقَلُ فِي الْمِيزَانِ مِنْ أُحُدٍ'),
 ('bullying_repair_verse',24,'F24','H24','quran','إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ'),
 ('bullying_repair',24,'G24','I24','hadith','اتَّقِ اللَّهِ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ')
]
short = {2:'نختار أصحابًا صادقين يعينوننا على الخير.',3:'نساعد بعض في الأشياء الطيبة.',4:'نتكلم بكلام طيب ولطيف.',5:'ما نسخر من أحد أو نقلل منه.',6:'نبدأ بالسلام.',7:'نقابل الآخرين بوجه بشوش.',8:'نختار صحبة تعيننا على الخير.',16:'نحب الخير لأصحابنا مثل ما نحبه لأنفسنا.',17:'عندنا مهارات مختلفة، ونقدر نتعلم ونحاول.',18:'نلاحظ النعم اللي عندنا ونشكر الله عليها.',19:'الله كرّم الناس؛ المقارنة ما تقلل من قيمتك.',20:'نقدر نتعامل بلطف ونأخذ وقتنا في تكوين الصداقة، من غير ما نقبل الأذى.',21:'ما تقبل الأذى، وتستعين بشخص كبير تثق فيه. مو لازم تواجهه لحالك.',22:'ما نشارك في التنمر، ونساعد المتأذي بطريقة آمنة.',23:'ما نسخر من شكل أحد أو من الأشياء اللي عنده.',24:'إذا غلطنا، نوقف التصرف ونحاول نصلحه بخُلُق حسن.'}
for id,row,cell,refcell,kind,quote in extra:
    meaning = sheet[f'E{row}'].value.strip()
    specs.append((id,row,cell,refcell,kind,quote,'مرجع الفريق — '+sheet[f'D{row}'].value.strip(),short[row],short[row]))
cards = []
for id,row,cell,refcell,kind,quote,reference,child,simple in specs:
    assert quote in sheet[cell].value, (cell, 'excerpt must occur verbatim in workbook')
    cards.append({'id':id,'title':sheet[f'D{row}'].value.strip(), 'sourceQuote':quote,
        'quoteIntroduction':'من قول الله تعالى:' if kind=='quran' else 'من الحديث الوارد في المرجع:',
        'sourceReference':reference,'sourceUrl':sheet[refcell].value.strip(),'isExcerpt':True,
        'kind':kind,'permittedExplanation':sheet[f'E{row}'].value.strip(),
        'childExplanation':child,'simpleExplanation':simple,
        'keywords':[x.strip() for x in sheet[f'C{row}'].value.split('،') if x.strip()],
        'boundaries':['المعنى الرئيسي من صف الإكسل نفسه؛ لا تضف حكمًا دينيًا أو ثوابًا أو نصًا من خارجه.',
          'الكلمات المفتاحية قرائن وليست قرارًا؛ افهم النفي ودور المتحدث والموقف كاملًا.',
          'لا تجبر الطفل على المسامحة أو التواصل مع من يؤذيه، ولا تجعل حماية نفسه مسؤوليته وحده.',
          'التطبيق اقتراح مناسب للسياق؛ لا تعد بنتيجة أو تفترض النوايا، ولا تجعل الرأي الخاطئ أو المؤذي صحيحًا لمجرد الاختلاف.'],
        'referenceLinks':list(dict.fromkeys(sheet[f'{c}{row}'].value.strip() for c in 'HI' if sheet[f'{c}{row}'].value)),
        'reviewStatus':'draft','workbook':{'version':version,'sheet':sheet_name,'row':row,'quoteCell':cell,
          'meaningCell':f'E{row}','referenceCell':refcell,'linkVerification':'pending'}})
category_specs=[('conflict',9),('interpretation',10),('greeting',11),('respect',12),('anger',13),('restraint',14),('reconciliation',15)] + [(f'value_{r}',r) for r in list(range(2,9))+list(range(16,25))]
scope={'version':version,'activeDomain':'الصداقات والعلاقات','activeDomains':list(dict.fromkeys(x['domain'] for x in rows)),'provenance':f'{path.name}: {sheet_name}!A2:I24',
 'authority':'Only the selected workbook rows and their quotation records authorize religious content. Headings and keywords alone are not evidence.',
 'categories':[{'id':id,'label':sheet[f'D{row}'].value.strip(),'scope':sheet[f'E{row}'].value.strip(),
   'branch':next(x['branch'] for x in rows if x['row']==row),
   'domain':next(x['domain'] for x in rows if x['row']==row),
   'keywords':[x.strip() for x in sheet[f'C{row}'].value.split('،') if x.strip()],
   'sourceIds':[x['id'] for x in cards if x['workbook']['row']==row]} for id,row in category_specs]}
for name,data in [('workbook-snapshot.json',snapshot),('sources.json',cards),('scope.json',scope)]:
    (root/'src/content'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Imported {len(cards)} exact excerpts from {sheet_name}!A2:I24; workbook SHA256 {snapshot["sha256"]}')
