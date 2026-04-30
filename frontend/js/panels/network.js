/**
 * SysScope — Network Panel Renderer
 */

window.NetworkPanel = (function () {
    'use strict';

    let chart = null;
    let initialized = false;

    function init(container) {
        container.innerHTML = `
            <div class="stat-row mb-4">
                <div>
                    <span class="text-dim">Up: </span>
                    <span class="speed-value" id="net-up-val">0 B/s</span>
                </div>
                <div>
                    <span class="text-dim">Down: </span>
                    <span class="speed-value" id="net-down-val">0 B/s</span>
                </div>
            </div>
            <canvas class="chart-canvas" id="net-chart"></canvas>
            <div class="mt-4" id="net-interfaces" style="font-size:var(--font-size-xs)"></div>
        `;

        const canvas = document.getElementById('net-chart');
        chart = new window.RollingChart(canvas, {
            maxPoints: 60,
            lineColor: '#e8a020',
            fillColor: 'rgba(232, 160, 32, 0.08)',
            unit: 'B/s',
            showGrid: false
        });

        initialized = true;
    }

    function formatSpeedLocal(value) {
        if (!value || isNaN(value)) return '0 B/s';
        return window.SysScope.formatSpeed(value);
    }

    function render(data) {
        const container = document.getElementById('network-body');
        if (!container) return;
        if (!initialized) init(container);

        if (!data || !data.interfaces || data.interfaces.length === 0) {
            container.innerHTML = '<div class="text-dim" style="text-align:center; margin-top:20px;">No interfaces found</div>';
            return;
        }

        const upVal = document.getElementById('net-up-val');
        const downVal = document.getElementById('net-down-val');
        
        if (upVal) upVal.textContent = formatSpeedLocal(data.upload_speed);
        if (downVal) downVal.textContent = formatSpeedLocal(data.download_speed);

        if (chart) {
            const up = isNaN(data.upload_speed) ? 0 : data.upload_speed;
            const down = isNaN(data.download_speed) ? 0 : data.download_speed;
            chart.push(up + down);
        }

        const ifacesContainer = document.getElementById('net-interfaces');
        if (ifacesContainer && data.interfaces) {
            ifacesContainer.innerHTML = `
                <div class="text-dim mb-2" style="text-transform:uppercase;letter-spacing:1px">Interfaces</div>
                <div style="display:flex; flex-wrap:wrap; gap:8px;">
                    ${data.interfaces.slice(0, 8).map(i => `<span style="background:var(--bg-elevated); padding:2px 6px; border-radius:2px; border:1px solid var(--border)">${i}</span>`).join('')}
                    ${data.interfaces.length > 8 ? '<span class="text-dim">...</span>' : ''}
                </div>
            `;
        }
    }

    return { render };
})();
