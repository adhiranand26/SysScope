/**
 * SysScope — Battery Panel Renderer
 */

window.BatteryPanel = (function () {
    'use strict';

    function init(container) {
        container.innerHTML = `
            <div style="display:flex; align-items:center; gap:20px; margin-bottom: 20px;">
                <div style="position:relative; width:60px; height:30px; border:2px solid var(--text-dim); border-radius:4px; padding:2px;">
                    <div id="batt-icon-fill" style="height:100%; width:0%; background:var(--state-sleeping); transition: width 0.3s ease;"></div>
                    <div style="position:absolute; right:-6px; top:6px; width:4px; height:14px; background:var(--text-dim); border-radius:0 2px 2px 0;"></div>
                </div>
                <div class="stat-value" id="batt-pct-large" style="font-size:36px; line-height:1">--%</div>
            </div>
            
            <div class="kv-grid">
                <span class="kv-key">Status</span><span class="kv-val" id="batt-status">--</span>
                <span class="kv-key">Time Left</span><span class="kv-val" id="batt-time">--</span>
            </div>
        `;
    }

    function render(data) {
        const container = document.getElementById('battery-body');
        const headerPct = document.getElementById('batt-pct');
        if (!container) return;
        
        if (!data) {
            container.innerHTML = '<div class="text-dim" style="text-align:center; margin-top:20px;">Calculating...</div>';
            return;
        }

        if (!data.available) {
            container.innerHTML = '<div class="text-dim" style="text-align:center; margin-top:20px;">No battery — desktop machine</div>';
            return;
        }
        
        if (!document.getElementById('batt-icon-fill')) {
            init(container);
        }

        const pct = data.percent;
        
        if (headerPct) headerPct.textContent = pct !== null ? `${pct}%` : 'N/A';
        document.getElementById('batt-pct-large').textContent = pct !== null ? `${pct}%` : 'N/A';
        
        const fill = document.getElementById('batt-icon-fill');
        fill.style.width = pct !== null ? `${pct}%` : '0%';
        
        if (pct !== null) {
            if (pct <= 15) fill.style.background = 'var(--danger)';
            else if (pct <= 30) fill.style.background = 'var(--accent)';
            else fill.style.background = 'var(--state-sleeping)';
        }

        document.getElementById('batt-status').textContent = data.charging === true ? "Charging" : (data.charging === false ? "Discharging" : "N/A");
        
        let timeStr = 'N/A';
        if (data.charging) {
            timeStr = 'Charging';
        } else if (data.time_left_formatted) {
            timeStr = data.time_left_formatted;
        } else if (pct === 100) {
            timeStr = 'Full';
        }
        
        document.getElementById('batt-time').textContent = timeStr;
    }

    return { render };
})();
