# Issue #125: slideshow playback verification

The deployed https://kspf.au/ homepage serves the static `slideshow.js` implementation (deployment revision `d7b2a84e88c9-e191e38dac55`). The Next.js slideshow is also maintained in this checkout.

## Cause and change

Static slides saved their outgoing time by URL and restored it on slide activation and viewport re-entry. Next.js paused off-screen videos but resumed without resetting time. Static single-slide projects also returned before installing their visibility observer.

Both implementations now reset to zero on activation/re-entry and pause when the document becomes hidden. Static single-slide projects observe visibility. Next.js pauses on effect cleanup and uses the effect as its sole playback owner, removing native autoplay competition. Its playback effect tracks the slide index so consecutive slides with the same URL restart too. Muted inline playback, existing loops, transitions, navigation and Next.js reduced-motion handling remain unchanged. No preload or request-gating policy changed.

## Playback traces (Codex in-app browser)

| Scenario | Deployed static before | Local static draft after |
| --- | --- | --- |
| First video before switching | 3.206555s, playing | Playing only in the visible project |
| Switch to second video | Outgoing paused at 3.290930s | Outgoing paused |
| Return to first video | 3.425442s, playing (resumed) | 0.200453s, playing (restarted) |
| Desktop viewport exit | — | First video paused at 0.682667s, top -767px |
| Mobile 390×844 return via arrows | — | 0.000000s, playing; other projects paused |
| Mobile viewport exit | — | First video paused at 0.917333s, top -1923px; visible Albus video playing |
| Mobile viewport return | — | First video playing again; Albus and AP-REPS paused |

Next.js was checked separately on its development server at http://localhost:3000/: mobile return to the first video sampled at 0.160304s, desktop return at 0.125951s; off-screen videos stayed paused at zero. The development command could not generate its HTTPS certificate and used HTTP locally. No certificate trust settings were changed.

Real browser samples include elapsed time between the click and inspection. Regression tests assert the exact zero reset synchronously. Automated tests cover single/multiple slides, viewport exit/re-entry, tab hiding, repeated visibility callbacks, rapid image/video switching, duplicate URLs, and reduced motion. Existing interaction tests cover counters, keyboard wrapping and touch navigation.

## Request traces and performance boundary

CDP Network.requestWillBeSent captures on reload showed these initial Media requests before and after:

| Video filename | Live published before (count) | Local saved draft after (count) |
| --- | ---: | ---: |
| ath.mp4 | 4 | 4 |
| ath-collage.mp4 | 1 | 1 |
| mockup_2.mp4 | 1 | 1 |
| Comp_1.mp4 | 0 | 1 |
| Sequence_01_3.mp4 | 4 | 4 |
| Albus-video-02.mp4 | 1 | 1 |
| Albus_1.mp4 | 1 | 1 |
| sequence-01_6.mp4 | 4 | 4 |
| untitled-19-august-2026-at-14-22-00-3.mp4 | 1 | 1 |

The initial observed live request sequence spans CDP timestamps 36869.281763–36869.285887; the local sequence spans 37022.288423–37022.296577. Counts include detached aspect probes and duplicate video slots. Both also issue an Image-classified request for ath.mp4. Saved draft content differs from published content (including the additional Comp_1 video), so this is a diagnostic trace, not a controlled performance benchmark.

Off-screen projects and aspect probes request media even while their displayed videos are paused. Playback was already largely visibility-gated on the live site; the reproduced defect is saved/resumed position. These traces do not establish that background loading causes slower page loads. #79 should own video source/request gating, including aspect probes; #77 should measure cold-cache bytes and loading budgets under controlled conditions. No page-load speed improvement is claimed here.

## Validation

- Verified the running 8001 preview includes the Storyblok preview client, refreshed drafts successfully (HTTP 204), and compared served projects.json/content/home.json with a fresh Storyblok draft fetch: both match.
- Initial working checkout: npm test passed 174 tests; script suite passed 127 tests.
- Standalone PR branch based on main: npm test passed 156 tests; script suite passed 117 tests.
- The initial script run emitted the existing MODULE_TYPELESS_PACKAGE_JSON warning from home-scroll.js.
- npm run build: passed, including TypeScript.
- git diff --check: passed.

Verification was performed locally before opening the PR. No content was published and no production files were deployed.
