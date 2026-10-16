# JCVIQ — YouTube AI Optimizer

A Chrome extension that puts a Gemini-powered optimization panel inside YouTube and YouTube Studio. It reads what your video actually contains — your script, the rendered video file, captions and the thumbnail — then generates packaging you can apply with one click.

No popup. The panel mounts into the page: docked in the right column on a watch page, and as a right-hand drawer in Studio.

---

## The idea

Most YouTube SEO tools score the title you already typed. JCVIQ starts a step earlier: it looks at the video and the script, works out what the video is actually about, and writes the packaging from there. A title suggestion is only as good as the model's understanding of the footage, so the extension puts real effort into getting the footage in front of the model.

---

## Sources

The Overview tab has a **Sources** panel. Everything in it feeds the prompt, and the analysis tells you afterwards which sources it actually used.

| Source | How it gets there | Why it matters |
|---|---|---|
| **Script** | Paste it, or pick a `.txt` / `.md` / `.srt` / `.vtt` / `.json` file | The authoritative account of what the video says. Works for videos that are still private and have no captions. |
| **Video file** | Upload the rendered file; it goes to the Gemini Files API and is attached to the request by URI | The model watches the real footage. This is the only path that works for private and still-processing uploads. Up to 2 GB. |
| **Captions** | Read from YouTube's own transcript panel at analysis time | Timestamped, so chapter suggestions land on real moments. See the caveat below. |
| **Thumbnail** | The current YouTube thumbnail, or upload your own | Scored by the model's vision. |

Scripts and uploaded video references are remembered per video ID, so they survive a page reload and are still there when you come back to the same edit page.

Watch pages also offer **"Let Gemini watch this video by URL"**, which skips the upload for public videos. It fails for anything private or unlisted, and the extension falls back to script and captions with a note explaining why.

### A note on captions

YouTube's caption endpoint now answers requests from outside its own player with an empty response, so fetching captions directly no longer works for any extension. JCVIQ instead reads YouTube's own transcript panel: it opens the panel, collects the rows while scrolling the virtualised list, and closes the panel again. A full transcript takes about a second.

That works whenever YouTube serves its current transcript panel. YouTube is presently running an older panel alongside it for some viewers and videos, and the older one opens empty because its own request fails. When that happens JCVIQ reports no captions and carries on with the script and video. This is the reason the script input matters: it is the one caption-independent source you fully control.

Captions are not available in Studio at all, where there is no transcript panel. Use the script there.

---

## What it produces

**Titles** — five options, each with the reasoning behind it and its own length and keyword badges, so you can compare candidates at a glance.

**Description, hashtags, tags, chapters** — ready to paste. Tags are fitted to YouTube's 500-character budget by dropping whole tags rather than truncating mid-word, and a meter shows how much of the budget is used.

**Thumbnail** — vision scoring for readability, subject visibility, contrast, mobile legibility and clutter, plus three concepts with the exact moment of footage to grab each frame from, and a generator that turns any concept into a real image.

**Strategy** — primary and secondary keywords, the opening hook, content and retention advice, research insights, and a repurposing kit (Shorts ideas, social captions, follow-up video ideas).

---

## Thumbnail generation

The Thumbnail tab can generate the image, not just describe it. Every concept gets a **Generate image** button, and a free-form generator at the bottom takes your own description.

**It detects the shape first.** The extension reads the actual video element on the page and works out whether the video is wide or vertical, falling back to the Shorts URL, the selected content type, and the thumbnail dimensions in YouTube's player response. The detected shape is shown as a badge on the tab, and it decides far more than the output dimensions:

| | Wide 16:9 | Vertical 9:16 |
|---|---|---|
| Subject placement | Fills 50–70% of frame | Confined to the middle third |
| Reserved for YouTube's UI | Bottom-right duration badge | Bottom 22% and right 15% |
| Survives | Edge cropping in the feed | A centre square crop in the Shorts grid |
| Text overlay | Left or upper-left third | Large, short, upper-middle |

Generating a 16:9 image for a Short puts the subject behind the like and comment buttons, which is exactly the failure this detection avoids.

**It can match your footage.** Before generating, the extension tries to capture a frame from the on-page player and attach it as a reference, so the image resembles what the video actually contains rather than inventing a scene. YouTube's cross-origin video taints the canvas on most pages, so this is best-effort: when it fails the generation proceeds from text alone and the caption below the image tells you which happened.

Results can be downloaded, regenerated, or in Studio pushed straight into the thumbnail upload field. Image models still misspell overlay text, so check it before you publish.

The image model is configurable in Settings (Nano Banana 2.1 by default, Nano Banana Pro for higher quality). Image generation is billed per image, separately from the text analysis.

---

## Two kinds of score

These are deliberately separate, because they answer different questions.

**SEO score** is deterministic. Twelve checks run in the extension against the page's own title, description and tags: length bands, keyword presence and position, caps ratio, hashtag count, chapter line, link or call to action, tag count, and the 500-character budget. Nothing here is a model opinion. Checks award full, half or no credit, and the card shows your current score beside the score you would have if you applied the top suggestions.

**AI assessment** is the model's read on clarity, curiosity, keyword relevance, mobile readability, description completeness and clickbait risk, with a one-line summary of the biggest opportunity.

Keyword matching accepts the exact phrase, all of its significant words in any order, or half of them for partial credit. A title like "Ospreys Launch As The Storm Closes In" scores partial against "osprey carrier launch" rather than failing outright.

---

## Applying results

On a Studio edit page, every suggestion has an apply button that writes into the real form field, plus an "Apply title, description & tags" action on the Overview tab.

**Auto-apply is off by default.** Turn it on in Settings if you want every analysis to write straight into the form. Nothing is ever saved without you clicking Save in Studio, except during a mass update.

**Mass update** walks the Studio video list, opening each video in a background tab, analyzing it, applying the top suggestions and saving. It asks for confirmation first, because it overwrites and saves metadata on every video listed. Scripts and uploaded videos are matched by video ID, so add them on each video's edit page beforehand if you want grounded results.

On a watch page nothing can be applied, so everything is copy-to-clipboard. That includes competitors' videos.

---

## Model configuration

Settings offers Gemini 3.8 Flash (default), Gemini 4 Argon and Gemini 3.5 Flash-Lite, plus a Google Search grounding toggle.

Search grounding researches what is currently working in the niche, but the Gemini API does not allow the Search tool and a structured response schema in the same request. So with search **on**, the schema is described in the prompt and the reply goes through a repair pass for the unescaped newlines, trailing commas and truncated objects that models occasionally emit. With search **off**, the request uses a real `responseSchema` and the JSON is guaranteed well-formed. Both paths land on the same object.

Extended thinking is disabled (`thinkingBudget: 0`) because it eats the output budget and truncates the JSON, and this is an interactive workload.

---

## Install

**Requirements:** Chrome or any Chromium browser, and a Gemini API key ([free from Google AI Studio](https://aistudio.google.com/apikey)).

1. Clone or download this repository.
2. Open `chrome://extensions/` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `JCVIQ` folder.
4. Open any YouTube video or a Studio edit page. The panel appears on the page.
5. Open **Settings** in the panel, paste your key, and save.

Fill in the channel profile while you are there — niche, audience, tone, words to avoid, your call to action. It is injected into every prompt and measurably improves output.

### Developer key fallback

`background.js` prefers the key in `chrome.storage.local` and falls back to `CONFIG.GEMINI_API_KEY` from `config.js` if that file exists. It is gitignored and exists only as a local convenience. Copy `config.example.js` to `config.js` if you want it; end users do not need it.

---

## Where it works

| Page | Behavior |
|---|---|
| `youtube.com/watch` | Docked in the right column. Analyze any video, including competitors'. Copy-only. |
| `youtube.com/shorts/...` | Floating panel (Shorts have no right column). Detected as 9:16. |
| `studio.youtube.com` edit page | Right-hand drawer. Analyze plus one-click apply into the form. |
| `studio.youtube.com/.../videos` | Mass update across the video list. |

The panel follows YouTube's single-page navigation and switches between single and mass mode based on whether an edit form is open. Editing a draft opens a modal without changing the URL, which is why the mode is decided by the form's presence rather than the path.

It also follows YouTube's light and dark theme.

---

## Project structure

```
JCVIQ/
├── manifest.json        # Manifest V3 config, permissions, script registration
├── content.js           # Panel UI, sources, metadata extraction, scoring, Studio automation
├── content.css          # Panel styling, light and dark
├── background.js        # Service worker: Gemini calls, Files API uploads, captions, thumbnail
├── config.example.js    # Template for the optional local key fallback
├── images/              # Extension icons and logo
├── README.md
└── SETUP_GUIDE.md
```

**content.js** builds and mounts the panel, manages the source inputs and the chunked upload, extracts metadata from watch and Studio pages, runs the deterministic audit, renders every tab, writes values into Studio fields, and orchestrates mass updates. Model output is rendered with `textContent`, never `innerHTML`, so a hostile transcript cannot inject markup.

**background.js** resolves the API key, runs resumable uploads to the Files API, fetches captions and the thumbnail in parallel, builds the prompt, calls Gemini, and parses or repairs the returned JSON.

---

## Privacy

Your API key is stored in `chrome.storage.local` and goes nowhere except Google's Gemini endpoint. There is no backend and no telemetry. Host permissions are limited to `youtube.com`, `i.ytimg.com` and `generativelanguage.googleapis.com`.

Uploading a video file sends it to Google's Gemini Files API. Google stores it for 48 hours and then deletes it. Settings has a **Forget uploaded videos** action that deletes them immediately.

Generating a thumbnail sends the concept text and, when the page allows the capture, one still frame from the player. Generated images are held in memory for the session and are never written to storage.

The prompt marks the script, transcript and page metadata as untrusted data and instructs the model not to follow instructions found inside them.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Panel doesn't appear | Confirm the extension is enabled at `chrome://extensions/` and refresh. In Studio it mounts on edit pages and the video list. |
| "No Gemini API key configured" | Open Settings in the panel, paste your key, save. |
| Results feel generic | Add the script, or upload the video file. Fill in the channel profile. |
| Video stuck on "Processing" | Gemini processes large files server-side. The panel polls for up to 15 minutes. |
| Upload fails immediately | Check the key is valid and the file is under 2 GB. |
| Chapters land on the wrong moments | Captions were unavailable, so timestamps came from the script alone. Upload the video file. |
| Analysis reports no captions | YouTube served its older transcript panel, which fails to load, or the video has none. Add the script. |
| Tags get dropped | Expected. YouTube caps tags at 500 characters total. |
| Tag count reads zero in Studio | Expand "Show more" on the edit page so the tag chips render. |
| Generated thumbnail is the wrong shape | The aspect badge shows what was detected. Let the player load, or set the content type to YouTube Short. |
| Overlay text is misspelled in the image | Known limit of image models. Regenerate, shorten the overlay, or add the text yourself. |
| "Could not find the thumbnail upload field" | Studio's markup changed or the section is collapsed. Download the image and upload it manually. |

---

## Known limitations

- Captions depend on YouTube's transcript panel. YouTube currently serves two versions and the older one loads nothing, so captions are unavailable for some viewers and videos regardless of whether the video has them. The script input is the reliable substitute.
- Captions never work in Studio, and never for a video that has only just been uploaded.
- Auto-apply works in Studio only. Watch pages are read-only.
- Mass update depends on Studio's DOM and can need adjustment when YouTube changes its markup.
- The deterministic score reads the tags Studio has rendered, so it undercounts until the tags field is expanded.
- Reference frames for thumbnail generation usually fail on watch pages, because YouTube's cross-origin video taints the canvas. Generation still works from text.
- Image models render text approximately. Treat the overlay in a generated thumbnail as a mockup.

---

## License

Provided as-is for personal and commercial use.
