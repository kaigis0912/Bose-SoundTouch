import { h } from 'preact';
import htm from 'htm';

const html = htm.bind(h);

function DeviceCard({ id, device, onSelect, onRemove }) {
    const { info, status } = device;

    return html`
        <button class="device-card" onClick=${() => onSelect(id)}>
            <div class="device-header">
                <div class="device-info">
                    <div class="device-name">${info?.name || id}</div>
                    <div class="device-type">${info?.type || 'SoundTouch'}</div>
                </div>
                <div class="device-chevron">›</div>
            </div>
        </button>
    `;
}

export function DeviceList({ devices, isDiscovering, onSelect, onDiscover, onRemove }) {
    const entries = Object.entries(devices);

    return html`
        <div class="device-list-container">
            ${entries.length === 0
                ? html`
                    <div class="empty-state" key="empty">
                        <div class="empty-icon ${isDiscovering ? 'radiating' : ''}">◉</div>
                        <p>${isDiscovering ? 'Searching for devices...' : 'No devices found on your network.'}</p>
                    </div>`
                : html`
                    <div class="device-grid" key="grid">
                        ${entries.map(([id, device]) => html`
                            <${DeviceCard} key=${id} id=${id} device=${device} onSelect=${onSelect} onRemove=${onRemove} />
                        `)}
                    </div>`
            }
            <button class="fab-discover ${isDiscovering ? 'buzzing' : ''}" onClick=${onDiscover} title="Discover">
                +
            </button>
        </div>
    `;
}
