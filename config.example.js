// config.example.js - API Configuration template
//
// Copy this file to `config.js` and paste in your own key.
// `config.js` is gitignored and must never be committed.
//
// Get a Gemini API key at https://aistudio.google.com/apikey
const CONFIG = {
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE'
};

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
