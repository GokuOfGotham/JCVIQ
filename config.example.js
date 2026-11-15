// config.example.js - optional configuration template
//
// JCVIQ needs no API key: it runs on free local models through NeuroBrain OS.
// Copy this file to `config.js` (gitignored) only to pin a different NeuroBrain server.
const CONFIG = {
  // Optional override for NeuroBrain OS (CORTEX-5); defaults automatically to
  // http://192.168.1.76:8765 (gamingpc_rx) with failover to Tailscale http://gamingpc-rx:8765
  NEUROBRAIN_API_URL: 'http://192.168.1.76:8765'
};

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
