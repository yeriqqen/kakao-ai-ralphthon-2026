# Audio feasibility and evidence

Inspected on 2026-09-29, approximately 12:25–12:30 KST. These checks establish capability availability only. **Real microphone capture, Korean transcription, audible Korean speech, and a teammate conversation remain Unverified.** No audio was captured, played, or recorded during this inspection. No permission, system setting, account, package, or language pack was changed.

## Observed local environment

| Check | Actual result | What this proves |
| --- | --- | --- |
| `node --version` | `v22.16.0` | Existing Node runtime available |
| `npm --version` | `10.9.2` | Existing package tooling available |
| Chrome application bundle version | `154.0.8037.58` | Desktop Chrome installed |
| Safari application bundle version | `18.4` | Safari installed; no Safari audio run performed |
| `/usr/bin/say -v '?'` | `Yuna ko_KR`; also `Milena ru_RU` | Korean and Russian system voices listed; this command did not speak |
| Bundled Playwright package | `1.62.1` | Existing test harness, no installation needed |
| Playwright browser launch | Installed Chrome launched and closed successfully | Browser UI tests can run with that executable |

Existing test harness paths on this machine:

```text
/Users/yeriqqen/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright
/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

These machine-specific paths are tooling observations, not distributable application dependencies. The standard Playwright browser-cache locations were absent; use the installed Chrome executable for local browser tests.

## Read-only browser capability probe

Playwright launched headless Chrome with a fresh temporary profile. A local test page at `http://localhost:49875/` was fulfilled entirely by a Playwright route; this was not a deployed site. The probe inspected API presence, queried the microphone permission state, enumerated synthesis voices, and called the read-only local language availability API. It did **not** call `getUserMedia()`, recognition `start()`, synthesis `speak()`, `SpeechRecognition.install()`, or a permission-granting API.

Actual output:

```json
{
  "secureContext": true,
  "recognitionConstructor": true,
  "synthesis": true,
  "getUserMedia": true,
  "microphonePermission": "prompt",
  "recognitionProcessLocally": true,
  "recognitionAvailable": "function",
  "koreanLocalAvailability": "downloadable",
  "voiceCount": 157,
  "koreanVoices": [
    { "name": "Yuna", "lang": "ko-KR", "localService": true }
  ]
}
```

`downloadable` is not `available`. This probe does not establish an installed Korean recognition model in the normal Chrome profile. A fresh automated profile's permission state also does not establish the permission state of the actual presentation browser, microphone, or smartphone.

## Browser constraints and implementation guidance

- Chrome added on-device Web Speech recognition in version 139, with language availability queries and optional resource installation. Installed browser version alone therefore does not establish usable Korean offline recognition. [Chrome 139 release notes](https://developer.chrome.com/release-notes/139#on-device-web-speech-api)
- The Web Speech draft allows local or remote recognition by default. Only supported `processLocally = true` requires local processing. Show that browser recognition may use a provider service; do not promise all-local audio processing. Recognition requires informed consent. Handle errors including `not-allowed`, `audio-capture`, `network`, and `no-speech` without inventing clinic facts. [Web Speech API](https://webaudio.github.io/web-speech-api/)
- `getUserMedia()` is a secure-context API and requires permission. HTTPS or a same-device loopback URL is the practical presentation setup. A granted permission alone does not prove the microphone works. [Media Capture and Streams](https://www.w3.org/TR/mediacapture-streams/)
- Loopback addresses and conforming `localhost` origins qualify as potentially trustworthy. A phone opening the Mac's plain `http://192.168…` LAN address does not receive the loopback exception. The two-phone arrangement therefore remains **Unconfirmed** until trusted HTTPS and both devices are rehearsed. Do not disable browser security to make the microphone appear functional. [Secure Contexts](https://www.w3.org/TR/secure-contexts/#is-origin-trustworthy)
- Safari introduced recognition through the Siri speech engine; its announcement identifies Siri enablement as a prerequisite. Current device settings and actual behavior are **Unconfirmed** and were not changed. [WebKit Safari 14.1 announcement](https://webkit.org/blog/11648/new-webkit-features-in-safari-14-1/)
- Select an available Korean synthesis voice and wait for `voiceschanged` if needed. `localService: true` identifies a local synthesis voice; it says nothing about the recognition path. Synthesis events do not establish that the room's speakers are audible or Korean pronunciation is intelligible. [Web Speech synthesis interfaces](https://webaudio.github.io/web-speech-api/#tts-section)

For this fictional demo, visible transcript text should remain reviewable. Recognition should stop while Korean speech plays, and resume on an explicit receptionist action to reduce self-transcription. This is an implementation recommendation, not an observed successful conversation. The Russian user side must remain usable entirely through text.

## Required live evidence before claiming a microphone demonstration

1. Open the runnable demo in the actual presentation browser and secure origin; verify the on-screen simulation labels and microphone disclosure.
2. The teammate explicitly starts microphone input and handles any browser/OS permission prompt. Do not silently change permissions or enable Dictation/Siri.
3. A Korean-speaking teammate confirms hearing and understanding the Korean introduction and questions. Preserve the synthesis status separately from this human observation.
4. Speak the scripted receptionist answers, including `처음 방문하시나요?`; preserve the actual recognized text and any correction in the demo's text evidence. Do not record raw audio.
5. Type `Да.` on the Russian side; confirm `네, 처음 방문입니다.` appears and is spoken. Silence or an unclear answer must pause or stay Unclear.
6. Compare the generated Russian facts and Korean sample sheets against the fictional fixture; label supported clinic facts `Confirmed in simulation` and unresolved facts `Unclear`.
7. Exercise microphone denial if feasible. Verify guidance and absence of fabricated answers. Keep a denial test or manually entered text rehearsal separate from a successful real microphone run.

At this inspection checkpoint, steps 1–7 have not been performed. Text fixtures, synthetic speech events, injected transcripts, and automated UI tests can verify application logic; none establishes hardware microphone capture or user value. Product value remains **Unverified** without actual user feedback.
