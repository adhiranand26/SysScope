/**
 * SysScope — CPU Panel Renderer
 * Renders per-core bars, overall %, sparkline chart, frequency.
 */

window.CpuPanel = (function () {
    'use strict';

    let chart = null;
    let initialized = false;

    function init(container) {
        container.innerHTML = `
            <div class="stat-row mb-4">
                <span class="stat-label">Overall</span>
                <span class="stat-value" id="cpu-overall">--%</span>
            </div>
            <div class="core-bars" id="cpu-core-bars"></div>
            <canvas class="sparkline-canvas" id="cpu-chart"></canvas>
            <div class="stat-row mt-4 text-dim" style="font-size:var(--font-size-xs)">
                <span id="cpu-freq"></span>
                <span id="cpu-cores-label"></span>
            </div>
        `;

        const canvas = document.getElementById('cpu-chart');
        chart = new window.RollingChart(canvas, {
            maxPoints: 60,
            lineColor: '#e8a020',
            fillColor: 'rgba(232, 160, 32, 0.08)',
            unit: '%',
        });

        initialized = true;
    }

    function render(data) {
        const container = document.getElementById('cpu-body');
        if (!container) return;
        if (!initialized) init(container);

        // Overall %
        const overall = document.getElementById('cpu-overall');
        if (overall) {
            overall.textContent = `${data.overall.toFixed(1)}%`;
        }

        // Per-core bars
        const barsContainer = document.getElementById('cpu-core-bars');
        if (barsContainer && data.per_core) {
            // Build or update bars
            if (barsContainer.children.length !== data.per_core.length) {
                barsContainer.innerHTML = data.per_core.map((pct, i) => `
                    <div class="core-bar-row">
                        <span style="width:42px;font-size:var(--font-size-xs)">Core ${i}</span>
                        <div class="bar-container">
                            <div class="bar-fill ${pct > 80 ? 'danger' : ''}" id="core-bar-${i}" style="width:${pct}%"></div>
                        </div>
                        <span class="core-pct" id="core-pct-${i}">${pct.toFixed(0)}%</span>
                    </div>
                `).join('');
            } else {
                // Update existing bars (smooth transition via CSS)
                data.per_core.forEach((pct, i) => {
                    const bar = document.getElementById(`core-bar-${i}`);
                    const label = document.getElementById(`core-pct-${i}`);
                    if (bar) {
                        bar.style.width = `${pct}%`;
                        // Red when > 80%
                        bar.classList.toggle('danger', pct > 80);
                    }
                    if (label) label.textContent = `${pct.toFixed(0)}%`;
                });
            }
        }

        // Sparkline chart
        if (chart) {
            chart.push(data.overall);
        }

        // Frequency
        const freq = document.getElementById('cpu-freq');
        if (freq && data.freq_current) {
            freq.textContent = `Freq: ${Math.round(data.freq_current)} / ${Math.round(data.freq_max)} MHz`;
        }

        const coresLabel = document.getElementById('cpu-cores-label');
        if (coresLabel) {
            coresLabel.textContent = `${data.core_count} logical${data.physical_cores ? ` / ${data.physical_cores} physical` : ''}`;
        }
    }

    return { render };
})();
