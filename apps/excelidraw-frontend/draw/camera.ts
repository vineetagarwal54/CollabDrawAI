export type Camera = {
    x: number;
    y: number;
    zoom: number;
};

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 10;

export function clamp(v: number, lo: number, hi: number): number {
    return Math.min(hi, Math.max(lo, v));
}

export function clampZoom(zoom: number): number {
    return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

export function screenToWorld(cam: Camera, sx: number, sy: number): { x: number; y: number } {
    return {
        x: sx / cam.zoom + cam.x,
        y: sy / cam.zoom + cam.y,
    };
}

export function worldToScreen(cam: Camera, wx: number, wy: number): { x: number; y: number } {
    return {
        x: (wx - cam.x) * cam.zoom,
        y: (wy - cam.y) * cam.zoom,
    };
}

/**
 * Cursor-centered zoom: compute a new camera such that the world point
 * currently under (sx, sy) remains under (sx, sy) after zooming.
 *
 * Derivation:
 *   before: world = sx / zoom + cam.x
 *   after:  world = sx / newZoom + newCam.x  (must equal the same world point)
 *   => newCam.x = world - sx / newZoom
 */
export function zoomAt(cam: Camera, sx: number, sy: number, factor: number): Camera {
    const newZoom = clampZoom(cam.zoom * factor);
    const world = screenToWorld(cam, sx, sy);
    return {
        zoom: newZoom,
        x: world.x - sx / newZoom,
        y: world.y - sy / newZoom,
    };
}
