"""Read-only import of the agreed blue domain; never edits the team workbook.

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
for row in range(9, 16):
    branch = sheet[f'B{row}'].value or branch
    rows.append({'row': row, 'branch': branch.strip(), 'cells': {
        f'{col}{row}': sheet[f'{col}{row}'].value for col in 'ABCDEFGHI'
        if sheet[f'{col}{row}'].value is not None
    }})
version = '2026-10-05.workbook-v2.conflict'
snapshot = {'version': version, 'fileName': path.name,
    'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    'sheet': sheet_name, 'domain': sheet['A9'].value,
    'selection': 'A9:I15; blue domain fill FFA2C4C9, branch fill FF76A5AF',
    'rows': rows,
    'notes': ['G10 contains Quran (49:12) in the hadith column; classified as Quran without changing the quotation.',
              'Only the blue domain is active. Other workbook domains and the previous corpus are excluded.',
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
        'reviewStatus':'draft','workbook':{'version':version,'sheet':sheet_name,'row':row,'quoteCell':cell,
          'meaningCell':f'E{row}','referenceCell':refcell,'linkVerification':'pending'}})
category_specs=[('conflict',9),('interpretation',10),('greeting',11),('respect',12),('anger',13),('restraint',14),('reconciliation',15)]
scope={'version':version,'activeDomain':'الخلاف مع الصديق','provenance':f'{path.name}: {sheet_name}!A9:I15',
 'authority':'Only the selected workbook rows and their quotation records authorize religious content. Headings and keywords alone are not evidence.',
 'categories':[{'id':id,'label':sheet[f'D{row}'].value.strip(),'scope':sheet[f'E{row}'].value.strip(),
   'branch':next(x['branch'] for x in rows if x['row']==row),
   'keywords':[x.strip() for x in sheet[f'C{row}'].value.split('،') if x.strip()],
   'sourceIds':[x['id'] for x in cards if x['workbook']['row']==row]} for id,row in category_specs]}
for name,data in [('workbook-snapshot.json',snapshot),('sources.json',cards),('scope.json',scope)]:
    (root/'src/content'/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Imported {len(cards)} exact excerpts from {sheet_name}!A9:I15; workbook SHA256 {snapshot["sha256"]}')
