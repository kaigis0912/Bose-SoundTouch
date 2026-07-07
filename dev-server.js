const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const STATIC_DIR = path.join(__dirname, 'pkg', 'service', 'soundtouchweb', 'static');

// Mock Data
let devices = {
    "device_livingroom": {
        info: {
            name: "Living Room (Mock)",
            ip_address: "192.168.1.100"
        },
        status: {
            nowPlaying: {
                PlayStatus: "PLAY_STATE",
                Source: "TUNEIN",
                Artist: "Antigravity",
                Track: "Symphony of Code",
                Album: "AI Creations",
                Art: { URL: "https://picsum.photos/300/300" }
            },
            volume: {
                TargetVolume: 35,
                ActualVolume: 35,
                MuteEnabled: false
            },
            presets: {
                Preset: [
                    { ID: 1, ContentItem: { ItemName: "Chill Hits", Source: "TUNEIN" } },
                    { ID: 2, ContentItem: { ItemName: "Rock Classics", Source: "RADIO_BROWSER" } },
                    { ID: 3, ContentItem: { ItemName: "News Radio", Source: "TUNEIN" } },
                    { ID: 4, ContentItem: { ItemName: "Jazz Café", Source: "LOCAL" } },
                    { ID: 5, ContentItem: { ItemName: "Synthwave", Source: "URL" } },
                    { ID: 6, ContentItem: { ItemName: "Lo-Fi Beats", Source: "TUNEIN" } }
                ]
            },
            sources: [
                { name: "TUNEIN", status: "READY" },
                { name: "RADIO_BROWSER", status: "READY" },
                { name: "BLUETOOTH", status: "READY" },
                { name: "AUX", status: "READY" }
            ]
        }
    },
    "device_kitchen": {
        info: {
            name: "Kitchen (Mock)",
            ip_address: "192.168.1.101"
        },
        status: {
            nowPlaying: {
                PlayStatus: "PAUSE_STATE",
                Source: "BLUETOOTH",
                Artist: "Coffee Maker",
                Track: "Morning Brew",
                Album: "Kitchen Sounds",
                Art: { URL: "https://picsum.photos/300/300?random=1" }
            },
            volume: {
                TargetVolume: 20,
                ActualVolume: 20,
                MuteEnabled: false
            },
            presets: { Preset: [] },
            sources: [
                { name: "TUNEIN", status: "READY" },
                { name: "BLUETOOTH", status: "READY" }
            ]
        }
    }
};

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Normalize and route requests
    let urlPath = req.url.split('?')[0];

    // Redirect / to /app/static/index.html (or serve it)
    if (urlPath === '/' || urlPath === '/index.html') {
        fs.readFile(path.join(STATIC_DIR, 'index.html'), (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Error loading index.html');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
        return;
    }

    // Serve static assets from /app/static/...
    if (urlPath.startsWith('/app/static/')) {
        const relativePath = urlPath.replace('/app/static/', '');
        const filePath = path.join(STATIC_DIR, relativePath);
        
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
            } else {
                // simple mime-types
                let contentType = 'text/plain';
                if (filePath.endsWith('.js')) contentType = 'application/javascript';
                else if (filePath.endsWith('.css')) contentType = 'text/css';
                else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
                else if (filePath.endsWith('.ico')) contentType = 'image/x-icon';
                else if (filePath.endsWith('.png')) contentType = 'image/png';
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
        return;
    }

    // Mock REST APIs
    if (urlPath === '/api/control/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: {
                service_url: "http://localhost:3000",
                version: "v1.0.0-mock",
                repo_url: "https://github.com/gesellix/bose-soundtouch",
                commit: "mockcommit12345",
                commit_url: "#",
                date: new Date().toISOString()
            }
        }));
        return;
    }

    if (urlPath === '/api/control/devices') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: devices }));
        return;
    }

    if (urlPath.startsWith('/api/control/devices/')) {
        const parts = urlPath.split('/');
        const id = parts[4]; // e.g. "device_livingroom"
        
        if (devices[id]) {
            // Action endpoints: /api/control/devices/:id/action/:action?id=:slotId
            if (parts[5] === 'action' && parts[6]) {
                const action = parts[6];
                const queryStr = req.url.split('?')[1] || '';
                const params = new URLSearchParams(queryStr);
                const presetId = parseInt(params.get('id'), 10);

                if (action === 'preset') {
                    // Play preset
                    const preset = (devices[id].status.presets?.Preset || []).find(p => p.ID == presetId);
                    if (preset) {
                        devices[id].status.nowPlaying = {
                            playStatus: "PLAY_STATE",
                            artist: preset.ContentItem.Source,
                            track: preset.ContentItem.ItemName,
                            album: "Preset " + presetId,
                            art: "https://picsum.photos/300/300?random=" + presetId,
                            source: preset.source
                        };
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                        broadcastDevices();
                    } else {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: false, error: 'Preset slot is empty' }));
                    }
                } else if (action === 'storepreset') {
                    const presetId = parseInt(params.get('id'), 10);
                    let presetsArr = devices[id].status.presets?.Preset;
                    if (!presetsArr) {
                        presetsArr = [];
                        devices[id].status.presets = { Preset: presetsArr };
                    }
                    const presetIndex = presetsArr.findIndex(p => p.ID == presetId);
                    
                    const newItem = {
                        ID: presetId,
                        ContentItem: {
                            Source: devices[id].status.nowPlaying.Source || "TUNEIN",
                            ItemName: devices[id].status.nowPlaying.Track || "Neuer Sender"
                        }
                    };

                    if (presetIndex !== -1) {
                        presetsArr[presetIndex] = newItem;
                    } else {
                        presetsArr.push(newItem);
                    }
                    
                    devices[id].status.presets.Preset = presetsArr.sort((a, b) => a.ID - b.ID);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                    broadcastDevices();
                    return;
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
                }
                return;
            }

            // Play provider: POST /api/control/devices/:id/providers/:provider/play
            if (parts[5] === 'providers' && parts[6] && parts[7] === 'play' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    let playReq = {};
                    try {
                        playReq = JSON.parse(body);
                    } catch (e) {
                        // Fallback: parse as URL-encoded form data
                        const params = new URLSearchParams(body);
                        playReq = Object.fromEntries(params.entries());
                    }
                    const name = playReq.name || playReq.ItemName || playReq.Track || "Radio Station";
                    const source = parts[6].toUpperCase();
                    
                    devices[id].status.nowPlaying = {
                        playStatus: "PLAY_STATE",
                        artist: source,
                        track: name,
                        album: "Live Stream",
                        art: "https://picsum.photos/300/300?random=" + Math.floor(Math.random() * 100),
                        source: source
                    };
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                    broadcastDevices();
                });
                return;
            }

            // Power toggle endpoint
            if (urlPath.endsWith('/power') && req.method === 'POST') {
                const currentStatus = devices[id].status.nowPlaying.playStatus;
                devices[id].status.nowPlaying.playStatus = currentStatus === 'PLAY_STATE' ? 'PAUSE_STATE' : 'PLAY_STATE';
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                broadcastDevices();
                return;
            }
            // Volume endpoint /api/control/devices/:id/volume/:level
            if (parts[5] === 'volume' && parts[6]) {
                const level = parseInt(parts[6]);
                devices[id].status.volume.targetvolume = level;
                devices[id].status.volume.actualvolume = level;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
                broadcastDevices();
                return;
            }
            // Return specific device
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, data: devices[id] }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'Device not found' }));
        }
        return;
    }

    // Mock TuneIn Navigate: GET /api/control/providers/tunein/navigate
    if (urlPath.startsWith('/api/control/providers/tunein/navigate')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: {
                bmx_sections: [
                    {
                        name: "Popular Stations",
                        items: [
                            {
                                name: "Deutschlandfunk",
                                imageUrl: "https://cdn-profiles.tunein.com/s24878/images/logod.png",
                                subtitle: "News & Talk",
                                _links: {
                                    bmx_playback: { href: "http://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3", type: "stationurl" }
                                }
                            },
                            {
                                name: "Antenne Bayern",
                                imageUrl: "https://cdn-profiles.tunein.com/s22519/images/logod.png",
                                subtitle: "Pop · Munich",
                                _links: {
                                    bmx_playback: { href: "http://stream.antenne.de/antenne/stream/mp3", type: "stationurl" }
                                }
                            },
                            {
                                name: "WDR 2",
                                imageUrl: "https://cdn-profiles.tunein.com/s56559/images/logod.png",
                                subtitle: "Pop · Cologne",
                                _links: {
                                    bmx_playback: { href: "http://wdr-wdr2-rheinland.icecast.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3", type: "stationurl" }
                                }
                            },
                            {
                                name: "Rock Antenne",
                                imageUrl: "https://cdn-profiles.tunein.com/s108282/images/logod.png",
                                subtitle: "Rock · Ismaning",
                                _links: {
                                    bmx_playback: { href: "http://stream.rockantenne.de/rockantenne/stream/mp3", type: "stationurl" }
                                }
                            }
                        ],
                        _links: {}
                    },
                    {
                        name: "Categories",
                        items: [
                            {
                                name: "Music",
                                subtitle: "Browse music stations",
                                _links: { bmx_navigate: { href: "/v1/navigate/music" } }
                            },
                            {
                                name: "News & Talk",
                                subtitle: "Browse news stations",
                                _links: { bmx_navigate: { href: "/v1/navigate/talk" } }
                            },
                            {
                                name: "Sports",
                                subtitle: "Browse sports stations",
                                _links: { bmx_navigate: { href: "/v1/navigate/sports" } }
                            },
                            {
                                name: "Podcasts",
                                subtitle: "Browse popular podcasts",
                                _links: { bmx_navigate: { href: "/v1/navigate/podcasts" } }
                            }
                        ],
                        _links: {}
                    }
                ]
            }
        }));
        return;
    }

    // Mock TuneIn Search: GET /api/control/providers/tunein/search
    if (urlPath.startsWith('/api/control/providers/tunein/search')) {
        const queryStr = req.url.split('?')[1] || '';
        const params = new URLSearchParams(queryStr);
        const q = (params.get('q') || '').toLowerCase();
        const allStations = [
            { name: "Deutschlandfunk", imageUrl: "https://cdn-profiles.tunein.com/s24878/images/logod.png", subtitle: "News & Talk", stream: "http://st01.sslstream.dlf.de/dlf/01/128/mp3/stream.mp3" },
            { name: "Antenne Bayern", imageUrl: "https://cdn-profiles.tunein.com/s22519/images/logod.png", subtitle: "Pop · Munich", stream: "http://stream.antenne.de/antenne/stream/mp3" },
            { name: "WDR 2", imageUrl: "https://cdn-profiles.tunein.com/s56559/images/logod.png", subtitle: "Pop · Cologne", stream: "http://wdr-wdr2-rheinland.icecast.wdr.de/wdr/wdr2/rheinland/mp3/128/stream.mp3" },
            { name: "Rock Antenne", imageUrl: "https://cdn-profiles.tunein.com/s108282/images/logod.png", subtitle: "Rock · Ismaning", stream: "http://stream.rockantenne.de/rockantenne/stream/mp3" },
            { name: "SWR3", imageUrl: "https://cdn-profiles.tunein.com/s24896/images/logod.png", subtitle: "Pop · Baden-Baden", stream: "http://swr-swr3-live.cast.addradio.de/swr/swr3/live/mp3/128/stream.mp3" },
            { name: "1LIVE", imageUrl: "https://cdn-profiles.tunein.com/s56460/images/logod.png", subtitle: "Pop · Cologne", stream: "http://wdr-1live-live.icecast.wdr.de/wdr/1live/live/mp3/128/stream.mp3" },
            { name: "NDR 2", imageUrl: "https://cdn-profiles.tunein.com/s25090/images/logod.png", subtitle: "Pop · Hamburg", stream: "http://ndr-ndr2-niedersachsen.cast.addradio.de/ndr/ndr2/niedersachsen/mp3/128/stream.mp3" },
            { name: "Bayern 3", imageUrl: "https://cdn-profiles.tunein.com/s15033/images/logod.png", subtitle: "Pop · Munich", stream: "http://dispatcher.rndfnk.com/br/br3/live/mp3/mid" },
        ];
        const filtered = allStations.filter(s => s.name.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: {
                bmx_sections: [{
                    name: `Search results for "${params.get('q') || ''}"`,
                    items: filtered.map(s => ({
                        name: s.name,
                        imageUrl: s.imageUrl,
                        subtitle: s.subtitle,
                        _links: { bmx_playback: { href: s.stream, type: "stationurl" } }
                    })),
                    _links: {}
                }]
            }
        }));
        return;
    }

    // Mock RadioBrowser Search: GET /api/control/providers/radiobrowser/search
    if (urlPath.startsWith('/api/control/providers/radiobrowser/search')) {
        const queryStr = req.url.split('?')[1] || '';
        const params = new URLSearchParams(queryStr);
        const q = (params.get('q') || '').toLowerCase();
        const allStations = [
            { name: "SWR3", subtitle: "Pop · Baden-Baden · Germany", imageUrl: "https://cdn-profiles.tunein.com/s24896/images/logod.png", stream: "http://swr-swr3-live.cast.addradio.de/swr/swr3/live/mp3/128/stream.mp3" },
            { name: "1LIVE", subtitle: "Pop · Cologne · Germany", imageUrl: "https://cdn-profiles.tunein.com/s56460/images/logod.png", stream: "http://wdr-1live-live.icecast.wdr.de/wdr/1live/live/mp3/128/stream.mp3" },
            { name: "NDR 2", subtitle: "Pop · Hamburg · Germany", imageUrl: "https://cdn-profiles.tunein.com/s25090/images/logod.png", stream: "http://ndr-ndr2-niedersachsen.cast.addradio.de/ndr/ndr2/niedersachsen/mp3/128/stream.mp3" },
            { name: "FluxFM", subtitle: "Alternative · Berlin · Germany", imageUrl: "https://cdn-profiles.tunein.com/s93549/images/logod.png", stream: "http://streams.fluxfm.de/live/mp3-320/audio/" },
            { name: "Klassik Radio", subtitle: "Classical · Hamburg · Germany", imageUrl: "https://cdn-profiles.tunein.com/s24878/images/logod.png", stream: "http://stream.klassikradio.de/live/mp3-192/stream.klassikradio.de/" },
            { name: "Radio BOB!", subtitle: "Rock · Kassel · Germany", imageUrl: "https://cdn-profiles.tunein.com/s108282/images/logod.png", stream: "http://bob.hoerradar.de/radiobob-live-mp3-hq" },
            { name: "Sunshine Live", subtitle: "Electronic · Mannheim · Germany", imageUrl: "https://cdn-profiles.tunein.com/s22519/images/logod.png", stream: "http://sunshinelive.hoerradar.de/sunshinelive-live-mp3-hq" },
            { name: "BBC Radio 1", subtitle: "Pop · London · UK", imageUrl: "https://cdn-profiles.tunein.com/s24939/images/logod.png", stream: "http://stream.live.vc.bbcmedia.co.uk/bbc_radio_one" },
        ];
        const filtered = q ? allStations.filter(s => s.name.toLowerCase().includes(q) || s.subtitle.toLowerCase().includes(q)) : allStations;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            data: {
                bmx_sections: [{
                    name: q ? `Results for "${params.get('q')}"` : "Popular Stations",
                    items: filtered.map(s => ({
                        name: s.name,
                        imageUrl: s.imageUrl,
                        subtitle: s.subtitle,
                        _links: { bmx_playback: { href: s.stream, type: "stationurl" } }
                    })),
                    _links: {}
                }]
            }
        }));
        return;
    }

    // Default response for other API routes
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, message: "Mock response" }));
});

// Create WebSocket server fallback or helper
// Since we don't have ws installed, we'll try to run the server.
// If the user wants websockets to work, we can require 'ws'.
// Let's implement a clean upgrade handler with the 'ws' package.
// If 'ws' is not installed, we can fall back to standard HTTP.
let wss;
try {
    const WebSocket = require('ws');
    wss = new WebSocket.Server({ noServer: true });
    
    wss.on('connection', (ws) => {
        console.log('WS Client connected');
        // Immediately send devices list
        ws.send(JSON.stringify({ type: 'devices', data: devices }));
        ws.send(JSON.stringify({ type: 'discovery_status', data: { isDiscovering: false, status: 'completed', deviceCount: 2 } }));
    });
    
    server.on('upgrade', (request, socket, head) => {
        if (request.url === '/api/control/ws') {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit('connection', ws, request);
            });
        } else {
            socket.destroy();
        }
    });
} catch (e) {
    console.warn("WebSocket ('ws') module not found. Run 'npm install ws' to enable live updates.");
}

function broadcastDevices() {
    if (wss) {
        wss.clients.forEach(client => {
            if (client.readyState === 1) { // OPEN
                client.send(JSON.stringify({ type: 'devices', data: devices }));
            }
        });
    }
}

server.listen(PORT, () => {
    console.log(`\n🚀 Mock Dev Server running at http://localhost:${PORT}\n`);
});
