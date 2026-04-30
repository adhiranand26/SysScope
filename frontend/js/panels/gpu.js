/**
 * SysScope — GPU Panel Renderer
 */

window.GpuPanel = (function () {
    'use strict';

    function init(container) {
        container.innerHTML = `
            <div id="gpu-info" class="kv-grid mb-4">
                <span class="kv-key">Model</span><span class="kv-val" id="gpu-name">--</span>
                <span class="kv-key">Util</span><span class="kv-val" id="gpu-util">--</span>
                <span class="kv-key">VRAM</span><span class="kv-val" id="gpu-vram">--</span>
                <span class="kv-key">Temp</span><span class="kv-val" id="gpu-temp">--</span>
            </div>
        `;
    }

    function render(data) {
        const container = document.getElementById('gpu-body');
        if (!container) return;
        
        if (!document.getElementById('gpu-info')) {
            init(container);
        }

        if (!data || !data.available) {
            document.getElementById('gpu-name').textContent = "No GPU Detected";
            return;
        }

        const formatBytes = window.SysScope.formatBytes;

        document.getElementById('gpu-name').textContent = data.name || 'N/A';
        document.getElementById('gpu-util').textContent = data.usage_percent !== null ? `${data.usage_percent}%` : 'N/A';
        document.getElementById('gpu-temp').textContent = data.temperature !== null ? `${data.temperature}°C` : 'N/A';
        
        let vramStr = '';
        if (data.vram_used !== null && data.vram_total !== null) {
            vramStr = `${formatBytes(data.vram_used)} / ${formatBytes(data.vram_total)}`;
        } else if (data.vram_total !== null) {
            vramStr = `? / ${formatBytes(data.vram_total)}`;
        } else {
            vramStr = 'N/A';
        }
        
        document.getElementById('gpu-vram').textContent = vramStr;
    }

    return { render };
})();
