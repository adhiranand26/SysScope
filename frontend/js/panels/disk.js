/**
 * SysScope — Disk Panel Renderer
 * Render read/write speeds as moving bars, and partition usage.
 */

window.DiskPanel = (function () {
    'use strict';

    let initialized = false;
    let maxReadSeen = 10 * 1024 * 1024; // start with 10MB/s baseline for bar scale
    let maxWriteSeen = 10 * 1024 * 1024;

    function init(container) {
        container.innerHTML = `
            <div class="mb-8">
                <div class="speed-row">
                    <span class="text-dim">Read Speed</span>
                    <span class="speed-value" id="disk-read-val">0 B/s</span>
                </div>
                <div class="bar-container mb-4">
                    <div class="bar-fill" id="disk-read-bar" style="width:0%"></div>
                </div>

                <div class="speed-row mt-4">
                    <span class="text-dim">Write Speed</span>
                    <span class="speed-value" id="disk-write-val">0 B/s</span>
                </div>
                <div class="bar-container">
                    <div class="bar-fill" id="disk-write-bar" style="width:0%; background:rgba(232, 160, 32, 0.6)"></div>
                </div>
            </div>
            
            <div id="disk-partitions" class="mt-8" style="font-size:var(--font-size-xs)"></div>
        `;
        initialized = true;
    }

    function render(data) {
        const container = document.getElementById('disk-body');
        if (!container) return;
        if (!initialized) init(container);

        const formatSpeed = window.SysScope.formatSpeed;
        const formatBytes = window.SysScope.formatBytes;

        // Auto-scale bars based on seen maximums (decay over time if we wanted to be fancy)
        if (data.read_speed > maxReadSeen) maxReadSeen = data.read_speed * 1.5;
        if (data.write_speed > maxWriteSeen) maxWriteSeen = data.write_speed * 1.5;

        // Reads
        const readVal = document.getElementById('disk-read-val');
        const readBar = document.getElementById('disk-read-bar');
        if (readVal && readBar) {
            readVal.textContent = formatSpeed(data.read_speed);
            const readPct = Math.min(100, (data.read_speed / maxReadSeen) * 100);
            readBar.style.width = `${readPct}%`;
        }

        // Writes
        const writeVal = document.getElementById('disk-write-val');
        const writeBar = document.getElementById('disk-write-bar');
        if (writeVal && writeBar) {
            writeVal.textContent = formatSpeed(data.write_speed);
            const writePct = Math.min(100, (data.write_speed / maxWriteSeen) * 100);
            writeBar.style.width = `${writePct}%`;
        }

        // Partitions
        const partContainer = document.getElementById('disk-partitions');
        if (partContainer && data.partitions) {
            partContainer.innerHTML = data.partitions.map(p => {
                const pct = p.percent.toFixed(1);
                // Highlight near full disks
                const isFull = pct > 90;
                return `
                    <div class="mb-4">
                        <div class="speed-row" style="font-size:var(--font-size-xs)">
                            <span>${p.mount} <span class="text-dim">(${p.fstype})</span></span>
                            <span class="${isFull ? 'text-danger' : 'text-dim'}">${formatBytes(p.used)} / ${formatBytes(p.total)} (${pct}%)</span>
                        </div>
                        <div class="bar-container" style="height:4px">
                            <div class="bar-fill ${isFull ? 'danger' : ''}" style="width:${pct}%"></div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    return { render };
})();
