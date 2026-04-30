/**
 * SysScope — Rolling Line Chart (Canvas)
 * Reusable 60-second rolling chart for CPU, memory, network panels.
 */

class RollingChart {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {Object} options
     */
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maxPoints = options.maxPoints || 60;
        this.lineColor = options.lineColor || '#e8a020';
        this.fillColor = options.fillColor || 'rgba(232, 160, 32, 0.08)';
        this.gridColor = options.gridColor || '#333333';
        this.labelColor = options.labelColor || '#777777';
        this.min = options.min ?? 0;
        this.max = options.max ?? 100;
        this.lineWidth = options.lineWidth || 1.5;
        this.showGrid = options.showGrid !== false;
        this.showLabel = options.showLabel !== false;
        this.unit = options.unit || '%';
        this.data = [];

        // Handle high-DPI displays
        this._setupCanvas();

        // Resize observer for responsive sizing
        this._resizeObserver = new ResizeObserver(() => this._setupCanvas());
        this._resizeObserver.observe(this.canvas);
    }

    _setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
        this.render();
    }

    /**
     * Push a new value onto the chart. Oldest values are dropped.
     * @param {number} value
     */
    push(value) {
        this.data.push(value);
        if (this.data.length > this.maxPoints) {
            this.data.shift();
        }
        this.render();
    }

    /**
     * Draw the chart: grid, filled area, line, label.
     */
    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const range = this.max - this.min;

        // Clear
        ctx.clearRect(0, 0, w, h);

        if (this.data.length === 0) return;

        // Grid lines at 25%, 50%, 75%
        if (this.showGrid) {
            ctx.strokeStyle = this.gridColor;
            ctx.lineWidth = 0.5;
            ctx.setLineDash([2, 4]);
            for (const pct of [0.25, 0.5, 0.75]) {
                const y = h - (pct * h);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // Calculate points
        const points = [];
        const step = w / (this.maxPoints - 1);
        const offset = this.maxPoints - this.data.length;

        for (let i = 0; i < this.data.length; i++) {
            const x = (offset + i) * step;
            const normalized = (this.data[i] - this.min) / range;
            const y = h - (normalized * (h - 2)) - 1; // 1px padding top/bottom
            points.push({ x, y });
        }

        if (points.length < 2) return;

        // Filled area
        ctx.beginPath();
        ctx.moveTo(points[0].x, h);
        for (const p of points) {
            ctx.lineTo(p.x, p.y);
        }
        ctx.lineTo(points[points.length - 1].x, h);
        ctx.closePath();
        ctx.fillStyle = this.fillColor;
        ctx.fill();

        // Line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.strokeStyle = this.lineColor;
        ctx.lineWidth = this.lineWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Current value label (top-right)
        if (this.showLabel && this.data.length > 0) {
            const current = this.data[this.data.length - 1];
            const label = `${current.toFixed(1)}${this.unit}`;
            ctx.font = `500 10px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'right';
            ctx.fillStyle = this.labelColor;
            ctx.fillText(label, w - 4, 12);
        }
    }

    /**
     * Clean up observer.
     */
    destroy() {
        this._resizeObserver.disconnect();
    }
}

// Export for use by panel modules
window.RollingChart = RollingChart;
