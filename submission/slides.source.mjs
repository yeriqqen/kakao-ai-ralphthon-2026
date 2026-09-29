import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

// Editable deck source. Set RUNTIME_NODE_MODULES and PRESENTATIONS_SKILL_DIR
// to the installed Codex workspace runtime when rebuilding elsewhere.
const here = path.dirname(new URL(import.meta.url).pathname);
const workspaceDir = path.dirname(here);
const build = path.join(workspaceDir, '.presentation-build');
const moduleRoot = process.env.RUNTIME_NODE_MODULES;
const SKILL_DIR = process.env.PRESENTATIONS_SKILL_DIR;
const RUNTIME_PYTHON = process.env.RUNTIME_PYTHON;
if (!moduleRoot || !SKILL_DIR || !RUNTIME_PYTHON) throw new Error('Set RUNTIME_NODE_MODULES, PRESENTATIONS_SKILL_DIR and RUNTIME_PYTHON using the Codex bundled workspace runtime.');
await fs.mkdir(build, {recursive:true});
const require = createRequire(path.join(moduleRoot, '_entry.cjs'));
const {Presentation, PresentationFile} = require('@oai/artifact-tool');
const {finalizePresentation} = await import(pathToFileURL(path.join(SKILL_DIR, 'container_tools/artifact_tool_utils.mjs')));

const palette = {ink:'#1B5147', paper:'#F6F7F2', muted:'#64756D', lime:'#E4F4A2', white:'#FFFFFF', amber:'#986224'};
const font = 'Apple SD Gothic Neo';
const latin = 'Arial';
const presentation = Presentation.create({slideSize:{width:1280,height:720}});
let evidence = {logic:'규칙 기반 처리와 화면 흐름: 검증 진행 중', audio:'실제 마이크 대화와 한국어 음성 청취: Unverified', checks:'실행 결과는 제출 전 검증 보고서와 함께 확인합니다.'};
try { evidence = {...evidence,...JSON.parse(await fs.readFile(path.join(here, 'slides.evidence.json'),'utf8'))}; } catch {}

function text(slide,content,x,y,w,h,size=30,color=palette.ink,bold=false,typeface=font){
  const s=slide.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
  s.text=content;
  s.text.style={typeface,fontSize:size,color,bold,autoFit:'none',verticalAlignment:'top',wrap:true};
  return s;
}
function page(n,title,dark=false){
  const s=presentation.slides.add();
  s.background.fill=dark?palette.ink:palette.paper;
  if(title) text(s,title,72,58,1136,85,52,dark?palette.white:palette.ink,true);
  text(s,'YOKOBU · Simulated call · 실제 전화 없음',72,665,1020,32,20,dark?'#DDECCF':palette.muted,false,latin);
  text(s,`${n} / 5`,1130,665,85,32,20,dark?'#DDECCF':palette.muted,false,latin);
  return s;
}
const notesBase='All clinic facts and patient details in this deck are fictional simulation fixtures authorized by the team. No actual call or verified clinic fact is claimed. Product-value status is Unverified without user feedback. Official five-page PDF requirement: https://ralphthon.org/kakao-ai-dot-2026/#process . Three-minute judging guide: https://ralphthon.org/kakao-ai-dot-2026/student-preparation.pdf .';

{
const s=page(1,null,true);
text(s,'YOKOBU',72,57,1100,108,84,palette.lime,true,latin);
text(s,'전화로만 확인할 수 있는\n생활 정보',72,205,1136,155,60,palette.white,true);
text(s,'한국의 외국인 거주자와 관광객, 농인·난청인을 위한\nAI 음성 컨시어지 데모',76,410,1132,90,32,palette.white);
text(s,'한국어 전화는 언어와 청각 접근성 장벽을 만듭니다.\n번역 앱과 온라인 목록만으로 확인하기 어려운 정보를 다룹니다.',76,543,1120,78,26,'#DDECCF');
s.speakerNotes.textFrame.setText(notesBase+'\n0:00–0:25. 고객과 문제를 소개합니다. 핵심 정보가 전화로만 확인되는 상황에 집중한다고 설명합니다.');
}
{
const s=page(2,'사용자 흐름');
const rows=[
 ['01','러시아어 요청','누락된 나이·증상·보험 정보만 확인'],
 ['02','한국어 통화 계획','사용자가 “Start simulation”으로 시작'],
 ['03','한국어 음성 대화','팀원이 마이크로 답변, 모르는 질문은 러시아어로 전달'],
 ['04','러시아어 요약과 한국어 서류','대화에서 확인한 내용과 가상 입력 정보로 작성'],
];
rows.forEach(([num,head,body],i)=>{
 const y=171+i*100;
 text(s,num,74,y,82,64,42,palette.muted,false,latin);
 text(s,head,177,y+1,995,50,34,palette.ink,true);
 text(s,body,178,y+49,1000,40,25,palette.muted);
});
text(s,'사용자는 듣거나 말하지 않고 텍스트만으로 참여합니다.',73,592,1130,43,28,palette.ink,true);
s.speakerNotes.textFrame.setText(notesBase+'\n0:25–0:55. 사용자 화면과 접수자 화면 모두 Simulated call로 표시합니다. 한국어 계획을 보여주고 사용자가 시작합니다. 실제 전화 연결은 하지 않습니다.');
}
{
const s=page(3,'가상 진료 문의와 즉석 질문');
text(s,'데모용 가상 정보 — 실제 환자 정보 아님',74,139,1120,43,25,palette.amber,true);
text(s,'가상 입력',74,213,590,43,29,palette.ink,true);
text(s,'7세, 기침 2일\n국민건강보험 없음',74,257,590,88,30);
text(s,'시뮬레이션의 기대 답변',74,369,590,40,28,palette.ink,true);
text(s,'영업 중, 여성 의사 오늘 불가\n다른 의사 가능, 무보험 접수 가능\n진료비 약 20,000원, 대기 15분',74,417,596,128,28);
text(s,'처음 방문 여부는 사용자에게 확인',731,213,481,46,28,palette.ink,true);
text(s,'처음 방문하시나요?',731,271,481,43,31);
text(s,'Вы впервые в этой\nклинике?',731,331,481,88,30,palette.muted,false,latin);
text(s,'Да.',731,430,481,45,35,palette.ink,true,latin);
text(s,'네, 처음 방문입니다.',731,490,481,47,31,palette.ink,true);
text(s,'접수용   나이: 7세 / 건강보험: 국민건강보험 없음\n진료용   증상: 기침 / 증상 기간: 2일',74,572,1136,73,25,palette.muted);
s.speakerNotes.textFrame.setText(notesBase+'\n0:55–1:55. 요청: “Узнайте в этой детской клинике, принимает ли сегодня женщина-врач, принимают ли пациентов без корейской государственной медицинской страховки и сколько сейчас ждать.” 팀원이 예상 답변을 말하고 처음 방문 여부를 질문합니다. 사용자가 Да.를 입력하면 한국어로 돌려줍니다. 이 슬라이드는 기대 결과이며 실제 실행 성공의 증거가 아닙니다. 실제 요약은 대화에서 확인한 사실만 포함해야 합니다.');
}
{
const s=page(4,'동작 범위와 검증 상태');
text(s,'규칙 기반 데모',74,164,1100,45,32,palette.ink,true);
text(s,'정해진 표현을 해석하고, 수집한 답으로 요약과 서류를 만듭니다.\n자유 대화를 이해하는 범용 LLM 연동은 구현하지 않았습니다.',74,215,1120,87,28);
text(s,'확인한 동작',74,326,1100,46,32,palette.ink,true);
text(s,evidence.logic,74,379,1120,50,28);
text(s,evidence.checks,74,428,1120,46,25,palette.muted);
text(s,'브라우저 음성인식(STT)과 한국어 음성합성(TTS)',74,500,1120,46,30,palette.ink,true);
text(s,evidence.audio,74,550,1120,55,28,palette.amber,true);
text(s,'미응답·모호한 사실은 Unclear. 확인한 가상 사실은 Confirmed in simulation.',74,616,1120,33,21,palette.muted,false,latin);
s.speakerNotes.textFrame.setText(notesBase+'\n1:55–2:30. Codex에 핵심 흐름과 모르는 정보를 추측하지 않는 조건을 맡겼습니다. 화면과 처리 로직의 자동 검증은 실제 마이크 대화 성공과 구분합니다. 브라우저 음성 인식은 권한과 서비스 가용성에 영향을 받습니다. 최신 근거는 별도 검증 보고서에서 확인합니다.');
}
{
const s=page(5,'사용자 가치 가설과 남은 확인');
text(s,'가치 가설',74,172,1095,50,34,palette.ink,true);
text(s,'한국어 통화를 직접 수행하기 어려운 사용자가\n필요한 정보를 텍스트로 확인할 수 있을까요?',74,230,1136,113,38);
text(s,'Unverified',74,374,1100,58,45,palette.amber,true,latin);
text(s,'실제 사용자 피드백을 아직 받지 않았습니다.',74,438,1110,49,30);
text(s,'오늘의 범위: 클리닉 마이크 시뮬레이션',74,531,1110,47,31,palette.ink,true);
text(s,'실제 전화, 검색, 영구 프로필, 여러 장소 추천, 녹음과 후속 서비스는 제외합니다.\n두 스마트폰 동시 시연 환경은 Unconfirmed입니다.',74,580,1130,72,23,palette.muted);
s.speakerNotes.textFrame.setText(notesBase+'\n2:30–3:00. 실제 사용자 가치가 검증되었다고 주장하지 않습니다. 대화 결과와 접수·진료용 가상 서류를 다시 보여주고 마칩니다. 현재 범위는 한 클리닉 시뮬레이션이며 실제 전화를 걸지 않습니다.');
}

await fs.writeFile(path.join(build,'slides.content.json'),JSON.stringify(presentation.toProto(),null,2));
const revision=String(Date.now());
const candidatePath=path.join(build,`candidate-${revision}.pptx`);
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);
for (let i=0;i<presentation.slides.items.length;i++){
 const slide=presentation.slides.items[i];
 const png=await presentation.export({slide,format:'png',scale:2});
 await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await png.arrayBuffer()));
}
const finalDir=path.join(build,'finalized');
await fs.mkdir(finalDir,{recursive:true});
const finalPath=path.join(finalDir,`slides-${revision}.pptx`);
await finalizePresentation({workspaceDir,candidatePath,finalPath,pythonExecutable:RUNTIME_PYTHON,
 integrityValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_package_integrity.py'),
 layoutValidatorPath:path.join(SKILL_DIR,'container_tools/inspect_presentation_layout_geometry.py'),
 layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit'],
 explicitTotalSlideCount:5,requiredNativeTableOwnerSlides:[],requiredNativeChartOwnerSlides:[],
 fontPolicy:{basis:'design',families:[font,latin]},verifyArtifactToolImport:true,
 receiptPath:path.join(build,`${path.basename(finalPath)}.validation.json`)});
const requestedPath=path.join(here,process.env.SLIDES_PPTX_NAME||'slides.pptx');
await fs.copyFile(finalPath,requestedPath);
console.log(requestedPath);
