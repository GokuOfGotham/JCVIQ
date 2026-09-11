// content.js - JCVIQ panel.
//  - youtube.com/watch  : docked into the right column above suggested videos.
//  - studio.youtube.com : collapsible right-hand drawer beside the edit form.
//
// Everything the model returns is rendered with textContent (never innerHTML)
// so a hostile transcript or title can't inject markup into the page.

'use strict';

const IS_STUDIO = location.hostname === 'studio.youtube.com';
const PANEL_ID = 'jcviq-panel';
const HANDLE_ID = 'jcviq-handle';
const UPLOAD_CHUNK = 8 * 1024 * 1024;          // multiple of 256 KiB (resumable protocol rule)
const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024; // Gemini Files API per-file limit
const MAX_SCRIPT_CHARS = 120000;
const HISTORY_LIMIT = 40;
const YT_TAGS_MAX = 500;
const PROFILE_FIELDS = ['niche', 'audience', 'tone', 'avoid', 'cta', 'hashtags', 'links', 'language'];

const ICONS = {
	history: '<svg viewBox="0 0 24 24"><path d="M13 3a9 9 0 0 0-9 9H1l3.9 3.9L8.8 12H6a7 7 0 1 1 2.1 5l-1.4 1.4A9 9 0 1 0 13 3zm-1 5v5l4.3 2.5.7-1.2-3.5-2.1V8z"/></svg>',
	settings: '<svg viewBox="0 0 24 24"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/></svg>',
	chevronRight: '<svg viewBox="0 0 24 24"><path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>',
	chevronLeft: '<svg viewBox="0 0 24 24"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>',
	chevronDown: '<svg viewBox="0 0 24 24"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
	minus: '<svg viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg>',
	copy: '<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>',
	check: '<svg viewBox="0 0 24 24"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
	close: '<svg viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
	upload: '<svg viewBox="0 0 24 24"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>',
	doc: '<svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>',
	video: '<svg viewBox="0 0 24 24"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>',
	image: '<svg viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg>',
	captions: '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z"/></svg>',
	bolt: '<svg viewBox="0 0 24 24"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>',
	trash: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>',
	warning: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>',
	pen: '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
	refresh: '<svg viewBox="0 0 24 24"><path d="M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>',
	eye: '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>',
	play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
};

// Single mutable app state.
const S = {
	panel: null,
	handle: null,
	meta: null,          // current page metadata
	mode: 'single',      // 'single' | 'mass'
	ctxKey: '',
	result: null,        // last optimization for this video
	resultSources: null, // which sources fed it
	sources: { script: { text: '', name: '' }, video: null, thumb: null },
	busy: false,
	tab: 'overview',
	view: 'tabs',        // 'tabs' | 'history' | 'settings'
	settings: {},
	pollTimer: null,
	scriptSaveTimer: null,
	generated: {},        // concept index (or 'custom') -> generated image
	generating: {},       // in-flight guards, same keys
	customPrompt: { idea: '', overlay: '', extra: '', useReference: true }
};

/* ============================ Small helpers ============================ */

function el(tag, className, textContent) {
	const node = document.createElement(tag);
	if (className) node.className = className;
	if (textContent != null) node.textContent = textContent;
	return node;
}

function svg(name) {
	const wrap = document.createElement('span');
	wrap.className = 'jc-ico';
	wrap.innerHTML = ICONS[name] || '';
	return wrap;
}

function q(name) {
	return S.panel ? S.panel.querySelector(`[data-jc="${name}"]`) : null;
}

function text(node) {
	return node && node.textContent ? node.textContent.trim() : null;
}

function meta(property) {
	const node =
		document.querySelector(`meta[property="${property}"]`) ||
		document.querySelector(`meta[name="${property}"]`);
	return node ? node.getAttribute('content') : null;
}

function send(message) {
	return new Promise((resolve) => {
		try {
			chrome.runtime.sendMessage(message, (res) => {
				if (chrome.runtime.lastError) resolve({ error: chrome.runtime.lastError.message });
				else resolve(res || { error: 'No response from the extension. Reload it from chrome://extensions and refresh this page.' });
			});
		} catch (e) {
			resolve({ error: 'The extension was reloaded. Refresh this page to reconnect.' });
		}
	});
}

function storageGet(keys) {
	return new Promise((resolve) => {
		try {
			chrome.storage.local.get(keys, (v) => resolve(v || {}));
		} catch (e) {
			resolve({});
		}
	});
}

function storageSet(obj) {
	return new Promise((resolve) => {
		try {
			chrome.storage.local.set(obj, () => resolve());
		} catch (e) {
			resolve();
		}
	});
}

function fmtBytes(n) {
	if (!n) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
	return `${n < 10 && i ? n.toFixed(1) : Math.round(n)} ${units[i]}`;
}

function fmtDuration(sec) {
	sec = Math.max(0, Math.round(sec || 0));
	const h = Math.floor(sec / 3600);
	const m = Math.floor((sec % 3600) / 60);
	const s = sec % 60;
	return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function timeAgo(ts) {
	const s = Math.floor((Date.now() - ts) / 1000);
	if (s < 60) return 'just now';
	if (s < 3600) return Math.floor(s / 60) + 'm ago';
	if (s < 86400) return Math.floor(s / 3600) + 'h ago';
	return Math.floor(s / 86400) + 'd ago';
}

function wordCount(str) {
	return (str || '').trim().split(/\s+/).filter(Boolean).length;
}

function blobToBase64(blob) {
	return new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(String(r.result).split(',')[1] || '');
		r.onerror = () => reject(r.error || new Error('Could not read the file.'));
		r.readAsDataURL(blob);
	});
}

function readFileText(file) {
	return new Promise((resolve, reject) => {
		const r = new FileReader();
		r.onload = () => resolve(String(r.result || ''));
		r.onerror = () => reject(r.error || new Error('Could not read the file.'));
		r.readAsText(file);
	});
}

function composeDescription(opt) {
	if (!opt || !opt.description) return '';
	const clean = opt.description.replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, '').trim();
	const hashtags = Array.isArray(opt.hashtags) ? opt.hashtags.filter(Boolean) : [];
	return hashtags.length ? `${clean}\n\n${hashtags.join(' ')}` : clean;
}

function fitTagsToLimit(tags, maxChars = YT_TAGS_MAX) {
	const out = [];
	let used = 0;
	for (const raw of tags || []) {
		const tag = String(raw || '').trim();
		if (!tag) continue;
		const cost = tag.length + (out.length ? 1 : 0);
		if (used + cost > maxChars) continue;
		out.push(tag);
		used += cost;
	}
	return out;
}

/* ============================ Page metadata ============================ */

function extractJsonAfter(src, marker) {
	const start = src.indexOf(marker);
	if (start === -1) return null;
	const from = src.indexOf('{', start);
	if (from === -1) return null;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = from; i < src.length; i++) {
		const ch = src[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (ch === '\\') escaped = true;
			else if (ch === '"') inString = false;
		} else if (ch === '"') inString = true;
		else if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) return src.slice(from, i + 1);
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

function getWatchMetadata() {
	const details = (getPlayerResponse() || {}).videoDetails || {};
	const shortsMatch = location.pathname.match(/^\/shorts\/([A-Za-z0-9_-]{11})/);
	const videoId = (shortsMatch && shortsMatch[1]) || new URLSearchParams(location.search).get('v') || details.videoId || '';
	// Only trust the embedded player response if it is for THIS video (SPA nav
	// leaves the previous page's script tags in place).
	const sameVideo = !details.videoId || details.videoId === videoId;

	const title =
		text(document.querySelector('h1.ytd-watch-metadata yt-formatted-string')) ||
		text(document.querySelector('h1.title yt-formatted-string')) ||
		(sameVideo && details.title) ||
		meta('og:title') ||
		document.title.replace(/ - YouTube$/, '');

	const description =
		text(document.querySelector('ytd-text-inline-expander #description-inline-expander')) ||
		text(document.querySelector('yt-formatted-string.content')) ||
		(sameVideo && details.shortDescription) ||
		meta('og:description') ||
		'';

	const tags = sameVideo && Array.isArray(details.keywords) ? details.keywords.slice(0, 40) : [];
	const channelName =
		text(document.querySelector('ytd-channel-name #text a')) ||
		text(document.querySelector('ytd-channel-name a')) ||
		(sameVideo && details.author) || '';
	const views =
		text(document.querySelector('span.view-count')) ||
		(sameVideo && details.viewCount ? `${Number(details.viewCount).toLocaleString()} views` : '');
	const likeEl =
		document.querySelector('like-button-view-model button') ||
		document.querySelector('button[aria-label*="like" i]');
	const likes = likeEl ? (likeEl.getAttribute('aria-label') || text(likeEl) || '') : '';
	const lengthSeconds = sameVideo && details.lengthSeconds ? Number(details.lengthSeconds) : 0;

	return { title, description, tags, channelName, views, likes, videoId, lengthSeconds, videoUrl: location.href };
}

function studioBoxes() {
	return Array.from(document.querySelectorAll('#textbox'));
}

function getStudioTags() {
	const chips = Array.from(document.querySelectorAll('ytcp-free-text-chip-bar ytcp-chip, ytcp-chip-bar ytcp-chip'));
	return chips
		.map((c) => text(c.querySelector('#chip-text, .chip-text, #text')) || text(c) || '')
		.map((t) => t.replace(/\s*(close|remove).*$/i, '').trim())
		.filter(Boolean);
}

function getStudioMetadata() {
	let title = '';
	let description = '';
	const boxes = studioBoxes();
	boxes.forEach((b) => {
		const label = (b.getAttribute('aria-label') || '').toLowerCase();
		const val = (b.textContent || '').trim();
		if (/title/.test(label) && !title) title = val;
		else if (/(tell viewers|description)/.test(label) && !description) description = val;
	});
	if (!title && boxes[0]) title = (boxes[0].textContent || '').trim();
	if (!description && boxes[1]) description = (boxes[1].textContent || '').trim();

	const idMatch = location.pathname.match(/\/video\/([^/]+)\/edit/);
	const videoId = idMatch ? idMatch[1] : '';
	const videoEl = document.querySelector('video');
	const lengthSeconds = videoEl && isFinite(videoEl.duration) ? Math.round(videoEl.duration) : 0;

	return { title, description, tags: getStudioTags(), channelName: '', views: '', likes: '', videoId, lengthSeconds, videoUrl: location.href };
}

function getMetadata() {
	const m = IS_STUDIO ? getStudioMetadata() : getWatchMetadata();
	m.aspect = detectAspect(m);
	return m;
}

/* ---- Captions via YouTube's own transcript panel ----
   YouTube's timedtext endpoint now answers 200 with an empty body unless the
   request carries a proof-of-origin token, so fetching captions directly no
   longer works from an extension. The transcript panel still renders real
   captions because YouTube's own player fetches them, so we open it, read the
   rows, and put it back the way we found it. The list is virtualised, so the
   rows have to be collected while scrolling. */

const TRANSCRIPT_ROW = 'transcript-segment-view-model';
const TRANSCRIPT_TS = '.ytwTranscriptSegmentViewModelTimestamp';
const TRANSCRIPT_A11Y = '.ytwTranscriptSegmentViewModelTimestampA11yLabel';

function tsToSeconds(ts) {
	return String(ts || '').split(':').reverse()
		.reduce((acc, part, i) => acc + (Number(part) || 0) * Math.pow(60, i), 0);
}

function readTranscriptRows() {
	return Array.from(document.querySelectorAll(TRANSCRIPT_ROW)).map((row) => {
		const ts = row.querySelector(TRANSCRIPT_TS);
		// The a11y label duplicates the timestamp in words; drop both before
		// reading the caption text.
		const clone = row.cloneNode(true);
		clone.querySelectorAll(`${TRANSCRIPT_TS}, ${TRANSCRIPT_A11Y}`).forEach((n) => n.remove());
		return {
			ts: ts ? ts.textContent.trim() : '',
			text: clone.textContent.replace(/\s+/g, ' ').trim()
		};
	}).filter((r) => r.ts && r.text);
}

// YouTube renders several copies of this control, most of them hidden, and the
// ytd-button-renderer wrapper does not forward a synthetic click. Take the
// visible native <button> only.
function findTranscriptButton(open) {
	const want = open ? /^show transcript$/i : /^close transcript$/i;
	return Array.from(document.querySelectorAll('button'))
		.find((b) => b.offsetParent && want.test((b.getAttribute('aria-label') || b.textContent || '').trim())) || null;
}

// Closing the panel leaves its rows cached in the DOM, so presence of rows does
// not mean the panel is open. Go by the engagement panel's visibility.
function openTranscriptPanelEl() {
	return Array.from(document.querySelectorAll('ytd-engagement-panel-section-list-renderer'))
		.find((p) => /transcript/i.test(p.getAttribute('target-id') || '') &&
			p.getAttribute('visibility') !== 'ENGAGEMENT_PANEL_VISIBILITY_HIDDEN') || null;
}

// Put the page back: the panel's own control is labelled just "Close".
function closeTranscriptPanel() {
	const panel = openTranscriptPanelEl();
	const btn = panel
		? Array.from(panel.querySelectorAll('button')).find((b) => /^close/i.test(b.getAttribute('aria-label') || ''))
		: findTranscriptButton(false);
	return realClick(btn);
}

// A bare .click() is ignored by YouTube's Polymer handlers; they listen for the
// pointer sequence. Dispatch the whole thing at the element's centre.
function realClick(node) {
	if (!node) return false;
	const r = node.getBoundingClientRect();
	const opts = {
		bubbles: true, cancelable: true, composed: true, view: window,
		clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
	};
	for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
		const Ctor = type.startsWith('pointer') && typeof PointerEvent === 'function' ? PointerEvent : MouseEvent;
		node.dispatchEvent(new Ctor(type, opts));
	}
	return true;
}

async function waitFor(predicate, timeoutMs, stepMs = 250) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const value = predicate();
		if (value) return value;
		await new Promise((r) => setTimeout(r, stepMs));
	}
	return null;
}

// Returns { text, durationSec, language } or null. Never throws.
//
// YouTube currently ships two transcript panels. The modern one
// (PAmodern_transcript_view) renders captions; the legacy one
// (engagement-panel-searchable-transcript) opens but its own fetch fails, so it
// stays empty. Which one a viewer gets is out of our hands, so treat an empty
// panel as "no captions" and make sure it is closed again either way.
async function scrapeTranscriptPanel() {
	if (IS_STUDIO) return null;
	let weOpened = false;
	try {
		if (!openTranscriptPanelEl()) {
			// The button lives inside the description, which may be collapsed.
			let btn = findTranscriptButton(true);
			if (!btn) {
				const expand = document.querySelector('ytd-text-inline-expander #expand, #expand');
				if (!expand) return null;
				realClick(expand);
				btn = await waitFor(() => findTranscriptButton(true), 3000, 200);
			}
			if (!btn) return null;
			realClick(btn);
			weOpened = true;
			const appeared = await waitFor(
				() => openTranscriptPanelEl() && document.querySelector(TRANSCRIPT_ROW),
				8000
			);
			if (!appeared) return null; // legacy panel, or captions genuinely absent
			// Let the virtualised list settle before reading the first page.
			await new Promise((r) => setTimeout(r, 400));
		}

		const rows = new Map();
		readTranscriptRows().forEach((r) => rows.set(r.ts, r.text));

		// The list is virtualised, so rows have to be collected while scrolling.
		const scroller = Array.from(document.querySelectorAll('div.ytSectionListRendererContents'))
			.find((d) => d.scrollHeight > d.clientHeight + 20);
		if (scroller) {
			let stagnant = 0;
			for (let i = 0; i < 400 && stagnant < 4; i++) {
				const before = rows.size;
				const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
				scroller.scrollTop = Math.min(
					scroller.scrollTop + Math.max(120, scroller.clientHeight * 0.8),
					scroller.scrollHeight
				);
				await new Promise((r) => setTimeout(r, 150));
				readTranscriptRows().forEach((r) => rows.set(r.ts, r.text));
				stagnant = rows.size === before ? stagnant + 1 : 0;
				if (atEnd && rows.size === before) break;
			}
		}

		if (!rows.size) return null;

		const list = Array.from(rows, ([ts, text]) => ({ ts, text, sec: tsToSeconds(ts) }))
			.sort((a, b) => a.sec - b.sec);
		return {
			text: list.map((r) => `[${r.ts}] ${r.text}`).join('\n'),
			durationSec: list[list.length - 1].sec,
			language: document.documentElement.lang || ''
		};
	} catch (e) {
		console.warn('JCVIQ: transcript panel scrape failed:', e.message);
		return null;
	} finally {
		// Always put the page back the way we found it, including the failure
		// path where the panel opened empty.
		if (weOpened) {
			try { closeTranscriptPanel(); } catch (e) { /* ignore */ }
		}
	}
}

/* ---- Aspect ratio: decides the shape of a generated thumbnail ---- */

function biggestVideoEl() {
	return Array.from(document.querySelectorAll('video'))
		.filter((v) => v.videoWidth > 0 && v.videoHeight > 0)
		.sort((a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight)[0] || null;
}

// '16:9' or '9:16'. The real video element is the most reliable signal;
// everything after it is a fallback for pages where it has not loaded yet.
function detectAspect(m) {
	const v = biggestVideoEl();
	if (v) return v.videoWidth >= v.videoHeight ? '16:9' : '9:16';
	if (location.pathname.startsWith('/shorts/')) return '9:16';
	if ((S.settings && S.settings.contentType) === 'short') return '9:16';
	const thumbs = (getPlayerResponse() || {}).videoDetails?.thumbnail?.thumbnails;
	if (thumbs && thumbs.length) {
		const biggest = thumbs[thumbs.length - 1];
		if (biggest.width && biggest.height) return biggest.width >= biggest.height ? '16:9' : '9:16';
	}
	// A vertical source under 60s is almost certainly a Short.
	if (m && m.lengthSeconds && m.lengthSeconds <= 60 && (S.settings && S.settings.contentType) === '') return '16:9';
	return '16:9';
}

// Grab one frame from the on-page player to steer image generation.
// Cross-origin video taints the canvas on most YouTube pages, so this is
// strictly best-effort and the caller must cope with null.
async function captureReferenceFrame() {
	const video = biggestVideoEl();
	if (!video) return null;
	try {
		const canvas = document.createElement('canvas');
		const scale = Math.min(1, 768 / video.videoWidth);
		canvas.width = Math.round(video.videoWidth * scale);
		canvas.height = Math.round(video.videoHeight * scale);
		canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
		const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // throws when tainted
		return { mimeType: 'image/jpeg', data: dataUrl.split(',')[1] };
	} catch (e) {
		return null;
	}
}

function sourceKey() {
	return (S.meta && S.meta.videoId) || 'draft';
}

/* ============================ Metadata audit (deterministic) ============================ */
// The checks vidIQ/TubeBuddy show. These run on the page's data, not the model's opinion.

// How well `haystack` carries `keyword`: the exact phrase (or every significant
// word in any order) is 'exact'; at least half the words is 'partial'.
// Exact-substring-only matching would fail a title like "Ospreys Launch As The
// Storm Closes In" against "osprey carrier launch", which is far too harsh.
function keywordMatch(haystack, keyword) {
	const kw = (keyword || '').trim().toLowerCase();
	const hay = (haystack || '').toLowerCase();
	if (!kw || !hay) return 'none';
	if (hay.includes(kw)) return 'exact';
	const words = kw.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2);
	if (!words.length) return 'none';
	// Match on the stem so "osprey" hits "ospreys" and "launch" hits "launches".
	const hit = words.filter((w) => hay.includes(w.replace(/(ing|es|s)$/, ''))).length;
	if (hit === words.length) return 'exact';
	return hit / words.length >= 0.5 ? 'partial' : 'none';
}

// Character offset of the earliest keyword word, or -1.
function keywordPosition(haystack, keyword) {
	const hay = (haystack || '').toLowerCase();
	const kw = (keyword || '').trim().toLowerCase();
	if (!kw || !hay) return -1;
	const exact = hay.indexOf(kw);
	if (exact > -1) return exact;
	let best = -1;
	kw.split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2).forEach((w) => {
		const at = hay.indexOf(w.replace(/(ing|es|s)$/, ''));
		if (at > -1 && (best === -1 || at < best)) best = at;
	});
	return best;
}

const WEIGHT_OF = { pass: 1, partial: 0.5, fail: 0 };

function auditMetadata({ title = '', description = '', tags = [], keyword = '', contentType = '' }) {
	const kw = (keyword || '').trim();
	const checks = [];
	const add = (id, label, state, detail, weight, applicable = true) =>
		checks.push({ id, label, state, detail, weight, applicable });
	const bool = (v) => (v ? 'pass' : 'fail');
	const fromMatch = (m) => (m === 'exact' ? 'pass' : m === 'partial' ? 'partial' : 'fail');

	const t = (title || '').trim();
	add('title-len', 'Title length', bool(t.length >= 20 && t.length <= 70),
		`${t.length} chars · aim 20–70, hard max 100`, 15);

	const titleMatch = keywordMatch(t, kw);
	add('title-kw', 'Keyword in title', fromMatch(titleMatch),
		kw
			? (titleMatch === 'exact' ? `Carries "${kw}"` : titleMatch === 'partial' ? `Only part of "${kw}"` : `Missing "${kw}"`)
			: 'Run an analysis to detect the keyword',
		15, Boolean(kw));

	const kwPos = keywordPosition(t, kw);
	add('title-front', 'Keyword front-loaded', bool(kwPos > -1 && kwPos <= 30),
		kwPos > -1 ? `Starts at character ${kwPos + 1}` : 'Put the keyword in the first 30 characters', 5, Boolean(kw));

	const letters = t.replace(/[^a-z]/gi, '');
	const caps = letters.replace(/[^A-Z]/g, '').length;
	add('title-caps', 'Not shouting in caps', bool(!letters.length || caps / letters.length < 0.6),
		letters.length ? `${Math.round((caps / letters.length) * 100)}% uppercase` : '', 5);

	const d = (description || '').trim();
	add('desc-len', 'Description length', bool(d.length >= 200),
		`${d.length} chars · aim 200+, max 5,000`, 10);

	const descMatch = keywordMatch(d.slice(0, 160), kw);
	add('desc-kw', 'Keyword early in description', fromMatch(descMatch),
		kw
			? (descMatch === 'exact' ? 'In the first 160 characters' : descMatch === 'partial' ? 'Partly in the first 160 characters' : 'Not in the first 160 characters')
			: 'Run an analysis to detect the keyword',
		10, Boolean(kw));

	const hashtags = (d.match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length;
	add('desc-hash', 'Hashtags', hashtags >= 1 && hashtags <= 15 ? 'pass' : hashtags > 15 ? 'fail' : 'fail',
		`${hashtags} found · 1–3 ideal, YouTube ignores all of them above 15`, 5);

	const hasChapters = /(^|\n)\s*0?0:00\b/.test(d);
	add('desc-chapters', 'Chapters / timestamps', bool(hasChapters),
		hasChapters ? 'Chapter list detected' : 'No "0:00" chapter line', 5, contentType !== 'short');

	const hasLink = /https?:\/\//.test(d);
	const hasCta = /subscribe|follow/i.test(d);
	add('desc-link', 'Link or call to action', bool(hasLink || hasCta),
		hasLink ? 'Link found' : hasCta ? 'Call to action found' : 'No link or call to action', 5);

	const list = (tags || []).map((x) => String(x || '').trim()).filter(Boolean);
	const tagChars = list.join(',').length;
	add('tags-count', 'Tag count', list.length >= 5 ? 'pass' : list.length ? 'partial' : 'fail',
		list.length ? `${list.length} tags · aim 5–15` : (IS_STUDIO ? 'None read — expand "Show more" in Studio' : 'No tags'), 10);
	add('tags-budget', 'Tags within 500 characters', bool(tagChars <= YT_TAGS_MAX), `${tagChars} / ${YT_TAGS_MAX}`, 5);

	const tagMatch = list.some((x) => keywordMatch(x, kw) === 'exact') ? 'exact'
		: list.some((x) => keywordMatch(x, kw) === 'partial') ? 'partial' : 'none';
	add('tags-kw', 'Keyword in tags', fromMatch(tagMatch),
		kw ? (tagMatch === 'exact' ? 'Present' : tagMatch === 'partial' ? 'Only partly present' : `Add "${kw}" as a tag`) : 'Run an analysis to detect the keyword',
		10, Boolean(kw));

	const applicable = checks.filter((c) => c.applicable);
	const total = applicable.reduce((a, c) => a + c.weight, 0);
	const got = applicable.reduce((a, c) => a + c.weight * (WEIGHT_OF[c.state] || 0), 0);
	return { score: total ? Math.round((got / total) * 100) : 0, checks };
}

function suggestedMetadata(opt) {
	if (!opt) return null;
	return {
		title: opt.titles && opt.titles.length ? opt.titles[0].title : '',
		description: composeDescription(opt) + (opt.chapters && opt.chapters.length ? '\n\n' + opt.chapters.map((c) => `${c.timestamp} ${c.title}`).join('\n') : ''),
		tags: fitTagsToLimit(opt.tags || [])
	};
}

function currentKeyword() {
	return (S.result && S.result.primaryKeyword) || '';
}

/* ============================ Theme ============================ */

function luminanceOf(color) {
	const m = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\)/.exec(color || '');
	if (!m) return null;
	if (m[4] !== undefined && Number(m[4]) === 0) return null;
	return (0.2126 * Number(m[1]) + 0.7152 * Number(m[2]) + 0.0722 * Number(m[3])) / 255;
}

function detectTheme() {
	const html = document.documentElement;
	if (html.hasAttribute('dark') || html.getAttribute('data-theme') === 'dark') return 'dark';
	for (const sel of ['body', 'ytd-app', 'ytcp-app', '#main', '#page-manager']) {
		const node = document.querySelector(sel);
		if (!node) continue;
		const lum = luminanceOf(getComputedStyle(node).backgroundColor);
		if (lum !== null) return lum < 0.5 ? 'dark' : 'light';
	}
	return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
	if (!S.panel) return;
	const theme = detectTheme();
	S.panel.dataset.theme = theme;
	if (S.handle) S.handle.dataset.theme = theme;
}

/* ============================ Panel shell ============================ */

function buildPanel() {
	const panel = el('div');
	panel.id = PANEL_ID;
	panel.className = 'jcviq';
	panel.innerHTML = `
		<div class="jc-hd">
			<div class="jc-brand">
				<img alt="" src="${chrome.runtime.getURL('images/icon48.png')}">
				<span class="jc-brand-name">JCVIQ</span>
				<span class="jc-brand-tag">AI</span>
			</div>
			<div class="jc-hd-actions">
				<button class="jc-iconbtn" data-jc="btnHistory" title="History">${ICONS.history}</button>
				<button class="jc-iconbtn" data-jc="btnSettings" title="Settings">${ICONS.settings}</button>
				<button class="jc-iconbtn" data-jc="btnCollapse" title="Collapse">${IS_STUDIO ? ICONS.chevronRight : ICONS.minus}</button>
			</div>
		</div>
		<div class="jc-tabs" data-jc="tabs">
			<button class="jc-tab" data-tab="overview">Overview</button>
			<button class="jc-tab" data-tab="titles">Titles</button>
			<button class="jc-tab" data-tab="metadata">Description</button>
			<button class="jc-tab" data-tab="thumbnail">Thumbnail</button>
			<button class="jc-tab" data-tab="strategy">Strategy</button>
		</div>
		<div class="jc-views" data-jc="views">
			<div class="jc-view" data-view="overview"></div>
			<div class="jc-view" data-view="titles"></div>
			<div class="jc-view" data-view="metadata"></div>
			<div class="jc-view" data-view="thumbnail"></div>
			<div class="jc-view" data-view="strategy"></div>
			<div class="jc-view" data-view="history"></div>
			<div class="jc-view" data-view="settings"></div>
		</div>
		<div class="jc-toast" data-jc="toast" hidden></div>
		<input type="file" data-jc="scriptFile" accept=".txt,.md,.srt,.vtt,.json,.py,.csv,.tsv,.rtf,text/plain" hidden>
		<input type="file" data-jc="videoFile" accept="video/*,.mp4,.mov,.mkv,.webm,.avi" hidden>
		<input type="file" data-jc="thumbFile" accept="image/*" hidden>
	`;

	panel.querySelector('[data-jc="btnHistory"]').addEventListener('click', () => toggleView('history'));
	panel.querySelector('[data-jc="btnSettings"]').addEventListener('click', () => toggleView('settings'));
	panel.querySelector('[data-jc="btnCollapse"]').addEventListener('click', () => setCollapsed(!panel.classList.contains('jc-collapsed')));
	panel.querySelectorAll('.jc-tab').forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
	panel.querySelector('[data-jc="scriptFile"]').addEventListener('change', onScriptFile);
	panel.querySelector('[data-jc="videoFile"]').addEventListener('change', onVideoFile);
	panel.querySelector('[data-jc="thumbFile"]').addEventListener('change', onThumbFile);

	// Keep YouTube's global keyboard shortcuts (k, j, f…) from firing while typing in the panel.
	['keydown', 'keyup', 'keypress'].forEach((evt) => panel.addEventListener(evt, (e) => e.stopPropagation()));
	return panel;
}

function buildHandle() {
	const handle = el('button', 'jc-handle');
	handle.id = HANDLE_ID;
	handle.title = 'Open JCVIQ';
	handle.innerHTML = `${ICONS.chevronLeft}<span>JCVIQ</span>`;
	handle.addEventListener('click', () => setCollapsed(false));
	return handle;
}

function setCollapsed(collapsed) {
	if (!S.panel) return;
	S.panel.classList.toggle('jc-collapsed', collapsed);
	if (S.handle) S.handle.hidden = !collapsed;
	const btn = q('btnCollapse');
	if (btn) {
		btn.innerHTML = IS_STUDIO
			? (collapsed ? ICONS.chevronLeft : ICONS.chevronRight)
			: (collapsed ? ICONS.chevronDown : ICONS.minus);
		btn.title = collapsed ? 'Expand' : 'Collapse';
	}
	storageSet({ panelCollapsed: collapsed });
}

function setTab(tab) {
	S.tab = tab;
	S.view = 'tabs';
	S.panel.querySelectorAll('.jc-tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
	S.panel.querySelectorAll('.jc-view').forEach((v) => v.classList.toggle('active', v.dataset.view === tab));
	q('tabs').classList.remove('jc-tabs-dim');
	q('views').scrollTop = 0;
}

function toggleView(view) {
	if (S.view === view) {
		setTab(S.tab);
		return;
	}
	S.view = view;
	if (view === 'history') renderHistory();
	if (view === 'settings') renderSettings();
	S.panel.querySelectorAll('.jc-tab').forEach((b) => b.classList.remove('active'));
	S.panel.querySelectorAll('.jc-view').forEach((v) => v.classList.toggle('active', v.dataset.view === view));
	q('tabs').classList.add('jc-tabs-dim');
	q('views').scrollTop = 0;
}

function view(name) {
	return S.panel.querySelector(`.jc-view[data-view="${name}"]`);
}

function markTabsReady(ready) {
	S.panel.querySelectorAll('.jc-tab').forEach((b) => {
		if (b.dataset.tab !== 'overview') b.classList.toggle('has-data', ready);
	});
}

/* ---- Toast ---- */

let toastTimer = null;
function toast(message, tone = 'ok', ms = 3000) {
	const t = q('toast');
	if (!t) return;
	t.textContent = message;
	t.className = `jc-toast ${tone}`;
	t.hidden = false;
	clearTimeout(toastTimer);
	if (ms) toastTimer = setTimeout(() => { t.hidden = true; }, ms);
}

/* ---- Reusable widgets ---- */

function card(title, icon, opts = {}) {
	const c = el('div', 'jc-card' + (opts.className ? ' ' + opts.className : ''));
	if (title) {
		const hd = el('div', 'jc-card-hd');
		if (icon) hd.append(svg(icon));
		hd.append(el('span', 'jc-card-title', title));
		if (opts.count != null) hd.append(el('span', 'jc-count', String(opts.count)));
		if (opts.actions) {
			const a = el('div', 'jc-card-actions');
			opts.actions.forEach((x) => a.append(x));
			hd.append(a);
		}
		c.append(hd);
	}
	return c;
}

function badge(label, tone) {
	return el('span', 'jc-badge' + (tone ? ' ' + tone : ''), label);
}

function button(label, opts = {}) {
	const b = el('button', 'jc-btn' + (opts.primary ? ' primary' : '') + (opts.small ? ' sm' : '') + (opts.className ? ' ' + opts.className : ''));
	if (opts.icon) b.append(svg(opts.icon));
	if (label) b.append(el('span', null, label));
	if (opts.title) b.title = opts.title;
	if (opts.onClick) b.addEventListener('click', opts.onClick);
	if (opts.disabled) b.disabled = true;
	return b;
}

function iconButton(icon, title, onClick) {
	const b = el('button', 'jc-iconbtn sm');
	b.title = title;
	b.innerHTML = ICONS[icon] || '';
	b.addEventListener('click', onClick);
	return b;
}

function copyButton(value, label) {
	return button(label || 'Copy', { icon: 'copy', small: true, onClick: () => copyValue(value) });
}

function applyButton(kind, value, label) {
	return button(label || 'Apply', { icon: 'pen', small: true, className: 'apply', onClick: () => applyToStudio(kind, value) });
}

function chips(list, opts = {}) {
	const wrap = el('div', 'jc-chips');
	(list || []).forEach((t, i) => {
		const chip = el('span', 'jc-chip' + (opts.highlightFirst && i === 0 ? ' hi' : ''), String(t));
		wrap.append(chip);
	});
	return wrap;
}

function scoreTone(v) {
	if (v >= 80) return 'ok';
	if (v >= 50) return 'warn';
	return 'bad';
}

function ring(value, label) {
	const wrap = el('div', 'jc-ring-wrap');
	const v = Math.max(0, Math.min(100, Math.round(value || 0)));
	const r = 30;
	const c = 2 * Math.PI * r;
	const box = el('div', 'jc-ring ' + scoreTone(v));
	box.innerHTML = `<svg viewBox="0 0 72 72"><circle class="track" cx="36" cy="36" r="${r}"/><circle class="fill" cx="36" cy="36" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - v / 100)).toFixed(2)}"/></svg>`;
	box.append(el('div', 'jc-ring-val', String(v)));
	wrap.append(box);
	if (label) wrap.append(el('div', 'jc-ring-label', label));
	return wrap;
}

function bar(label, value) {
	const row = el('div', 'jc-bar-row');
	row.append(el('span', 'jc-bar-label', label));
	const track = el('div', 'jc-bar');
	const fill = el('div', 'jc-bar-fill ' + scoreTone(value));
	fill.style.width = Math.max(0, Math.min(100, value)) + '%';
	track.append(fill);
	row.append(track, el('span', 'jc-bar-val', String(value)));
	return row;
}

function paragraph(txt, className) {
	return el('div', className || 'jc-text', txt || '');
}

function emptyState(message, icon = 'bolt') {
	const e = el('div', 'jc-empty');
	e.append(svg(icon), el('div', null, message));
	return e;
}

function titleBadges(title, keyword) {
	const wrap = el('span', 'jc-badges');
	const len = (title || '').length;
	wrap.append(badge(`${len} chars`, len <= 60 ? 'ok' : len <= 70 ? 'warn' : 'bad'));
	if (keyword) {
		const m = keywordMatch(title, keyword);
		wrap.append(badge(
			m === 'exact' ? 'keyword' : m === 'partial' ? 'partial keyword' : 'no keyword',
			m === 'exact' ? 'ok' : m === 'partial' ? 'warn' : 'bad'
		));
	}
	return wrap;
}

/* ============================ Overview ============================ */

function renderOverview() {
	const v = view('overview');
	v.innerHTML = '';
	v.append(videoCard());
	const host = el('div');
	host.dataset.jc = 'sourcesHost';
	v.append(host);
	renderSources();
	v.append(S.mode === 'mass' ? massCard() : runCard());
	if (S.result) {
		v.append(scoreCard());
		v.append(assessmentCard());
	}
}

function videoCard() {
	const m = S.meta || {};
	const c = el('div', 'jc-card jc-video');
	if (m.videoId) {
		const img = el('img', 'jc-video-thumb');
		img.alt = '';
		img.src = `https://i.ytimg.com/vi/${m.videoId}/mqdefault.jpg`;
		img.addEventListener('error', () => img.replaceWith(el('div', 'jc-video-thumb ph')));
		c.append(img);
	} else {
		c.append(el('div', 'jc-video-thumb ph'));
	}
	const body = el('div', 'jc-video-body');
	body.append(el('div', 'jc-video-title', S.mode === 'mass' ? 'Channel content' : (m.title || 'No title detected')));
	let sub;
	if (S.mode === 'mass') sub = `${collectStudioVideoIds().length} videos on this page`;
	else if (IS_STUDIO) sub = m.videoId ? `Studio · ${m.videoId}${m.lengthSeconds ? ' · ' + fmtDuration(m.lengthSeconds) : ''}` : 'Studio · new upload';
	else sub = [m.views, m.channelName, m.lengthSeconds ? fmtDuration(m.lengthSeconds) : ''].filter(Boolean).join(' · ');
	body.append(el('div', 'jc-video-sub', sub));
	c.append(body);
	return c;
}

/* ---- Sources ---- */

function renderSources() {
	const host = q('sourcesHost');
	if (!host) return;
	host.innerHTML = '';
	if (S.mode === 'mass') return;

	const c = card('Sources', null, { className: 'jc-sources' });
	const s = S.sources;

	// Script
	{
		const words = wordCount(s.script.text);
		const row = sourceRow('doc', 'Script', words
			? `${words.toLocaleString()} words${s.script.name ? ' · ' + s.script.name : ''}`
			: 'Not added — paste or pick the script file');
		row.classList.toggle('on', words > 0);
		const actions = row.querySelector('.jc-src-actions');
		actions.append(button(words ? 'Edit' : 'Paste', { small: true, onClick: () => toggleScriptEditor() }));
		actions.append(iconButton('upload', 'Choose script file', () => q('scriptFile').click()));
		if (words) actions.append(iconButton('close', 'Remove script', () => { setScript('', ''); renderSources(); }));
		c.append(row);

		const editor = el('div', 'jc-script-editor');
		editor.dataset.jc = 'scriptEditor';
		editor.hidden = !S.scriptEditorOpen;
		const ta = el('textarea');
		ta.placeholder = 'Paste the video script or narration here…';
		ta.value = s.script.text;
		ta.rows = 8;
		ta.addEventListener('input', () => {
			setScript(ta.value, s.script.name, { silent: true });
			const st = row.querySelector('.jc-src-status');
			const n = wordCount(ta.value);
			st.textContent = n ? `${n.toLocaleString()} words` : 'Not added — paste or pick the script file';
			row.classList.toggle('on', n > 0);
		});
		editor.append(ta);
		editor.append(el('div', 'jc-hint', 'Plain text, .md, .srt or .vtt. Timestamps in SRT/VTT help with chapters.'));
		c.append(editor);
	}

	// Video file
	{
		const vf = s.video;
		let status = 'Not added — upload the rendered file for full analysis';
		let tone = '';
		if (vf) {
			if (vf.phase === 'uploading') { status = `Uploading ${Math.round((vf.progress || 0) * 100)}% · ${fmtBytes(vf.size)}`; tone = 'busy'; }
			else if (vf.phase === 'processing') { status = `Processing on Gemini… · ${vf.fileName}`; tone = 'busy'; }
			else if (vf.phase === 'ready') { status = `Ready · ${vf.fileName} · ${fmtBytes(vf.size)}`; tone = 'on'; }
			else if (vf.phase === 'error') { status = vf.message || 'Upload failed'; tone = 'bad'; }
		}
		const row = sourceRow('video', 'Video file', status);
		if (tone) row.classList.add(tone);
		const actions = row.querySelector('.jc-src-actions');
		if (!vf || vf.phase === 'error' || vf.phase === 'ready') {
			actions.append(button(vf && vf.phase === 'ready' ? 'Replace' : 'Choose', { small: true, icon: 'upload', onClick: () => q('videoFile').click() }));
		}
		if (vf && vf.phase !== 'uploading') actions.append(iconButton('close', 'Remove video', () => removeVideo()));
		c.append(row);
		if (vf && vf.phase === 'uploading') {
			const p = el('div', 'jc-progress');
			const f = el('i');
			f.style.width = Math.round((vf.progress || 0) * 100) + '%';
			p.append(f);
			c.append(p);
		}
		if (vf && vf.phase === 'ready' && vf.expirationTime) {
			c.append(el('div', 'jc-hint', `Stored by Google for analysis until ${new Date(vf.expirationTime).toLocaleString()}, then deleted.`));
		}
	}

	// Thumbnail
	{
		const th = s.thumb;
		const row = sourceRow('image', 'Thumbnail', th ? `Custom · ${th.name}` : (S.meta && S.meta.videoId ? 'Auto — current YouTube thumbnail' : 'Not available yet'));
		row.classList.toggle('on', Boolean(th || (S.meta && S.meta.videoId)));
		const actions = row.querySelector('.jc-src-actions');
		actions.append(iconButton('upload', 'Upload a thumbnail image', () => q('thumbFile').click()));
		if (th) actions.append(iconButton('close', 'Use the YouTube thumbnail', () => { S.sources.thumb = null; renderSources(); renderThumbnail(); }));
		c.append(row);
	}

	// Captions (informational)
	{
		const status = IS_STUDIO
			? 'Not available in Studio — add the script instead'
			: (S.meta && S.meta.videoId)
				? 'Auto — read from the transcript panel at analysis time'
				: 'Available once the video has an ID';
		const row = sourceRow('captions', 'Captions', status);
		row.classList.add('muted');
		c.append(row);
	}

	host.append(c);
}

function sourceRow(icon, name, status) {
	const row = el('div', 'jc-src');
	row.append(svg(icon));
	const body = el('div', 'jc-src-body');
	body.append(el('div', 'jc-src-name', name), el('div', 'jc-src-status', status));
	row.append(body, el('div', 'jc-src-actions'));
	return row;
}

function toggleScriptEditor(force) {
	S.scriptEditorOpen = force !== undefined ? force : !S.scriptEditorOpen;
	const ed = q('scriptEditor');
	if (ed) {
		ed.hidden = !S.scriptEditorOpen;
		if (S.scriptEditorOpen) ed.querySelector('textarea').focus();
	}
}

function setScript(textValue, name, opts = {}) {
	S.sources.script = { text: (textValue || '').slice(0, MAX_SCRIPT_CHARS), name: name || '' };
	clearTimeout(S.scriptSaveTimer);
	S.scriptSaveTimer = setTimeout(persistSources, 400);
	if (!opts.silent && !S.sources.script.text) S.scriptEditorOpen = false;
}

async function onScriptFile(e) {
	const file = e.target.files && e.target.files[0];
	e.target.value = '';
	if (!file) return;
	if (file.size > 5 * 1024 * 1024) { toast('Script files over 5 MB are not supported.', 'err'); return; }
	try {
		let txt = await readFileText(file);
		if (/\.json$/i.test(file.name)) {
			try { txt = flattenJsonText(JSON.parse(txt)); } catch (_) { /* keep raw */ }
		}
		if (txt.length > MAX_SCRIPT_CHARS) toast(`Script trimmed to ${MAX_SCRIPT_CHARS.toLocaleString()} characters.`, 'warn');
		setScript(txt, file.name);
		S.scriptEditorOpen = false;
		renderSources();
		toast(`Script loaded: ${wordCount(txt).toLocaleString()} words.`);
	} catch (err) {
		toast(err.message || 'Could not read the script file.', 'err');
	}
}

// Pull the string values out of a JSON script file in document order.
function flattenJsonText(value, out = []) {
	if (typeof value === 'string') out.push(value);
	else if (Array.isArray(value)) value.forEach((v) => flattenJsonText(v, out));
	else if (value && typeof value === 'object') Object.values(value).forEach((v) => flattenJsonText(v, out));
	return out.filter((s) => s.trim().length > 1).join('\n');
}

async function onThumbFile(e) {
	const file = e.target.files && e.target.files[0];
	e.target.value = '';
	if (!file) return;
	if (file.size > 8 * 1024 * 1024) { toast('Thumbnail images over 8 MB are not supported.', 'err'); return; }
	try {
		const data = await blobToBase64(file);
		S.sources.thumb = { mimeType: file.type || 'image/jpeg', data, name: file.name };
		renderSources();
		renderThumbnail();
		toast('Thumbnail loaded.');
	} catch (err) {
		toast(err.message || 'Could not read the image.', 'err');
	}
}

/* ---- Video upload (Gemini Files API, chunked through the service worker) ---- */

async function onVideoFile(e) {
	const file = e.target.files && e.target.files[0];
	e.target.value = '';
	if (!file) return;
	if (file.size > MAX_VIDEO_BYTES) { toast('Gemini accepts video files up to 2 GB.', 'err'); return; }
	if (S.sources.video && S.sources.video.phase === 'uploading') { toast('An upload is already running.', 'warn'); return; }

	const previous = S.sources.video;
	if (previous && previous.name) send({ action: 'fileDelete', name: previous.name });

	S.sources.video = { phase: 'uploading', progress: 0, fileName: file.name, size: file.size, mimeType: file.type || 'video/mp4', key: sourceKey() };
	renderSources();

	try {
		const start = await send({ action: 'uploadStart', fileName: file.name, size: file.size, mimeType: file.type || 'video/mp4' });
		if (start.error) throw new Error(start.error);
		let offset = 0;
		let info = null;
		while (offset < file.size) {
			const end = Math.min(offset + UPLOAD_CHUNK, file.size);
			const data = await blobToBase64(file.slice(offset, end));
			const last = end >= file.size;
			const res = await send({ action: 'uploadChunk', uploadUrl: start.uploadUrl, offset, data, last });
			if (res.error) throw new Error(res.error);
			offset = end;
			if (S.sources.video && S.sources.video.phase === 'uploading') {
				S.sources.video.progress = offset / file.size;
				renderSources();
			}
			if (last) info = res.file;
		}
		if (!info || !info.uri) throw new Error('Upload finished but Gemini returned no file reference.');
		S.sources.video = {
			phase: info.state === 'ACTIVE' ? 'ready' : 'processing',
			name: info.name, uri: info.uri, mimeType: info.mimeType || file.type || 'video/mp4',
			fileName: file.name, size: file.size, expirationTime: info.expirationTime, key: sourceKey()
		};
		await persistSources();
		renderSources();
		if (S.sources.video.phase === 'processing') pollVideo();
		else toast('Video ready for analysis.');
	} catch (err) {
		S.sources.video = { phase: 'error', message: err.message || 'Upload failed', fileName: file.name, size: file.size };
		renderSources();
		toast(err.message || 'Upload failed.', 'err', 6000);
	}
}

function pollVideo() {
	clearTimeout(S.pollTimer);
	const started = Date.now();
	const tick = async () => {
		const vf = S.sources.video;
		if (!vf || vf.phase !== 'processing') return;
		const res = await send({ action: 'fileStatus', name: vf.name });
		if (res.error) { toast(res.error, 'err'); return; }
		if (res.missing) {
			S.sources.video = null;
			await persistSources();
			renderSources();
			toast('The uploaded video has expired on Gemini. Upload it again.', 'warn');
			return;
		}
		const f = res.file || {};
		if (f.state === 'ACTIVE') {
			S.sources.video = { ...vf, phase: 'ready', uri: f.uri || vf.uri, expirationTime: f.expirationTime || vf.expirationTime };
			await persistSources();
			renderSources();
			toast('Video ready for analysis.');
			return;
		}
		if (f.state === 'FAILED') {
			S.sources.video = { phase: 'error', message: 'Gemini could not process this video file.', fileName: vf.fileName, size: vf.size };
			await persistSources();
			renderSources();
			return;
		}
		if (Date.now() - started > 15 * 60 * 1000) {
			toast('Gemini is still processing the video. Try again in a minute.', 'warn');
			return;
		}
		S.pollTimer = setTimeout(tick, 4000);
	};
	S.pollTimer = setTimeout(tick, 3000);
}

async function removeVideo() {
	const vf = S.sources.video;
	S.sources.video = null;
	clearTimeout(S.pollTimer);
	if (vf && vf.name) send({ action: 'fileDelete', name: vf.name });
	await persistSources();
	renderSources();
}

/* ---- Sources persistence (per video) ---- */

async function persistSources() {
	const { jcSources = {} } = await storageGet('jcSources');
	const key = sourceKey();
	const vf = S.sources.video;
	const entry = {
		updated: Date.now(),
		script: S.sources.script.text ? { text: S.sources.script.text, name: S.sources.script.name } : null,
		video: vf && (vf.phase === 'ready' || vf.phase === 'processing')
			? { phase: vf.phase, name: vf.name, uri: vf.uri, mimeType: vf.mimeType, fileName: vf.fileName, size: vf.size, expirationTime: vf.expirationTime }
			: null
	};
	if (!entry.script && !entry.video) delete jcSources[key];
	else jcSources[key] = entry;
	// Drop stale entries (older than 3 days) so storage doesn't grow forever.
	const cutoff = Date.now() - 3 * 86400000;
	for (const k of Object.keys(jcSources)) {
		if ((jcSources[k].updated || 0) < cutoff) delete jcSources[k];
	}
	await storageSet({ jcSources });
}

async function loadSources() {
	clearTimeout(S.pollTimer);
	const { jcSources = {} } = await storageGet('jcSources');
	const entry = jcSources[sourceKey()] || {};
	S.sources.script = entry.script ? { text: entry.script.text || '', name: entry.script.name || '' } : { text: '', name: '' };
	S.sources.thumb = null;
	const vf = entry.video;
	if (vf && vf.uri && (!vf.expirationTime || new Date(vf.expirationTime).getTime() > Date.now() + 60000)) {
		S.sources.video = { ...vf, key: sourceKey() };
		if (vf.phase === 'processing') pollVideo();
	} else {
		S.sources.video = null;
	}
	S.scriptEditorOpen = false;
}

/* ---- Run card ---- */

function runCard() {
	const c = card(null, null, { className: 'jc-run' });

	const row = el('div', 'jc-field-row');
	const lbl = el('label', 'jc-label', 'Content type');
	const sel = el('select');
	sel.dataset.jc = 'contentType';
	[
		['', 'Auto-detect'], ['long', 'Long-form video'], ['short', 'YouTube Short'], ['documentary', 'Documentary / explainer'],
		['tutorial', 'Tutorial / how-to'], ['gaming', 'Gaming'], ['sports', 'Sports'], ['news', 'News / commentary'],
		['military', 'Military / defense'], ['podcast', 'Podcast'], ['review', 'Product review'], ['vlog', 'Vlog'],
		['compilation', 'Compilation'], ['wildlife', 'Wildlife / live-cam']
	].forEach(([value, label]) => {
		const o = el('option', null, label);
		o.value = value;
		sel.append(o);
	});
	sel.value = S.settings.contentType || '';
	sel.addEventListener('change', () => { S.settings.contentType = sel.value; storageSet({ contentType: sel.value }); });
	row.append(lbl, sel);
	c.append(row);

	if (!IS_STUDIO) {
		const t = el('label', 'jc-check');
		const cb = el('input');
		cb.type = 'checkbox';
		cb.checked = Boolean(S.settings.watchByUrl);
		cb.addEventListener('change', () => { S.settings.watchByUrl = cb.checked; storageSet({ watchByUrl: cb.checked }); });
		t.append(cb, el('span', null, 'Let Gemini watch this video by URL (public videos only, slower)'));
		c.append(t);
	}

	const run = button(S.result ? 'Re-analyze' : 'Analyze video', { primary: true, icon: 'bolt', className: 'jc-run-btn', onClick: runAnalyze });
	run.dataset.jc = 'runBtn';
	c.append(run);
	const status = el('div', 'jc-status');
	status.dataset.jc = 'status';
	status.hidden = true;
	c.append(status);
	return c;
}

function setStatus(message) {
	const s = q('status');
	if (!s) return;
	if (!message) { s.hidden = true; s.innerHTML = ''; return; }
	s.hidden = false;
	s.innerHTML = '';
	s.append(el('span', 'jc-spinner'), el('span', null, message));
}

/* ---- Score + assessment (after analysis) ---- */

function scoreCard() {
	const m = S.meta || {};
	const keyword = currentKeyword();
	const contentType = S.settings.contentType || '';
	const current = auditMetadata({ title: m.title, description: m.description, tags: m.tags, keyword, contentType });
	const sug = suggestedMetadata(S.result);
	const projected = sug ? auditMetadata({ ...sug, keyword, contentType }) : null;

	const c = card('SEO score', null);
	const rings = el('div', 'jc-rings');
	rings.append(ring(current.score, 'Current'));
	if (projected) {
		rings.append(el('div', 'jc-rings-arrow', '→'));
		rings.append(ring(projected.score, 'With top suggestions'));
	}
	const kwBox = el('div', 'jc-kw');
	kwBox.append(el('div', 'jc-kw-label', 'Primary keyword'));
	kwBox.append(el('div', 'jc-kw-val', keyword || '—'));
	rings.append(kwBox);
	c.append(rings);

	const list = el('div', 'jc-checks');
	const CHECK_ICON = { pass: 'check', partial: 'minus', fail: 'close' };
	current.checks.forEach((ch) => {
		const state = ch.applicable ? ch.state : 'na';
		const row = el('div', 'jc-check-row ' + state);
		row.append(svg(CHECK_ICON[state] || 'minus'));
		const body = el('div', 'jc-check-body');
		body.append(el('div', 'jc-check-label', ch.label));
		if (ch.detail) body.append(el('div', 'jc-check-detail', ch.detail));
		row.append(body);
		list.append(row);
	});
	c.append(list);
	return c;
}

function assessmentCard() {
	const opt = S.result;
	const sc = opt.scores || {};
	const c = card('AI assessment', null);
	if (sc.summary) c.append(paragraph(sc.summary, 'jc-summary'));
	[
		['Title clarity', sc.titleClarity], ['Curiosity', sc.curiosity], ['Keyword relevance', sc.keywordRelevance],
		['Mobile readability', sc.mobileReadability], ['Description', sc.descriptionCompleteness]
	].forEach(([label, value]) => {
		if (typeof value === 'number') c.append(bar(label, value));
	});
	if (sc.clickbaitRisk) {
		const r = String(sc.clickbaitRisk).toLowerCase();
		const row = el('div', 'jc-inline');
		row.append(el('span', 'jc-muted', 'Clickbait risk'), badge(sc.clickbaitRisk, r === 'high' ? 'bad' : r === 'medium' ? 'warn' : 'ok'));
		c.append(row);
	}
	const src = S.resultSources || {};
	const used = [];
	if (src.script) used.push('script');
	if (src.video === 'file') used.push('video file');
	if (src.video === 'url') used.push('video (URL)');
	if (src.transcript) used.push('captions');
	if (src.thumbnail) used.push('thumbnail');
	c.append(el('div', 'jc-hint', used.length ? `Grounded in: ${used.join(', ')}.` : 'Based on the title and description only — add a script or video for grounded results.'));

	const actions = el('div', 'jc-actions');
	actions.append(button('See titles', { small: true, onClick: () => setTab('titles') }));
	if (IS_STUDIO && S.mode === 'single') {
		actions.append(button('Apply title, description & tags', { small: true, primary: true, icon: 'pen', onClick: () => applyAll(opt) }));
	}
	c.append(actions);
	return c;
}

/* ---- Mass update card ---- */

function massCard() {
	const c = card('Mass optimize', null);
	const count = collectStudioVideoIds().length;
	c.append(paragraph(`${count} video${count === 1 ? '' : 's'} found on this page. Each one opens in a background tab, gets analyzed, has its title, description and tags replaced with the top suggestions, and is saved.`));
	c.append(el('div', 'jc-hint', 'Uploaded video files and scripts are matched by video ID, so add them on each video\'s edit page first if you want grounded results.'));
	const btn = button(`Mass optimize ${count} videos`, { primary: true, icon: 'bolt', disabled: !count });
	btn.dataset.jc = 'massBtn';
	const confirm = el('div', 'jc-confirm');
	confirm.hidden = true;
	confirm.append(svg('warning'), el('div', null, 'This overwrites metadata on every video listed and saves it. Continue?'));
	const yes = button('Yes, run it', { small: true, primary: true, onClick: () => startMassUpdate() });
	const no = button('Cancel', { small: true, onClick: () => { confirm.hidden = true; } });
	confirm.append(yes, no);
	btn.addEventListener('click', () => { confirm.hidden = false; });
	c.append(btn, confirm);
	return c;
}

/* ============================ Titles ============================ */

function renderTitles() {
	const v = view('titles');
	v.innerHTML = '';
	const opt = S.result;
	if (!opt || !opt.titles || !opt.titles.length) {
		v.append(emptyState('Run an analysis to get five title options scored for length and keyword use.'));
		return;
	}
	const keyword = currentKeyword();
	const m = S.meta || {};
	if (m.title) {
		const cur = card('Current title', null);
		const row = el('div', 'jc-sug');
		const body = el('div', 'jc-sug-body');
		body.append(el('div', 'jc-sug-text', m.title), titleBadges(m.title, keyword));
		row.append(body);
		cur.append(row);
		v.append(cur);
	}
	const c = card('Suggested titles', null, { count: opt.titles.length });
	opt.titles.forEach((item, i) => {
		const row = el('div', 'jc-sug');
		row.append(el('div', 'jc-sug-num', String(i + 1)));
		const body = el('div', 'jc-sug-body');
		body.append(el('div', 'jc-sug-text', item.title || ''));
		body.append(titleBadges(item.title || '', keyword));
		if (item.reason) body.append(el('div', 'jc-sug-reason', item.reason));
		row.append(body);
		const actions = el('div', 'jc-sug-actions');
		if (IS_STUDIO) actions.append(iconButton('pen', 'Use this title in Studio', () => applyToStudio('title', item.title)));
		actions.append(iconButton('copy', 'Copy title', () => copyValue(item.title)));
		row.append(actions);
		c.append(row);
	});
	v.append(c);
}

/* ============================ Description & tags ============================ */

function renderMetadata() {
	const v = view('metadata');
	v.innerHTML = '';
	const opt = S.result;
	if (!opt) {
		v.append(emptyState('Run an analysis to get a ready-to-paste description, hashtags, tags and chapters.'));
		return;
	}

	if (opt.description) {
		const full = composeDescription(opt);
		const actions = [copyButton(full)];
		if (IS_STUDIO) actions.push(applyButton('description', full));
		const c = card('Description', null, { actions });
		c.append(el('pre', 'jc-pre', full));
		c.append(el('div', 'jc-hint', `${full.length.toLocaleString()} / 5,000 characters`));
		v.append(c);
	}

	if (opt.hashtags && opt.hashtags.length) {
		const c = card('Hashtags', null, { count: opt.hashtags.length, actions: [copyButton(opt.hashtags.join(' '))] });
		c.append(chips(opt.hashtags));
		v.append(c);
	}

	if (opt.tags && opt.tags.length) {
		const fitted = fitTagsToLimit(opt.tags);
		const chars = fitted.join(',').length;
		const actions = [copyButton(fitted.join(', '))];
		if (IS_STUDIO) actions.push(applyButton('tags', fitted));
		const c = card('Tags', null, { count: fitted.length, actions });
		c.append(chips(fitted));
		const meter = el('div', 'jc-meter');
		const fill = el('i');
		fill.style.width = Math.min(100, (chars / YT_TAGS_MAX) * 100) + '%';
		fill.className = chars > YT_TAGS_MAX ? 'bad' : chars > 450 ? 'warn' : 'ok';
		meter.append(fill);
		c.append(meter, el('div', 'jc-hint', `${chars} / ${YT_TAGS_MAX} characters${fitted.length < opt.tags.length ? ` · ${opt.tags.length - fitted.length} dropped to fit` : ''}`));
		if (opt.tagReasons) c.append(paragraph(opt.tagReasons, 'jc-reason'));
		v.append(c);
	}

	if (opt.chapters && opt.chapters.length) {
		const lines = opt.chapters.map((ch) => `${ch.timestamp} ${ch.title}`);
		const c = card('Chapters', null, { count: opt.chapters.length, actions: [copyButton(lines.join('\n'))] });
		const list = el('div', 'jc-chapters');
		opt.chapters.forEach((ch) => {
			const row = el('div', 'jc-chapter');
			row.append(el('span', 'jc-chapter-ts', ch.timestamp || ''), el('span', null, ch.title || ''));
			list.append(row);
		});
		c.append(list, el('div', 'jc-hint', 'Paste at the end of the description. The first line must be 0:00 for YouTube to show chapters.'));
		v.append(c);
	}

	if (opt.pinnedComment) {
		const c = card('Pinned comment', null, { actions: [copyButton(opt.pinnedComment)] });
		c.append(paragraph(opt.pinnedComment));
		v.append(c);
	}

	if (opt.category || (opt.playlistSuggestions && opt.playlistSuggestions.length)) {
		const c = card('Category & playlists', null);
		if (opt.category) {
			const row = el('div', 'jc-inline');
			row.append(el('span', 'jc-muted', 'Category'), badge(opt.category));
			c.append(row);
		}
		if (opt.playlistSuggestions && opt.playlistSuggestions.length) c.append(chips(opt.playlistSuggestions));
		v.append(c);
	}
}

/* ============================ Thumbnail ============================ */

function renderThumbnail() {
	const v = view('thumbnail');
	if (!v) return;
	v.innerHTML = '';
	const opt = S.result;
	const m = S.meta || {};

	const preview = card('Current thumbnail', null, {
		actions: [aspectBadge(), button('Upload image', { small: true, icon: 'upload', onClick: () => q('thumbFile').click() })]
	});
	if (S.sources.thumb) {
		const img = el('img', 'jc-thumb-img');
		img.alt = '';
		img.src = `data:${S.sources.thumb.mimeType};base64,${S.sources.thumb.data}`;
		preview.append(img, el('div', 'jc-hint', `Custom image: ${S.sources.thumb.name}`));
	} else if (m.videoId) {
		const img = el('img', 'jc-thumb-img');
		img.alt = '';
		img.src = `https://i.ytimg.com/vi/${m.videoId}/hqdefault.jpg`;
		img.addEventListener('error', () => img.replaceWith(el('div', 'jc-thumb-img ph', 'No thumbnail yet')));
		preview.append(img);
	} else {
		preview.append(el('div', 'jc-thumb-img ph', 'No thumbnail yet'));
	}
	v.append(preview);

	if (!opt) {
		v.append(emptyState('Run an analysis to score the thumbnail and get three concepts to try.', 'image'));
		v.append(customGeneratorCard());
		if (S.generated.custom) renderGenerated('custom');
		return;
	}

	if (opt.thumbnailAnalysis) {
		const ta = opt.thumbnailAnalysis;
		const c = card('Thumbnail analysis', null);
		[
			['Readability', ta.readability], ['Subject visibility', ta.subjectVisibility], ['Contrast', ta.contrast],
			['Mobile legibility', ta.mobileLegibility], ['Low clutter', ta.clutter]
		].forEach(([label, value]) => { if (typeof value === 'number') c.append(bar(label, value)); });
		if (ta.titleSynergy) {
			const row = paragraph('', 'jc-text');
			row.append(el('strong', null, 'Title synergy: '), document.createTextNode(ta.titleSynergy));
			c.append(row);
		}
		(ta.improvements || []).forEach((imp) => {
			const row = el('div', 'jc-sug');
			row.append(el('div', 'jc-sug-num', '→'));
			const body = el('div', 'jc-sug-body');
			body.append(el('div', 'jc-sug-reason', imp));
			row.append(body);
			c.append(row);
		});
		v.append(c);
	}

	if (opt.thumbnailConcepts && opt.thumbnailConcepts.length) {
		const c = card('Concepts to try', null, { count: opt.thumbnailConcepts.length });
		opt.thumbnailConcepts.forEach((concept, i) => {
			const row = el('div', 'jc-sug');
			row.append(el('div', 'jc-sug-num', String(i + 1)));
			const body = el('div', 'jc-sug-body');
			body.append(el('div', 'jc-sug-text jc-overlay', concept.textOverlay || ''));
			if (concept.idea) body.append(el('div', 'jc-sug-reason', concept.idea));
			if (concept.moment) body.append(el('div', 'jc-sug-moment', `Frame: ${concept.moment}`));
			const gen = el('div', 'jc-gen-row');
			gen.append(button('Generate image', {
				small: true, icon: 'image',
				onClick: (e) => generateThumbnailFor(i, {
					overlay: concept.textOverlay || '',
					idea: concept.idea || '',
					moment: concept.moment || ''
				}, e.currentTarget)
			}));
			body.append(gen);
			const slot = el('div', 'jc-gen-slot');
			slot.dataset.jc = 'gen-' + i;
			body.append(slot);
			row.append(body);
			const actions = el('div', 'jc-sug-actions');
			actions.append(iconButton('copy', 'Copy overlay text', () => copyValue(concept.textOverlay || '')));
			row.append(actions);
			c.append(row);
		});
		v.append(c);
		// Restore after the card is in the panel: renderGenerated finds its slot
		// through the panel, so it must not run while the card is detached.
		opt.thumbnailConcepts.forEach((_, i) => { if (S.generated[i]) renderGenerated(i); });
	}

	v.append(customGeneratorCard());
	if (S.generated.custom) renderGenerated('custom');
}

/* ---- Thumbnail generation ---- */

function aspectBadge() {
	const aspect = (S.meta && S.meta.aspect) || '16:9';
	const b = badge(aspect === '9:16' ? 'Vertical 9:16 (Shorts)' : 'Wide 16:9', 'ok');
	b.title = 'Detected from the video on this page. Generated thumbnails use this shape.';
	return b;
}

function customGeneratorCard() {
	const c = card('Generate a thumbnail', 'image', { actions: [aspectBadge()] });
	c.append(el('div', 'jc-hint', 'Describe the image you want. The shape, safe areas and composition rules for this video are added automatically.'));

	const idea = el('textarea');
	idea.rows = 3;
	idea.placeholder = 'e.g. Osprey nose-high on a wet deck, storm wall behind, rotor wash tearing spray across the frame';
	idea.value = S.customPrompt.idea || '';
	idea.addEventListener('input', () => { S.customPrompt.idea = idea.value; });
	c.append(field('Visual concept', idea));

	const overlay = el('input');
	overlay.type = 'text';
	overlay.placeholder = 'e.g. 40-KNOT LAUNCH (leave blank for no text)';
	overlay.value = S.customPrompt.overlay || '';
	overlay.addEventListener('input', () => { S.customPrompt.overlay = overlay.value; });
	c.append(field('Text overlay', overlay));

	const useRef = el('label', 'jc-check');
	const refCb = el('input');
	refCb.type = 'checkbox';
	refCb.checked = S.customPrompt.useReference !== false;
	refCb.addEventListener('change', () => { S.customPrompt.useReference = refCb.checked; });
	useRef.append(refCb, el('span', null, 'Use a frame from the player as reference, when the page allows it'));
	c.append(useRef);

	const actions = el('div', 'jc-actions');
	actions.append(button('Generate', {
		primary: true, icon: 'image',
		onClick: (e) => {
			if (!idea.value.trim()) { toast('Describe the image you want first.', 'warn'); return; }
			generateThumbnailFor('custom', { overlay: overlay.value, idea: idea.value, moment: '' }, e.currentTarget);
		}
	}));
	c.append(actions);
	const slot = el('div', 'jc-gen-slot');
	slot.dataset.jc = 'gen-custom';
	c.append(slot);
	return c;
}

async function generateThumbnailFor(key, concept, btn) {
	if (S.generating[key]) return;
	S.generating[key] = true;
	if (btn) btn.disabled = true;

	const slot = q('gen-' + key);
	if (slot) {
		slot.innerHTML = '';
		const status = el('div', 'jc-status');
		status.append(el('span', 'jc-spinner'), el('span', null, 'Generating image… this takes 10–30 seconds.'));
		slot.append(status);
	}

	const wantRef = key === 'custom' ? S.customPrompt.useReference !== false : true;
	const reference = wantRef ? await captureReferenceFrame() : null;
	const profile = S.settings.channelProfile || {};

	const res = await send({
		action: 'generateThumbnail',
		payload: {
			aspect: (S.meta && S.meta.aspect) || '16:9',
			overlay: concept.overlay,
			idea: concept.idea,
			moment: concept.moment,
			extra: key === 'custom' ? '' : (S.customPrompt.extra || ''),
			videoTitle: (S.result && S.result.titles && S.result.titles.length ? S.result.titles[0].title : (S.meta && S.meta.title)) || '',
			keyword: currentKeyword(),
			niche: profile.niche || '',
			reference
		}
	});

	S.generating[key] = false;
	if (btn) btn.disabled = false;

	if (res.error) {
		if (slot) slot.innerHTML = '';
		toast(res.error, 'err', 8000);
		return;
	}
	S.generated[key] = {
		src: `data:${res.image.mimeType};base64,${res.image.data}`,
		mimeType: res.image.mimeType,
		aspect: res.aspect,
		usedReference: Boolean(reference),
		overlay: concept.overlay || ''
	};
	renderGenerated(key);
	toast('Thumbnail generated.', 'ok');
}

function renderGenerated(key) {
	const slot = q('gen-' + key);
	const g = S.generated[key];
	if (!slot || !g) return;
	slot.innerHTML = '';

	const img = el('img', 'jc-gen-img' + (g.aspect === '9:16' ? ' tall' : ''));
	img.alt = '';
	img.src = g.src;
	slot.append(img);

	const row = el('div', 'jc-actions');
	row.append(button('Download', { small: true, icon: 'upload', onClick: () => downloadGenerated(key) }));
	if (IS_STUDIO) row.append(button('Set in Studio', { small: true, icon: 'pen', className: 'apply', onClick: () => sendToStudioThumbnail(key) }));
	row.append(button('Regenerate', {
		small: true, icon: 'refresh',
		onClick: (e) => {
			const concept = key === 'custom'
				? { overlay: S.customPrompt.overlay || '', idea: S.customPrompt.idea || '', moment: '' }
				: conceptAt(key);
			if (concept) generateThumbnailFor(key, concept, e.currentTarget);
		}
	}));
	slot.append(row);
	slot.append(el('div', 'jc-hint', `${g.aspect}${g.usedReference ? ' · matched to a frame from the player' : ''}. Image models can misspell overlay text — check it before you upload.`));
}

function conceptAt(i) {
	const list = S.result && S.result.thumbnailConcepts;
	if (!list || !list[i]) return null;
	return { overlay: list[i].textOverlay || '', idea: list[i].idea || '', moment: list[i].moment || '' };
}

function generatedFileName(key) {
	const g = S.generated[key] || {};
	const base = (g.overlay || (S.meta && S.meta.title) || 'thumbnail')
		.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'thumbnail';
	const ext = (g.mimeType || 'image/png').split('/')[1] || 'png';
	return `jcviq-${base}-${(g.aspect || '16-9').replace(':', 'x')}.${ext}`;
}

async function generatedBlob(key) {
	const g = S.generated[key];
	if (!g) return null;
	return (await fetch(g.src)).blob();
}

async function downloadGenerated(key) {
	try {
		const blob = await generatedBlob(key);
		if (!blob) return;
		const url = URL.createObjectURL(blob);
		const a = el('a');
		a.href = url;
		a.download = generatedFileName(key);
		document.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10000);
		toast('Image downloaded.', 'ok');
	} catch (e) {
		toast('Could not download the image.', 'err');
	}
}

// Best effort: push the image straight into Studio's thumbnail file input.
async function sendToStudioThumbnail(key) {
	const input = document.querySelector('ytcp-thumbnail-uploader input[type="file"]') ||
		document.querySelector('ytcp-thumbnail-editor input[type="file"]') ||
		Array.from(document.querySelectorAll('input[type="file"]'))
			.find((i) => /image|thumb/i.test(i.getAttribute('accept') || '') || /thumb/i.test(i.id || ''));
	if (!input) {
		toast('Could not find the thumbnail upload field. Download the image and upload it manually.', 'err', 7000);
		return;
	}
	try {
		const blob = await generatedBlob(key);
		const file = new File([blob], generatedFileName(key), { type: blob.type || 'image/png' });
		const dt = new DataTransfer();
		dt.items.add(file);
		input.files = dt.files;
		input.dispatchEvent(new Event('change', { bubbles: true }));
		toast('Sent to Studio. Check the thumbnail preview, then Save.', 'ok', 6000);
	} catch (e) {
		toast('Studio rejected the image. Download it and upload manually.', 'err', 7000);
	}
}

/* ============================ Strategy ============================ */

function renderStrategy() {
	const v = view('strategy');
	v.innerHTML = '';
	const opt = S.result;
	if (!opt) {
		v.append(emptyState('Run an analysis to get keywords, the opening hook, research insights and repurposing ideas.'));
		return;
	}

	if (opt.primaryKeyword || (opt.secondaryKeywords && opt.secondaryKeywords.length)) {
		const c = card('Keywords', null, { actions: [copyButton([opt.primaryKeyword, ...(opt.secondaryKeywords || [])].filter(Boolean).join(', '))] });
		c.append(chips([opt.primaryKeyword, ...(opt.secondaryKeywords || [])].filter(Boolean), { highlightFirst: true }));
		if (opt.keywordStrategy) c.append(paragraph(opt.keywordStrategy));
		v.append(c);
	}

	[
		['Opening hook', opt.hook],
		['Content strategy', opt.contentStrategy],
		['Research insights', opt.researchInsights],
		['End screens & cards', opt.endScreenTips]
	].forEach(([label, body]) => {
		if (!body) return;
		const c = card(label, null, { actions: [copyButton(body)] });
		c.append(paragraph(body));
		v.append(c);
	});

	const rp = opt.repurposing;
	if (rp) {
		if (rp.shortsIdeas && rp.shortsIdeas.length) {
			const c = card('Shorts ideas', null, { count: rp.shortsIdeas.length });
			rp.shortsIdeas.forEach((s, i) => {
				const row = el('div', 'jc-sug');
				row.append(el('div', 'jc-sug-num', String(i + 1)));
				const body = el('div', 'jc-sug-body');
				body.append(el('div', 'jc-sug-text', s.title || ''));
				if (s.hook) body.append(el('div', 'jc-sug-reason', s.hook));
				row.append(body);
				const actions = el('div', 'jc-sug-actions');
				actions.append(iconButton('copy', 'Copy', () => copyValue(`${s.title}\n${s.hook || ''}`)));
				row.append(actions);
				c.append(row);
			});
			v.append(c);
		}
		const posts = rp.socialPosts || {};
		[['X / Twitter', posts.x], ['Community post', posts.community], ['Instagram / Reels', posts.instagram]].forEach(([label, body]) => {
			if (!body) return;
			const c = card(label, null, { actions: [copyButton(body)] });
			c.append(el('pre', 'jc-pre', body));
			v.append(c);
		});
		if (rp.followUpIdeas && rp.followUpIdeas.length) {
			const c = card('Follow-up video ideas', null, { count: rp.followUpIdeas.length });
			rp.followUpIdeas.forEach((idea) => {
				const row = el('div', 'jc-sug');
				row.append(el('div', 'jc-sug-num', '•'));
				const body = el('div', 'jc-sug-body');
				body.append(el('div', 'jc-sug-text', idea));
				row.append(body);
				c.append(row);
			});
			v.append(c);
		}
	}
}

/* ============================ History ============================ */

async function renderHistory() {
	const v = view('history');
	v.innerHTML = '';
	const { history = [] } = await storageGet('history');
	const actions = history.length
		? [button('Clear', { small: true, icon: 'trash', onClick: async () => { await storageSet({ history: [] }); renderHistory(); } })]
		: [];
	const c = card('History', 'history', { actions });
	if (!history.length) {
		c.append(el('div', 'jc-hint', 'No saved analyses yet. Run one and it will appear here.'));
	}
	history.forEach((entry) => {
		const row = el('div', 'jc-hist');
		const body = el('div', 'jc-hist-body');
		body.append(el('div', 'jc-hist-title', entry.title || 'Untitled'));
		const metaRow = el('div', 'jc-badges');
		metaRow.append(el('span', 'jc-muted', timeAgo(entry.date)));
		const src = entry.sources || {};
		if (src.script) metaRow.append(badge('script', 'ok'));
		if (src.video) metaRow.append(badge('video', 'ok'));
		if (src.transcript) metaRow.append(badge('captions'));
		body.append(metaRow);
		row.append(body, svg('chevronRight'));
		row.addEventListener('click', () => {
			S.result = entry.optimization;
			S.resultSources = entry.sources || {};
			renderResults();
			setTab('titles');
		});
		c.append(row);
	});
	v.append(c);
}

async function saveToHistory(m, optimization, sources) {
	try {
		const { history = [] } = await storageGet('history');
		history.unshift({
			id: (m.videoId || 'unknown') + '-' + Date.now(),
			videoId: m.videoId || '',
			title: m.title || 'Untitled',
			date: Date.now(),
			sources,
			optimization
		});
		await storageSet({ history: history.slice(0, HISTORY_LIMIT) });
	} catch (e) {
		console.warn('JCVIQ: could not save history:', e.message);
	}
}

/* ============================ Settings ============================ */

function field(label, input, hint) {
	const wrap = el('div', 'jc-field');
	wrap.append(el('label', 'jc-label', label), input);
	if (hint) wrap.append(el('div', 'jc-hint', hint));
	return wrap;
}

function renderSettings() {
	const v = view('settings');
	v.innerHTML = '';
	const s = S.settings;

	// API
	const api = card('Gemini API', 'settings');
	const keyRow = el('div', 'jc-inline-row');
	const key = el('input');
	key.type = 'password';
	key.placeholder = 'AIza…';
	key.autocomplete = 'off';
	key.spellcheck = false;
	key.value = s.geminiApiKey || '';
	const show = iconButton('eye', 'Show / hide key', () => { key.type = key.type === 'password' ? 'text' : 'password'; });
	keyRow.append(key, show);
	api.append(field('API key', keyRow, 'Stored only in this browser. Get a free key at aistudio.google.com/apikey.'));

	const model = el('select');
	[['gemini-2.5-flash', 'Gemini 2.5 Flash — fast (default)'], ['gemini-2.5-pro', 'Gemini 2.5 Pro — deeper, slower'], ['gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite — cheapest']].forEach(([val, label]) => {
		const o = el('option', null, label);
		o.value = val;
		model.append(o);
	});
	model.value = s.model || 'gemini-2.5-flash';
	api.append(field('Model', model));

	const search = el('label', 'jc-check');
	const searchCb = el('input');
	searchCb.type = 'checkbox';
	searchCb.checked = s.useSearch !== false;
	search.append(searchCb, el('span', null, 'Google Search grounding (researches the niche; slower, less strict JSON)'));
	api.append(search);

	const imageModel = el('select');
	[
		['gemini-2.5-flash-image', 'Gemini 2.5 Flash Image — fast (default)'],
		['gemini-3-pro-image-preview', 'Gemini 3 Pro Image — higher quality, slower']
	].forEach(([val, label]) => {
		const o = el('option', null, label);
		o.value = val;
		imageModel.append(o);
	});
	imageModel.value = s.imageModel || 'gemini-2.5-flash-image';
	api.append(field('Thumbnail image model', imageModel, 'Used by the generator on the Thumbnail tab. Billed per image.'));
	v.append(api);

	// Behaviour
	const beh = card('Studio behaviour', null);
	const auto = el('label', 'jc-check');
	const autoCb = el('input');
	autoCb.type = 'checkbox';
	autoCb.checked = Boolean(s.autoApply);
	auto.append(autoCb, el('span', null, 'Auto-apply the top title, description and tags after every analysis'));
	beh.append(auto, el('div', 'jc-hint', 'Off by default. Mass optimize always applies and saves.'));
	v.append(beh);

	// Profile
	const prof = card('Channel profile', null);
	prof.append(el('div', 'jc-hint', 'Injected into every prompt so output sounds like your channel.'));
	const inputs = {};
	[
		['niche', 'Niche / topic', 'e.g. US Navy & military aviation'],
		['audience', 'Target audience', 'e.g. defense enthusiasts, 25–55'],
		['tone', 'Tone / voice', 'e.g. authoritative, cinematic'],
		['avoid', 'Words to avoid', 'comma separated'],
		['cta', 'Standard call-to-action', 'e.g. Subscribe for weekly breakdowns'],
		['hashtags', 'Preferred hashtags', '#navy #military'],
		['links', 'Links for the description', 'one per line or comma separated'],
		['language', 'Output language', 'default: English']
	].forEach(([id, label, ph]) => {
		const inp = el('input');
		inp.type = 'text';
		inp.placeholder = ph;
		inp.value = (s.channelProfile && s.channelProfile[id]) || '';
		inputs[id] = inp;
		prof.append(field(label, inp));
	});
	v.append(prof);

	// Save
	const actions = el('div', 'jc-actions');
	actions.append(button('Save settings', {
		primary: true,
		icon: 'check',
		onClick: async () => {
			const profile = {};
			PROFILE_FIELDS.forEach((f) => { const val = inputs[f].value.trim(); if (val) profile[f] = val; });
			S.settings = {
				...S.settings,
				geminiApiKey: key.value.trim(),
				model: model.value,
				imageModel: imageModel.value,
				useSearch: searchCb.checked,
				autoApply: autoCb.checked,
				channelProfile: profile
			};
			await storageSet({
				geminiApiKey: S.settings.geminiApiKey,
				model: S.settings.model,
				imageModel: S.settings.imageModel,
				useSearch: S.settings.useSearch,
				autoApply: S.settings.autoApply,
				channelProfile: profile
			});
			toast('Settings saved.');
			setTab('overview');
		}
	}));
	actions.append(button('Forget uploaded videos', {
		small: true,
		icon: 'trash',
		onClick: async () => {
			const { jcSources = {} } = await storageGet('jcSources');
			Object.values(jcSources).forEach((e) => { if (e.video && e.video.name) send({ action: 'fileDelete', name: e.video.name }); });
			await storageSet({ jcSources: {} });
			S.sources.video = null;
			renderSources();
			toast('Uploaded videos forgotten.');
		}
	}));
	v.append(actions);
	v.append(el('div', 'jc-footer', 'JCVIQ · Gemini-powered YouTube optimizer · no telemetry, no backend'));
}

async function loadSettings() {
	S.settings = await storageGet([
		'geminiApiKey', 'model', 'imageModel', 'useSearch', 'autoApply', 'channelProfile',
		'contentType', 'watchByUrl', 'panelCollapsed'
	]);
}

/* ============================ Analyze ============================ */

function renderResults() {
	markTabsReady(Boolean(S.result));
	renderOverview();
	renderTitles();
	renderMetadata();
	renderThumbnail();
	renderStrategy();
}

async function runAnalyze() {
	if (S.busy) return;
	refreshMeta({ silent: true });
	const m = S.meta;
	if (!m || (!m.title && !S.sources.script.text)) {
		toast(IS_STUDIO
			? 'Could not read the title field. Wait for the video details to load, or add a script.'
			: 'Could not read this video. Refresh the page and try again.', 'err', 5000);
		return;
	}
	const vf = S.sources.video;
	if (vf && (vf.phase === 'uploading' || vf.phase === 'processing')) {
		toast('The video is still uploading or processing. Wait for "Ready" before analyzing.', 'warn', 5000);
		return;
	}

	S.busy = true;
	const btn = q('runBtn');
	if (btn) btn.disabled = true;
	const parts = [];
	if (S.sources.script.text) parts.push('script');
	if (vf && vf.phase === 'ready') parts.push('video file');
	else if (!IS_STUDIO && S.settings.watchByUrl) parts.push('video by URL');
	// Read YouTube's transcript panel before calling out, since it is the only
	// caption path that still works. Cheap when there is no transcript to find.
	let transcriptOverride = null;
	if (!IS_STUDIO && m.videoId) {
		setStatus('Reading the video transcript…');
		transcriptOverride = await scrapeTranscriptPanel();
	}
	if (transcriptOverride) parts.push('transcript');

	setStatus(`Gemini is analyzing ${parts.join(' + ')}…${parts.includes('video file') || parts.includes('video by URL') ? ' Watching the video can take a few minutes.' : ''}`);

	const payload = {
		...m,
		contentType: S.settings.contentType || '',
		profile: S.settings.channelProfile || {},
		script: S.sources.script.text || '',
		videoFile: vf && vf.phase === 'ready' ? { uri: vf.uri, mimeType: vf.mimeType, name: vf.name } : null,
		watchByUrl: !IS_STUDIO && Boolean(S.settings.watchByUrl),
		thumbnailOverride: S.sources.thumb ? { mimeType: S.sources.thumb.mimeType, data: S.sources.thumb.data } : null,
		transcriptOverride
	};

	const res = await send({ action: 'analyze', payload });

	S.busy = false;
	setStatus('');
	if (btn) btn.disabled = false;

	if (res.error) {
		toast(res.error, 'err', 8000);
		if (/api key/i.test(res.error)) toggleView('settings');
		return;
	}
	if (!res.optimization) {
		toast('Gemini returned nothing usable. Try again.', 'err');
		return;
	}

	S.result = res.optimization;
	S.resultSources = res.sources || {};
	S.resultFor = m.videoId || 'draft';
	renderResults();
	setTab('overview');
	if (res.note) toast(res.note, 'warn', 9000);
	else toast('Analysis complete.');

	saveToHistory(m, res.optimization, res.sources);

	if (IS_STUDIO && S.mode === 'single') {
		const { massUpdateQueue = [] } = await storageGet('massUpdateQueue');
		const inMass = massUpdateQueue.length > 0 && massUpdateQueue[0] === m.videoId;
		if (inMass || S.settings.autoApply) {
			applyAll(res.optimization, { quiet: inMass });
			if (inMass) setTimeout(() => clickSaveAndContinue(), 800);
		}
	}
}

/* ============================ Studio: apply ============================ */

function findStudioBox(kind) {
	const boxes = studioBoxes();
	for (const b of boxes) {
		const label = (b.getAttribute('aria-label') || '').toLowerCase();
		if (kind === 'title' && /title/.test(label)) return b;
		if (kind === 'description' && /(tell viewers|description)/.test(label)) return b;
	}
	return kind === 'title' ? boxes[0] : boxes[1];
}

// Write into a Studio contenteditable so its framework registers the change.
function setStudioTextbox(kind, value) {
	const box = findStudioBox(kind);
	if (!box) return false;
	box.focus();
	try {
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

function setStudioTags(tagsArray) {
	tagsArray = fitTagsToLimit(tagsArray);
	if (!tagsArray.length) return false;
	// The tags field may be hidden behind "Show more".
	const showMore = Array.from(document.querySelectorAll('ytcp-button#toggle-button'))
		.find((b) => (b.textContent || '').toLowerCase().includes('show more'));
	if (showMore) showMore.click();
	setTimeout(() => {
		const tagInput = document.querySelector('ytcp-free-text-chip-bar #text-input') ||
			document.querySelector('input[aria-label="Tags"]') ||
			document.querySelector('input[aria-label="Add tag"]');
		if (!tagInput) return;
		tagInput.focus();
		// A trailing comma makes Studio split the pasted string into chips.
		const val = tagsArray.join(', ') + ',';
		const ok = document.execCommand('insertText', false, val);
		if (!ok) {
			tagInput.value = val;
			tagInput.dispatchEvent(new Event('input', { bubbles: true }));
			tagInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
		}
	}, 300);
	return true;
}

function applyToStudio(kind, value) {
	if (!IS_STUDIO) { copyValue(typeof value === 'string' ? value : (value || []).join(', ')); return; }
	const ok = kind === 'tags' ? setStudioTags(value) : setStudioTextbox(kind, value);
	const label = kind.charAt(0).toUpperCase() + kind.slice(1);
	toast(ok ? `${label} applied in Studio.` : `Could not find the ${kind} field.`, ok ? 'ok' : 'err');
}

function applyAll(opt, opts = {}) {
	let applied = 0;
	if (opt.titles && opt.titles.length && setStudioTextbox('title', opt.titles[0].title)) applied++;
	const desc = composeDescription(opt);
	if (desc && setStudioTextbox('description', desc)) applied++;
	if (opt.tags && opt.tags.length && setStudioTags(opt.tags)) applied++;
	if (!opts.quiet) toast(applied ? 'Title, description and tags applied. Review, then Save in Studio.' : 'Could not find the Studio fields.', applied ? 'ok' : 'err', 5000);
	refreshMeta({ silent: true });
	return applied;
}

/* ============================ Studio: mass update ============================ */

function collectStudioVideoIds() {
	const ids = [];
	const seen = new Set();
	const add = (id) => { if (id && !seen.has(id)) { seen.add(id); ids.push(id); } };
	const ID_EDIT = /\/video\/([A-Za-z0-9_-]{11})\/edit/;
	const ID_ANY = /\bvideo\/([A-Za-z0-9_-]{11})\b|"videoId"\s*:\s*"([A-Za-z0-9_-]{11})"/g;

	document.querySelectorAll('a[href*="/video/"]').forEach((a) => {
		const m = (a.getAttribute('href') || '').match(ID_EDIT);
		if (m) add(m[1]);
	});
	document.querySelectorAll('[href],[data-video-id],[test-id]').forEach((node) => {
		for (const attr of node.attributes) {
			const m = attr.value && attr.value.match(ID_EDIT);
			if (m) add(m[1]);
			if (attr.name === 'data-video-id' && /^[A-Za-z0-9_-]{11}$/.test(attr.value)) add(attr.value);
		}
	});
	if (!ids.length) {
		const scope = document.querySelector('ytcp-video-section-content, #contents, ytcp-content-cards-manager') || document.body;
		const html = scope ? scope.innerHTML : '';
		let m;
		while ((m = ID_ANY.exec(html))) add(m[1] || m[2]);
	}
	return ids;
}

async function startMassUpdate() {
	const vids = collectStudioVideoIds();
	if (!vids.length) { toast('No videos found on this page.', 'err'); return; }
	const btn = q('massBtn');
	if (btn) btn.disabled = true;
	const res = await send({ action: 'startMassUpdate', vids });
	if (res.error) { toast(res.error, 'err'); if (btn) btn.disabled = false; return; }
	toast(`Mass update started for ${vids.length} videos. Each opens in a background tab.`, 'ok', 6000);
}

function clickSaveAndContinue() {
	toast('Saving and moving to the next video…', 'ok', 4000);
	const enabled = (b) => b && !b.hasAttribute('disabled') && b.getAttribute('aria-disabled') !== 'true';
	let saveBtn = document.querySelector('ytcp-button#save') || document.querySelector('ytcp-button#save-button');
	if (!enabled(saveBtn)) {
		saveBtn = Array.from(document.querySelectorAll('ytcp-button, ytcp-button-shape button'))
			.find((b) => enabled(b) && /^(save|done)$/i.test((b.textContent || '').trim()));
	}
	if (enabled(saveBtn)) saveBtn.click();
	setTimeout(() => send({ action: 'massUpdateNext' }), 4000);
}

chrome.storage.onChanged.addListener((changes) => {
	if (!changes.massUpdateQueue) return;
	const remaining = (changes.massUpdateQueue.newValue || []).length;
	const btn = q('massBtn');
	if (!btn) return;
	if (remaining > 0) {
		btn.disabled = true;
		btn.querySelector('span:last-child').textContent = `Processing ${remaining} video${remaining === 1 ? '' : 's'} in the background…`;
	} else {
		btn.disabled = false;
		btn.querySelector('span:last-child').textContent = 'Mass update complete';
	}
});

function checkMassUpdateQueue() {
	if (!IS_STUDIO) return;
	const match = location.pathname.match(/\/video\/([^/]+)\/edit/);
	if (!match) return;
	const videoId = match[1];
	storageGet('massUpdateQueue').then(({ massUpdateQueue = [] }) => {
		if (massUpdateQueue.length && massUpdateQueue[0] === videoId) {
			// Give Studio time to populate the form, then run.
			setTimeout(() => { if (S.panel) runAnalyze(); }, 3500);
		}
	});
}

/* ============================ Clipboard ============================ */

function copyValue(value) {
	navigator.clipboard.writeText(String(value == null ? '' : value))
		.then(() => toast('Copied to clipboard.'))
		.catch(() => toast('Clipboard blocked. Select the text and copy it manually.', 'err'));
}

/* ============================ Context / mount ============================ */

function studioFormPresent() {
	if (document.querySelector('ytcp-uploads-dialog') || document.querySelector('ytcp-video-metadata-editor')) return true;
	return studioBoxes().some((b) => /title|tell viewers/i.test(b.getAttribute('aria-label') || ''));
}

function isTargetPage() {
	if (IS_STUDIO) return studioFormPresent() || location.pathname.includes('/videos');
	// Shorts have no right column, so the panel falls back to floating there.
	return location.pathname === '/watch' || /^\/shorts\/[A-Za-z0-9_-]{11}/.test(location.pathname);
}

function currentMode() {
	if (!IS_STUDIO) return 'single';
	return (!studioFormPresent() && location.pathname.includes('/videos')) ? 'mass' : 'single';
}

// Re-read the page and re-render what depends on it. Cheap when nothing changed.
async function refreshMeta(opts = {}) {
	if (!S.panel) return;
	const prevKey = sourceKey();
	S.meta = getMetadata();
	S.mode = currentMode();
	const key = `${S.mode}|${S.meta.videoId}|${S.meta.title}|${(S.meta.description || '').length}|${(S.meta.tags || []).length}`;
	if (key === S.ctxKey && !opts.force) return;
	const videoChanged = sourceKey() !== prevKey || opts.force;
	S.ctxKey = key;
	if (videoChanged) {
		if (S.resultFor && S.resultFor !== sourceKey()) { S.result = null; S.resultSources = null; }
		// Generated images belong to the video they were made for.
		S.generated = {};
		S.generating = {};
		await loadSources();
	}
	if (S.busy) return;
	if (!opts.silent || videoChanged) renderResults();
	else {
		// Only the fields that mirror the page changed (user typed in Studio).
		renderOverview();
		renderTitles();
	}
}

function watchHost() {
	if (location.pathname.startsWith('/shorts/')) return null; // no right column on Shorts
	return document.querySelector('#secondary-inner') || document.querySelector('#secondary');
}

function mountPanel(attempt = 0) {
	if (window.top !== window.self) return; // never inside iframes (live chat etc.)
	if (!isTargetPage()) return;

	// De-duplicate: keep one panel.
	const existing = Array.from(document.querySelectorAll('#' + PANEL_ID));
	if (existing.length > 1) existing.slice(1).forEach((p) => p.remove());
	if (existing.length && S.panel === existing[0]) {
		placePanel(attempt);
		refreshMeta();
		return;
	}
	if (existing.length) existing.forEach((p) => p.remove());

	S.panel = buildPanel();
	if (IS_STUDIO) {
		S.panel.classList.add('jc-drawer');
		S.handle = buildHandle();
		S.handle.hidden = true;
		document.body.append(S.handle);
	}
	applyTheme();
	loadSettings().then(async () => {
		placePanel(attempt);
		if (IS_STUDIO && S.settings.panelCollapsed) setCollapsed(true);
		else if (!IS_STUDIO) setCollapsed(false);
		await refreshMeta({ force: true });
		setTab('overview');
	});
}

// Put the panel where it belongs: right column on watch pages, drawer in Studio.
function placePanel(attempt = 0) {
	const panel = S.panel;
	if (!panel) return;
	if (IS_STUDIO) {
		if (!panel.isConnected) document.body.append(panel);
		if (S.handle && !S.handle.isConnected) document.body.append(S.handle);
		return;
	}
	const host = watchHost();
	if (host) {
		panel.classList.remove('jc-floating');
		panel.classList.add('jc-docked');
		if (panel.parentElement !== host || host.firstElementChild !== panel) host.prepend(panel);
		return;
	}
	// Float: either this page has no right column (Shorts), or it has not
	// rendered yet and we keep looking for a few seconds.
	if (!panel.isConnected || panel.classList.contains('jc-docked')) {
		panel.classList.remove('jc-docked');
		panel.classList.add('jc-floating');
		document.body.append(panel);
	}
	const columnPossible = !location.pathname.startsWith('/shorts/');
	if (columnPossible && attempt < 20) setTimeout(() => placePanel(attempt + 1), 500);
}

function removePanel() {
	document.getElementById(PANEL_ID)?.remove();
	document.getElementById(HANDLE_ID)?.remove();
	S.panel = null;
	S.handle = null;
	S.ctxKey = '';
}

function handleNavigation() {
	if (isTargetPage()) setTimeout(() => mountPanel(), 600);
	else removePanel();
}

window.addEventListener('yt-navigate-finish', handleNavigation);
document.addEventListener('yt-navigate-finish', handleNavigation);
window.addEventListener('yt-page-data-updated', () => { if (S.panel) refreshMeta(); });

// Theme changes (YouTube toggles the `dark` attribute on <html>).
new MutationObserver(() => applyTheme()).observe(document.documentElement, { attributes: true, attributeFilter: ['dark', 'data-theme', 'class', 'style'] });
if (window.matchMedia) {
	try { window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme); } catch (e) { /* older API */ }
}

// Studio navigation is unpredictable (SPA + modal upload dialog), so poll for
// the details form and mount/refresh/remove as it appears and disappears.
// On watch pages the same loop re-docks the panel if YouTube re-renders the column.
setInterval(() => {
	if (isTargetPage()) {
		if (!S.panel || !S.panel.isConnected) mountPanel();
		else { placePanel(); refreshMeta({ silent: true }); }
	} else if (S.panel) {
		removePanel();
	}
}, 1500);

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => { mountPanel(); checkMassUpdateQueue(); });
} else {
	mountPanel();
	checkMassUpdateQueue();
}
