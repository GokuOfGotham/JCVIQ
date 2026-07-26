# JCVIQ — YouTube AI Optimizer

A Chrome extension that puts a Google Gemini–powered optimization assistant directly inside YouTube and YouTube Studio. It reads what your video actually contains — transcript, thumbnail, and sampled video frames — then generates optimized metadata and, in Studio, writes it straight into the edit form.

No popup. The panel is injected into the page itself.

---

## What it does

**Generates a full metadata set**
- 3 title options, each with the reasoning behind it
- Optimized description, hashtags, and up to 500 characters of tags
- Chapter list with timestamps
- Thumbnail concepts (text overlay + visual idea)
- Suggested category, playlists, and a pinned comment
- Opening hook and end-screen guidance

**Scores what you already have**

A diagnostic scorecard rating title clarity, curiosity, keyword relevance, mobile readability, and description completeness, plus a clickbait-risk assessment and written summary.

**Suggests repurposing**

Shorts ideas with hooks, ready-to-post copy for X / Community / Instagram, and follow-up video concepts.

**Applies results in Studio**

On a Studio edit page, one click writes a suggestion into the real form field. Tags are fitted to YouTube's 500-character limit by budgeting whole tags rather than truncating mid-word.

**Mass updates**

From the Studio video list, JCVIQ can queue your library and walk through it, optimizing and saving each video in turn.

**History**

The last 40 optimizations are stored locally and browsable from the panel.

---

## How it gathers context

JCVIQ doesn't optimize from the title alone. Before calling the model it collects:

- **Transcript** — pulled for the video where available
- **Thumbnail** — fetched and passed to the model as image input
- **Video frames** — up to 4 frames captured from the player, which matters for private or still-processing uploads that have no public thumbnail yet
- **Page metadata** — parsed from YouTube's embedded `ytInitialPlayerResponse` rather than scraped from the DOM, with separate extraction paths for watch pages and Studio
- **Your channel profile** — niche, audience, tone, things to avoid, CTA, hashtags, links, and language, saved once and injected into every prompt so output sounds like your channel

The model call uses `gemini-2.5-flash` with Google Search grounding enabled, so SEO recommendations reflect current search behavior rather than training data alone. Extended reasoning is disabled (`thinkingBudget: 0`) because this is an interactive workload where latency matters more than deep deliberation. Responses are constrained by a typed JSON schema, with repair passes for the unescaped newlines and truncated objects that language models occasionally emit.

---

## Install

**Requirements:** Chrome or any Chromium browser, and a Google Gemini API key ([free from Google AI Studio](https://aistudio.google.com/app/apikeys)).

1. Clone or download this repository.
2. Open `chrome://extensions/` and turn on **Developer mode** (top right).
3. Click **Load unpacked** and select the `JCVIQ` folder.
4. Open any YouTube video or Studio edit page. The JCVIQ panel appears on the page.
5. Click the **⚙️ settings** icon in the panel, paste your API key, and click save. The key is stored in `chrome.storage.local` on your machine.

Optionally, fill in the channel profile fields in settings — it measurably improves output quality.

### Developer key fallback

`background.js` prefers the key in `chrome.storage.local` and falls back to a `CONFIG.GEMINI_API_KEY` value from `config.js` if one exists. That file is gitignored and exists only as a local convenience. Copy `config.example.js` to `config.js` if you want it; end users don't need it.

---

## Where it works

| Page | Behavior |
|---|---|
| `youtube.com/watch` | Analyze any video, including competitors' |
| `studio.youtube.com` edit page | Analyze plus one-click apply to the form |
| `studio.youtube.com/.../videos` | Mass update across the video list |

The panel tracks YouTube's single-page navigation and switches between individual and mass modes based on whether an edit form is present.

---

## Project structure

```
JCVIQ/
├── manifest.json        # Manifest V3 config, permissions, script registration
├── content.js           # Injected panel UI, metadata extraction, Studio automation
├── content.css          # Panel, scorecard, and history styling
├── background.js        # Service worker: Gemini calls, transcript + thumbnail fetch
├── config.example.js    # Template for the optional local key fallback
├── images/              # Extension icons and logo
├── README.md
└── SETUP_GUIDE.md       # Condensed setup steps
```

**content.js** — builds and mounts the panel, extracts metadata from watch and Studio pages, captures frames, renders results and the scorecard, writes values into Studio form fields, and orchestrates mass updates.

**background.js** — resolves the API key, fetches transcript and thumbnail, builds the prompt, calls the Gemini API under a response schema, and parses or repairs the returned JSON.

---

## Privacy

Your API key is stored locally in `chrome.storage.local` and is never transmitted anywhere except to Google's Gemini endpoint. There is no backend and no telemetry. Host permissions are limited to `youtube.com`, `i.ytimg.com`, and `generativelanguage.googleapis.com`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Panel doesn't appear | Confirm the extension is enabled in `chrome://extensions/` and refresh the page. On Studio it mounts on edit pages and the video list. |
| "API key not configured" | Open the panel's ⚙️ settings, paste your key, and save. |
| No response from Gemini | Check connectivity and that the key is valid. The free tier allows 60 requests/minute. |
| Results look generic | Fill in the channel profile fields in settings — they're injected into the prompt. |
| Tags get dropped | Expected. YouTube caps tags at 500 characters total; JCVIQ fits whole tags to that budget. |

---

## Known limitations

- Transcripts aren't available for every video; analysis proceeds without one and says so.
- Auto-apply works on Studio pages only — watch pages are read-only, so results are copy-to-clipboard.
- Mass update depends on Studio's DOM and can need adjustment when YouTube changes its markup.

---

## License

Provided as-is for personal and commercial use.
