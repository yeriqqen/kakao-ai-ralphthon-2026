import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const workspaceDir = path.dirname(path.dirname(here));
const build = path.join(workspaceDir, '.presentation-build-v2');
const moduleRoot = process.env.RUNTIME_NODE_MODULES;
const SKILL_DIR = process.env.PRESENTATIONS_SKILL_DIR;
const python = process.env.RUNTIME_PYTHON;
if (!moduleRoot || !SKILL_DIR || !python) throw new Error('Set RUNTIME_NODE_MODULES, PRESENTATIONS_SKILL_DIR and RUNTIME_PYTHON to the installed Codex workspace runtime.');
await fs.mkdir(build, {recursive:true});
const require = createRequire(path.join(moduleRoot, '_entry.cjs'));
const {Presentation, PresentationFile} = require('@oai/artifact-tool');
const {finalizePresentation} = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')));
const C = {ink:'#1B5147',paper:'#F6F7F2',muted:'#64756D',lime:'#E4F4A2',white:'#FFFFFF',amber:'#986224'};
const presentation=Presentation.create({slideSize:{width:1280,height:720}});
const evidence=JSON.parse(await fs.readFile(path.join(here,'slides.evidence.json'),'utf8'));
function text(s,value,x,y,w,h,size=30,color=C.ink,bold=false){
 const box=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 box.text=value;box.text.style={typeface:'Arial',fontSize:size,color,bold,autoFit:'none',verticalAlignment:'top',wrap:true};return box;
}
function page(n,title,dark=false){
 const s=presentation.slides.add();s.background.fill=dark?C.ink:C.paper;
 if(title)text(s,title,72,60,1136,85,52,dark?C.white:C.ink,true);
 text(s,'YOKOBU v2 · Fictional institutions · Simulated calls only',72,666,1030,30,19,dark?'#DDECCF':C.muted);
 text(s,`${n} / 5`,1135,666,75,30,19,dark?'#DDECCF':C.muted);return s;
}
const base='Team-defined YOKOBU v2 scope, including the later instruction to use separate tabs on this laptop instead of two actual phones. No real telephone calls or real institution search. User value is Unverified. Official submission: https://ralphthon.org/kakao-ai-dot-2026/#process . Official three-minute guide: https://ralphthon.org/kakao-ai-dot-2026/student-preparation.pdf .';
{
 const s=page(1,null,true);
 text(s,'YOKOBU',72,60,1120,105,84,C.lime,true);
 text(s,'A text interface for\nKorean business conversations',72,209,1136,153,58,C.white,true);
 text(s,'For expats, tourists, and deaf or hard-of-hearing\nusers in Korea who need information or help.',76,414,1120,99,32,C.white);
 text(s,'Language and accessibility barriers can prevent people\nfrom getting the information they need by phone.',76,548,1110,81,27,'#DDECCF');
 s.speakerNotes.textFrame.setText(base+'\n0:00–0:25. Explain the intended users and problem. This is a product hypothesis, not a claim of validated demand.');
}
{
 const s=page(2,'The customer experience');
 const rows=[
 ['01','Describe a need','English by default, with Russian and Chinese options.'],
 ['02','Clarify through chat','OpenAI generates the interview and a concrete call plan.'],
 ['03','Review and authorize','Choose a fictional institution, then explicitly say Yes.'],
 ['04','Resolve questions in Korean','Realtime voice speaks to the teammate. Unknown details return to chat.'],
 ['05','Receive the result','A conversation-grounded summary and a reasoned recommendation.'],
 ];
 rows.forEach(([number,title,body],i)=>{const y=167+i*93;text(s,number,74,y,82,61,38,C.muted);text(s,title,173,y,1034,47,32,C.ink,true);text(s,body,175,y+44,1022,39,25,C.muted);});
 s.speakerNotes.textFrame.setText(base+'\n0:25–0:55. Show the clean chat interface and language selection. The interview, institutions and required questions come from the model. These are intended runtime steps; the current verification status is on slide four.');
}
{
 const s=page(3,'The laptop demonstration');
 text(s,'Planned acceptance run using real OpenAI services',74,143,1100,43,25,C.amber,true);
 text(s,'CUSTOMER TAB',74,223,535,42,24,C.muted,true);
 text(s,'“I want to go to a hospital.”',74,277,572,58,34,C.ink,true);
 text(s,'Answer the AI’s questions.\nReview the plan and authorize.\nReply to unknown details in chat.',74,364,565,146,29);
 text(s,'BUSINESS TAB',714,223,493,42,24,C.muted,true);
 text(s,'Inactive until authorized\nand accepted',714,277,492,92,34,C.ink,true);
 text(s,'The teammate accepts the call.\nSpeak Korean through the laptop’s\nmicrophone and speaker.',714,387,492,134,28);
 text(s,'The teammate asks a detail the interview has not covered.\nThe AI asks the customer, waits, and relays the answer in Korean.',74,543,1129,78,27,C.muted);
 text(s,'Completion requires every required answer and a confirmed readback.',74,624,1129,29,21,C.muted);
 s.speakerNotes.textFrame.setText(base+'\n0:55–2:00. Open a separate business tab on the same laptop. It must remain inactive before customer authorization. Accept only when incoming. Use fictional customer details and business answers. Choose an unknown customer detail based on the actual interview, rather than assuming prior-visit status is unknown. If API credit is still blocked, show the explicit blocker and do not present synthetic fixtures as a live run.');
}
{
 const s=page(4,'What is verified');
 text(s,'Customer interface and Codex checks',74,163,1120,45,31,C.ink,true);
 text(s,evidence.interface,74,211,1120,54,28);
 text(s,evidence.interfaceBoundary,74,266,1120,43,23,C.muted);
 text(s,'Live OpenAI conversation',74,335,1120,45,31,C.ink,true);
 text(s,evidence.api,74,386,1120,58,28,C.amber,true);
 text(s,'Korean microphone and audible Realtime speech',74,476,1120,45,31,C.ink,true);
 text(s,evidence.voice,74,526,1120,54,28,C.amber,true);
 text(s,'Codex built call-state rules and UI checks. We tested connection loss,\nunknown-detail relay, and incomplete endings against explicit expectations.',74,603,1130,54,22,C.muted);
 s.speakerNotes.textFrame.setText(base+'\n2:00–2:30. Evidence source: artifacts/v2/customer-ui-check.json and the integration checkpoint recorded in verification.md. Browser checks use mocked API routes, not real models or speech. State completion rules are an implementation boundary, not proof of a live successful call.');
}
{
 const s=page(5,'Value hypothesis and scope');
 text(s,'Can a text conversation reduce the barrier\nto getting help from a Korean business?',74,179,1135,121,42,C.ink,true);
 text(s,'User value: Unverified',74,357,1120,66,43,C.amber,true);
 text(s,'No feedback from actual target users has been collected.',74,428,1120,49,28);
 text(s,'Today’s scope',74,520,1100,42,31,C.ink,true);
 text(s,'Fictional institutions. Simulated calls in two laptop tabs.\nNo real calls, real discovery, or reception/doctor sheets.',74,570,1120,82,27,C.muted);
 s.speakerNotes.textFrame.setText(base+'\n2:30–3:00. Show the resulting summary and recommendation only if a real conversation has produced them. Explain unresolved information and testing limits. Describe the representative Codex contribution: dynamic state and authorization checks, language coverage, and explicit synthetic-vs-live evidence. Do not claim target-user validation.');
}
const revision=String(Date.now());
const candidatePath=path.join(build,`candidate-${revision}.pptx`);
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
for(let i=0;i<presentation.slides.items.length;i++){
 const png=await presentation.export({slide:presentation.slides.items[i],format:'png',scale:2});
 await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await png.arrayBuffer()));
}
await fs.writeFile(path.join(build,'slides.content.json'),JSON.stringify(presentation.toProto(),null,2));
const finalDir=path.join(build,'finalized');await fs.mkdir(finalDir,{recursive:true});
const finalPath=path.join(finalDir,`slides-${revision}.pptx`);
await finalizePresentation({workspaceDir,candidatePath,finalPath,pythonExecutable:python,
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
 explicitTotalSlideCount:5,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:['Arial']},verifyArtifactToolImport:true,
 receiptPath:path.join(build,`slides-${revision}.validation.json`)});
await fs.copyFile(finalPath,path.join(here,'slides.pptx'));
console.log(path.join(here,'slides.pptx'));
