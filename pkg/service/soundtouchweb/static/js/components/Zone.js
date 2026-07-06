import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import htm from 'htm';
import { api } from '../api.js';

const html = htm.bind(h);

export function Zone({ deviceId, devices }) {
    const [zone, setZone] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPicker, setShowPicker] = useState(false);

    function refresh() {
        api.zone(deviceId).then(resp => {
            if (resp.success) setZone(resp.data);
        }).finally(() => setLoading(false));
    }

    useEffect(() => { refresh(); }, [deviceId]);

    async function addDevice(slaveId) {
        setShowPicker(false);
        await api.zoneAdd(deviceId, slaveId);
        refresh();
    }

    async function removeDevice(slaveId) {
        await api.zoneRemove(deviceId, slaveId);
        refresh();
    }

    async function dissolve() {
        await api.zoneDissolve(deviceId);
        refresh();
    }

    async function leave() {
        await api.zoneLeave(deviceId);
        refresh();
    }

    if (loading) return html`
        <div class="zone-section">
            <div class="section-title">Zone</div>
            <div class="loading-bar"></div>
        </div>
    `;

    if (!zone) return null;

    // Devices not already in the zone are available to add
    const zoneIps = new Set([zone.masterIp, ...(zone.members || []).map(m => m.ip)].filter(Boolean));
    const available = Object.entries(devices || {}).filter(([ip]) => !zoneIps.has(ip) && ip !== deviceId);

    const deviceName = (ip) => devices[ip]?.info?.name || ip;

    async function playAll() {
        for (const [ip] of available) {
            await api.zoneAdd(deviceId, ip);
        }
        refresh();
    }

    return html`
        <div class="group-section">
            ${zone.isSlave ? html`
                <div class="group-label">Currently playing in group with ${zone.masterName || deviceName(zone.masterIp)}</div>
                <button class="btn-pill-dark" onClick=${leave}>LEAVE GROUP</button>
            ` : zone.isMaster ? html`
                <button class="btn-pill-dark" onClick=${dissolve} style="background: #a00;">DISSOLVE GROUP</button>
                <div class="group-label">Members:</div>
                ${(zone.members || []).map(m => html`
                    <button class="btn-pill-light" key=${m.ip} onClick=${() => removeDevice(m.ip)}>
                        <span class="plus">−</span>
                        <span class="name">${m.name || deviceName(m.ip)}</span>
                    </button>
                `)}
                ${available.length > 0 && html`
                    <div class="group-label" style="margin-top:1rem;">Add more:</div>
                    ${available.map(([ip, d]) => html`
                        <button class="btn-pill-light" key=${ip} onClick=${() => addDevice(ip)}>
                            <span class="plus">+</span>
                            <span class="name">${d.info?.name || ip}</span>
                        </button>
                    `)}
                `}
            ` : html`
                ${available.length > 0 && html`
                    <button class="btn-pill-dark" onClick=${playAll}>PLAY ALL</button>
                    <div class="group-label">Or add individually to group:</div>
                    ${available.map(([ip, d]) => html`
                        <button class="btn-pill-light" key=${ip} onClick=${() => addDevice(ip)}>
                            <span class="plus">+</span>
                            <span class="name">${d.info?.name || ip}</span>
                        </button>
                    `)}
                `}
            `}
        </div>
    `;
}