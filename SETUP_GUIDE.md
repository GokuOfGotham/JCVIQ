# JCVIQ — Quick Setup

Five minutes, three steps. See [README.md](README.md) for what the extension actually does.

## 1. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click **Create API Key**
3. Copy it — you'll paste it into the panel in step 3

The free tier allows 60 requests per minute, which is plenty for a single channel.

## 2. Load the extension

1. Open `chrome://extensions/`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** (top left)
4. Select the `JCVIQ` folder

## 3. Add your key

1. Open any YouTube video, or a video's edit page in YouTube Studio
2. The **JCVIQ panel appears on the page** — there is no popup, and you don't click the toolbar icon
3. Click **⚙️** in the panel
4. Paste your API key and save

While you're in settings, fill in the channel profile — niche, audience, tone, what to avoid, your CTA. It gets injected into every prompt and noticeably improves results.

---

## Using it

**On a watch page:** click **Optimize**. JCVIQ pulls the transcript, thumbnail, and a few video frames, then returns titles, description, tags, chapters, thumbnail concepts, a scorecard, and repurposing ideas. Copy anything with the 📋 button.

**On a Studio edit page:** same analysis, but each suggestion gets an apply button that writes directly into the form field.

**On the Studio video list:** JCVIQ can queue your videos and optimize them in sequence.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| No panel on the page | Check the extension is enabled at `chrome://extensions/`, then refresh |
| "API key not configured" | Panel → ⚙️ → paste key → save |
| No response from Gemini | Verify the key and check you're under 60 requests/minute |
| Results feel generic | Fill in the channel profile in settings |

---

## Optional: local key fallback

`background.js` reads the key from `chrome.storage.local` first, then falls back to `config.js` if present. To use it, copy `config.example.js` to `config.js` and paste your key there. `config.js` is gitignored. Most people should just use the settings panel and skip this.
