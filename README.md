# EdSpace — Behance case study, Dribbble shots & motion

A presentation built around the 26 screens in `Untitled.fig`. The screens are never redesigned. Every screen in this presentation is a faithful render (`screens/`) or, in Figma, a duplicate of your original frames.

## What's here

| Path | What it is |
| --- | --- |
| `export/behance/` | 15 sections, each 1836 px wide, exported at 2x (3672 px), one file per section in publishing order. Animated sections also come as `.mp4` (1836 px) and `.gif` (under 10 MB). |
| `export/dribbble/` | 8 standalone shots at 800 × 600, exported at 2x (1600 × 1200). Animated shots also come as `.mp4` and `.gif`. |
| `export/motion/` | Keyframe stills for every animated section and shot. |
| `figma-plugin/` | **EdSpace Presentation Builder**, a plugin that creates the `01 Behance`, `02 Dribbble` and `03 Motion` pages in your Figma file. |
| `screens/` | SVG renders of the 26 original frames, made from the file's own geometry and glyph outlines. |
| `source/` | The presentation itself: `frames.js` (every section and shot), `lib.js` (devices, shapes, text), `html.js` + `build.js` (PNG and video export). |
| `tools/fig-render/` | The `.fig` renderer used to turn the original frames into `screens/`. |

## Build the pages in Figma

1. In Figma desktop, open the file that contains the screens.
2. Go to **Plugins → Development → Import plugin from manifest…** and pick `figma-plugin/manifest.json`.
3. Run **EdSpace Presentation Builder**, choose the pages you want, and click **Build pages**.

What the plugin does:

- It finds the original frames by name and size. It only reads them: each one is duplicated onto `00 Screen Library` and turned into a component named `Screen / …`.
- Every screen in the presentation is an instance of one of those components, scaled with `rescale`. Crops (UI elements, detail cards) are trimmed duplicates that keep only the layers inside the crop.
- Devices, waves, brackets, glows and dot patterns are vector layers. All copy is live Degular text.
- `03 Motion` holds 2 keyframe frames per animation, with identical layer names. They are wired *After delay → Smart Animate* and loop back to the first keyframe. Open `03 Motion` and **Present** any flow to watch it.
- Running the plugin again replaces only the frames it created.

### Layer budget

Each screen instance expands to roughly 2k–12k layers. So by default:

- the decorative tilted grids use image copies of the duplicated screens (exported at 1x, pixel-identical);
- the Motion keyframes use image copies too.

Untick both options for live instances everywhere. That is about 400 screen instances, which is very heavy.

## Rebuild the exports

```bash
. source/env.sh            # paths to fonts / playwright / build temp (edit for your machine)
node source/build.js       # PNG @2x + MP4/GIF + figma-plugin/scene.json
node figma-plugin/build-plugin.js
```

## Notes

- **Typeface.** Degular is a licensed font, so it isn't included here. The previews use glyph outlines embedded in your `.fig`, which cover every character used in the presentation copy. The `#` in hex values and the uppercase alphabet row (Q, X and Z aren't in the file) appear only in the Figma build, where your installed Degular renders them.
- **Copy.** All copy comes from visible UI text, or describes what the screens show. There are no metrics, research claims or quotes.
- **Prototype timings.** These use the plugin API's seconds for the *After delay* and transition durations. If a delay plays too fast or slow in your Figma version, adjust it in the Prototype panel.
