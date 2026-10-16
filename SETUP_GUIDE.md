# JCVIQ — Quick Setup

Three steps, about five minutes. See [README.md](README.md) for what the extension does and how it works.

## 1. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **Create API Key**
3. Copy it — you will paste it into the panel in step 3

## 2. Load the extension

1. Open `chrome://extensions/`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** (top left)
4. Select the `JCVIQ` folder

## 3. Add your key

1. Open any YouTube video, or a video's edit page in YouTube Studio
2. The **panel appears on the page** — there is no popup and you do not click the toolbar icon
3. Click the **settings** icon in the panel header
4. Paste your key and click **Save settings**

While you are in Settings, fill in the channel profile: niche, audience, tone, words to avoid, your call to action. It goes into every prompt and noticeably improves results.

---

## Getting good results

The single biggest factor is what you give it. A title written from a filename is a guess; a title written from your script and your footage is not.

**Add your script.** On the Overview tab, open **Sources** and either click **Paste** to type it in, or use the upload icon to pick a `.txt`, `.md`, `.srt`, `.vtt` or `.json` file. This alone transforms the output, and it works before the video is public.

This matters more than it used to. YouTube has closed off direct caption access, so JCVIQ now reads captions out of YouTube's own transcript panel, which works on watch pages but not in Studio and not for every video. Your script is the one source that always works.

**Upload the video file** for a video the model cannot otherwise see — anything private, unlisted or still processing. Click **Choose** on the Video file row and pick the rendered file, up to 2 GB. It uploads to Google's Gemini Files API, shows a progress bar, then a processing state, then **Ready**. Google deletes it after 48 hours.

**Pick the content type** before you analyze. It changes the packaging rules substantially — a Short and a documentary get very different title advice.

Then click **Analyze video**. With a video file attached this can take a few minutes, because the model is actually watching it.

---

## Reading the results

**Overview** shows two scores. The SEO score on the left is your current metadata measured against twelve deterministic checks. The one on the right is what you would score if you applied the top suggestions. Below that, the AI assessment is the model's judgement, which is a separate thing from the checklist.

**Titles** gives five options, each badged with its character count and whether it carries the primary keyword.

**Description** has the description, hashtags, tags with a 500-character meter, and chapters.

**Thumbnail** scores your current image, suggests three concepts, and generates the actual images.

**Strategy** covers keywords, the opening hook, retention advice, research insights and repurposing.

---

## Generating a thumbnail

On the Thumbnail tab, every concept has a **Generate image** button, and the card at the bottom takes your own description instead.

Check the shape badge first. It reads the video on the page and says **Wide 16:9** or **Vertical 9:16 (Shorts)**. This matters more than it sounds: a vertical cover has to keep the subject clear of the bottom 22% and the right 15%, where Shorts puts the title and the action buttons, while a wide thumbnail only has to dodge the duration badge in the bottom-right. The generator applies the right rules automatically.

If the badge is wrong, let the player finish loading, or set the content type to **YouTube Short** and it will follow.

The extension also tries to grab a frame from the player and hand it to the model as reference, so the image looks like your actual footage. This often fails on watch pages for security reasons, and the caption under the generated image tells you whether it worked.

When you have an image you like, **Download** it, or in Studio use **Set in Studio** to push it straight into the thumbnail field. Check the overlay text before publishing: image models still misspell words.

Generated images are billed per image and are separate from the text analysis. Pick the image model in Settings.

---

## Applying in Studio

Each suggestion has an apply button that writes into the real Studio field. Overview also has **Apply title, description & tags** to do all three at once.

Nothing is saved until you click Save in Studio.

If you want every analysis to write into the form automatically, turn on **Auto-apply** in Settings. It is off by default on purpose.

**Mass optimize** appears on the Studio video list. It opens each video in a background tab, analyzes it, applies the top suggestions and saves. It asks for confirmation first, because it overwrites metadata across your library.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No panel on the page | Check the extension is enabled at `chrome://extensions/`, then refresh |
| "No Gemini API key configured" | Settings → paste key → Save settings |
| Results feel generic | Add the script or upload the video file, and fill in the channel profile |
| Video stuck on "Processing" | Large files take time on Google's side; the panel polls for up to 15 minutes |
| "Gemini could not watch this video by URL" | The video is private or unlisted. Upload the file instead. |
| Tag count reads zero | Expand "Show more" on the Studio edit page so the tag chips render |
| No captions were used | YouTube served a transcript panel that fails to load, or the video has none. Add the script. |
| Generated thumbnail is the wrong shape | Check the shape badge; let the player load, or set the content type to YouTube Short |
| Overlay text is misspelled in the image | Regenerate, shorten the overlay, or add the text yourself |

---

## Optional: local key fallback

`background.js` reads the key from `chrome.storage.local` first, then falls back to `config.js` if it exists. To use it, copy `config.example.js` to `config.js` and paste your key there. `config.js` is gitignored. Most people should just use the Settings panel and skip this.
