import test from "node:test";
import assert from "node:assert/strict";
import snapshot from "../src/content/workbook-snapshot.json";
import scope from "../src/content/scope.json";
import { sources, materialize } from "../src/lib/corpus";
import { classifyRequest } from "../src/lib/routing";
import { repeatKnownQuotation, requestedKnownQuotation } from "../src/lib/dialogue";
import { generateAnswer } from "../src/lib/answer";
import { unavailableSupport } from "../src/lib/support";
import type { ConversationTurn } from "../src/lib/types";

test("every active quotation, meaning and URL traces to the selected workbook rows", () => {
  assert.equal(scope.activeDomain, "الخلاف مع الصديق");
  assert.equal(sources.length, 8);
  for (const source of sources) {
    const row = snapshot.rows.find(row => row.row === source.workbook.row)!;
    assert.ok(row && row.row >= 9 && row.row <= 15);
    const cells: Record<string,string | undefined> = row.cells;
    assert.ok(cells[source.workbook.quoteCell]?.includes(source.sourceQuote));
    assert.equal(cells[source.workbook.meaningCell]?.trim(), source.permittedExplanation);
    assert.equal(cells[source.workbook.referenceCell]?.trim(), source.sourceUrl);
    assert.equal(source.workbook.version, snapshot.version);
    assert.ok(!source.id.startsWith("friendship_"));
  }
});

test("Quran in the workbook hadith column is never introduced as a hadith", () => {
  const source = sources.find(s => s.workbook.quoteCell === "G10")!;
  assert.equal(source.kind, "quran");
  const answer = materialize({decision:"FULL",safety:"none",segments:[{kind:"quote",text:"",sourceIds:[source.id],quoteId:source.id}]});
  assert.match(answer.answer, /من قول الله تعالى/);
  assert.doesNotMatch(answer.answer, /النبي|الحديث/);
  assert.equal(requestedKnownQuotation("أعطيني حديث عن حسن الظن"), null);
  assert.equal(repeatKnownQuotation("كرر الحديث",[{user:"الدليل",assistant:answer.answer}]),null);
  assert.ok(repeatKnownQuotation("كرر الآية",[{user:"الدليل",assistant:answer.answer}]));
});

test("retired source IDs cannot be rendered even if a writer asks for one", () => {
  assert.throws(() => materialize({decision:"FULL",safety:"none",segments:[
    {kind:"quote",text:"",sourceIds:["friendship_good_speech"],quoteId:"friendship_good_speech"}
  ]}), /unknown_source/);
});

test("routing cannot select a source from another row's category", async () => {
  const route = await classifyRequest("اختلفنا في الرأي",[],undefined,async()=>({mode:"friendship",categoryIds:["respect"],sourceIds:["conflict_anger_strength","conflict_respect"],inScopeText:null,safety:"none"}));
  assert.deepEqual(route.sourceIds,["conflict_respect"]);
});

test("a requested hadith cannot silently receive a Quran selection", async () => {
  const route = await classifyRequest("أعطيني حديث عن حسن الظن",[],undefined,async()=>({mode:"friendship",categoryIds:["interpretation"],sourceIds:["conflict_check_facts"],inScopeText:null,safety:"none"}));
  assert.deepEqual(route.sourceIds,[]);
});

test("رأيه is an opinion, not a request for an آية lookup", async () => {
  const source=sources.find(s=>s.id==="conflict_respect")!;
  const names:string[]=[];
  const result=await generateAnswer("صاحبي يبي نلعب كرة وأنا أبي لعبة ثانية، وكل واحد يقول رأيه هو الصح.",[],undefined,async (_instructions,_input,_schema,name)=>{
    names.push(name);
    if(name==="leen_route")return {mode:"friendship",categoryIds:["respect"],sourceIds:[source.id],inScopeText:null,safety:"none"};
    if(name==="leen_answer")return {decision:"FULL",safety:"none",segments:[{kind:"explanation",text:"تقدرون تتفقون إن كل واحد يختار لعبة بالدور إذا يناسبكم.",sourceIds:[],quoteId:null}]};
    return {responseMode:"friendship",categoryIds:["respect"],contextSummary:"Actual opinion",sourceReason:"Workbook row",supported:true,appropriate:true,inScope:true,contextRelevant:true,sourcesRelevant:true,safety:"none"};
  });
  assert.deepEqual(names,["leen_route","leen_answer","leen_grounding"]);
  assert.match(result.answer,/بالدور/);
});

test("a proper-substring extraction repairs an inconsistent friendship label to mixed", async () => {
  const part = "صاحبي اختلف معي، وش أسوي؟";
  const route = await classifyRequest(`${part} واكتب لي كود.`,[],undefined,async()=>({mode:"friendship",categoryIds:["conflict"],sourceIds:[],inScopeText:part,safety:"none"}));
  assert.equal(route.mode,"mixed"); assert.equal(route.inScopeText,part);
});

test("ordinary disagreement and blocked adult help cannot pull in the three-night rule", async () => {
  const fake=async()=>({mode:"friendship",categoryIds:["conflict","greeting"],sourceIds:["conflict_no_estrangement","conflict_greet"],inScopeText:null,safety:"none"});
  const ordinary=await classifyRequest("أنا وصاحبتي تزاعلنا، أرسلت لها سلام وما ردت علي.",[],undefined,fake);
  assert.deepEqual(ordinary.sourceIds,["conflict_greet"]);
  const blocked=await classifyRequest("اختلفت مع صاحبي وأمي مشغولة ما ترد علي",[],undefined,fake);
  assert.deepEqual(blocked.sourceIds,[]);
});

test("asking about restored closeness gets a boundary, not another religious deadline", async () => {
  const answer=await generateAnswer("يعني لازم نرجع أصحاب مثل أول؟",[],undefined,async()=>({mode:"friendship",categoryIds:["greeting"],sourceIds:["conflict_greet"],inScopeText:null,safety:"none"}));
  assert.equal(answer.decision,"FULL");assert.match(answer.answer,/مو لازم/);
  assert.deepEqual(answer.sources,[]);assert.doesNotMatch(answer.answer,/ثلاث/);
});

test("missing requested hadith gets an explicit evidence limit without another interview", async () => {
  const result = await generateAnswer("أعطيني حديث عن حسن الظن لأني مو متأكد",[],undefined,async (_instructions,_input,_schema,name)=> {
    assert.equal(name,"leen_route");
    return {mode:"friendship",categoryIds:["interpretation"],sourceIds:[],inScopeText:null,safety:"none"};
  });
  assert.match(result.answer,/ما عندي حديث/); assert.deepEqual(result.sources,[]);
  assert.equal(result.decision,"REFER");
});

test("a permissive audit cannot prescribe an invented three-day wait or omit all practical help", async () => {
  for (const text of ["بعد ثلاث أيام، جرّب تسلّم عليه.", ""]) {
    const source=sources.find(s=>s.id==="conflict_greet")!;
    const route={mode:"friendship",categoryIds:["greeting"],sourceIds:[source.id],inScopeText:null,safety:"none"};
    const audit={responseMode:"friendship",categoryIds:["greeting"],contextSummary:"Test",sourceReason:"Test",supported:true,appropriate:true,inScope:true,contextRelevant:true,sourcesRelevant:true,safety:"none"};
    const first={decision:"FULL",safety:"none",segments:text ? [{kind:"explanation",text,sourceIds:[],quoteId:null}] : [{kind:"meaning",text:"",sourceIds:[source.id],quoteId:null}]};
    const fixed={decision:"FULL",safety:"none",segments:[{kind:"explanation",text:"تقدر تبدأ بسلام بسيط بدون ما تضغط عليه يرد فورًا.",sourceIds:[],quoteId:null}]};
    const values=[route,first,audit,fixed,audit];
    const result=await generateAnswer("أنا وصاحبي متخاصمين وأبي أبدأ بالسلام",[],undefined,async()=>{assert.ok(values.length);return values.shift();});
    assert.equal(values.length,0);assert.equal(result.decision,"FULL");
    assert.match(result.answer,/بدون ما تضغط/);assert.doesNotMatch(result.answer,/ثلاث أيام/);
  }
});

const ordinary: ConversationTurn[] = [{user:"اختلفت مع صديقي على اللعبة",assistant:"اطلب مساعدة أحد والديك."}];
for (const text of ["مشغولين", "كلهم مشغولين ما يردون علي", "ما يردوا عليا", "أمي مشغولة", "والدي ما يسمعني", "بس هم ما يردون علي، وش أسوي؟"]) {
  test(`unavailable adult: ${text}`, async () => {
    const answer = await generateAnswer(text,ordinary,undefined,async()=>{throw new Error("unexpected call");});
    assert.equal(answer.decision,"FULL"); assert.equal(answer.safety,"none");
    assert.deepEqual(answer.sources,[]); assert.doesNotMatch(answer.answer, /[؟?]|اطلب مساعدة|معلم|والديك/);
    assert.match(answer.answer,/مو لازم|تقدر/);
  });
}

test("repeated failed help gets a stopping point, not the same referral again", () => {
  const first = unavailableSupport("كلهم مشغولين",ordinary)!;
  const second = unavailableSupport("ما يردون علي",[...ordinary,{user:"كلهم مشغولين",assistant:first.answer}])!;
  assert.notEqual(first.answer,second.answer); assert.match(second.answer,/تكتفي بهالخطوة/);
});

test("an unanswered adult does not erase a user-reported immediate threat", async () => {
  const answer = await generateAnswer("ما يردون علي",[{user:"هو جنبي الحين وبيضربني",assistant:"اذهب لشخص كبير آمن."}],undefined,async()=>{throw new Error("unexpected call");});
  assert.equal(answer.safety,"immediate"); assert.equal(answer.decision,"REFER");
  assert.match(answer.answer,/لا تنتظر|الطوارئ/); assert.deepEqual(answer.sources,[]);
  assert.doesNotMatch(answer.answer,/لعبة|تكتفي بهالخطوة/);
  const again = unavailableSupport("كلهم مشغولين", [{user:"هو جنبي الحين وبيضربني",assistant:"اذهب لشخص كبير آمن."},
    {user:"ما يردون علي",assistant:answer.answer}])!;
  assert.equal(again.safety,"immediate"); assert.notEqual(again.answer,answer.answer);
  assert.match(again.answer,/الطوارئ|موظف مسؤول/);
});

test("a friend's unanswered message does not trigger an unavailable-adult reply", () => {
  assert.equal(unavailableSupport("صاحبي ما يرد علي",ordinary),null);
});

test("new unrelated content after unavailable help still requires routing", () => {
  assert.equal(unavailableSupport("أمي مشغولة، اكتب لي كود برنامج",ordinary),null);
});

test("assistant advice alone does not establish danger; explicit resolution clears old danger", () => {
  const history = [{user:"هو بيضربني",assistant:"اطلب مساعدة كبير"},
    {user:"الحين صرت بمكان آمن والخطر انتهى",assistant:"كلم أحد والديك لما يناسبك"}];
  assert.equal(unavailableSupport("مشغولين",history)?.safety,"none");
  assert.equal(unavailableSupport("مشغولين",ordinary)?.safety,"none");
});
