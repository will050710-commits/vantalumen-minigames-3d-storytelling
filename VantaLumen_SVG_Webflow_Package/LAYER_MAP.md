# SVG layer contract

All `<g>` elements and `<path>` elements inside the story SVG have unique IDs. Paths remain ordinary editable paths; no raster image or baked model geometry is embedded. Preserve these IDs when editing the drawings.

## Mascot transform stack

| Layer | Ownership | Purpose |
| --- | --- | --- |
| `rise-position` | Scroll pose | Global scene placement, `translate(x y)` in the 1000 × 900 stage |
| `rise-scale` | Scroll pose | Scene-specific scale |
| `rise-bounce` | Idle, entry and reaction offsets | Local vertical bounce, independent of global placement |
| `rise-tilt` | Scroll pose | Head tilt around the local mascot origin |
| `rise-squash` | Idle bounce | Subtle contact compression; disabled in reduced motion |
| `rise-side-discs` | Artwork | The reference model’s yellow side accents |
| `rise-head` | Artwork | Base face, shadow and highlight paths |
| `rise-cheeks` | Artwork | Lavender cheek ellipses |
| `rise-expressions` | Expression controller | Seven independently addressable facial groups |
| `rise-blink` | Blink clock | Closed-eye strokes, paired with temporary hiding of the eye groups |
| `rise-cap` | Artwork | Blue ocean, green continents, highlight and band |
| `rise-cap-band` | Artwork | Dark band, gold edges, stars and RISE label |
| `rise-speech` | Scroll pose + chapter text | Independently positioned caption bubble |
| `rise-ground-shadow` / `rise-shadow` | Pose + bounce | Ground position and subtle width/opacity response |

The standalone mascot has its local origin at the center of its face. Its viewBox is `-210 -225 420 420`. The scene generator wraps the same geometry into the main stage.

## Expressions

| Group ID | Eye group | Key mouth path |
| --- | --- | --- |
| `rise-expression-happy` | `rise-eyes-happy` | `rise-mouth-happy` |
| `rise-expression-curious` | `rise-eyes-curious` | `rise-mouth-curious` |
| `rise-expression-amazed` | `rise-eyes-amazed` | `rise-mouth-amazed` |
| `rise-expression-focused` | `rise-eyes-focused` | `rise-mouth-focused` |
| `rise-expression-confident` | `rise-eyes-confident` | `rise-mouth-confident` |
| `rise-expression-concerned` | `rise-eyes-concerned` | `rise-mouth-concerned` |
| `rise-expression-grateful` | `rise-eyes-grateful` | `rise-mouth-grateful` |

Each expression has `data-emotion` and contains separately named eyes, glints, mouth, and eyebrows where applicable. The engine crossfades group opacity. Eye-pair groups carry `class="rise-eye-pair"` for coordinated blinks. There is no MorphSVG dependency.

## Scene layers

| Group | Main children |
| --- | --- |
| `background-decoration` | `background-wash`, `background-orbit`, `background-stars` |
| `scene-origin` | `origin-orbits`, `origin-child-sketch`, `origin-eight-label` |
| `scene-worlds` | `worlds-moon-choice`, `worlds-mars-choice`, beacons |
| `scene-landing` | `landing-moon`, `landing-mars`, `landing-beacon` |
| `scene-discovery` | `discovery-archive-frame`, relic uses, `discovery-dust`, `discovery-brush` |
| `scene-inspection` | `inspection-moon`, `inspection-mars`, `inspection-scan`, `inspection-markers` |
| `scene-future` | `future-site`, future-only rigs and surface sand, `future-protection`, `future-year` |
| `scene-legacy` | `legacy-constellation`, `legacy-certificate`, `legacy-confetti` |

`data-scene="0..6"` owns story opacity and transition offset. `data-world-layer="moon|mars"` owns branch visibility. Interactive SVG planets and markers have `role="button"`, accessible labels and keyboard handlers; inactive scenes remove them from the tab order.

## Reusable illustrations

`art-eagle`, `art-spirit`, `art-moon` and `art-mars` live in `<defs>` and are instantiated through named `<use>` elements. Edit their paths once to update every scene. Key component layers include:

- Eagle: `eagle-descent-stage`, `eagle-engine`, `eagle-footpads`, front/back leg groups.
- Spirit: `spirit-chassis`, `spirit-wheels`, `spirit-solar-array`, `spirit-camera-mast`, `spirit-arm`.
- Inspection: `eagle-condition-intact`, `eagle-condition-wear`, `spirit-condition-intact`, `spirit-condition-wear`.
- Dust activity: `dust-ui-tiles` contains generated, named `dust-tile-00` through `dust-tile-39` rectangles.

Update `WORLDS[world].markers` if component positions change. Each position uses the stage coordinate system, before the scene’s small transition offset.

## Editing without animation conflicts

Change chapter placement, size and bounce in the `SCENES` table in `assets/story.js`. Do not place CSS transforms on those same transform-owner groups. Adjust the inner artwork paths instead. Keep each expression’s face features in the same local coordinate system. Keep the cap, cheeks and side discs outside expression groups so switching emotions cannot duplicate or remove them.

## Future-only articulated rigs (v1.1)

| Layer | Transform / purpose |
| --- | --- |
| `future-eagle` / `future-spirit` | Fixed stage placement; branch visibility |
| `future-eagle-body-rig` | Body tips around a low left pivot; engine, foil and all body sand travel together |
| `future-eagle-leg-left` / `future-eagle-leg-right` | Separate supports and footpads, independent rotations and translations |
| `future-spirit-body-rig` | Chassis, attached left wheels, arm, panels and mast tip together |
| `future-spirit-leg-back` / `-middle` / `-front` | Independent right wheel/support assemblies that separate and roll outward |
| `future-*-joint-cracks` | Progressive crack visibility |
| `future-eagle-sand-top` / `-front` / `-side` | Face-clipped, individually named sand bands attached to the lander body |
| `future-spirit-sand-panels` / `-body` | Panel/body-clipped sand bands attached to the rover body |
| `future-contact-shadow` | Widens and shifts beneath the fall |

`data-sand-band="0..3"` controls staggered buildup. `data-future-cracks` and `data-future-break` control fracture visibility. All `future-*-clip` masks reuse the original surface outline. The future rigs reference original component geometry with `<use>` without changing it. There is no `future-wear` cloud layer in v1.1.

`paintFuture()` exclusively owns these transforms and opacities. `futureView.damage` and `futureView.sand` are numeric GSAP playheads. Do not add CSS or GSAP transforms directly to the same owner groups. Slider scrubbing is fully reversible; protection restores structural integrity as an illustrative comparison.
