/**
 * SysScope — Process Table Search/Filter
 * Debounced input handler that triggers a re-render of the process panel via CSS classes.
 * Actually, since the rendering is driven by WebSocket updates, it's cleaner to 
 * just store the search value and let the ProcessPanel use it on the next tick,
 * which is what we implemented in processes.js. This file just sets up the listener.
 */

(function () {
    'use strict';

    function init() {
        const searchInput = document.getElementById('process-search');
        if (!searchInput) return;

        // The actual filtering happens inside ProcessPanel.render() based on this input's value.
        // We just prevent keyboard shortcuts (like 'h' for help) from firing when typing here.
        
        searchInput.addEventListener('keydown', (e) => {
            e.stopPropagation(); // Prevent global shortcuts
            if (e.key === 'Escape') {
                searchInput.value = '';
                searchInput.blur();
            }
        });
        
        // Optional: trigger immediate visual update without waiting for next WS tick
        searchInput.addEventListener('input', () => {
            const val = searchInput.value.toLowerCase();
            const rows = document.querySelectorAll('.process-row');
            
            rows.forEach(row => {
                const proc = JSON.parse(row.dataset.proc.replace(/&apos;/g, "'"));
                const match = proc.name.toLowerCase().includes(val) ||
                              proc.pid.toString() === val ||
                              proc.state.toLowerCase() === val;
                              
                if (match || !val) {
                    row.classList.remove('hidden');
                } else {
                    row.classList.add('hidden');
                }
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
