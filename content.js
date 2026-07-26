// content.js - Extract video data AND inject the JCVIQ panel.
//  - On youtube.com/watch  -> panel docked in the right column (vidIQ-style).
//  - On studio.youtube.com -> floating panel reading the Studio edit fields.

const IS_STUDIO = location.hostname === 'studio.youtube.com';
const PANEL_ID = 'jcviq-panel';
let currentMetadata = null;

/* ============================ Data extraction ============================ */

function text(el) {
	return el && el.textContent ? el.textContent.trim() : null;
}

function meta(property) {
	const el =
		document.querySelector(`meta[property="${property}"]`) ||
		document.querySelector(`meta[name="${property}"]`);
	return el ? el.getAttribute('content') : null;
}

// Extract a balanced JSON object that follows `marker` in a larger string.
// More robust than a regex: JSON string values can contain braces/`};`.
function extractJsonAfter(text, marker) {
	const start = text.indexOf(marker);
	if (start === -1) return null;
	const from = text.indexOf('{', start);
	if (from === -1) return null;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = from; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === '\\') escaped = true;
			else if (ch === '"') inString = false;
		} else if (ch === '"') inString = true;
		else if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return text.slice(from, i + 1);
		}
	}
	return null;
}

function getPlayerResponse() {
	try {
		for (const script of document.querySelectorAll('script')) {
			const src = script.textContent;
			if (!src || src.indexOf('ytInitialPlayerResponse') === -1) continue;
			const raw = extractJsonAfter(src, 'ytInitialPlayerResponse');
			if (raw) return JSON.parse(raw);
		}
	} catch (e) {
		/* ignore */
	}
	return null;
}

// Public watch page.
function getWatchMetadata() {
	const details = getPlayerResponse()?.videoDetails || {};

	const title =
		text(document.querySelector('h1.ytd-watch-metadata yt-formatted-string')) ||
		text(document.querySelector('h1.title yt-formatted-string')) ||
		meta('og:title') ||
		details.title ||
		document.title.replace(/ - YouTube$/, '');

	const description =
		text(document.querySelector('ytd-text-inline-expander #description-inline-expander')) ||
		text(document.querySelector('yt-formatted-string.content')) ||
		meta('og:description') ||
		details.shortDescription ||
		'';

	const tags = Array.isArray(details.keywords) ? details.keywords.slice(0, 25) : [];
	const channelName =
		text(document.querySelector('ytd-channel-name #text a')) ||
		text(document.querySelector('ytd-channel-name a')) ||
		details.author;
	const views =
		text(document.querySelector('span.view-count')) ||
		(details.viewCount ? `${Number(details.viewCount).toLocaleString()} views` : null);
	const likeEl =
		document.querySelector('like-button-view-model button') ||
		document.querySelector('button[aria-label*="like" i]');
	const likes = likeEl ? (likeEl.getAttribute('aria-label') || text(likeEl)) : null;

	const videoId = new URLSearchParams(location.search).get('v') || details.videoId || '';

	return { title, description, tags, channelName, views, likes, videoId, videoUrl: location.href };
}

// YouTube Studio "Video details" edit page.
function getStudioMetadata() {
	let title = '';
	let description = '';
	const boxes = Array.from(document.querySelectorAll('#textbox'));

	boxes.forEach((b) => {
		const label = (b.getAttribute('aria-label') || '').toLowerCase();
		const val = (b.textContent || '').trim();
		if (/title/.test(label) && !title) title = val;
		else if (/(tell viewers|description)/.test(label) && !description) description = val;
	});
	// Fallback: Studio renders the title box first, description second.
	if (!title && boxes[0]) title = (boxes[0].textContent || '').trim();
	if (!description && boxes[1]) description = (boxes[1].textContent || '').trim();

	const idMatch = location.pathname.match(/\/video\/([^/]+)\/edit/);
	const videoId = idMatch ? idMatch[1] : '';

	return { title, description, tags: [], channelName: '', views: '', likes: '', videoId, videoUrl: location.href };
}

function getMetadata() {
	return IS_STUDIO ? getStudioMetadata() : getWatchMetadata();
}

// Keep the popup working: respond to its data requests too.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	if (request.action === 'extractData') {
		sendResponse(getMetadata());
	}
});

/* ============================ Panel construction ============================ */

function el(tag, className, textContent) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (textContent != null) node.textContent = textContent;
	return node;
}

function q(panel, name) {
	return panel.querySelector(`[data-jc="${name}"]`);
}

function buildPanel() {
	const panel = el('div');
	panel.id = PANEL_ID;
	// Both watch pages and Studio use the fixed top-right corner panel.
	panel.classList.add('jcviq-floating');

	panel.innerHTML = `
		<div class="jcviq-header">
			<img alt="JCVIQ" src="${chrome.runtime.getURL('images/icon48.png')}">
			<div class="jcviq-title-wrap">
				<div class="jcviq-title">JCVIQ <span class="jcviq-badge">AI</span></div>
				<div class="jcviq-subtitle">YouTube Optimizer</div>
			</div>
			<button class="jcviq-icon-btn" data-jc="history" title="History">🕘</button>
			<button class="jcviq-icon-btn" data-jc="gear" title="Settings">⚙️</button>
			<button class="jcviq-icon-btn jcviq-min" data-jc="min" title="Minimize">–</button>
		</div>
		<div class="jcviq-body" data-jc="bodyWrap">
			<div class="jcviq-video-info" data-jc="videoInfo"></div>

			<div class="jcviq-type-row">
				<label>Content type</label>
				<select data-jc="contentType">
					<option value="">Auto-detect</option>
					<option value="long">Long-form video</option>
					<option value="short">YouTube Short</option>
					<option value="tutorial">Tutorial / How-to</option>
					<option value="gaming">Gaming</option>
					<option value="sports">Sports</option>
					<option value="news">News / Commentary</option>
					<option value="podcast">Podcast</option>
					<option value="review">Product review</option>
					<option value="vlog">Vlog</option>
					<option value="compilation">Compilation</option>
					<option value="wildlife">Wildlife / Live-cam</option>
				</select>
			</div>

			<label class="jcviq-toggle">
				<input type="checkbox" data-jc="deepVideo">
				<span>🎬 Deep video analysis <span class="jcviq-hint-inline">(AI watches the video — slower)</span></span>
			</label>

			<label class="jcviq-toggle">
				<input type="checkbox" data-jc="autoApply" checked>
				<span>🤖 Auto-Apply to Studio <span class="jcviq-hint-inline">(Fully trust AI to update fields)</span></span>
			</label>

			<button class="jcviq-btn" data-jc="optimize">🚀 Optimize Everything</button>
			<button class="jcviq-btn jcviq-hidden" data-jc="massOptimize">🚀 Mass Optimize Videos</button>

			<div class="jcviq-loading jcviq-hidden" data-jc="loading">
				<div class="jcviq-spinner"></div>
				<div data-jc="loadingText">Analyzing with Gemini AI…</div>
			</div>

			<div class="jcviq-settings jcviq-hidden" data-jc="settings">
				<label>🔑 Gemini API Key</label>
				<input type="password" data-jc="keyInput" placeholder="AIza…" autocomplete="off" spellcheck="false">
				<div class="jcviq-settings-row">
					<button class="jcviq-btn jcviq-btn-sm" data-jc="saveKey">Save Key</button>
					<button class="jcviq-btn jcviq-btn-sm" data-jc="showKey">👁 Show</button>
				</div>
				<p class="jcviq-hint" data-jc="keyStatus"></p>

				<div class="jcviq-divider"></div>

				<label>📺 Channel Profile <span class="jcviq-hint-inline">(applied to every optimization)</span></label>
				<input data-jc="pf-niche" placeholder="Niche / topic (e.g. US Navy & military)">
				<input data-jc="pf-audience" placeholder="Target audience (e.g. defense enthusiasts)">
				<input data-jc="pf-tone" placeholder="Tone / voice (e.g. authoritative, cinematic)">
				<input data-jc="pf-avoid" placeholder="Words to avoid (comma separated)">
				<input data-jc="pf-cta" placeholder="Standard call-to-action">
				<input data-jc="pf-hashtags" placeholder="Preferred hashtags (#navy #military)">
				<input data-jc="pf-links" placeholder="Links for description">
				<input data-jc="pf-language" placeholder="Output language (default: English)">
				<button class="jcviq-btn jcviq-btn-sm" data-jc="saveProfile">Save Profile</button>
				<p class="jcviq-hint" data-jc="profileStatus"></p>
				<p class="jcviq-hint">Everything is stored locally in your browser. Get a free key at Google AI Studio.</p>
			</div>

			<div class="jcviq-history jcviq-hidden" data-jc="historyView"></div>
			<div class="jcviq-results jcviq-hidden" data-jc="results"></div>
			<div class="jcviq-msg jcviq-hidden" data-jc="msg"></div>
			<div class="jcviq-footer">✨ Powered by Google Gemini</div>
		</div>
	`;

	q(panel, 'optimize').addEventListener('click', () => runOptimize(panel));
	q(panel, 'massOptimize').addEventListener('click', () => startMassUpdate(panel));
	q(panel, 'gear').addEventListener('click', () => toggleSettings(panel));
	q(panel, 'min').addEventListener('click', () => panel.classList.toggle('jcviq-collapsed'));
	q(panel, 'saveKey').addEventListener('click', () => saveKey(panel));
	q(panel, 'showKey').addEventListener('click', () => toggleKeyVisibility(panel));
	q(panel, 'saveProfile').addEventListener('click', () => saveProfile(panel));
	q(panel, 'history').addEventListener('click', () => toggleHistory(panel));
	q(panel, 'contentType').addEventListener('change', (e) => {
		chrome.storage.local.set({ contentType: e.target.value });
	});
	q(panel, 'deepVideo').addEventListener('change', (e) => {
		chrome.storage.local.set({ deepVideo: e.target.checked });
	});
	q(panel, 'autoApply').addEventListener('change', (e) => {
		chrome.storage.local.set({ autoApply: e.target.checked });
	});

	loadPrefs(panel);
	return panel;
}

const PROFILE_FIELDS = ['niche', 'audience', 'tone', 'avoid', 'cta', 'hashtags', 'links', 'language'];

async function loadPrefs(panel) {
	const { contentType, channelProfile, deepVideo, autoApply } = await chrome.storage.local.get(['contentType', 'channelProfile', 'deepVideo', 'autoApply']);
	if (contentType) q(panel, 'contentType').value = contentType;
	if (deepVideo) q(panel, 'deepVideo').checked = true;
	if (autoApply !== undefined) q(panel, 'autoApply').checked = autoApply;
	if (channelProfile) {
		PROFILE_FIELDS.forEach((f) => {
			const input = q(panel, 'pf-' + f);
			if (input && channelProfile[f]) input.value = channelProfile[f];
		});
	}
}

function readProfile(panel) {
	const profile = {};
	PROFILE_FIELDS.forEach((f) => {
		const v = (q(panel, 'pf-' + f)?.value || '').trim();
		if (v) profile[f] = v;
	});
	return profile;
}

async function saveProfile(panel) {
	const profile = readProfile(panel);
	await chrome.storage.local.set({ channelProfile: profile });
	q(panel, 'profileStatus').textContent = '✅ Channel profile saved.';
}

function refreshVideoInfo(panel) {
	currentMetadata = getMetadata();
	// Editing a DRAFT opens the upload dialog as a modal ON TOP of the /videos
	// list, so the URL stays "/videos". Prioritise the presence of the edit form:
	// if a details form/dialog is open we're editing one video (individual mode),
	// otherwise a "/videos" URL means the list (mass mode).
	const isList = !studioFormPresent() && location.pathname.includes('/videos');

	if (isList) {
		q(panel, 'optimize').classList.add('jcviq-hidden');
		const massBtn = q(panel, 'massOptimize');
		if (massBtn) {
			massBtn.classList.remove('jcviq-hidden');
			const count = collectStudioVideoIds().length;
			massBtn.textContent = `🚀 Mass Optimize [${count}] Videos`;
		}
		
		const info = q(panel, 'videoInfo');
		info.innerHTML = '';
		info.append(el('strong', null, 'Channel Content Mode'));
		info.append(el('span', null, 'Auto-apply AI to all videos on screen.'));
	} else {
		q(panel, 'optimize').classList.remove('jcviq-hidden');
		if (q(panel, 'massOptimize')) q(panel, 'massOptimize').classList.add('jcviq-hidden');
		
		const info = q(panel, 'videoInfo');
		info.innerHTML = '';
		info.append(el('strong', null, currentMetadata.title || 'No title detected'));
		const sub = IS_STUDIO
			? 'Reading from YouTube Studio'
			: `${currentMetadata.views || '– views'} · ${currentMetadata.channelName || 'Unknown channel'}`;
		info.append(el('span', null, sub));
	}
}

/* ---- Settings ---- */

function toggleSettings(panel) {
	const s = q(panel, 'settings');
	const hidden = s.classList.contains('jcviq-hidden');
	s.classList.toggle('jcviq-hidden', !hidden);
	if (hidden) {
		q(panel, 'historyView').classList.add('jcviq-hidden');
		loadKeyStatus(panel);
	}
}

async function loadKeyStatus(panel) {
	const { geminiApiKey } = await chrome.storage.local.get('geminiApiKey');
	if (geminiApiKey) {
		q(panel, 'keyInput').value = geminiApiKey;
		q(panel, 'keyStatus').textContent = '✅ API key saved.';
	} else {
		q(panel, 'keyStatus').textContent = 'No key saved yet.';
	}
}

async function saveKey(panel) {
	const key = q(panel, 'keyInput').value.trim();
	if (!key) {
		q(panel, 'keyStatus').textContent = '⚠️ Enter a key first.';
		return;
	}
	await chrome.storage.local.set({ geminiApiKey: key });
	q(panel, 'keyStatus').textContent = '✅ API key saved.';
}

function toggleKeyVisibility(panel) {
	const input = q(panel, 'keyInput');
	const btn = q(panel, 'showKey');
	if (input.type === 'password') {
		input.type = 'text';
		btn.textContent = '🙈 Hide';
	} else {
		input.type = 'password';
		btn.textContent = '👁 Show';
	}
}

/* ---- Frame capture (visual grounding for private / unprocessed videos) ---- */

function findPreviewVideo() {
	return Array.from(document.querySelectorAll('video'))
		.filter((v) => v.videoWidth > 0 && v.videoHeight > 0)
		.sort((a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight)[0] || null;
}

function seekTo(video, t) {
	return new Promise((resolve) => {
		const cleanup = () => {
			video.removeEventListener('seeked', onSeeked);
			clearTimeout(timer);
		};
		const onSeeked = () => { cleanup(); resolve(true); };
		const timer = setTimeout(() => { cleanup(); resolve(false); }, 2500);
		video.addEventListener('seeked', onSeeked);
		try { video.currentTime = t; } catch (e) { cleanup(); resolve(false); }
	});
}

// Grab evenly-spaced frames from the on-page video element.
// Returns { frames: [{mimeType,data}], tainted: bool }.
async function captureVideoFrames(maxFrames = 4) {
	const video = findPreviewVideo();
	if (!video) return { frames: [], tainted: false };

	const duration = isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
	const times = [];
	if (duration) {
		for (let i = 1; i <= maxFrames; i++) times.push((duration * i) / (maxFrames + 1));
	} else {
		times.push(video.currentTime || 0);
	}

	const canvas = document.createElement('canvas');
	const scale = Math.min(1, 640 / video.videoWidth);
	canvas.width = Math.round(video.videoWidth * scale);
	canvas.height = Math.round(video.videoHeight * scale);
	const ctx = canvas.getContext('2d');

	const originalTime = video.currentTime;
	const wasPaused = video.paused;
	const wasMuted = video.muted;
	video.muted = true;
	if (!wasPaused) { try { video.pause(); } catch (e) { /* ignore */ } }

	const frames = [];
	let tainted = false;
	for (const t of times) {
		await seekTo(video, t);
		try {
			ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
			const dataUrl = canvas.toDataURL('image/jpeg', 0.7); // throws if canvas is tainted
			frames.push({ mimeType: 'image/jpeg', data: dataUrl.split(',')[1] });
		} catch (e) {
			tainted = true;
			break;
		}
	}

	// Restore the player.
	try {
		video.currentTime = originalTime;
		video.muted = wasMuted;
		if (!wasPaused) video.play().catch(() => {});
	} catch (e) { /* ignore */ }

	return { frames, tainted };
}

/* ---- Optimize ---- */

async function runOptimize(panel) {
	refreshVideoInfo(panel);
	if (!currentMetadata || !currentMetadata.title) {
		showMsg(panel, IS_STUDIO
			? 'Could not read the title field. Make sure the video details are loaded.'
			: 'Could not read this video. Refresh the page and try again.', 'err');
		return;
	}

	hideMsg(panel);
	q(panel, 'results').classList.add('jcviq-hidden');
	const deepVideo = q(panel, 'deepVideo').checked;
	q(panel, 'loading').classList.remove('jcviq-hidden');
	q(panel, 'optimize').disabled = true;

	// For deep analysis, grab frames from the on-page player first. This gives
	// visual grounding even for private / still-processing uploads that Gemini
	// cannot reach by URL.
	let frames = [];
	let framesTainted = false;
	if (deepVideo) {
		q(panel, 'loadingText').textContent = 'Capturing video frames…';
		try {
			const cap = await captureVideoFrames();
			frames = cap.frames;
			framesTainted = cap.tainted;
		} catch (e) { /* ignore */ }
	}

	q(panel, 'loadingText').textContent = deepVideo
		? (frames.length ? 'Analyzing video frames…' : 'Watching the video… up to a minute')
		: currentMetadata.videoId
			? 'Reading captions & analyzing…'
			: 'Analyzing with Gemini AI…';

	const payload = {
		...currentMetadata,
		contentType: q(panel, 'contentType').value,
		deepVideo,
		frames,
		profile: readProfile(panel)
	};

	chrome.runtime.sendMessage(
		{ action: 'optimizeVideo', metadata: payload },
		(response) => {
			q(panel, 'loading').classList.add('jcviq-hidden');
			q(panel, 'optimize').disabled = false;

			if (chrome.runtime.lastError) {
				showMsg(panel, 'Extension error: ' + chrome.runtime.lastError.message, 'err');
			} else if (!response) {
				showMsg(panel, 'No response from the extension. Try reloading it.', 'err');
			} else if (response.error) {
				showMsg(panel, response.error, 'err');
				if (/api key/i.test(response.error)) toggleSettings(panel);
			} else if (response.optimization) {
				const videoSource = response.hasVideo ? 'url' : response.hasFrames ? 'frames' : null;
				renderResults(panel, response.optimization, response.hasTranscript, videoSource);
				if (deepVideo && !response.hasVideo && !response.hasFrames) {
					showMsg(panel, framesTainted
						? 'Could not read the preview frames (the player blocks pixel access). Set the video to Unlisted and re-run for full video analysis.'
						: 'No visual source available yet — play the preview so it loads, or set the video Unlisted for full analysis. Used text only for now.', 'err', 7000);
				} else if (response.videoNote) {
					showMsg(panel, response.videoNote, 'ok', 5000);
				}

				if (IS_STUDIO && q(panel, 'autoApply').checked) {
					const opt = response.optimization;
					let applied = false;
					if (opt.titles?.length) {
						setStudioTextbox('title', opt.titles[0].title);
						applied = true;
					}
					if (opt.description) {
						let cleanDesc = opt.description.replace(/(?:\s*#[a-zA-Z0-9_]+)+\s*$/, '');
						const fullDesc = opt.hashtags?.length
							? `${cleanDesc}\n\n${opt.hashtags.join(' ')}`
							: cleanDesc;
						setStudioTextbox('description', fullDesc);
						applied = true;
					}
					if (opt.tags?.length) {
						setStudioTags(opt.tags);
						applied = true;
					}
					if (applied) {
						setTimeout(() => {
							showMsg(panel, '🚀 Trusted AI Auto-Applied Title, Description & Tags!', 'ok', 4000);
							chrome.storage.local.get('massUpdateQueue').then(({ massUpdateQueue = [] }) => {
								if (massUpdateQueue.length > 0 && massUpdateQueue[0] === currentMetadata.videoId) {
									clickSaveAndContinue(panel, massUpdateQueue);
								}
							});
						}, 500);
					}
				}

				saveToHistory(currentMetadata, response.optimization, response.hasTranscript, response.hasThumbnail);
			}
		}
	);
}

/* ---- Mass Update Orchestration ---- */

// Collect the video IDs of every video on the Content page.
// Layout-independent: instead of assuming a specific row element, we sweep for
// /video/{id}/edit references anywhere on the page. Published/private videos
// always expose such a link. Drafts may only carry their id in a data-* or
// on a nested element, so we also scan every attribute and the raw HTML.
function collectStudioVideoIds() {
	const ids = [];
	const seen = new Set();
	const add = (id) => { if (id && !seen.has(id)) { seen.add(id); ids.push(id); } };
	const ID_EDIT = /\/video\/([A-Za-z0-9_-]{11})\/edit/;
	const ID_ANY = /\bvideo\/([A-Za-z0-9_-]{11})\b|"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;

	// 1. Every anchor that points at a video edit page (published & private).
	document.querySelectorAll('a[href*="/video/"]').forEach((a) => {
		const m = (a.getAttribute('href') || '').match(ID_EDIT);
		if (m) add(m[1]);
	});

	// 2. Any element attribute holding a /video/{id}/edit reference (thumbnails,
	//    menu items, data-* on rows) — catches layouts without a title anchor.
	document.querySelectorAll('[href],[data-video-id],[test-id]').forEach((elm) => {
		for (const attr of elm.attributes) {
			const m = attr.value && attr.value.match(ID_EDIT);
			if (m) add(m[1]);
			if (attr.name === 'data-video-id' && /^[A-Za-z0-9_-]{11}$/.test(attr.value)) add(attr.value);
		}
	});

	// 3. Last-resort raw-HTML sweep of the content list container, catching ids
	//    embedded as plain text/JSON (some draft rows expose them this way).
	if (!ids.length) {
		const scope = document.querySelector('ytcp-video-section-content, #contents, ytcp-content-cards-manager') || document.body;
		const html = scope ? scope.innerHTML : '';
		let m;
		while ((m = ID_ANY.exec(html))) add(m[1] || m[2]);
	}
	return ids;
}

async function startMassUpdate(panel) {
	const vids = collectStudioVideoIds();

	if (!vids.length) {
		showMsg(panel, 'No videos found on this page.', 'err');
		return;
	}

	showMsg(panel, `🚀 Starting background mass update of ${vids.length} videos (drafts included)...`, 'ok');
	q(panel, 'massOptimize').disabled = true;

	chrome.runtime.sendMessage({ action: 'startBackgroundMassUpdate', vids });
}

function clickSaveAndContinue(panel, queue) {
	showMsg(panel, '💾 Auto-saving video...', 'ok');
	
	// Published/private videos use #save; drafts persist via a "Save" / "Done"
	// button that isn't always id'd, so fall back to matching the button label.
	const enabled = (b) => b && !b.hasAttribute('disabled') && b.getAttribute('aria-disabled') !== 'true';
	let saveBtn = document.querySelector('ytcp-button#save') || document.querySelector('ytcp-button#save-button');
	if (!enabled(saveBtn)) {
		saveBtn = Array.from(document.querySelectorAll('ytcp-button, ytcp-button-shape button'))
			.find((b) => enabled(b) && /^(save|done)$/i.test((b.textContent || '').trim()));
	}
	if (enabled(saveBtn)) {
		saveBtn.click();
	}

	// Wait 4 seconds for save to process, then move to next
	setTimeout(() => {
		showMsg(panel, '➡️ Moving to next background video...', 'ok');
		chrome.runtime.sendMessage({ action: 'massUpdateNext' });
	}, 4000);
}

chrome.storage.onChanged.addListener((changes) => {
	if (changes.massUpdateQueue) {
		const qLength = (changes.massUpdateQueue.newValue || []).length;
		const massBtn = document.querySelector('[data-jc="massOptimize"]');
		if (massBtn && qLength > 0) {
			massBtn.textContent = `⏳ Processing ${qLength} video(s) in background...`;
			massBtn.disabled = true;
		} else if (massBtn && qLength === 0) {
			massBtn.textContent = `🎉 Mass update complete!`;
			massBtn.disabled = false;
		}
	}
});

/* ---- History library ---- */

const HISTORY_LIMIT = 40;

async function saveToHistory(meta, optimization, hasTranscript, hasThumbnail) {
	try {
		const { history = [] } = await chrome.storage.local.get('history');
		history.unshift({
			id: (meta.videoId || 'unknown') + '-' + Date.now(),
			videoId: meta.videoId || '',
			title: meta.title || 'Untitled',
			date: Date.now(),
			hasTranscript: Boolean(hasTranscript),
			optimization
		});
		await chrome.storage.local.set({ history: history.slice(0, HISTORY_LIMIT) });
	} catch (e) {
		console.warn('Could not save history:', e.message);
	}
}

function timeAgo(ts) {
	const s = Math.floor((Date.now() - ts) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return Math.floor(s / 60) + 'm ago';
	if (s < 86400) return Math.floor(s / 3600) + 'h ago';
	return Math.floor(s / 86400) + 'd ago';
}

async function toggleHistory(panel) {
	const view = q(panel, 'historyView');
	if (!view.classList.contains('jcviq-hidden')) {
		view.classList.add('jcviq-hidden');
		return;
	}
	// Opening: hide other views.
	q(panel, 'results').classList.add('jcviq-hidden');
	q(panel, 'settings').classList.add('jcviq-hidden');
	hideMsg(panel);
	await renderHistory(panel);
	view.classList.remove('jcviq-hidden');
}

async function renderHistory(panel) {
	const view = q(panel, 'historyView');
	view.innerHTML = '';

	const { history = [] } = await chrome.storage.local.get('history');

	const head = el('div', 'jcviq-sec-head');
	head.append(el('span', 'jcviq-sec-icon', '🕘'));
	head.append(el('span', 'jcviq-sec-label', 'History'));
	if (history.length) {
		const clear = el('button', 'jcviq-copy', '🗑 Clear');
		clear.addEventListener('click', async () => {
			await chrome.storage.local.set({ history: [] });
			renderHistory(panel);
		});
		head.append(clear);
	}
	view.append(head);

	if (!history.length) {
		view.append(el('div', 'jcviq-hint', 'No saved optimizations yet. Run one and it will appear here.'));
		return;
	}

	history.forEach((entry) => {
		const row = el('div', 'jcviq-hist-item');
		const info = el('div', 'jcviq-hist-info');
		info.append(el('div', 'jcviq-hist-title', entry.title));
		info.append(el('div', 'jcviq-hist-date', timeAgo(entry.date) + (entry.hasTranscript ? ' · 📝 transcript' : '')));
		row.append(info);
		row.addEventListener('click', () => {
			q(panel, 'historyView').classList.add('jcviq-hidden');
			renderResults(panel, entry.optimization, entry.hasTranscript);
		});
		view.append(row);
	});
}

/* ============================ Results rendering ============================ */

function section(icon, label, count) {
	const sec = el('div', 'jcviq-section');
	const head = el('div', 'jcviq-sec-head');
	head.append(el('span', 'jcviq-sec-icon', icon));
	head.append(el('span', 'jcviq-sec-label', label));
	if (count != null) head.append(el('span', 'jcviq-sec-count', String(count)));
	sec.append(head);
	return sec;
}

function copyBtn(panel, label, value) {
	const btn = el('button', 'jcviq-btn jcviq-btn-sm', label);
	btn.addEventListener('click', () => copyValue(panel, value));
	return btn;
}

function scoreColor(v) {
	if (v >= 80) return '#1a9c4b';
	if (v >= 60) return '#e0a800';
	return '#e0453e';
}

function renderScorecard(panel, scores) {
	const sec = section('📊', 'Current Score', null);
	if (scores.summary) {
		sec.append(el('div', 'jcviq-score-summary', scores.summary));
	}
	const metrics = [
		['Title clarity', scores.titleClarity],
		['Curiosity', scores.curiosity],
		['Keyword relevance', scores.keywordRelevance],
		['Mobile readability', scores.mobileReadability],
		['Description completeness', scores.descriptionCompleteness]
	];
	metrics.forEach(([label, value]) => {
		if (typeof value !== 'number') return;
		const row = el('div', 'jcviq-score-row');
		row.append(el('span', 'jcviq-score-label', label));
		const bar = el('div', 'jcviq-score-bar');
		const fill = el('div', 'jcviq-score-fill');
		fill.style.width = Math.max(0, Math.min(100, value)) + '%';
		fill.style.background = scoreColor(value);
		bar.append(fill);
		row.append(bar);
		row.append(el('span', 'jcviq-score-val', String(value)));
		sec.append(row);
	});
	if (scores.clickbaitRisk) {
		const risk = el('div', 'jcviq-score-risk');
		risk.append(el('span', null, 'Clickbait risk: '));
		const badge = el('span', 'jcviq-risk-badge', scores.clickbaitRisk);
		const r = scores.clickbaitRisk.toLowerCase();
		badge.style.background = r === 'high' ? '#e0453e' : r === 'medium' ? '#e0a800' : '#1a9c4b';
		risk.append(badge);
		sec.append(risk);
	}
	return sec;
}

function renderResults(panel, opt, hasTranscript, videoSource) {
	const results = q(panel, 'results');
	results.innerHTML = '';

	// Grounding indicator
	let badgeText;
	let badgeClass = 'on';
	if (videoSource === 'url') {
		badgeText = '🎬 Grounded in the actual video (visuals + audio)';
	} else if (videoSource === 'frames') {
		badgeText = '🎬 Grounded in captured video frames';
	} else if (hasTranscript) {
		badgeText = '✓ Grounded in the video transcript';
	} else {
		badgeText = 'ⓘ No video/captions available — based on title & description';
		badgeClass = 'off';
	}
	results.append(el('div', 'jcviq-transcript-badge ' + badgeClass, badgeText));

	// 0. Scorecard
	if (opt.scores) results.append(renderScorecard(panel, opt.scores));

	// 1. Titles (A/B candidates)
	if (opt.titles?.length) {
		const sec = section('📝', 'Titles · A/B candidates', opt.titles.length);
		opt.titles.forEach((item, i) => {
			const row = el('div', 'jcviq-suggestion');
			row.append(el('div', 'jcviq-num', i + 1));
			const body = el('div', 'jcviq-sug-body');
			body.append(
				el('div', 'jcviq-sug-text', item.title),
				el('div', 'jcviq-sug-reason', item.reason || '')
			);
			const actions = el('div', 'jcviq-row-actions');
			if (IS_STUDIO) {
				const apply = el('button', 'jcviq-copy', '✍️');
				apply.title = 'Use this title in Studio';
				apply.addEventListener('click', () => applyToStudio(panel, 'title', item.title));
				actions.append(apply);
			}
			const copy = el('button', 'jcviq-copy', '📋');
			copy.title = 'Copy title';
			copy.addEventListener('click', () => copyValue(panel, item.title));
			actions.append(copy);
			row.append(body, actions);
			sec.append(row);
		});
		results.append(sec);
	}

	// 2. Description (+ hashtags appended for easy copy)
	if (opt.description) {
		const sec = section('📄', 'Description');
		let cleanDesc = opt.description.replace(/(?:\s*#[a-zA-Z0-9_]+)+\s*$/, '');
		const fullDesc = opt.hashtags?.length
			? `${cleanDesc}\n\n${opt.hashtags.join(' ')}`
			: cleanDesc;
		sec.append(el('div', 'jcviq-desc', fullDesc));
		const row = el('div', 'jcviq-btn-row');
		row.append(copyBtn(panel, '📋 Copy', fullDesc));
		if (IS_STUDIO) {
			const apply = el('button', 'jcviq-btn jcviq-btn-sm jcviq-btn-apply', '✍️ Apply to Studio');
			apply.addEventListener('click', () => applyToStudio(panel, 'description', fullDesc));
			row.append(apply);
		}
		sec.append(row);
		results.append(sec);
	}

	// 3. Hashtags
	if (opt.hashtags?.length) {
		const sec = section('#️⃣', 'Hashtags', opt.hashtags.length);
		const wrap = el('div', 'jcviq-tags');
		opt.hashtags.forEach((h) => wrap.append(el('span', 'jcviq-tag', h)));
		sec.append(wrap);
		sec.append(copyBtn(panel, '📋 Copy Hashtags', opt.hashtags.join(' ')));
		results.append(sec);
	}

	// 4. Tags / keywords
	if (opt.tags?.length) {
		const sec = section('🏷️', 'Tags', opt.tags.length);
		const wrap = el('div', 'jcviq-tags');
		opt.tags.forEach((t) => wrap.append(el('span', 'jcviq-tag', t)));
		sec.append(wrap);
		if (opt.tagReasons) sec.append(el('div', 'jcviq-reason', opt.tagReasons));
		
		const row = el('div', 'jcviq-btn-row');
		row.append(copyBtn(panel, '📋 Copy Tags', opt.tags.join(', ')));
		if (IS_STUDIO) {
			const apply = el('button', 'jcviq-btn jcviq-btn-sm jcviq-btn-apply', '✍️ Apply to Studio');
			apply.addEventListener('click', () => applyToStudio(panel, 'tags', opt.tags));
			row.append(apply);
		}
		sec.append(row);
		results.append(sec);
	}

	// 5. Thumbnail concepts
	if (opt.thumbnailConcepts?.length) {
		const sec = section('🖼️', 'Thumbnail Concepts', opt.thumbnailConcepts.length);
		opt.thumbnailConcepts.forEach((c, i) => {
			const row = el('div', 'jcviq-suggestion');
			row.append(el('div', 'jcviq-num', i + 1));
			const body = el('div', 'jcviq-sug-body');
			body.append(
				el('div', 'jcviq-sug-text', `"${c.textOverlay}"`),
				el('div', 'jcviq-sug-reason', c.idea || '')
			);
			row.append(body);
			sec.append(row);
		});
		results.append(sec);
	}

	// 6. Chapters / timestamps
	if (opt.chapters?.length) {
		const sec = section('⏱️', 'Chapters', opt.chapters.length);
		const lines = opt.chapters.map((c) => `${c.timestamp} ${c.title}`);
		const box = el('div', 'jcviq-desc');
		lines.forEach((line) => {
			const p = el('div', null, line);
			box.append(p);
		});
		sec.append(box);
		sec.append(copyBtn(panel, '📋 Copy Chapters', lines.join('\n')));
		results.append(sec);
	}

	// 7. Pinned comment
	if (opt.pinnedComment) {
		const sec = section('💬', 'Pinned Comment');
		sec.append(el('div', 'jcviq-desc', opt.pinnedComment));
		sec.append(copyBtn(panel, '📋 Copy Comment', opt.pinnedComment));
		results.append(sec);
	}

	// 8. Playlists + Category (compact)
	if (opt.playlistSuggestions?.length || opt.category) {
		const sec = section('📂', 'Playlists & Category');
		if (opt.category) {
			const cat = el('div', 'jcviq-text');
			cat.append(el('strong', null, 'Category: '));
			cat.append(document.createTextNode(opt.category));
			sec.append(cat);
		}
		if (opt.playlistSuggestions?.length) {
			const wrap = el('div', 'jcviq-tags');
			wrap.style.marginTop = '8px';
			opt.playlistSuggestions.forEach((p) => wrap.append(el('span', 'jcviq-tag', p)));
			sec.append(wrap);
		}
		results.append(sec);
	}

	// 9. Strategy & Research sections
	const strategy = [
		['🧠', 'AI Research Insights (1M View Data)', opt.researchInsights],
		['🎣', 'Hook · first 15-30s', opt.hook],
		['🔍', 'SEO Keywords', opt.keywordStrategy],
		['🎯', 'Content Strategy', opt.contentStrategy],
		['📺', 'End Screens & Cards', opt.endScreenTips]
	];
	strategy.forEach(([icon, label, body]) => {
		if (!body) return;
		const sec = section(icon, label);
		sec.append(el('div', 'jcviq-text', body));
		results.append(sec);
	});

	// 10. Thumbnail analysis (vision)
	if (opt.thumbnailAnalysis) {
		const ta = opt.thumbnailAnalysis;
		const sec = section('🖼️', 'Thumbnail Analysis');
		[
			['Readability', ta.readability],
			['Subject visibility', ta.subjectVisibility],
			['Contrast', ta.contrast],
			['Mobile legibility', ta.mobileLegibility],
			['Low clutter', ta.clutter]
		].forEach(([label, value]) => {
			if (typeof value !== 'number') return;
			const row = el('div', 'jcviq-score-row');
			row.append(el('span', 'jcviq-score-label', label));
			const bar = el('div', 'jcviq-score-bar');
			const fill = el('div', 'jcviq-score-fill');
			fill.style.width = Math.max(0, Math.min(100, value)) + '%';
			fill.style.background = scoreColor(value);
			bar.append(fill);
			row.append(bar, el('span', 'jcviq-score-val', String(value)));
			sec.append(row);
		});
		if (ta.titleSynergy) {
			const syn = el('div', 'jcviq-text');
			syn.style.marginTop = '10px';
			syn.append(el('strong', null, 'Title synergy: '));
			syn.append(document.createTextNode(ta.titleSynergy));
			sec.append(syn);
		}
		(ta.improvements || []).forEach((imp) => {
			const row = el('div', 'jcviq-suggestion');
			row.append(el('div', 'jcviq-num', '→'));
			const body = el('div', 'jcviq-sug-body');
			body.append(el('div', 'jcviq-sug-reason', imp));
			row.append(body);
			sec.append(row);
		});
		results.append(sec);
	}

	// 11. Repurposing toolkit
	if (opt.repurposing) {
		const rp = opt.repurposing;
		const sec = section('♻️', 'Repurposing Toolkit');

		if (rp.shortsIdeas?.length) {
			sec.append(el('div', 'jcviq-rp-head', 'Shorts ideas'));
			rp.shortsIdeas.forEach((s, i) => {
				const row = el('div', 'jcviq-suggestion');
				row.append(el('div', 'jcviq-num', i + 1));
				const body = el('div', 'jcviq-sug-body');
				body.append(el('div', 'jcviq-sug-text', s.title));
				body.append(el('div', 'jcviq-sug-reason', s.hook || ''));
				row.append(body);
				const copy = el('button', 'jcviq-copy', '📋');
				copy.title = 'Copy';
				copy.addEventListener('click', () => copyValue(panel, `${s.title}\n${s.hook || ''}`));
				row.append(copy);
				sec.append(row);
			});
		}

		const posts = rp.socialPosts || {};
		[
			['𝕏 / Twitter', posts.x],
			['Community post', posts.community],
			['Instagram / Reels', posts.instagram]
		].forEach(([label, body]) => {
			if (!body) return;
			sec.append(el('div', 'jcviq-rp-head', label));
			const box = el('div', 'jcviq-desc', body);
			sec.append(box);
			sec.append(copyBtn(panel, '📋 Copy', body));
		});

		if (rp.followUpIdeas?.length) {
			sec.append(el('div', 'jcviq-rp-head', 'Follow-up video ideas'));
			rp.followUpIdeas.forEach((idea) => {
				const row = el('div', 'jcviq-suggestion');
				row.append(el('div', 'jcviq-num', '💡'));
				const body = el('div', 'jcviq-sug-body');
				body.append(el('div', 'jcviq-sug-text', idea));
				row.append(body);
				sec.append(row);
			});
		}
		results.append(sec);
	}

	results.classList.remove('jcviq-hidden');
}

/* ---- Apply directly into the YouTube Studio form ---- */

function findStudioBox(kind) {
	const boxes = Array.from(document.querySelectorAll('#textbox'));
	for (const b of boxes) {
		const label = (b.getAttribute('aria-label') || '').toLowerCase();
		if (kind === 'title' && /title/.test(label)) return b;
		if (kind === 'description' && /(tell viewers|description)/.test(label)) return b;
	}
	return kind === 'title' ? boxes[0] : boxes[1];
}

// Write text into a Studio contenteditable so its framework registers the change.
function setStudioTextbox(kind, value) {
	const box = findStudioBox(kind);
	if (!box) return false;

	box.focus();
	try {
		// execCommand('insertText') fires the proper input events Studio listens for.
		const sel = window.getSelection();
		const range = document.createRange();
		range.selectNodeContents(box);
		sel.removeAllRanges();
		sel.addRange(range);
		const ok = document.execCommand('insertText', false, value);
		if (!ok) {
			box.textContent = value;
			box.dispatchEvent(new InputEvent('input', { bubbles: true }));
		}
	} catch (e) {
		box.textContent = value;
		box.dispatchEvent(new Event('input', { bubbles: true }));
	}
	box.dispatchEvent(new Event('change', { bubbles: true }));
	return true;
}

// YouTube caps the tags field at 500 characters total (tags joined by commas).
// Overflowing it makes Studio reject the input and the apply appears to hang, so
// trim the list to fit. `continue` (not break) lets a later short tag still fit.
const YT_TAGS_MAX = 500;
function fitTagsToLimit(tags, maxChars = YT_TAGS_MAX) {
	const out = [];
	let used = 0;
	for (const raw of tags || []) {
		const tag = String(raw || '').trim();
		if (!tag) continue;
		const cost = tag.length + (out.length ? 1 : 0); // +1 for the joining comma
		if (used + cost > maxChars) continue;
		out.push(tag);
		used += cost;
	}
	return out;
}

function setStudioTags(tagsArray) {
	tagsArray = fitTagsToLimit(tagsArray);
	if (!tagsArray.length) return false;

	// The tags section might be hidden behind the "Show more" button
	const showMoreBtns = Array.from(document.querySelectorAll('ytcp-button#toggle-button'));
	const showMoreBtn = showMoreBtns.find(b => (b.textContent || '').toLowerCase().includes('show more'));
	if (showMoreBtn) showMoreBtn.click();

	setTimeout(() => {
		const tagInput = document.querySelector('ytcp-free-text-chip-bar #text-input') ||
						 document.querySelector('input[aria-label="Tags"]') ||
						 document.querySelector('input[aria-label="Add tag"]');
		if (tagInput) {
			tagInput.focus();
			// A trailing comma tells YouTube Studio to convert the pasted string into chips
			const val = tagsArray.join(', ') + ',';
			const ok = document.execCommand('insertText', false, val);
			if (!ok) {
				tagInput.value = val;
				tagInput.dispatchEvent(new Event('input', { bubbles: true }));
				tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
			}
		}
	}, 300);
	return true;
}

function applyToStudio(panel, kind, value) {
	let ok = false;
	if (kind === 'tags') {
		ok = setStudioTags(value);
	} else {
		ok = setStudioTextbox(kind, value);
	}
	const label = kind.charAt(0).toUpperCase() + kind.slice(1);
	showMsg(panel, ok ? `✅ ${label} applied to Studio!` : `Could not find the ${kind} field.`, ok ? 'ok' : 'err', 2400);
}

/* ---- Clipboard & messages ---- */

function copyValue(panel, value) {
	navigator.clipboard.writeText(value).then(() => showMsg(panel, '✅ Copied to clipboard!', 'ok', 1800));
}

function showMsg(panel, message, type, autohide) {
	const m = q(panel, 'msg');
	m.textContent = message;
	m.className = 'jcviq-msg ' + (type === 'ok' ? 'ok' : 'err');
	if (autohide) setTimeout(() => hideMsg(panel), autohide);
}

function hideMsg(panel) {
	q(panel, 'msg').classList.add('jcviq-hidden');
}

/* ============================ Mount / SPA handling ============================ */

// In Studio the details form appears both on the edit page AND in the upload
// dialog (which has no /edit URL), so detect the form itself rather than the URL.
function studioFormPresent() {
	if (document.querySelector('ytcp-uploads-dialog') || document.querySelector('ytcp-video-metadata-editor')) {
		return true;
	}
	return Array.from(document.querySelectorAll('#textbox')).some((b) =>
		/title|tell viewers/i.test(b.getAttribute('aria-label') || '')
	);
}

function isTargetPage() {
	if (IS_STUDIO) {
		return studioFormPresent() || location.pathname.includes('/videos');
	}
	return location.pathname === '/watch';
}

function mountPanel(attempt = 0) {
	// Failsafe: never run in iframes (e.g. YouTube live chat)
	if (window.top !== window.self) return;

	if (!isTargetPage()) return;

	// Aggressively remove ALL existing panels before mounting to prevent duplicates
	const existingPanels = document.querySelectorAll('#' + PANEL_ID);
	if (existingPanels.length > 1) {
		existingPanels.forEach(p => p.remove());
	} else if (existingPanels.length === 1) {
		refreshVideoInfo(existingPanels[0]);
		return;
	}

	// Fixed corner panel → always mounts on <body>.
	if (document.body) {
		const panel = buildPanel();
		document.body.appendChild(panel);
		refreshVideoInfo(panel);
	} else if (attempt < 40) {
		setTimeout(() => mountPanel(attempt + 1), 400);
	}
}

function removePanel() {
	document.getElementById(PANEL_ID)?.remove();
}

function handleNavigation() {
	if (isTargetPage()) {
		setTimeout(() => mountPanel(), 600);
	} else {
		removePanel();
	}
}

// YouTube (and Studio) fire this on SPA navigation.
window.addEventListener('yt-navigate-finish', handleNavigation);
document.addEventListener('yt-navigate-finish', handleNavigation);

// Studio navigation is unpredictable (SPA + modal upload dialog), so poll for
// the details form and mount/remove the panel as it appears and disappears.
if (IS_STUDIO) {
	// Track the page context so we can re-sync an existing panel when the user
	// moves between the /videos list (mass mode) and a single video's editor
	// (individual mode). The context includes whether an edit form is open,
	// because editing a DRAFT opens a modal WITHOUT changing the URL — keying
	// off the pathname alone would miss it and the panel would stay in mass mode.
	const studioContextKey = () =>
		location.pathname + '|' + (studioFormPresent() ? 'form' : 'list');
	let lastStudioContext = studioContextKey();
	setInterval(() => {
		if (studioFormPresent() || location.pathname.includes('/videos')) {
			const panel = document.getElementById(PANEL_ID);
			const ctx = studioContextKey();
			if (!panel) {
				mountPanel();
				lastStudioContext = ctx;
			} else if (ctx !== lastStudioContext) {
				// Context changed under an existing panel — refresh its mode/metadata.
				lastStudioContext = ctx;
				refreshVideoInfo(panel);
			}
		} else if (document.getElementById(PANEL_ID)) {
			removePanel();
			lastStudioContext = studioContextKey();
		}
	}, 1500);
}

function checkMassUpdateQueue() {
	if (!IS_STUDIO) return;
	const match = location.pathname.match(/\/video\/([^/]+)\/edit/);
	if (!match) return;
	const videoId = match[1];

	chrome.storage.local.get('massUpdateQueue').then(({ massUpdateQueue = [] }) => {
		if (massUpdateQueue.length > 0 && massUpdateQueue[0] === videoId) {
			// We are in a mass update for this video!
			// Wait for the form to populate fully
			setTimeout(() => {
				const panel = document.getElementById(PANEL_ID);
				if (panel) {
					const autoApply = q(panel, 'autoApply');
					if (autoApply) autoApply.checked = true; // force true
					runOptimize(panel);
				}
			}, 3000);
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => { mountPanel(); checkMassUpdateQueue(); });
} else {
	mountPanel();
	checkMassUpdateQueue();
}
