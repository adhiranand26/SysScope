/**
 * SysScope — Alerts Panel Renderer
 */

window.AlertsPanel = (function () {
    'use strict';

    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let lastAlertTime = 0;
    
    // Configurable via Settings? For now, just a button/toggle or hardcoded true
    let soundEnabled = true;

    function playBeep() {
        if (!soundEnabled || audioCtx.state === 'suspended') return;
        // Simple soft beep
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
    }

    // Attempt to unlock audio context on first click
    document.addEventListener('click', () => {
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }, { once: true });

    function init(container) {
        container.innerHTML = `<div id="alerts-list"></div>`;
    }

    function render(data) {
        const container = document.getElementById('alerts-body');
        const summary = document.getElementById('alert-summary');
        if (!container) return;
        
        if (!document.getElementById('alerts-list')) {
            init(container);
        }

        const list = document.getElementById('alerts-list');

        if (!data || data.length === 0) {
            list.innerHTML = '<div class="no-alerts" style="color:var(--state-sleeping); text-align:center; margin-top:20px;">All systems normal</div>';
            if (summary) summary.textContent = '● System OK';
            return;
        }

        let newAlertFound = false;

        list.innerHTML = data.map(a => {
            const timeStr = new Date(a.timestamp * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
            const isCrit = a.severity === 'critical';
            
            if (a.timestamp > lastAlertTime && isCrit) {
                newAlertFound = true;
                lastAlertTime = a.timestamp;
            }

            return `
                <div class="alert-item ${a.severity}">
                    <span class="alert-time">${timeStr}</span>
                    <span class="${isCrit ? 'alert-icon-crit' : 'alert-icon-warn'}"></span>
                    <span class="alert-msg">${a.message}</span>
                </div>
            `;
        }).join('');

        if (summary) {
            const critCount = data.filter(a => a.severity === 'critical').length;
            const warnCount = data.length - critCount;
            let text = [];
            if (critCount > 0) text.push(`${critCount} Critical`);
            if (warnCount > 0) text.push(`${warnCount} Warning`);
            summary.textContent = `⚠ ${text.join(', ')}`;
        }

        if (newAlertFound) {
            playBeep();
        }
    }

    return { render };
})();
