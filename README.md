# JCVIQ — YouTube AI Optimizer

A Chrome extension that puts a free, local-AI optimization panel inside YouTube and YouTube Studio. It reads what your video actually contains — your script, captions (or a local whisper transcript) and the thumbnail — then generates packaging you can apply with one click.

**No Google or Gemini API, no API key, $0 per run.** Every model runs on your own GPUs through NeuroBrain OS: titles, descriptions, tags and chapters come from gemma4:12b on GAMINGPC-G451 (RTX 5070, with qwen3 4b on gamingpc_rx as backup), and thumbnails are rendered by Z-Image Turbo in ComfyUI. JCVIQ needs NeuroBrain reachable (LAN, or Tailscale when away from home).

No popup. The panel mounts into the page: docked in the right column on a watch page, and as a right-hand drawer in Studio. The toolbar icon shows or hides it.

---

## The idea

Most YouTube SEO tools score the title you already typed. JCVIQ starts a step earlier: it looks at the video and the script, works out what the video is actually about, and writes the packaging from there. A title suggestion is only as good as the model's understanding of the footage, so the extension puts real effort into getting the footage in front of the model.

---

## Sources

The Overview tab has a **Sources** panel. Everything in it feeds the prompt, and the analysis tells you afterwards which sources it actually used.

| Source | How it gets there | Why it matters |
|---|---|---|
| **Script** | Paste it, or pick a `.txt` / `.md` / `.srt` / `.vtt` / `.json` file | The authoritative account of what the video says. Works for videos that are still private and have no captions. |
| **Captions** | Read from YouTube's own transcript panel at analysis time | Timestamped, so chapter suggestions land on real moments. See the caveat below. |
| **Thumbnail** | The current YouTube thumbnail, or upload your own | Scored by the model's vision and CORTEX-5's 0–500ms visual cascade. |
| **NeuroBrain OS (CORTEX-5)** | Automatic REST call to `http://192.168.1.76:8765` on gamingpc_rx (with Tailscale failover to `http://gamingpc-rx:8765`) | Runs a 10-region 0–5s neural timeline simulation, evaluates the 4 Fast Hijack Triggers, rewrites the 5-second hook formula, and retrieves evidence from the 94-page Society for Neuroscience *Brain Facts* PDF (435 chunks + 136 glossary terms) and 5 live Open Neuroscience APIs. |

Scripts are remembered per video ID, so they survive a page reload and are still there when you come back to the same edit page.

Watch pages also offer **local transcription by URL**: when YouTube's captions are missing, NeuroBrain downloads the public video (yt-dlp) and transcribes it with whisper on its own machine, free. It fails for anything private or unlisted, and the extension carries on with the title and description and says so.

### A note on captions

YouTube's caption endpoint now answers requests from outside its own player with an empty response, so fetching captions directly no longer works for any extension. JCVIQ instead reads YouTube's own transcript panel: it opens the panel, collects the rows while scrolling the virtualised list, and closes the panel again. A full transcript takes about a second.

That works whenever YouTube serves its current transcript panel. YouTube is presently running an older panel alongside it for some viewers and videos, and the older one opens empty because its own request fails. When that happens JCVIQ reports no captions and carries on with the script (or the local transcription by URL). This is the reason the script input matters: it is the one caption-independent source you fully control.

Captions are not available in Studio at all, where there is no transcript panel. Use the script there.

---

## What it produces

**Titles** — five options, each with the reasoning behind it and its own length and keyword badges, so you can compare candidates at a glance.

**Description, hashtags, tags, chapters** — ready to paste. Tags are fitted to YouTube's 500-character budget by dropping whole tags rather than truncating mid-word, and a meter shows how much of the budget is used.

**Thumbnail** — vision scoring for readability, subject visibility, contrast, mobile legibility and clutter, plus three concepts with the exact moment of footage to grab each frame from, and a generator that turns any concept into a real image.

**Strategy** — primary and secondary keywords, the CORTEX-5 5-second hook formula rewrite, the opening hook, content and retention advice, research insights, and a repurposing kit (Shorts ideas, social captions, follow-up video ideas).

**Brain (CORTEX-5)** — full 0–5s neural simulation report (Gatekeeper 0–3s vs. Multiplier 3s+ scores, 4 Fast Neural Hijack Triggers, 4 timeline phases from 0.0s to 5.0s, 10 anatomical brain regions, 6 neurochemicals, Behavioral Advisory Playbook, *Brain Facts* PDF citations, and 5 live Open Neuroscience APIs), plus interactive tools to score any hook (`/api/hook-score`), ask the NeuroBrain Advisor (`/api/advise`), or search the *Brain Facts* knowledge base (`/api/knowledge/search`).

The Brain tab also has **Search the Strategists** (Sun Tzu, La Rochefoucauld, Schopenhauer, Gracián, Chanakya and Machiavelli, each hit cited and linked to its public-domain source) and **Scripture & Theology** (exact Berean Standard Bible / KJV text by words or reference, a passage study with cross-references, commentary and Greek/Hebrew key words, and CC0 artwork links). The Advisor gains *Machiavelli Counsel* and *Theology & Scripture* domains and lists the passages each answer was grounded in. All of it comes from the NeuroBrain server; no extra keys.

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

Results can be downloaded, regenerated, or in Studio pushed straight into the thumbnail upload field. Z-Image Turbo renders short overlay text well, but check it before you publish.

Thumbnails are rendered locally and free: NeuroBrain's `/api/thumbnail/generate` has gemma4:12b condense the long brief (and the reference frame, when captured) into one concrete image prompt, then Z-Image Turbo renders it in ComfyUI on the RTX 5070 at 1280×720 (16:9) or 720×1280 (9:16), in about 30-60 seconds. ComfyUI must be running on GAMINGPC-G451 and listening on the network.

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

**Mass update** walks the Studio video list, opening each video in a background tab, analyzing it, applying the top suggestions and saving. It asks for confirmation first, because it overwrites and saves metadata on every video listed. Scripts are matched by video ID, so add them on each video's edit page beforehand if you want grounded results. A **Cancel run** button is shown while it works. A video whose analysis fails is skipped so the run carries on; an unreachable NeuroBrain stops the run outright; and a queue left behind by a browser that closed mid-run is discarded after two hours rather than resuming the next time you open one of those videos.

On a watch page nothing can be applied, so everything is copy-to-clipboard. That includes competitors' videos.

---

## Models (all local, all free)

| Job | Model | Where it runs |
|---|---|---|
| Titles, description, tags, chapters, strategy | gemma4:12b (vision; scores the thumbnail too) | GAMINGPC-G451, RTX 5070, via Ollama |
| Backup when the 5070 PC is off | qwen3:4b-instruct / qwen3-vl:4b-instruct | gamingpc_rx, RX 5700 XT, via Ollama |
| Thumbnails | Z-Image Turbo (prompt written by gemma4:12b) | GAMINGPC-G451, RTX 5070, via ComfyUI |
| Transcription by URL | faster-whisper | gamingpc_rx CPU |

The extension sends one request per job to NeuroBrain OS (`/api/llm/generate`, `/api/thumbnail/generate`, `/api/video/analyze`). The JSON shape is enforced with Ollama structured outputs, so the reply always parses. There is no Google Search grounding: the "research insights" come from the model's own knowledge and NeuroBrain's knowledge bases. Runs take 1-3 minutes instead of Gemini's 20-60 seconds; the cost is $0.

### Long requests and Chrome's service worker

Chrome stops an extension's service worker after 30 seconds without activity, when a `fetch()` takes more than 30 seconds to answer, and when a single message handler runs for more than five minutes. A local-model analysis (or a local transcription) can take several minutes, so the slow calls run as jobs: the panel starts one and polls for the result every two seconds, and the worker pings an extension API every 20 seconds while a request is in flight. Both reset Chrome's idle timer, and no handler ever approaches the five-minute limit.

---

## Install

**Requirements:** Chrome or any Chromium browser, and network access to NeuroBrain OS on gamingpc_rx (`http://192.168.1.76:8765`, or `http://gamingpc-rx:8765` over Tailscale). No API key.

1. Clone or download this repository.
2. Open `chrome://extensions/` and turn on **Developer mode**.
3. Click **Load unpacked** and select the `JCVIQ` folder.
4. Open any YouTube video or a Studio edit page. The panel appears on the page.
5. Open **Settings** in the panel and check that the Local AI card reports the models as up.

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
├── background.js        # Service worker: local-model calls through NeuroBrain, thumbnail, jobs
├── config.example.js    # Template for an optional NeuroBrain URL override
├── images/              # Extension icons and logo
├── README.md
└── SETUP_GUIDE.md
```

**content.js** builds and mounts the panel, manages the source inputs, extracts metadata from watch and Studio pages, runs the deterministic audit, renders every tab, writes values into Studio fields, and orchestrates mass updates. Model output is rendered with `textContent`, never `innerHTML`, so a hostile transcript cannot inject markup.

**background.js** finds the NeuroBrain server, fetches the thumbnail, builds the prompt, runs the local model through NeuroBrain as a polled job, parses or repairs the returned JSON, and asks NeuroBrain to render thumbnails and transcribe videos by URL.

---

## Privacy

Nothing leaves your own machines: scripts, captions, thumbnails and generated images go only to NeuroBrain OS on your network (or over your Tailscale tailnet), and the models run on your own GPUs. There is no API key, no third-party AI service and no telemetry. Host permissions cover YouTube, its image CDN, the NeuroBrain addresses, and the Google endpoints used only by the optional YouTube Data API mass update.

Generating a thumbnail sends the concept text and, when the page allows the capture, one still frame from the player, to NeuroBrain. Generated images are held in memory for the session and are never written to storage.

The prompt marks the script, transcript and page metadata as untrusted data and instructs the model not to follow instructions found inside them.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Panel doesn't appear | Confirm the extension is enabled at `chrome://extensions/` and refresh. In Studio it mounts on edit pages and the video list. |
| "NeuroBrain OS is not reachable" | gamingpc_rx is off or you are away from home without Tailscale. Check Settings → Local AI. |
| Results feel generic | Add the script. Fill in the channel profile. |
| Thumbnail fails with "ComfyUI ... is not reachable" | Start ComfyUI on GAMINGPC-G451 (the "ComfyUI LAN" logon task does this). |
| Analysis is slow | Normal for local models: 1-3 minutes, longer when the RTX 5070 PC is off and the RX backup answers. |
| Chapters land on the wrong moments | Captions were unavailable, so timestamps came from the script alone. Turn on local transcription by URL. |
| Analysis reports no captions | YouTube served its older transcript panel, which fails to load, or the video has none. Add the script. |
| Tags get dropped | Expected. YouTube caps tags at 500 characters total. |
| Tag count reads zero in Studio | Expand "Show more" on the edit page so the tag chips render. |
| Generated thumbnail is the wrong shape | The aspect badge shows what was detected. Let the player load, or set the content type to YouTube Short. |
| Overlay text is misspelled in the image | Known limit of image models. Regenerate, shorten the overlay, or add the text yourself. |
| "Could not find the thumbnail upload field" | Studio's markup changed or the section is collapsed. Download the image and upload it manually. |
| "Chrome restarted the extension's background worker" | Rare. Chrome recycled the worker mid-request; run the analysis again. |
| "The local model hit its output limit" | Run again; very long transcripts leave less room for the answer. |

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
