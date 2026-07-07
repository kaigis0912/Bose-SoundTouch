import { h, render } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import htm from 'htm';
import { api } from './api.js';

const html = htm.bind(h);

// ── Icons (Hinge / Clean Minimalist Style) ──
const IconPlay = () => html`<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const IconPause = () => html`<svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const IconMusic = () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
const IconSearch = () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;
const IconGrid = () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`;
const IconPlus = () => html`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
const IconVolDown = () => html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon></svg>`;
const IconVolUp = () => html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;


// ── Helper: flatten bmx_sections for RadioBrowser ──
function flattenSections(data) {
    if (!data?.bmx_sections) return [];
    return data.bmx_sections.flatMap(section =>
        (section.items || []).map(item => ({ ...item, _sectionName: section.name }))
    );
}

// ── Helper: get cached radio logo ──
function getRadioLogo(np) {
    if (!np) return '';
    const name = np.stationName || np.StationName || np.ContentItem?.ItemName || np.itemName || '';
    if (!name) return '';
    return localStorage.getItem('radio-logo-' + name.toLowerCase().trim()) || '';
}

// ═══════════════════════════════════════════════════════════
// Tab 1: Player
// ═══════════════════════════════════════════════════════════
function PlayerTab({ deviceId, device }) {
    const serverVol = device?.status?.volume?.ActualVolume ?? 30;
    const [localVol, setLocalVol] = useState(serverVol);
    const [isDragging, setIsDragging] = useState(false);
    const [bgLogo, setBgLogo] = useState('');

    useEffect(() => {
        if (!isDragging) {
            setLocalVol(serverVol);
        }
    }, [serverVol, isDragging]);

    if (!device) return html`<div class="v2-empty">Lautsprecher wird verbunden...</div>`;

    const np = device.status?.nowPlaying;
    const stationName = np?.stationName || np?.StationName || np?.ContentItem?.ItemName || np?.itemName || '';

    // Background logo lookup
    useEffect(() => {
        if (!stationName) {
            setBgLogo('');
            return;
        }
        const cacheKey = 'radio-logo-' + stationName.toLowerCase().trim();
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            setBgLogo(cached);
            return;
        }

        // If not in cache, search in background
        setBgLogo('');
        api.radioBrowserSearch(stationName).then(resp => {
            if (resp.success) {
                const items = flattenSections(resp.data);
                const match = items.find(item => item.name?.toLowerCase().trim() === stationName.toLowerCase().trim()) || items[0];
                if (match && match.imageUrl) {
                    localStorage.setItem(cacheKey, match.imageUrl);
                    setBgLogo(match.imageUrl);
                }
            }
        }).catch(err => {
            console.error('[Logo Lookup] Failed', err);
        });
    }, [stationName]);

    const isPlaying = np?.PlayStatus === 'PLAY_STATE';
    const artist = np?.Artist || np?.artist || '';
    const track = np?.Track || np?.track || np?.StationName || '';
    const cachedLogo = getRadioLogo(np);
    const art = np?.Art?.URL || np?.art || bgLogo || cachedLogo || '';
    const source = np?.Source || np?.source || '';
    const isRadio = source === 'RADIO_BROWSER' || source === 'TUNEIN';
    const displaySubText = isRadio ? (np?.Track || 'Web Radio') : (artist || source || '—');

    return html`
        <div class="v2-player">
            ${art ? html`<img class="v2-player-art" src=${art} alt="" />` : html`<div class="v2-player-art-placeholder"><${IconMusic} /></div>`}
            
            <div class="v2-player-info">
                <div class="v2-player-track">${track || 'Keine Wiedergabe'}</div>
                <div class="v2-player-artist">${displaySubText}</div>
            </div>

            <div class="v2-player-controls">
                <button class="v2-big-btn v2-play-btn" onClick=${() => api.key(deviceId, isPlaying ? 'PAUSE' : 'PLAY')}>
                    ${isPlaying ? html`<${IconPause} />` : html`<${IconPlay} />`}
                </button>
            </div>

            <div class="v2-vol-row">
                <span class="v2-vol-icon" onClick=${() => api.volume(deviceId, Math.max(0, serverVol - 5))}><${IconVolDown} /></span>
                <input 
                    type="range" 
                    class="v2-vol-slider" 
                    min="0" max="100" 
                    value=${localVol} 
                    onMouseDown=${() => setIsDragging(true)}
                    onTouchStart=${() => setIsDragging(true)}
                    onMouseUp=${() => setIsDragging(false)}
                    onTouchEnd=${() => setIsDragging(false)}
                    onInput=${e => {
                        setLocalVol(e.target.value);
                        api.volume(deviceId, e.target.value);
                    }} 
                />
                <span class="v2-vol-icon" onClick=${() => api.volume(deviceId, Math.min(100, serverVol + 5))}><${IconVolUp} /></span>
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════
// Tab 2: Search (Spotify button + RadioBrowser)
// ═══════════════════════════════════════════════════════════
function SearchTab({ deviceId, device }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [playingName, setPlayingName] = useState(null);

    async function doSearch() {
        if (!query.trim()) return;
        setLoading(true);
        const resp = await api.radioBrowserSearch(query);
        setLoading(false);
        if (resp.success) {
            const items = flattenSections(resp.data);
            items.forEach(item => {
                if (item.name && item.imageUrl) {
                    localStorage.setItem('radio-logo-' + item.name.toLowerCase().trim(), item.imageUrl);
                }
            });
            setResults(items);
        }
    }

    async function playStation(item) {
        const play = item._links?.bmx_playback;
        if (!play || !deviceId) return;
        if (item.name && item.imageUrl) {
            localStorage.setItem('radio-logo-' + item.name.toLowerCase().trim(), item.imageUrl);
        }
        setPlayingName(item.name);
        await api.radioBrowserPlay(deviceId, {
            location: play.href,
            type: play.type,
            name: item.name
        });
        setTimeout(() => setPlayingName(null), 2000);
    }

    return html`
        <div class="v2-search">
            <a href="https://open.spotify.com" target="_blank" rel="noopener noreferrer" class="v2-spotify-btn">
                Spotify öffnen
            </a>

            <div class="v2-search-box">
                <div class="v2-search-icon-wrapper">
                    <${IconSearch} />
                </div>
                <input
                    type="text"
                    class="v2-search-input"
                    placeholder="Sender suchen..."
                    value=${query}
                    onInput=${(e) => setQuery(e.target.value)}
                    onKeyDown=${(e) => { if (e.key === 'Enter') doSearch(); }}
                />
            </div>

            ${loading ? html`<div class="v2-loading">Suche läuft...</div>` : null}

            <div class="v2-results">
                ${results.map((item, i) => html`
                    <button
                        key=${i}
                        class="v2-result-item ${playingName === item.name ? 'playing' : ''}"
                        onClick=${() => playStation(item)}
                    >
                        ${item.imageUrl ? html`<img class="v2-result-img" src=${item.imageUrl} alt="" />` : html`<div class="v2-result-img-placeholder"><${IconMusic} /></div>`}
                        <div class="v2-result-info">
                            <div class="v2-result-name">${item.name}</div>
                            ${item.subtitle ? html`<div class="v2-result-sub">${item.subtitle}</div>` : null}
                        </div>
                    </button>
                `)}
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════
// Tab 3: Presets
// ═══════════════════════════════════════════════════════════
function PresetsTab({ deviceId, device }) {
    const timerRef = useRef(null);
    const didLongPress = useRef(false);
    const [fillingId, setFillingId] = useState(null);

    if (!device) return html`<div class="v2-empty">Lautsprecher wird verbunden...</div>`;

    const presets = device.status?.presets?.Preset ?? [];
    const np = device.status?.nowPlaying;
    const canSave = !!(np?.Source && np.Source !== 'STANDBY');

    const byId = Object.fromEntries(presets.map(p => [p.ID, p]));
    const slots = [1, 2, 3, 4, 5, 6].map(id => byId[id] ?? { ID: id, ContentItem: null });

    function playPreset(slotId) {
        // Don't play if we just did a long-press save
        if (didLongPress.current) {
            didLongPress.current = false;
            return;
        }
        api.control(deviceId, 'preset', slotId);
    }

    function startPress(slotId, e) {
        if (!canSave) return;
        if (e.type === 'mousedown' && e.button !== 0) return;
        didLongPress.current = false;
        setFillingId(slotId);
        timerRef.current = setTimeout(() => {
            didLongPress.current = true;
            api.storePreset(deviceId, slotId);
            setFillingId(null);
        }, 1500);
    }

    function cancelPress() {
        if (timerRef.current) clearTimeout(timerRef.current);
        setFillingId(null);
    }

    // Cleanup timer on unmount
    useEffect(() => {
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    return html`
        <div class="v2-presets">
            <div class="v2-preset-grid">
                ${slots.map(slot => {
                    const item = slot.ContentItem;
                    const isEmpty = !item;
                    const name = item?.ItemName || '';
                    const isFilling = fillingId === slot.ID;

                    return html`
                        <div class="v2-preset-card" key=${slot.ID}>
                            <button
                                class="v2-preset-btn ${isEmpty ? 'empty' : ''} ${isFilling ? 'filling' : ''}"
                                onClick=${() => !isEmpty && playPreset(slot.ID)}
                                onMouseDown=${(e) => startPress(slot.ID, e)}
                                onMouseUp=${cancelPress}
                                onMouseLeave=${cancelPress}
                                onTouchStart=${(e) => startPress(slot.ID, e)}
                                onTouchEnd=${cancelPress}
                                onTouchCancel=${cancelPress}
                            >
                                <span class="v2-preset-num">${slot.ID}</span>
                                ${isEmpty ? html`<span class="v2-preset-icon"><${IconPlus} /></span>` : html`<span class="v2-preset-name">${name}</span>`}
                            </button>
                        </div>
                    `;
                })}
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════
// Main App
// ═══════════════════════════════════════════════════════════
function App() {
    const [devices, setDevices] = useState({});
    const [tab, setTab] = useState('player');
    const [selectedId, setSelectedId] = useState(null);
    const [toast, setToast] = useState(null);

    // Auto-select first device
    useEffect(() => {
        const ids = Object.keys(devices);
        if (ids.length > 0 && (!selectedId || !devices[selectedId])) {
            setSelectedId(ids[0]);
        }
    }, [devices]);

    // Hardware Volume Buttons / Keyboard Support
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in a text field (Search box)
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
            
            if (!selectedId || !devices[selectedId]) return;
            const currentVol = devices[selectedId].status?.volume?.ActualVolume ?? 30;
            
            // Check for VolumeUp/VolumeDown (Android Webview / Chrome) or Arrow keys (Desktop)
            if (e.key === 'VolumeUp' || e.keyCode === 24 || e.key === 'ArrowUp') {
                e.preventDefault();
                api.volume(selectedId, Math.min(100, currentVol + 5));
            } else if (e.key === 'VolumeDown' || e.keyCode === 25 || e.key === 'ArrowDown') {
                e.preventDefault();
                api.volume(selectedId, Math.max(0, currentVol - 5));
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, devices]);

    // WebSocket connection
    useEffect(() => {
        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${location.host}/api/control/ws`);
        let reconnectTimer;

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'devices') {
                setDevices(msg.data || {});
            } else if (msg.type === 'status_update' && msg.deviceId) {
                setDevices(prev => {
                    if (!prev[msg.deviceId]) return prev;
                    return { ...prev, [msg.deviceId]: { ...prev[msg.deviceId], status: msg.data } };
                });
            }
        };

        ws.onerror = () => console.error('[WS] Connection error');
        ws.onclose = () => {
            console.warn('[WS] Closed. Retrying in 5s…');
            reconnectTimer = setTimeout(() => location.reload(), 5000);
        };

        return () => { clearTimeout(reconnectTimer); ws.close(); };
    }, []);

    const deviceEntries = Object.entries(devices);
    const device = selectedId ? devices[selectedId] : null;

    return html`
        <div class="app">
            <header class="app-header">
                <div class="brand">
                    <span class="brand-name">ReTouch</span>
                </div>
                ${deviceEntries.length > 1 ? html`
                    <select
                        class="v2-device-select"
                        value=${selectedId}
                        onChange=${(e) => setSelectedId(e.target.value)}
                    >
                        ${deviceEntries.map(([id, d]) => html`
                            <option value=${id}>${d.info?.name || id}</option>
                        `)}
                    </select>
                ` : null}
            </header>

            <main class="main-content">
                ${tab === 'player' ? html`
                    <${PlayerTab} deviceId=${selectedId} device=${device} />
                ` : tab === 'search' ? html`
                    <${SearchTab} deviceId=${selectedId} device=${device} />
                ` : tab === 'presets' ? html`
                    <${PresetsTab} deviceId=${selectedId} device=${device} />
                ` : null}
            </main>

            <nav class="navbar v2-nav">
                <div class="nav-links">
                    <a href="#" class="${tab === 'player' ? 'active' : ''}"
                        onClick=${(e) => { e.preventDefault(); setTab('player'); }}>
                        <span class="v2-nav-icon"><${IconMusic} /></span>
                    </a>
                    <a href="#" class="${tab === 'search' ? 'active' : ''}"
                        onClick=${(e) => { e.preventDefault(); setTab('search'); }}>
                        <span class="v2-nav-icon"><${IconSearch} /></span>
                    </a>
                    <a href="#" class="${tab === 'presets' ? 'active' : ''}"
                        onClick=${(e) => { e.preventDefault(); setTab('presets'); }}>
                        <span class="v2-nav-icon"><${IconGrid} /></span>
                    </a>
                </div>
            </nav>

            ${toast ? html`<div class="toast" key="toast">${toast}</div>` : null}
        </div>
    `;
}

render(html`<${App} />`, document.getElementById('app'));
