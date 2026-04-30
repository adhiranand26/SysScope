/**
 * SysScope — Fullscreen Panel Toggle
 * Double-click a panel to maximize it. Includes a back button.
 */

(function() {
    'use strict';

    function initFullscreen() {
        const panels = document.querySelectorAll('.panel');

        panels.forEach(panel => {
            // Create back button
            const backBtn = document.createElement('button');
            backBtn.className = 'btn-fullscreen-back';
            backBtn.innerHTML = '⬅ Back';
            backBtn.title = 'Restore Window';
            
            // Add it to the panel
            panel.appendChild(backBtn);

            // Double click to maximize
            panel.addEventListener('dblclick', (e) => {
                // Ignore if already fullscreen or if clicking the back button
                if (panel.classList.contains('fullscreen') || e.target === backBtn) return;
                
                // Also ignore if clicking inside interactive elements like inputs
                if (['INPUT', 'BUTTON', 'A', 'SELECT'].includes(e.target.tagName)) return;

                // Maximize this panel
                panel.classList.add('fullscreen');
            });

            // Click back button to restore
            backBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                panel.classList.remove('fullscreen');
            });
        });
    }

    if (document.readyState !== 'loading') {
        initFullscreen();
    } else {
        document.addEventListener('DOMContentLoaded', initFullscreen);
    }
})();
