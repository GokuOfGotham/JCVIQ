// config.example.js - API Configuration template
//
// Copy this file to `config.js` and paste in your own key.
// `config.js` is gitignored and must never be committed.
//
// Get a Gemini API key at https://aistudio.google.com/apikey
const CONFIG = {
  GEMINI_API_KEY: 'YOUR_GEMINI_API_KEY_HERE',
  // Optional override for NeuroBrain OS (CORTEX-5); defaults automatically to
  // http://192.168.1.76:8765 (gamingpc_rx) with failover to Tailscale http://gamingpc-rx:8765
  NEUROBRAIN_API_URL: 'http://192.168.1.76:8765'
};

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
