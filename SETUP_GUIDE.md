// SETUP_GUIDE.md

# JCVIQ - Quick Setup Guide

## 🚀 5-Minute Setup

### Step 1: Get Your Gemini API Key (1 min)
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click **Create API Key** (in new project)
3. Copy the API key
4. **Save it somewhere safe** - you'll need it for the extension

### Step 2: Load Extension into Chrome (2 min)
1. Open Chrome
2. Go to `chrome://extensions/`
3. Toggle **Developer Mode** ON (top right)
4. Click **Load Unpacked** (top left)
5. Select the `JCVIQ` folder
6. ✅ Extension is now installed!

### Step 3: Configure the Extension (2 min)
1. Go to any **YouTube video**
2. Click the **JCVIQ icon** (top right of Chrome)
3. Paste your **Gemini API key** in the setup dialog
4. Click **Save API Key**
5. ✅ You're all set!

---

## 🎬 How to Use

1. **Open any YouTube video**
2. **Click JCVIQ extension** → Opens popup
3. **Click "🚀 Optimize Video"** → Waits for AI analysis
4. **Review results:**
   - 📝 Title suggestions (click 📋 to copy)
   - 📄 Better description
   - 🏷️ Recommended tags
   - 🖼️ Thumbnail advice
   - 🔍 SEO keywords
   - 🎯 Content strategy tips

5. **Copy and apply** suggestions to your video!

---

## 📂 Project Files

```
JCVIQ/
├── manifest.json    ← Chrome extension config
├── content.js       ← Extracts YouTube data
├── background.js    ← Calls Gemini API (secure)
├── popup.html       ← Extension UI
├── popup.js         ← UI logic
├── popup.css        ← Styling
└── README.md        ← Full documentation
```

---

## 🔒 Security

- ✅ API key stored **locally only** (not on servers)
- ✅ Only talks to Google Gemini API
- ✅ Never shares your data
- ✅ Delete API key anytime from Chrome settings

---

## 💡 Free Tier Details

Google Gemini API is **free**:
- 60 requests per minute
- Unlimited requests per day
- Perfect for personal channels!

Get it: [Google AI Studio](https://aistudio.google.com/app/apikeys)

---

## ❓ Troubleshooting

| Problem | Solution |
|---------|----------|
| "Navigate to YouTube video" | Make sure you're on a YouTube watch page |
| "API key not configured" | Paste your API key in the setup dialog |
| "No response from API" | Check internet, verify API key is valid |
| Extension not showing | Check `chrome://extensions/` - make sure it's enabled |

---

## 🎯 Pro Tips

1. **Test on your own videos first** - see what works
2. **A/B test suggestions** - compare title variations
3. **Use on competitor videos** - learn what's working
4. **Track results** - note which optimizations improve CTR
5. **Batch optimize** - do multiple videos at once

---

## 📊 Next Steps

After getting JCVIQ working:

1. Optimize your **last 5 videos**
2. Test which suggestions **improve CTR most**
3. Document the **patterns that work**
4. Apply learnings to **new content**
5. Scale the **successful strategies**

---

**Ready?** Start with Step 1 above! 🎉
