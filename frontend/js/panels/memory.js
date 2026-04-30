/**
 * SysScope — Memory Panel Renderer
 * Stacked bar (used/buf/cache/free), swap, page faults, rolling chart.
 */

window.MemoryPanel = (function () {
    'use strict';

    let chart = null;
    let initialized = false;

    function init(container) {
        container.innerHTML = `
            <div class="stat-row mb-2">
                <span class="stat-label">RAM</span>
                <span class="stat-value-sm" id="mem-usage">-- / --</span>
            </div>
            <div class="stacked-bar" id="mem-bar"></div>
            <div class="stat-row mb-2 mt-4" style="font-size:var(--font-size-xs)">
                <span>SWAP</span>
                <span id="mem-swap-text">-- / --</span>
            </div>
            <div class="bar-container mb-4">
                <div class="bar-fill" id="mem-swap-bar" style="width:0%"></div>
            </div>
            <div id="mem-vmstat" style="font-size:var(--font-size-xs)"></div>
            <canvas class="sparkline-canvas" id="mem-chart"></canvas>
        `;

        const canvas = document.getElementById('mem-chart');
        chart = new window.RollingChart(canvas, {
            maxPoints: 60,
            lineColor: '#e8a020',
            fillColor: 'rgba(232, 160, 32, 0.08)',
            unit: '%',
        });

        initialized = true;
    }

    function render(data) {
        const container = document.getElementById('memory-body');
        if (!container) return;
        if (!initialized) init(container);

        const formatBytes = window.SysScope.formatBytes;

        // RAM usage label
        const usage = document.getElementById('mem-usage');
        if (usage) {
            usage.textContent = `${formatBytes(data.used)} / ${formatBytes(data.total)}`;
        }

        // Stacked bar
        const bar = document.getElementById('mem-bar');
        if (bar && data.total > 0) {
            const usedPct = (data.used / data.total * 100).toFixed(1);
            const bufPct = ((data.buffers || 0) / data.total * 100).toFixed(1);
            const cachePct = ((data.cached || 0) / data.total * 100).toFixed(1);
            const freePct = Math.max(0, 100 - usedPct - bufPct - cachePct).toFixed(1);

            bar.innerHTML = `
                <div class="segment used" style="flex:${usedPct}">${usedPct > 8 ? `USED ${formatBytes(data.used)}` : ''}</div>
                <div class="segment buffers" style="flex:${bufPct}">${bufPct > 5 ? `BUF` : ''}</div>
                <div class="segment cached" style="flex:${cachePct}">${cachePct > 5 ? `CACHE` : ''}</div>
                <div class="segment free" style="flex:${freePct}">${freePct > 8 ? `FREE` : ''}</div>
            `;
        }

        // Swap
        const swapText = document.getElementById('mem-swap-text');
        const swapBar = document.getElementById('mem-swap-bar');
        if (swapText) {
            if (data.swap_total > 0) {
                swapText.textContent = `${formatBytes(data.swap_used)} / ${formatBytes(data.swap_total)} (${data.swap_percent.toFixed(0)}%)`;
            } else {
                swapText.textContent = 'No swap';
            }
        }
        if (swapBar) {
            swapBar.style.width = `${data.swap_percent || 0}%`;
            swapBar.classList.toggle('danger', data.swap_percent > 50);
        }

        // Page faults / vmstat
        const vmstat = document.getElementById('mem-vmstat');
        if (vmstat) {
            vmstat.innerHTML = `
                <div class="stat-row"><span>Page Faults</span><span class="text-accent">${(data.page_faults || 0).toLocaleString()}</span></div>
                <div class="stat-row"><span>Major Faults</span><span>${(data.major_faults || 0).toLocaleString()}</span></div>
                <div class="stat-row"><span>Dirty Pages</span><span>${formatBytes(data.dirty_pages_bytes || 0)}</span></div>
            `;
        }

        // Chart
        if (chart) {
            chart.push(data.percent);
        }
    }

    return { render };
})();
