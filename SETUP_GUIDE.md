# JCVIQ — Quick Setup

Two steps, about two minutes. No API key: JCVIQ runs on free local models through NeuroBrain OS. See [README.md](README.md) for what the extension does and how it works.

## 1. Load the extension

1. Open `chrome://extensions/`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** (top left)
4. Select the `JCVIQ` folder (on this PC: `A:\AI\JCVIQ`)

## 2. Check the local models

1. Open any YouTube video, or a video's edit page in YouTube Studio
2. The **panel appears on the page** — there is no popup. The toolbar icon only shows or hides the panel.
3. Click the **settings** icon in the panel header
4. The **Local AI (free)** card should report the model hosts as up and ComfyUI as ready. If NeuroBrain is not reachable, gamingpc_rx is off, or you are away from home without Tailscale.

While you are in Settings, fill in the channel profile: niche, audience, tone, words to avoid, your call to action. It goes into every prompt and noticeably improves results.

Text runs on gemma4:12b on the RTX 5070 PC (qwen3 4b on gamingpc_rx when that PC is off); thumbnails on Z-Image Turbo in ComfyUI. A run takes 1-3 minutes and costs nothing.

---

## Getting good results

The single biggest factor is what you give it. A title written from a filename is a guess; a title written from your script and your footage is not.

**Add your script.** On the Overview tab, open **Sources** and either click **Paste** to type it in, or use the upload icon to pick a `.txt`, `.md`, `.srt`, `.vtt` or `.json` file. This alone transforms the output, and it works before the video is public.

This matters more than it used to. YouTube has closed off direct caption access, so JCVIQ now reads captions out of YouTube's own transcript panel, which works on watch pages but not in Studio and not for every video. Your script is the one source that always works.

**Transcribe by URL** for a public video whose captions YouTube will not hand over: tick the option on the watch page and NeuroBrain downloads the video and transcribes it locally with whisper, free. Private and unlisted videos cannot be read this way; add the script instead.

**Pick the content type** before you analyze. It changes the packaging rules substantially — a Short and a documentary get very different title advice.

Then click **Analyze video**. Expect 1-3 minutes; a local transcription adds 1-3 more.

---

## Reading the results

**Overview** shows two scores. The SEO score on the left is your current metadata measured against twelve deterministic checks. The one on the right is what you would score if you applied the top suggestions. Below that, the AI assessment is the model's judgement, which is a separate thing from the checklist.

**Titles** gives five options, each badged with its character count and whether it carries the primary keyword.

**Description** has the description, hashtags, tags with a 500-character meter, and chapters.

**Thumbnail** scores your current image, suggests three concepts, and generates the actual images.

**Strategy** covers keywords, the CORTEX-5 5-second hook formula rewrite, the opening hook, retention advice, research insights and repurposing.

**Brain** shows the full NeuroBrain OS (CORTEX-5) 0–5s neural timeline simulation from gamingpc_rx (`192.168.1.76:8765`) (Gatekeeper 0–3s vs. Multiplier 3s+ scores, 4 Fast Neural Hijack Triggers, 10 anatomical brain regions, 6 neurochemicals, Behavioral Advisory Playbook, and Society for Neuroscience *Brain Facts* citations), plus interactive labs to score any hook (`/api/hook-score`), ask the Brain Advisor (`/api/advise`), or search the *Brain Facts* PDF (`/api/knowledge/search`).

---

## Generating a thumbnail

On the Thumbnail tab, every concept has a **Generate image** button, and the card at the bottom takes your own description instead.

Check the shape badge first. It reads the video on the page and says **Wide 16:9** or **Vertical 9:16 (Shorts)**. This matters more than it sounds: a vertical cover has to keep the subject clear of the bottom 22% and the right 15%, where Shorts puts the title and the action buttons, while a wide thumbnail only has to dodge the duration badge in the bottom-right. The generator applies the right rules automatically.

If the badge is wrong, let the player finish loading, or set the content type to **YouTube Short** and it will follow.

The extension also tries to grab a frame from the player and hand it to the model as reference, so the image looks like your actual footage. This often fails on watch pages for security reasons, and the caption under the generated image tells you whether it worked.

When you have an image you like, **Download** it, or in Studio use **Set in Studio** to push it straight into the thumbnail field. Check the overlay text before publishing: image models still misspell words.

Generated images are billed per image and are separate from the text analysis. Pick the image model in Settings: Nano Banana 2.1 (default) and Nano Banana Pro render at 2K, which clears YouTube's 1280×720 recommendation; Nano Banana 2 Lite is the cheapest and renders at 1K.

---

## Applying in Studio

Each suggestion has an apply button that writes into the real Studio field. Overview also has **Apply title, description & tags** to do all three at once.

Nothing is saved until you click Save in Studio.

If you want every analysis to write into the form automatically, turn on **Auto-apply** in Settings. It is off by default on purpose.

**Mass optimize** appears on the Studio video list. It opens each video in a background tab, analyzes it, applies the top suggestions and saves. It asks for confirmation first, because it overwrites metadata across your library. A **Cancel run** button appears while it works; a video whose analysis fails is skipped rather than stalling the run, and a run interrupted by closing the browser is dropped instead of resuming days later.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No panel on the page | Check the extension is enabled at `chrome://extensions/`, then refresh |
| "NeuroBrain OS is not reachable" | gamingpc_rx is off, or you are away from home without Tailscale |
| Results feel generic | Add the script, and fill in the channel profile |
| Thumbnail fails: ComfyUI not reachable | Start ComfyUI on GAMINGPC-G451 (the "ComfyUI LAN" logon task does it) |
| "NeuroBrain could not read this video by URL" | The video is private or unlisted. Add the script instead. |
| Tag count reads zero | Expand "Show more" on the Studio edit page so the tag chips render |
| No captions were used | YouTube served a transcript panel that fails to load, or the video has none. Add the script. |
| Generated thumbnail is the wrong shape | Check the shape badge; let the player load, or set the content type to YouTube Short |
| Overlay text is misspelled in the image | Regenerate, shorten the overlay, or add the text yourself |
| "Chrome restarted the extension's background worker" | Rare; Chrome recycled the worker mid-request. Run the analysis again. |

---

## Optional: NeuroBrain URL override

JCVIQ finds NeuroBrain on its own (LAN first, then Tailscale). To pin a different server, set it in Settings, or copy `config.example.js` to `config.js` and set `NEUROBRAIN_API_URL` there. `config.js` is gitignored.

## Mass update with the YouTube API (no tabs)

1. In Google Cloud Console, create a project, enable **YouTube Data API v3**, and configure the OAuth consent screen (add yourself as a test user).
2. Create an OAuth client ID of type **Web application**. Under Authorized redirect URIs add the `https://<extension-id>.chromiumapp.org/` address shown in JCVIQ Settings > "Mass update via YouTube API".
3. Paste the client ID into that Settings field and save.
4. On the Studio videos page, run Mass optimize. The first run asks you to sign in to Google; after that it runs in the background, using the free local models through NeuroBrain, and writes each video through the YouTube Data API (free within its daily quota).

Each video costs about 51 of the default 10,000 daily quota units (roughly 190 videos a day). The run stops cleanly when the quota is hit. Original titles, descriptions and tags are backed up, and "Restore originals" puts them back.
