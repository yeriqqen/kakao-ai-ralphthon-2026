# Three-minute YOKOBU demonstration

Every input and clinic fact is fictional. Announce **“Simulated call — no actual phone call.”** Use one computer, a teammate in the receptionist role, and the Russian text-user pane. The team confirmed that a teammate can respond through this computer's microphone. Two-phone operation remains Unconfirmed and is not implemented in this local build.

## Before presenting

Run `npm start` and open `http://localhost:4173` in Chrome. Check speaker volume and the selected microphone. Use only the authorized fictional details. Browser speech recognition may use a remote browser-provider service. No audio is recorded by the app. Keep the scripted phrases available. Validate microphone and audible Korean on the actual presentation computer; a text-only fallback must be announced as such.

## English instructions for the team

Team communication and questions should be in **English**. The team has said it does not understand Korean. Whether a teammate can read the receptionist script aloud is **Unconfirmed**; microphone availability alone does not establish this.

The Korean text inside the simulated conversation is part of the required demo. These are the controls you need to operate it:

| Visible control | English meaning / action |
| --- | --- |
| Вставить пример | Insert the fictional Russian request |
| Продолжить | Continue to the short interview |
| Пример: 7 лет, кашель 2 дня, без страховки | Fill the fictional example: age 7, cough for 2 days, no insurance |
| Составить план | Show the Korean conversation plan |
| Start simulation | Begin the simulated conversation |
| 다시 듣기 | Replay the assistant's Korean speech |
| 마이크로 답하기 | Start microphone input; speak one receptionist line |
| 인식한 말 확인 · 필요하면 수정 | Review the recognized words; edit if needed |
| 이 답변 전달하기 | Send the reviewed receptionist reply |
| 가상 접수 시나리오 보기 | Expand the fictional receptionist script |
| 다음 가상 답변 삽입 | Insert synthetic text instead of microphone input; this does not verify the microphone |
| Передать | Send the Russian user's answer |
| Завершить и показать результат | Finish and show the result |
| Сохранить результат JSON | Save the result and its verification evidence |

At the first-visit checkpoint, the Russian question means **“Is this your first visit to this clinic?”** Type **Да** (Russian for **yes**). The Korean reply means **“Yes, this is our first visit.”** Do not answer on the user's behalf before that input arrives.

After a real microphone attempt, report in English: **Did your spoken replies appear correctly? Could you hear the assistant's Korean speech? Did the first-visit question reach the Russian user and their answer return in Korean?** If anything failed, describe the failed step. Do not report a typed or generated-voice fallback as a teammate microphone run.

## 0:00–0:25 — problem and request

“YOKOBU helps expats, tourists, and deaf or hard-of-hearing people in Korea obtain information that requires a Korean-language call. This demonstration is a microphone simulation; no clinic is contacted.”

Use **Вставить пример**. The request asks whether a female doctor is available, whether patients without Korean national health insurance are accepted, and the wait time.

## 0:25–0:45 — missing details and plan

Collect **7 years**, **cough**, **two days**, **no Korean national health insurance**. Show the Korean call plan. Prior-visit status is not collected. Click **Start simulation**. Point out the simulation labels and Korean AI introduction.

## 0:45–2:15 — microphone conversation and live relay

Click **마이크로 답하기** for each teammate response. Review the transcript and click **이 답변 전달하기**. Each submitted transcript, not the fixture list, determines the result.

| Receptionist says | Intended behavior |
| --- | --- |
| 네, 오늘 진료합니다. | Open, Confirmed in simulation |
| 아이는 몇 살인가요? | Direct answer from interview: 아이는 7세입니다. |
| 오늘 여자 의사 선생님은 진료하지 않습니다. | Female doctor unavailable |
| 다른 의사 선생님은 진료 가능합니다. | Other doctor available |
| 처음 방문하시나요? | Pause; show “Вы впервые в этой клинике?” |
| User types **Да** | Say “네, 처음 방문입니다.”; resume Korean question |
| 국민건강보험이 없어도 진료받을 수 있습니다. | Uninsured patients accepted |
| 진찰료는 약 2만 원입니다. | Approximate ₩20,000 consultation |
| 지금 대기 시간은 15분입니다. | Wait 15 minutes |

If no user answer arrives, show that the simulation waits. If a phrase is not recognized, repeat it clearly, edit the recognized transcript (recorded as edited), or leave it Unclear. Announce an explicitly synthetic text fallback if microphone recognition cannot work. Do not call fallback a successful microphone demonstration.

## 2:15–2:45 — readback and result

Finish. The assistant reads back only supported facts in Korean. Show the Russian summary, six fact labels with transcript evidence, and Korean sheets:

- 접수용: 나이: 7세 / 건강보험: 국민건강보험 없음.
- 진료용: 증상: 기침 / 증상 기간: 2일.
- Both: **데모용 가상 정보 — 실제 환자 정보 아님.**

## 2:45–3:00 — evidence and limits

Explain that text-flow tests and actual microphone verification are separate. Codex built a local phrase-based prototype and checked changed answers and failure cases. No real calls, general-purpose AI integration, or user-value validation are claimed. User value is **Unverified** without target-user feedback. Save the JSON to preserve the actual run if it has not already been saved.

## Recording an actual microphone run

After finishing, the teammate may check the optional “Korean speech was actually audible” checkbox. Click **Сохранить результат JSON**. Preserve the resulting local artifact and report: which responses used microphone, whether the first-visit question was recognized, whether the Russian answer produced audible Korean, whether any text editing/fallback was necessary, and whether the actual summary matched the expected six facts. Do not include raw Codex prompts or session logs in the official submission.
