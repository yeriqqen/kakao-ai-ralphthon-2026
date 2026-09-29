# English guide to the Korean microphone script

This is a **fictional, simulated conversation**. A teammate reads the receptionist lines below into the microphone. All instructions and meanings here are in English.

These are approximate pronunciation aids for rehearsal, not a guarantee that speech recognition will understand a first attempt. Read slowly, one line at a time. If recognition is wrong, repeat the line or review and edit the transcript; edited input is recorded separately from unedited microphone input. Leave unclear facts **Unclear**.

## Reading the sound hints

- Hyphens separate short sound chunks; they do not indicate strong English stress.
- **a** is approximately “ah”; **i** is “ee”; **u** is “oo.”
- **eo** is approximately “uh,” and is one vowel, not “ee-oh.”
- **eu** is a Korean vowel with no exact English equivalent: try a short “oo” with relaxed, unrounded lips.
- **ui** combines that **eu** sound with **ee** in one syllable.
- **ss** indicates a firmer “s.” **sh** in these hints helps approximate the sound before **i**.

The spelling reference is the [National Institute of Korean Language's romanization guide](https://www.korean.go.kr/front_eng/roman/roman_01.do). The hyphenated hints below are our approximate pronunciation aids, not official word-for-word romanizations or certified pronunciation.

## Before speaking

Open `http://localhost:4173` in Chrome and start the fictional example. In the receptionist panel, the large green **마이크로 답하기** button means **Speak into the microphone**. Allow the microphone prompt when you are ready. Say one line, review the recognized words, then press **이 답변 전달하기 →**, meaning **Send this reply**.

### 1. The clinic is open

**Korean:** 네, 오늘 진료합니다.

**Say:** Ne, o-neul jil-lyo-ham-ni-da.

**Meaning:** Yes, we are seeing patients today.

### 2. Ask a follow-up already covered by the interview

**Korean:** 아이는 몇 살인가요?

**Say:** A-i-neun myeot ssa-rin-ga-yo?

**Meaning:** How old is the child?

**Expected behavior:** The assistant answers that the child is seven, using the information already entered. It does not need to ask the Russian user again.

### 3. The female doctor is unavailable today

**Korean:** 오늘 여자 의사 선생님은 진료하지 않습니다.

**Say:** O-neul yeo-ja ui-sa seon-saeng-ni-meun jil-lyo-ha-ji an-sseum-ni-da.

**Meaning:** The female doctor is not seeing patients today.

### 4. Another doctor is available

**Korean:** 다른 의사 선생님은 진료 가능합니다.

**Say:** Da-reun ui-sa seon-saeng-ni-meun jil-lyo ga-neung-ham-ni-da.

**Meaning:** Another doctor can see the patient.

### 5. Ask the unknown question — then wait

**Korean:** 처음 방문하시나요?

**Say:** Cheo-eum bang-mun-ha-shi-na-yo?

**Meaning:** Is this your first visit?

**Expected behavior:** The assistant pauses and shows the Russian user **Вы впервые в этой клинике?** The user types **Да** (yes) and presses **Передать** (send). The assistant then says **네, 처음 방문입니다.**, meaning **Yes, this is our first visit**, and continues its Korean question. The receptionist must wait for that explicit answer.

### 6. Patients without national health insurance are accepted

**Korean:** 국민건강보험이 없어도 진료받을 수 있습니다.

**Say:** Gung-min geon-gang-bo-heo-mi eop-sseo-do jil-lyo-ba-deul ssu it-sseum-ni-da.

**Meaning:** The patient can be seen even without national health insurance.

### 7. Consultation costs approximately 20,000 won

**Korean:** 진찰료는 약 2만 원입니다.

**Say:** Jin-chal-lyo-neun yak i-man wo-nim-ni-da.

**Meaning:** The consultation fee is approximately twenty thousand won. **2만** is read **i-man**.

### 8. The current wait is 15 minutes

**Korean:** 지금 대기 시간은 15분입니다.

**Say:** Ji-geum dae-gi shi-ga-neun shi-bo bu-nim-ni-da.

**Meaning:** The current wait is fifteen minutes. **15** here is read **shi-bo**, joining the Korean words for ten and five.

## Finish and preserve the actual result

Press **Завершить и показать результат →** (Finish and show the result). Check the Russian summary and the Korean sample sheets. Only check the optional audible-Korean checkbox if someone actually heard the speech. Press **Сохранить результат JSON ↓** (Save result JSON).

Report in English whether the spoken replies were recognized, the Korean assistant was audible, and the first-visit relay worked. Mention any edited or typed replies. An inserted script line or generated-voice playback is synthetic input, not proof of a teammate speaking through the microphone.

See the [English control key and three-minute sequence](demo-guide.md) for the other buttons. This guide adds rehearsal support; it does not establish microphone success or user value.
