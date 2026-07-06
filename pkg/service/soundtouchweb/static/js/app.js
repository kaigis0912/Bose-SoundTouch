import { h, render } from 'preact';
import { useState, useEffect, useCallback } from 'preact/hooks';
import htm from 'htm';
import { DeviceList } from './components/DeviceList.js';
import { NowPlaying } from './components/NowPlaying.js';
import { Controls } from './components/Controls.js';
import { Presets } from './components/Presets.js';
import { Sources } from './components/Sources.js';
import { Zone } from './components/Zone.js';
import { Recents } from './components/Recents.js';
import { TuneInBrowser } from './components/TuneInBrowser.js';
import { RadioBrowser } from './components/RadioBrowser.js';
import { Library } from './components/Library.js';
import { PlayURL } from './components/PlayURL.js';
import { TTS } from './components/TTS.js';
import { api } from './api.js';

const html = htm.bind(h);

function DeviceDetail({ deviceId, devices, onBack }) {
    const device = devices[deviceId];
    if (!device) return null;

    const np = device.status?.nowPlaying;
    const artUrl = np?.art || np?.Art?.URL || '';
    const stationName = np?.StationName || np?.Track || np?.Source || 'SoundTouch';
    const sourceName = np?.Source || '';

    // If there is an album art, use it for the blurred background, else generic blue gradient
    const bgStyle = artUrl ? `background-image: url('${artUrl}')` : `background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)`;

    return html`
        <div class="device-detail-wrapper">
            <div class="device-detail-bg" style=${bgStyle}></div>
            
            <div class="device-detail-topbar">
                <div class="station">${stationName}</div>
                <div class="source">${sourceName}</div>
                <div class="pause-icon" onClick=${() => api.power(deviceId)}>${np?.PlayStatus === 'PLAY_STATE' ? '⏸' : '▶'}</div>
            </div>

            <div class="device-detail-sheet">
                <div class="sheet-header">
                    <button class="back-btn" onClick=${onBack}>˅</button>
                    <div class="sheet-title">${device.info?.name || 'SoundTouch'}</div>
                    <button class="power-btn" onClick=${() => api.power(deviceId)}>⏻</button>
                </div>
                
                <${NowPlaying} nowPlaying=${np} deviceId=${deviceId} presets=${device.status?.presets} />
                <${Controls} deviceId=${deviceId} status=${device.status} />
                <${Zone} deviceId=${deviceId} devices=${devices} />
                
                <${Presets} deviceId=${deviceId} status=${device.status} />
                <${Sources} deviceId=${deviceId} status=${device.status} />
                <${Recents} deviceId=${deviceId} />
            </div>
        </div>
    `;
}

function MusicSources({ onNavigate }) {
    const sources = [
        { id: 'tunein', name: 'TuneIn Radio', icon: '📻', desc: 'Suchen und Abspielen von globalen Radiosendern' },
        { id: 'radiobrowser', name: 'Radio Browser', icon: '🌍', desc: 'Kostenloses, offenes Radio-Verzeichnis mit über 30.000 Sendern' },
        { id: 'library', name: 'Music Library', icon: '💾', desc: 'Lokale Musikdateien von deinem Server' },
        { id: 'playurl', name: 'Play URL', icon: '🔗', desc: 'Einen direkten Audio-Stream abspielen' }
    ];

    return html`
        <div class="music-sources-container" style="max-width:600px; margin:0 auto; padding: 1rem 1.5rem;">
            <a href="spotify:" class="btn-pill-dark" style="display:flex; align-items:center; justify-content:center; text-decoration:none; width: 100%; margin: 0 0 2rem 0; background: #1DB954 !important; color: black !important; font-weight: bold; box-shadow: 0 4px 12px rgba(29,185,84,0.3) !important;">
                Spotify
            </a>
            
            <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem;">Weitere Quellen:</div>
            
            <div class="device-grid">
                ${sources.map(src => html`
                    <button class="device-card" onClick=${() => onNavigate(src.id)} key=${src.id} style="margin-bottom: 0.5rem;">
                        <div class="device-card-icon" style="font-size:1.5rem; color: var(--text);">${src.icon}</div>
                        <div class="device-header">
                            <div class="device-info">
                                <div class="device-name">${src.name}</div>
                                <div class="device-type" style="font-size:0.75rem; line-height: 1.3;">${src.desc}</div>
                            </div>
                            <div class="device-chevron">›</div>
                        </div>
                    </button>
                `)}
            </div>
        </div>
    `;
}

function SpotifyInfo({ onBack }) {
    return html`
        <div class="spotify-info-page" style="max-width: 600px; margin: 0 auto; text-align: center; padding: 2rem 1.5rem;">
            <div style="font-size: 5rem; margin-bottom: 1.5rem;">🎵</div>
            <h2 style="font-weight: 800; margin-bottom: 1rem;">Spotify Connect</h2>
            <p style="color: var(--text-dim); line-height: 1.6; margin-bottom: 2rem;">
                Your SoundTouch speakers support Spotify Connect. To play music, simply open the official <strong>Spotify app</strong> on your phone or computer, select the Devices menu, and choose your SoundTouch speaker.
            </p>
            <button class="btn-pill-dark" onClick=${onBack} style="width: auto; padding: 0.8rem 2rem;">Back to Sources</button>
        </div>
    `;
}

function PresetsPage({ devices, selectedId, onSelectDevice }) {
    const deviceEntries = Object.entries(devices);
    if (deviceEntries.length === 0) {
        return html`<p style="text-align:center; padding:3rem;">No speakers found. Ensure discovery is running.</p>`;
    }

    const currentId = selectedId || deviceEntries[0][0];
    const device = devices[currentId];

    return html`
        <div class="presets-page-container" style="max-width:600px; margin:0 auto; padding: 1rem 1.5rem;">
            <div class="device-selector" style="margin-bottom: 1.5rem;">
                <label style="font-size: 0.8rem; color: var(--text-dim); display: block; margin-bottom: 0.5rem;">Select Speaker:</label>
                <select 
                    value=${currentId} 
                    onChange=${(e) => onSelectDevice(e.target.value)}
                    style="width: 100%; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--border); background: var(--surface); color: var(--text);"
                >
                    ${deviceEntries.map(([id, dev]) => html`
                        <option value=${id}>${dev.info?.name || id}</option>
                    `)}
                </select>
            </div>
            
            ${device ? html`
                <${Presets} deviceId=${currentId} status=${device.status} />
            ` : html`<p>Select a speaker to view presets.</p>`}
        </div>
    `;
}

function App() {
    const [devices, setDevices] = useState({});
    const [page, setPage] = useState('devices');
    const [selectedId, setSelectedId] = useState(null);
    const [toast, setToast] = useState(null);
    const [version, setVersion] = useState(null);
    const [isDiscovering, setIsDiscovering] = useState(false);

    useEffect(() => {
        fetch('/api/control/version')
            .then(res => res.json())
            .then(resp => {
                if (resp.success) {
                    setVersion(resp.data);
                }
            })
            .catch(err => console.error('Failed to fetch version:', err));

        const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${location.host}/api/control/ws`);
        let reconnectTimer;

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'devices') {
                setDevices(msg.data || {});
            } else if (msg.type === 'discovery_status') {
                console.log('[DEBUG_LOG] discovery_status:', msg.data);
                if (msg.data?.isDiscovering !== undefined) {
                    setIsDiscovering(msg.data.isDiscovering);
                } else if (msg.data?.status === 'starting') {
                    setIsDiscovering(true);
                } else if (msg.data?.status === 'completed') {
                    setIsDiscovering(false);
                }

                if (msg.data?.status === 'completed') {
                    showToast(`Found ${msg.data.deviceCount} device(s)`);
                }
            } else if (msg.type === 'status_update' && msg.deviceId) {
                setDevices(prev => {
                    if (!prev[msg.deviceId]) return prev;
                    return {
                        ...prev,
                        [msg.deviceId]: { ...prev[msg.deviceId], status: msg.data },
                    };
                });
            }
        };

        ws.onerror = (err) => {
            console.error('[WebSocket] Connection error. Backend might be unreachable.');
        };

        ws.onclose = () => {
            console.warn('[WebSocket] Connection closed. Retrying in 5s...');
            reconnectTimer = setTimeout(() => location.reload(), 5000);
        };

        return () => {
            clearTimeout(reconnectTimer);
            ws.close();
        };
    }, []);

    function showToast(msg) {
        setToast(null);
        setTimeout(() => setToast(msg), 10);
        setTimeout(() => setToast(null), 3000);
    }

    const navigate = useCallback((p, id = null) => {
        setPage(p);
        setSelectedId(id);
    }, []);

    async function discover() {
        showToast('Discovering devices…');
        await api.discover();
    }

    async function removeDevice(id) {
        const name = devices[id]?.info?.name || id;
        if (!confirm(`Remove "${name}"?\n\nThis clears it from AfterTouch. A device still online may reappear after the next discovery scan.`)) {
            return;
        }
        setDevices(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        try {
            const resp = await api.removeDevice(id);
            showToast(resp?.success ? `Removed "${name}"` : (resp?.error || 'Failed to remove device'));
        } catch (err) {
            showToast('Failed to remove device');
        }
    }

    const isSpotifyTab = ['spotify', 'spotify-info', 'tunein', 'radiobrowser', 'library', 'playurl'].includes(page);

    return html`
        <div class="app">
            ${page !== 'device' ? html`
                <header class="app-header">
                    <div class="brand">
                        <span class="brand-name">ReTouch</span>
                    </div>
                </header>
            ` : null}
            <main class="main-content">
                ${page === 'devices' ? html`
                    <${DeviceList}
                        key="device-list"
                        devices=${devices}
                        isDiscovering=${isDiscovering}
                        onSelect=${(id) => navigate('device', id)}
                        onDiscover=${discover}
                        onRemove=${removeDevice}
                    />
                ` : page === 'device' ? html`
                    <${DeviceDetail}
                        key="device-detail"
                        deviceId=${selectedId}
                        devices=${devices}
                        onBack=${() => navigate('devices')}
                    />
                ` : page === 'spotify' ? html`
                    <${MusicSources} key="music-sources" onNavigate=${(id) => navigate(id)} />
                ` : page === 'spotify-info' ? html`
                    <${SpotifyInfo} key="spotify-info" onBack=${() => navigate('spotify')} />
                ` : page === 'tunein' ? html`
                    <div>
                        <button class="btn-pill-light" onClick=${() => navigate('spotify')} style="margin: 0 1.5rem 1rem; width: auto; display: inline-flex;">← Back to Sources</button>
                        <${TuneInBrowser} key="tunein-browser" devices=${devices} />
                    </div>
                ` : page === 'radiobrowser' ? html`
                    <div>
                        <button class="btn-pill-light" onClick=${() => navigate('spotify')} style="margin: 0 1.5rem 1rem; width: auto; display: inline-flex;">← Back to Sources</button>
                        <${RadioBrowser} key="radiobrowser-browser" devices=${devices} />
                    </div>
                ` : page === 'library' ? html`
                    <div>
                        <button class="btn-pill-light" onClick=${() => navigate('spotify')} style="margin: 0 1.5rem 1rem; width: auto; display: inline-flex;">← Back to Sources</button>
                        <${Library} key="library" devices=${devices} />
                    </div>
                ` : page === 'playurl' ? html`
                    <div>
                        <button class="btn-pill-light" onClick=${() => navigate('spotify')} style="margin: 0 1.5rem 1rem; width: auto; display: inline-flex;">← Back to Sources</button>
                        <${PlayURL} key="play-url" devices=${devices} serverServiceUrl=${version?.service_url || ''} />
                    </div>
                ` : page === 'presets-tab' ? html`
                    <${PresetsPage} key="presets-page" devices=${devices} selectedId=${selectedId} onSelectDevice=${(id) => setSelectedId(id)} />
                ` : page === 'tts' ? html`
                    <${TTS} key="tts" devices=${devices} serverServiceUrl=${version?.service_url || ''} />
                ` : null}
            </main>

            <nav class="navbar">
                <div class="nav-links">
                    <a href="#" class="${(page === 'devices' || page === 'device') ? 'active' : ''}"
                        onClick=${(e) => { e.preventDefault(); navigate('devices'); }}
                    >
                        <img src="/app/static/img/speaker-mono.svg" alt="" class="nav-device-icon" />
                    </a>
                    <a href="#" class="${isSpotifyTab ? 'active' : ''}"
                        onClick=${(e) => { e.preventDefault(); navigate('spotify'); }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M9 18V5l12-2v13"></path>
                            <circle cx="6" cy="18" r="3"></circle>
                            <circle cx="18" cy="16" r="3"></circle>
                        </svg>
                    </a>
                    <a href="#" class="${page === 'presets-tab' ? 'active' : ''}"
                        onClick=${(e) => { e.preventDefault(); navigate('presets-tab'); }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="7" y="2" width="10" height="20" rx="2" ry="2"></rect>
                            <line x1="12" y1="6" x2="12" y2="6.01"></line>
                            <line x1="12" y1="10" x2="12" y2="10.01"></line>
                            <line x1="12" y1="14" x2="12" y2="14.01"></line>
                            <circle cx="12" cy="18" r="1"></circle>
                        </svg>
                    </a>
                    <a href="#" class="${page === 'tts' ? 'active' : ''}"
                        onClick=${(e) => { e.preventDefault(); navigate('tts'); }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                    </a>
                </div>
            </nav>

            ${toast ? html`<div class="toast" key="toast">${toast}</div>` : null}
        </div>
    `;
}

render(html`<${App} />`, document.getElementById('app'));
