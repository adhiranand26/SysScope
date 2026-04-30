/**
 * SysScope — Help Overlay
 * Explains metrics for non-Linux users (projector ready) and lists keyboard shortcuts.
 */

window.HelpOverlay = (function () {
    'use strict';

    let isVisible = false;

    function init() {
        const content = document.getElementById('help-content');
        if (!content) return;

        content.innerHTML = `
            <h2>┤ SysScope Help & Shortcuts ├</h2>
            
            <h3>Understanding the Metrics</h3>
            <p><strong class="text-accent">CPU:</strong> Measures processor workload. "Overall" is the average across all cores. High usage (>80%) usually means the system is working hard on computational tasks.</p>
            
            <p><strong class="text-accent">Memory (RAM):</strong> Think of this as the system's short-term workspace.
            <br>• <em>Used:</em> Actively utilized by running apps.
            <br>• <em>Cache/Buf:</em> Memory used to store disk data for fast access. It's technically "in use" but can be freed instantly if apps need it.
            <br>• <em>Swap:</em> "Emergency" RAM on the hard drive. Using swap heavily slows down the system.</p>
            
            <p><strong class="text-accent">Page Faults:</strong> Happens when a program asks for memory that isn't currently loaded into RAM. A high number of "Major" faults means the system is reading heavily from disk (slow).</p>
            
            <p><strong class="text-accent">Process States:</strong>
            <br>• <span class="state-running">Running (R):</span> Currently executing on a CPU core.
            <br>• <span class="state-sleeping">Sleeping (S):</span> Waiting for an event (like user input or network data). Most processes spend their time here.
            <br>• <span class="state-zombie">Zombie (Z):</span> A dead process waiting for its parent to read its exit status.
            </p>
            
            <p><strong class="text-accent">Load Average:</strong> Represents the demand for CPU time over 1, 5, and 15 minutes. A load of 1.0 on a 1-core system means it's exactly at capacity. A load of 4.0 on a 4-core system is also exactly at capacity.</p>

            <h3>Keyboard Shortcuts</h3>
            <div class="kv-grid mt-4">
                <span class="kv-key"><kbd>H</kbd></span> <span class="kv-val">Toggle this help overlay</span>
                <span class="kv-key"><kbd>P</kbd></span> <span class="kv-val">Pause/Resume real-time updates</span>
                <span class="kv-key"><kbd>1</kbd>, <kbd>2</kbd>, <kbd>5</kbd></span> <span class="kv-val">Change refresh interval (seconds)</span>
                <span class="kv-key"><kbd>Esc</kbd></span> <span class="kv-val">Close modals / Help</span>
            </div>
            
            <button class="btn-close mt-8" onclick="HelpOverlay.toggle()">Close [Esc]</button>
        `;

        // Click outside to close
        const overlay = document.getElementById('help-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                toggle(false);
            }
        });
    }

    function toggle(force) {
        const overlay = document.getElementById('help-overlay');
        if (!overlay) return;

        if (typeof force === 'boolean') {
            isVisible = force;
        } else {
            isVisible = !isVisible;
        }

        if (isVisible) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    return { toggle };
})();
