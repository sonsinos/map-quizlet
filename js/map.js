/**
 * Map manager module for the Map Quizlet application.
 * Handles SVG path rendering, zooming, panning, touch pinch gestures, and dynamic labels.
 */
export class MapManager {
    /**
     * @param {SVGElement} mapSvg - The SVG element of the map.
     * @param {SVGElement} mapContentGroup - The content group `<g>` containing region paths.
     * @param {HTMLElement} mapContainer - The outer container wrapping the SVG.
     */
    constructor(mapSvg, mapContentGroup, mapContainer) {
        this.mapSvg = mapSvg;
        this.mapContentGroup = mapContentGroup;
        this.mapContainer = mapContainer;

        // Zoom & Pan Viewport State
        this.currentScale = 1;
        this.currentTranslate = { x: 0, y: 0 };
        this.isDragging = false;
        this.lastPanX = 0;
        this.lastPanY = 0;

        // Pinch Zoom Viewport State
        this.initialPinchDistance = null;
        this.initialScale = null;

        this.bindEvents();
    }

    /**
     * Draws paths onto the SVG based on configuration items.
     * @param {Object} quizConfig - The current quiz configuration.
     */
    drawPaths(quizConfig) {
        this.mapContentGroup.innerHTML = '';
        quizConfig.items.forEach(item => {
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", item.d);
            path.setAttribute("id", item.id);
            path.setAttribute("class", "region-path");
            path.setAttribute("data-name", item.name);
            this.mapContentGroup.appendChild(path);
        });

        this.mapSvg.setAttribute("viewBox", quizConfig.map.viewBox);
        this.resetZoom();
    }

    /**
     * Applies the current translate & scale transforms to the map content group.
     */
    updateTransform() {
        this.mapContentGroup.setAttribute(
            'transform',
            `translate(${this.currentTranslate.x} ${this.currentTranslate.y}) scale(${this.currentScale})`
        );
    }

    /**
     * Zooms in or out of the map.
     * @param {number} factor - The scale multiplier.
     */
    zoom(factor) {
        const newScale = this.currentScale * factor;
        if (newScale >= 0.5 && newScale <= 8) {
            const rect = this.mapContainer.getBoundingClientRect();
            const pt = this.mapSvg.createSVGPoint();
            pt.x = rect.left + rect.width / 2;
            pt.y = rect.top + rect.height / 2;
            
            const svgPt = pt.matrixTransform(this.mapSvg.getScreenCTM().inverse());
            const tx = svgPt.x - factor * (svgPt.x - this.currentTranslate.x);
            const ty = svgPt.y - factor * (svgPt.y - this.currentTranslate.y);

            this.currentScale = newScale;
            this.currentTranslate = { x: tx, y: ty };
            this.updateTransform();
        }
    }

    /**
     * Resets map viewport coordinates back to default scale.
     */
    resetZoom() {
        this.currentScale = 1;
        this.currentTranslate = { x: 0, y: 0 };
        this.updateTransform();
    }

    /**
     * Zooms onto a targeted region path centered on mobile viewports.
     * @param {Object} item - The current item to zoom in on.
     * @param {Object} quizConfig - The current quiz configuration.
     */
    autoZoomToItem(item, quizConfig) {
        // For tablet and desktop displays, keep default view to maintain general map perspective
        if (window.innerWidth >= 768) {
            this.resetZoom();
            return;
        }

        const pathEl = document.getElementById(item.id);
        if (!pathEl) return;

        const bbox = pathEl.getBBox();
        const cx = bbox.x + bbox.width / 2;
        const cy = bbox.y + bbox.height / 2;

        const zoomSettings = quizConfig.map.zoomSettings;
        let targetScale = zoomSettings.mediumScale;

        if (bbox.width > zoomSettings.largeThreshold || bbox.height > zoomSettings.largeThreshold) {
            targetScale = zoomSettings.largeScale;
        } else if (bbox.width < zoomSettings.smallThreshold || bbox.height < zoomSettings.smallThreshold) {
            targetScale = zoomSettings.smallScale;
        }

        const rect = this.mapContainer.getBoundingClientRect();
        const pt = this.mapSvg.createSVGPoint();
        pt.x = rect.left + rect.width / 2;
        pt.y = rect.top + rect.height / 2;

        const svgPt = pt.matrixTransform(this.mapSvg.getScreenCTM().inverse());
        const tx = svgPt.x - (cx * targetScale);
        const ty = svgPt.y - (cy * targetScale);

        this.currentScale = targetScale;
        this.currentTranslate = { x: tx, y: ty };
        this.updateTransform();
    }

    /**
     * Gets scale multiplier between screen viewport pixels and SVG canvas coordinate spaces.
     */
    getSvgToScreenRatio() {
        const viewBoxAttr = this.mapSvg.getAttribute("viewBox");
        if (!viewBoxAttr) return 1;
        const viewBox = viewBoxAttr.split(" ");
        const svgWidth = parseFloat(viewBox[2]) || 960;
        return svgWidth / this.mapContainer.clientWidth;
    }

    /**
     * Highlights target region boundary.
     * @param {string} id - The ID of the path to highlight.
     */
    highlight(id) {
        this.mapContentGroup.querySelectorAll('.active-region').forEach(el => {
            el.classList.remove('active-region');
        });

        const pathEl = document.getElementById(id);
        if (pathEl) {
            pathEl.classList.add('active-region');
        }
    }

    /**
     * Colors target path green (correct) or red (wrong).
     * @param {string} id - The target region path ID.
     * @param {boolean} isCorrect - Success criteria.
     */
    markResult(id, isCorrect) {
        const pathEl = document.getElementById(id);
        if (!pathEl) return;

        pathEl.classList.remove('active-region');
        if (isCorrect) {
            pathEl.classList.add('correct-region');
        } else {
            pathEl.classList.add('wrong-region');
        }
    }

    /**
     * Dynamically renders SVG text labels centered inside region paths.
     * @param {Object} item - Target item.
     * @param {Object} quizConfig - Current quiz configuration.
     */
    addLabel(item, quizConfig) {
        const labelField = quizConfig.map.labelField;
        if (!labelField) return;

        const pathEl = document.getElementById(item.id);
        if (!pathEl) return;

        const bbox = pathEl.getBBox();
        const centerX = bbox.x + bbox.width / 2;
        const centerY = bbox.y + bbox.height / 2;

        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", centerX);
        text.setAttribute("y", centerY);
        text.setAttribute("class", "region-label");
        text.textContent = item[labelField];

        this.mapContentGroup.appendChild(text);
    }

    /**
     * Clears all custom dynamic labels and status styling classes.
     */
    clear() {
        this.mapContentGroup.querySelectorAll('.region-label').forEach(el => el.remove());
        this.mapContentGroup.querySelectorAll('.region-path').forEach(el => {
            el.classList.remove('active-region', 'correct-region', 'wrong-region');
        });
    }

    /**
     * Binds mouse pan and multi-touch pinch drag controls to map area.
     */
    bindEvents() {
        // Mouse Drag Events
        this.mapContainer.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.mapContentGroup.classList.remove('duration-200'); // Disable smooth transition during manual dragging
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            this.mapContainer.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();

            const deltaX = e.clientX - this.lastPanX;
            const deltaY = e.clientY - this.lastPanY;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;

            const ratio = this.getSvgToScreenRatio();
            this.currentTranslate.x += deltaX * ratio;
            this.currentTranslate.y += deltaY * ratio;

            this.updateTransform();
        });

        window.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.mapContentGroup.classList.add('duration-200');
            this.mapContainer.style.cursor = 'grab';
        });

        // Helper to calculate pinch-to-zoom viewport gaps
        const getPinchDistance = (touches) => {
            return Math.hypot(
                touches[0].clientX - touches[1].clientX,
                touches[0].clientY - touches[1].clientY
            );
        };

        // Touch Panning & Pinching Event Hooks
        this.mapContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                this.isDragging = true;
                this.initialPinchDistance = null;
                this.mapContentGroup.classList.remove('duration-200');
                const touch = e.touches[0];
                this.lastPanX = touch.clientX;
                this.lastPanY = touch.clientY;
            } else if (e.touches.length === 2) {
                this.isDragging = false;
                this.mapContentGroup.classList.remove('duration-200');
                this.initialPinchDistance = getPinchDistance(e.touches);
                this.initialScale = this.currentScale;
            }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) {
                if (e.cancelable) e.preventDefault();
                const touch = e.touches[0];
                const deltaX = touch.clientX - this.lastPanX;
                const deltaY = touch.clientY - this.lastPanY;
                this.lastPanX = touch.clientX;
                this.lastPanY = touch.clientY;

                const ratio = this.getSvgToScreenRatio();
                this.currentTranslate.x += deltaX * ratio;
                this.currentTranslate.y += deltaY * ratio;
                this.updateTransform();
            } else if (e.touches.length === 2 && this.initialPinchDistance) {
                if (e.cancelable) e.preventDefault();
                const currentDistance = getPinchDistance(e.touches);
                const zoomFactor = currentDistance / this.initialPinchDistance;

                let newScale = this.initialScale * zoomFactor;
                if (newScale < 0.5) newScale = 0.5;
                if (newScale > 8) newScale = 8;

                this.currentScale = newScale;
                this.updateTransform();
            }
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) {
                this.isDragging = false;
                this.initialPinchDistance = null;
                this.mapContentGroup.classList.add('duration-200');
            } else if (e.touches.length === 1) {
                this.isDragging = false;
                this.initialPinchDistance = null;
            }
        });
    }
}
