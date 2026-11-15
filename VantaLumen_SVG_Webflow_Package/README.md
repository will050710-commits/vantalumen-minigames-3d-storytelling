# RISE · An illustrated journey for Webflow

A new **SVG + HTML + CSS + GSAP ScrollTrigger** interpretation of the `Story Line` sheet in `VANTALUMEN TEAM_Masterfile_Nov 2026.xlsx`.

RISE is original, editable vector artwork based on the supplied `rise_plushie.glb`: round peach face, lavender cheeks, yellow side discs, a blue globe cap with green continents, and a dark band with gold trim and stars. The GLB is **only a visual reference**. This package does not load, bundle, or require a 3D model at runtime.

## Open the experience

Download and open **VantaLumen_SVG_Preview.html** in a modern browser. The story illustrations and both animation libraries are embedded. The two header logo references from your edited HTML are preserved (`nasa-space-apps-challenge-removebg.png` and `vantalumen-mark-removebg.png`). Those image files were not included; keep them beside the HTML, or replace their paths with your Webflow asset URLs. The story animation itself runs offline. Some in-app file viewers disable JavaScript; download the file and open it in a browser if the preview is static there.

Version 1.1 updates the future chapter of your edited SVG preview and retains your header logo markup and styling.

## Install in Webflow

Use a blank full-width page with access to custom code:

1. Paste **webflow/01_HEAD.html** into **Page settings → Custom code → Inside `<head>`**.
2. Add one **Code Embed** to the page and paste **webflow/02_BODY_EMBED.html** into it. This contains the actual SVG paths and story markup.
3. Paste **webflow/03_FOOTER.html** into **Page settings → Custom code → Before `</body>`**.
4. Set the page Body margin to `0`, background to `#f6f3e9`, and the Embed width to `100%`. Avoid a max-width Container around the experience. Do not set a fixed height, scroll container, `overflow: hidden/auto`, or transform on an ancestor of the Embed: the story uses a sticky SVG stage and the window’s natural scroll.
5. Preview the page, and check its Webflow staging version before publishing to your production domain. Code execution inside Designer surfaces can differ from the published page.

Each block is below 50,000 characters. The Footer loads pinned GSAP/ScrollTrigger 3.13.0 from jsDelivr only when the corresponding global is missing, so it can reuse libraries already provided by Webflow. The standalone HTML embeds these libraries locally. For a strict CSP, allow the required inline code and the chosen library source, or serve the supplied files through your approved static host.

Use one instance per page; SVG IDs intentionally remain stable and human-readable. No Webflow site was modified or published: the connected site list was empty.

## What visitors can do

- Scroll through seven chapters as RISE changes position, scale, tilt, expression and bounce.
- Choose the Moon or Mars through accessible HTML controls or the SVG planet illustrations.
- Brush an SVG dust overlay using a pointer or keyboard-friendly button.
- Watch a captioned 30-second illustrated briefing with pause/replay. It has no audio or archival footage.
- Match relic component labels to SVG markers and see why the components matter.
- Scrub 2026–2076: supports fracture and separate, the vehicle loses balance and falls, and sand accumulates in tapered surface bands. Scrubbing backward restores the vehicle. The protection toggle preserves the structure and leaves only light sand.
- Record both expeditions, add a name and preview a print-ready A4 certificate. Save it as PDF from the print dialog or download the same artwork as SVG.
- Pause motion; operating-system reduced-motion preferences are also respected.

Progress is independent for each world and lasts for the current page session. Names stay in the browser. Reloading restarts the journey. The timeline and green/red condition patches are teaching illustrations, not measured damage or a scientific forecast. The certificate is issued by VantaLumen for completing this educational experience, not by NASA.

The certificate button creates an A4 landscape (297 × 210 mm) preview in the page. **Save as PDF** opens the browser print dialog; choose **Save as PDF** (or **Microsoft Print to PDF**) to keep a vector PDF. A temporary print-only sheet is appended to the page for the print job and removed afterwards, so no server, upload or external PDF library is involved. The optional **Download SVG** keeps the editable artwork.

## RISE’s seven expressions

| Chapter | Expression | Placement and motion |
| --- | --- | --- |
| Welcome | Happy | Large portrait, gentle bob, soft arrival bounce |
| Two worlds | Curious | Small guide below the planets, inquisitive tilt |
| Landing | Amazed | Left of the landing site, excited bounce |
| Discovery | Focused | Leaning toward the archive window from the right |
| Inspection | Confident | Small guide beside the relic, wink on correct matches |
| Fifty-year future | Concerned | Quieter bounce near the site; reassurance when protection is enabled |
| Legacy | Grateful | Centered over the certificate, celebratory bounce |

The expressions are separate named SVG groups, so no path-morphing plugin is needed. See **RISE_Emotion_Sheet.svg** and **RISE_Emotion_Sheet.png** for the expression study.

## Source files

| File | Purpose |
| --- | --- |
| `assets/rise.svg` | Standalone, editable mascot with all seven expression groups |
| `assets/scene.svg` | Scene source, with the `RISE_MASCOT` insertion marker |
| `assets/scene-complete.svg` | Complete generated SVG stage with RISE inserted |
| `story.html` | Story markup, chapter text and activity controls |
| `assets/story.css` | Scoped page styling and responsive layout |
| `assets/story.js` | Editable `SCENES`/`WORLDS` configuration, GSAP logic and activities |
| `webflow/` | Three generated Webflow copy/paste blocks |
| `index.html` | Hosted entry point using local assets |
| `VantaLumen_SVG_Preview.html` | Offline, self-contained experience |
| `LAYER_MAP.md` | Named layer contract and animation ownership |
| `STORYBOARD.md` | Mapping back to the workbook and editorial adaptations |
| `tests/qa.cjs` | Offline DOM, SVG structure, GSAP and interaction checks |
| `VALIDATION.json` | Exact validation results and limitations |

After editing source SVG, markup, CSS or JS, run `python tools/build.py` to regenerate the HTML and Webflow blocks. Run `python tools/emotion_sheet.py` to regenerate the editable expression sheet. Re-paste the generated blocks into Webflow after changes.

To serve the package locally, run `python -m http.server 8765` in this directory, then open `http://localhost:8765`. To run checks, use `npm install` and `npm test`.

## Animation implementation

- GSAP ScrollTrigger drives a scrubbed numeric playhead. Real DOM chapter offsets map the playhead to scene transitions, including when details expand or the viewport changes.
- Movement is divided into position, scale, bounce, tilt and squash groups. The idle bounce never overwrites chapter placement.
- A short `bounce.out` entry adds a landing response on scene changes. Action feedback uses its own vertical offset.
- Expression groups crossfade briefly; blinks affect only the named eye pairs and blink strokes.
- Scene opacity and vertical offsets, orbit rotation, scan line position and illustration state follow the same story progress. Scrolling backward reverses the narrative state.
- ScrollTrigger instances and tweens are individually owned and disposed. No `killAll()` or global timeline reset is used, so other Webflow animations can coexist.
- There is no WebGL, canvas, Three.js, model-viewer, Spline, embedded GLB, raster mascot or model download.

Maintainer hooks are exposed on `document.getElementById('vanta-svg-story').vantaSVG`: `getState()`, `renderAt(0..6)`, `renderFutureAt(year, protectedSite=false)`, `setEmotion(name)`, `createCertificate(name)`, `chooseWorld('moon'|'mars')`, `setMotion(true|false)`, `resume()`, and `destroy()`. `createCertificate()` returns the A4 certificate SVG string for inspection without opening the dialog. These support inspection; they are not controls shown to visitors.

## Future chapter choreography (v1.1)

Only the future rigs move destructively. The shared `art-eagle` and `art-spirit` definitions, used in earlier chapters, stay intact. The renderer maps the year to normalized progress and derives every transform from that value; a short GSAP tween smooths pointer/keyboard input. No part drifts or accumulates rotation after repeated scrubbing.

| Progress | Visual action |
| --- | --- |
| 0–18% | Small joint strain, crack lines, first right supports begin releasing |
| 2–34% | Right leg/wheel supports separate and move outward |
| 18–53% | Remaining loose supports detach |
| 12–72% | Body loses balance and tips toward the missing supports |
| 68–100% | Small impact settling; additional sand bands become visible |

Overlapping phases make the fall continuous. Protected mode sets structural damage to zero and reduces the sand playhead to 16%. This is an editorial illustration, not a prediction of real degradation. Sand paths are clipped to individual body faces and solar panels and live inside the moving body group. There are no dust-cloud blobs in this chapter.

Tune the thresholds and angles in `paintFuture()` and the input smoothing in `updateEnvironment()`. `renderFutureAt()` renders an exact pose for inspection; visitors use the normal year slider.

## Validation status

The editable SVG mascot, seven scene states, and both future rigs at 2026, 2031, 2040, 2055, 2076 and protected 2076 were rendered with Inkscape and reviewed. Offline checks run the **actual GSAP and ScrollTrigger builds** in jsdom and verify timeline wiring, poses, expressions, unique IDs, activity flow, A4 certificate preview, print-sheet isolation, escaping, reduced motion, cleanup and Webflow block sizes.

Full browser layout, touch behavior and published-Webflow visual testing remain unverified. The earlier browser request was rejected by automatic approval review because of the session’s usage limit. Static vector rendering and DOM checks do not replace a real browser pass; check the staging page before production publication.

## Sources and notices

- Story: attached workbook, sheet **Story Line**, B3:D15.
- Visual reference: supplied **rise_plushie.glb**; newly drawn SVG interpretation.
- Apollo 11: https://www.nasa.gov/history/apollo-11-mission-overview/
- Spirit: https://science.nasa.gov/mission/mer-spirit/
- Spirit landing date in UTC: https://science.nasa.gov/photojournal/mars-global-surveyors-view-of-gusev-crater-during-spirits-entry-descent-and-landing/
- GSAP ScrollTrigger: https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Webflow Code Embed: https://help.webflow.com/hc/en-us/articles/33961332238611-Custom-code-embed
- Library notices: `assets/vendor/GSAP-LICENSE-NOTICE.txt` and original headers in the supplied vendor files.

RISE and the supplied story remain subject to the user’s underlying asset rights. No NASA endorsement is implied by this independently produced educational experience.
