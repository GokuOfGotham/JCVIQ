# JCVIQ - YouTube AI Optimizer (Chrome Extension)

A powerful Chrome extension that uses Google Gemini AI to optimize YouTube videos with intelligent suggestions for titles, descriptions, tags, and more.

## Features

✨ **Complete Video Optimization:**
- 📝 **Title Suggestions** - Get 3 AI-generated high-CTR title alternatives with explanations
- 📄 **Description Optimization** - Get an optimized description with keywords and CTAs
- 🏷️ **Smart Tags** - Receive 10 SEO-optimized tags with strategic explanations
- 🖼️ **Thumbnail Advice** - Get specific guidance on improving your thumbnail design
- 🔍 **SEO Keywords** - Discover high-impact keywords and phrases to target
- 🎯 **Content Strategy** - Receive actionable advice on video structure and engagement

🔒 **Secure API Handling:**
- API keys stored locally in your browser
- No external server communication except with Google Gemini API
- One-time setup for easy use

⚡ **User-Friendly Interface:**
- Simple, intuitive popup interface
- One-click optimization analysis
- Easy copy-to-clipboard for all suggestions
- Real-time loading indicators

---

## Setup Instructions

### Prerequisites
- Google Chrome (or Chromium-based browser)
- Google Gemini API key (get one free at [Google AI Studio](https://aistudio.google.com/app/apikeys))

### Installation

1. **Clone or Download This Project**
   ```bash
   git clone <your-repo-url>
   cd JCVIQ
   ```

2. **Add Your Gemini API Key**
   - Get your free API key from [Google AI Studio](https://aistudio.google.com/app/apikeys)
   - You'll enter it in the extension UI on first use

3. **Load into Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle **Developer Mode** (top right corner)
   - Click **Load Unpacked** (top left)
   - Select the `JCVIQ` folder
   - The extension is now installed!

4. **Configure API Key**
   - Navigate to any YouTube video
   - Click the JCVIQ extension icon (top right)
   - Paste your Gemini API key in the setup dialog
   - Click "Save API Key"

### Usage

1. **Navigate to a YouTube Video**
   - Go to any YouTube video page

2. **Click the Extension Icon**
   - Find JCVIQ in your Chrome extensions (top right)
   - Click it to open the popup

3. **Click "Optimize Video"**
   - The extension will extract video metadata
   - Gemini AI will analyze and provide suggestions
   - Results appear with easy-to-copy options

4. **Copy and Apply Suggestions**
   - Click the 📋 button next to any suggestion to copy
   - Use the suggestions to improve your video's performance
   - Test and iterate!

---

## File Structure

```
JCVIQ/
├── manifest.json       # Extension configuration (Manifest V3)
├── content.js          # Injected panel UI + YouTube/Studio data extraction
├── content.css         # Styling for the injected panel
├── background.js       # Service worker: Gemini API, transcript & thumbnail fetch
├── config.js           # OPTIONAL dev-only Gemini key fallback (gitignored)
├── images/             # Extension icons
└── README.md           # This file
```

### File Descriptions

**manifest.json**
- Defines extension permissions and configuration
- Registers the content script/CSS and the background service worker

**content.js**
- Runs on youtube.com and studio.youtube.com pages
- Injects the JCVIQ panel directly into the page (no popup)
- Extracts video title, description, tags, and metadata
- On Studio, can auto-apply results to the edit form; orchestrates mass updates
- Captures on-page video frames for visual grounding

**content.css**
- Styles the injected panel, results, scorecards, and history views

**background.js**
- Service worker running securely in the background
- Reads the API key from `chrome.storage` (falls back to `config.js`)
- Fetches the transcript and thumbnail for grounding
- Calls the Gemini API and repairs/parses the JSON response

**config.js** *(optional, gitignored)*
- A convenience dev fallback holding a personal Gemini key
- Not required — end users enter their key in the panel's Settings (⚙️)
- Never commit this file; if a key leaks, revoke it at Google AI Studio

---

## API Key Management

### Getting a Free API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click "Create API Key"
3. Select your project or create a new one
4. Copy the API key
5. Paste it into the JCVIQ extension

### Free Tier Limits

Google Gemini API has generous free tier limits:
- **Requests per minute:** 60
- **Requests per day:** Unlimited
- **Cost:** Free

Perfect for personal YouTube channel optimization!

### Security Notes

- API keys are stored **locally in your browser's storage**
- They are **NOT** sent to external servers
- They are **NOT** stored on our servers
- You can delete your API key anytime from Chrome settings

---

## Troubleshooting

### "Please navigate to a YouTube video"
- Make sure you're on a YouTube video page (not YouTube home, search, or other pages)
- Refresh the page and try again

### "No response from Gemini API"
- Check your internet connection
- Verify your API key is correct
- Check if you've exceeded rate limits (60 requests/min)

### "API key not configured"
- Click the extension icon
- Paste your API key in the setup dialog
- Click "Save API Key"

### Extension not appearing
- Make sure you're on youtube.com
- Check that the extension is enabled in `chrome://extensions/`
- Try refreshing the YouTube page

### Can't extract video data
- Make sure you're on a YouTube video watch page
- Try refreshing the page
- Check browser console for errors (F12 → Console)

---

## API Response Format

The extension expects Gemini to return optimization data in this JSON format:

```json
{
  "titles": [
    { "title": "better title", "reason": "why this is better" },
    ...
  ],
  "description": "optimized description text",
  "tags": ["tag1", "tag2", ...],
  "tagReasons": "explanation of tag strategy",
  "thumbnailAdvice": "specific thumbnail improvement suggestions",
  "keywordStrategy": "SEO keywords and phrases",
  "contentStrategy": "video structure and engagement advice"
}
```

---

## Performance Tips

1. **Use During Editing**
   - Get suggestions before publishing your video
   - A/B test title variations

2. **Check Competitor Videos**
   - Navigate to competitor videos
   - See what works in your niche
   - Adapt successful strategies

3. **Optimize Multiple Videos**
   - Analyze your top-performing videos
   - Identify common successful elements
   - Apply patterns to new content

4. **Monitor Results**
   - Track which optimizations improve CTR
   - Refine your strategy based on results
   - Share successful patterns with your team

---

## Limitations & Future Improvements

### Current Limitations
- Requires Gemini API key (though free tier is generous)
- Only works on youtube.com
- Single-video analysis (no batch processing yet)

### Planned Features
- 🔄 Batch analysis for multiple videos
- 📊 Performance analytics integration
- 🎨 Thumbnail template suggestions
- 💾 Suggestion history
- 📤 Direct YouTube description export
- 🌐 Multi-language support

---

## License

This project is provided as-is for personal and commercial use.

---

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review the manifest.json and file structure
3. Check Chrome DevTools console for error messages
4. Verify Gemini API key validity at [Google AI Studio](https://aistudio.google.com/app/apikeys)

---

## Credits

Built with:
- Chrome Manifest V3 API
- Google Gemini AI
- Modern JavaScript (ES6+)

---

Happy optimizing! 🚀📺
