/* ============================ API mass update ============================ */
// Loaded into the service worker by background.js (importScripts).
// Runs entirely in the worker: no Studio tabs. For each video it reads the
// current metadata from the YouTube Data API, runs the normal analysis (which
// consults NeuroBrain on the local network first), then writes the top title,
// description and tags back with videos.update. Costs about 51 quota units per
// video against the project's daily YouTube Data API quota (10,000 by default).
// Uses analyze() and getSettings() from background.js at call time.

const YT_API = 'https://www.googleapis.com/youtube/v3';
const YT_SCOPE = 'https://www.googleapis.com/auth/youtube.force-ssl';
let apiMassRunning = false;
let apiMassCancel = false;

async function getYtToken(interactive) {
	const s = await chrome.storage.local.get(['ytToken', 'ytTokenExp', 'ytClientId']);
	if (s.ytToken && s.ytTokenExp > Date.now() + 60000) return s.ytToken;
	const clientId = (s.ytClientId || '').trim();
	if (!clientId) throw new Error('Add your Google OAuth client ID in Settings first (see SETUP_GUIDE.md, "Mass update with the YouTube API").');
	const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
		client_id: clientId,
		response_type: 'token',
		redirect_uri: chrome.identity.getRedirectURL(),
		scope: YT_SCOPE
	});
	let resp = null;
	try {
		resp = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: false });
	} catch (e) { resp = null; }
	if (!resp) {
		if (!interactive) throw new Error('Google sign-in expired. Start the mass update again to sign in.');
		resp = await chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true });
	}
	const params = new URLSearchParams(new URL(resp).hash.replace(/^#/, ''));
	const token = params.get('access_token');
	if (!token) throw new Error('Google sign-in did not return a token: ' + (params.get('error') || 'unknown error'));
	await chrome.storage.local.set({
		ytToken: token,
		ytTokenExp: Date.now() + (Number(params.get('expires_in')) || 3600) * 1000
	});
	return token;
}

async function ytFetch(path, init = {}) {
	for (let attempt = 0; attempt < 2; attempt++) {
		const token = await getYtToken(false);
		const res = await fetch(YT_API + path, {
			...init,
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
		});
		if (res.status === 401 && attempt === 0) {
			await chrome.storage.local.remove(['ytToken', 'ytTokenExp']);
			continue;
		}
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			const reason = data && data.error && data.error.errors && data.error.errors[0] && data.error.errors[0].reason;
			const err = new Error((data.error && data.error.message) || `YouTube API error ${res.status}`);
			err.quota = reason === 'quotaExceeded' || reason === 'dailyLimitExceeded';
			throw err;
		}
		return data;
	}
	throw new Error('YouTube rejected the sign-in token.');
}

function isoDurationSeconds(iso) {
	const m = String(iso || '').match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
	return m ? (Number(m[1]) || 0) * 3600 + (Number(m[2]) || 0) * 60 + (Number(m[3]) || 0) : 0;
}

function tsSeconds(ts) {
	return String(ts || '').split(':').reverse().reduce((a, p, i) => a + (Number(p) || 0) * Math.pow(60, i), 0);
}

function chapterBlock(opt, lengthSec) {
	const rows = ((opt && opt.chapters) || [])
		.map((c) => ({ ts: String(c.timestamp || '').trim(), title: String(c.title || '').trim() }))
		.filter((c) => /^\d{1,2}(:\d{2}){1,2}$/.test(c.ts) && c.title);
	const kept = [];
	let last = -Infinity;
	for (const c of rows) {
		const sec = tsSeconds(c.ts);
		if (!kept.length && sec !== 0) continue;
		if (kept.length && sec - last < 10) continue;
		if (lengthSec && sec >= lengthSec) continue;
		kept.push(c);
		last = sec;
	}
	return kept.length >= 3 ? kept.map((c) => `${c.ts} ${c.title}`).join('\n') : '';
}

function buildApiMetadata(opt, current, lengthSec) {
	// The API rejects < and > in titles and descriptions.
	const strip = (t) => String(t || '').replace(/[<>]/g, '').trim();
	const title = strip(opt.titles && opt.titles[0] && opt.titles[0].title).slice(0, 100) || current.title;

	let desc = '';
	if (opt.description) {
		const clean = opt.description.replace(/(?:\s*#[\p{L}\p{N}_]+)+\s*$/u, '').trim();
		const hashtags = Array.isArray(opt.hashtags) ? opt.hashtags.filter(Boolean) : [];
		desc = hashtags.length ? `${clean}\n\n${hashtags.join(' ')}` : clean;
	}
	const chapters = chapterBlock(opt, lengthSec);
	if (chapters) desc += '\n\n' + chapters;
	desc = strip(desc);
	while (new TextEncoder().encode(desc).length > 4900) desc = desc.slice(0, -100);
	if (!desc) desc = current.description || '';

	const tags = [];
	let used = 0;
	for (const raw of opt.tags || []) {
		const tag = String(raw || '').replace(/[<>]/g, '').trim();
		if (!tag) continue;
		// YouTube counts the quotes it adds around multi-word tags.
		const cost = tag.length + (/\s/.test(tag) ? 2 : 0) + (tags.length ? 1 : 0);
		if (used + cost > 480) continue;
		tags.push(tag);
		used += cost;
	}
	return { title, description: desc, tags: tags.length ? tags : (current.tags || []) };
}

async function setApiMassState(patch) {
	const { apiMassState = {} } = await chrome.storage.local.get('apiMassState');
	const next = { ...apiMassState, ...patch };
	await chrome.storage.local.set({ apiMassState: next });
	return next;
}

async function startApiMassUpdate(vids) {
	if (apiMassRunning) return { error: 'A mass update is already running.' };
	try { await getYtToken(true); } catch (e) { return { error: e.message }; }
	const ids = Array.from(new Set(vids)).filter((id) => /^[A-Za-z0-9_-]{11}$/.test(id));
	if (!ids.length) return { error: 'No videos to update.' };
	apiMassCancel = false;
	await chrome.storage.local.set({
		apiMassState: { running: true, total: ids.length, done: 0, failed: 0, current: '', errors: [], started: Date.now(), message: '' }
	});
	apiMassRun(ids).catch((e) => console.error('JCVIQ API mass update crashed:', e));
	return { ok: true, count: ids.length };
}

async function cancelApiMassUpdate() {
	apiMassCancel = true;
	await setApiMassState({ message: 'Cancelling after the current video…' });
	return { ok: true };
}

async function apiMassRun(ids) {
	apiMassRunning = true;
	// Keeps the worker alive across long local-model calls.
	const beat = setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);
	let done = 0;
	let failed = 0;
	const errors = [];
	let message = '';
	const store = await chrome.storage.local.get(['channelProfile', 'contentType', 'watchByUrl', 'jcMassBackup']);
	const backup = store.jcMassBackup || {};
	try {
		outer:
		for (let i = 0; i < ids.length; i += 50) {
			const chunk = ids.slice(i, i + 50);
			const list = await ytFetch(`/videos?part=snippet,contentDetails&id=${chunk.join(',')}&maxResults=50`);
			const byId = new Map((list.items || []).map((v) => [v.id, v]));
			for (const id of chunk) {
				if (apiMassCancel) { message = 'Cancelled.'; break outer; }
				const v = byId.get(id);
				await setApiMassState({ current: v ? v.snippet.title : id, done, failed });
				if (!v) { failed++; errors.push(`${id}: not found`); continue; }
				try {
					const sn = v.snippet;
					const lengthSec = isoDurationSeconds(v.contentDetails && v.contentDetails.duration);
					const res = await analyze({
						videoId: id,
						title: sn.title,
						description: sn.description || '',
						tags: sn.tags || [],
						channelName: sn.channelTitle || '',
						lengthSeconds: lengthSec,
						videoUrl: `https://www.youtube.com/watch?v=${id}`,
						contentType: store.contentType || '',
						profile: store.channelProfile || {},
						watchByUrl: Boolean(store.watchByUrl),
						script: '',
						massUpdate: true
					}, (step) => { setApiMassState({ step }); });
					if (res.error || !res.optimization) {
						const err = res.error || 'The local model returned nothing usable.';
						if (/api key/i.test(err)) { message = err; break outer; }
						throw new Error(err);
					}
					if (res.optimization._truncated) throw new Error('Local model output was cut off; skipped.');
					const meta = buildApiMetadata(res.optimization, { title: sn.title, description: sn.description, tags: sn.tags }, lengthSec);
					backup[id] = { title: sn.title, description: sn.description || '', tags: sn.tags || [], categoryId: sn.categoryId, at: Date.now() };
					await chrome.storage.local.set({ jcMassBackup: backup });
					await ytFetch('/videos?part=snippet', {
						method: 'PUT',
						body: JSON.stringify({
							id,
							snippet: {
								title: meta.title,
								description: meta.description,
								tags: meta.tags,
								categoryId: sn.categoryId,
								...(sn.defaultLanguage ? { defaultLanguage: sn.defaultLanguage } : {})
							}
						})
					});
					done++;
				} catch (e) {
					if (e.quota) { message = 'YouTube daily API quota reached. Run again tomorrow for the remaining videos.'; break outer; }
					failed++;
					errors.push(`${id}: ${e.message}`);
					console.warn('JCVIQ API mass update failed for', id, e.message);
				}
			}
		}
	} catch (e) {
		message = e.quota ? 'YouTube daily API quota reached. Run again tomorrow for the remaining videos.' : (e.message || 'Mass update stopped.');
	} finally {
		clearInterval(beat);
		apiMassRunning = false;
		await setApiMassState({
			running: false, done, failed, current: '', step: '', errors: errors.slice(-20),
			message: message || `Finished: ${done} updated, ${failed} failed.`, finished: Date.now()
		});
	}
}

async function restoreApiMassBackup() {
	const { jcMassBackup = {} } = await chrome.storage.local.get('jcMassBackup');
	let restored = 0;
	for (const id of Object.keys(jcMassBackup)) {
		const b = jcMassBackup[id];
		try {
			await ytFetch('/videos?part=snippet', {
				method: 'PUT',
				body: JSON.stringify({ id, snippet: { title: b.title, description: b.description, tags: b.tags, categoryId: b.categoryId } })
			});
			delete jcMassBackup[id];
			restored++;
		} catch (e) {
			if (e.quota) break;
		}
	}
	await chrome.storage.local.set({ jcMassBackup });
	return { ok: true, restored, remaining: Object.keys(jcMassBackup).length };
}
