import { getExistingShapes } from "./http";
import { Camera, screenToWorld, zoomAt, clampZoom } from "./camera";

export type Tool = "circle" | "rect" | "pencil" | "erase" | "hand";

export type Shape =
    | {
          type: "rect";
          x: number;
          y: number;
          width: number;
          height: number;
      }
    | {
          type: "circle";
          centerX: number;
          centerY: number;
          radius: number;
      }
    | {
          type: "pencil";
          points: Array<{ x: number; y: number }>;
          strokeWidth?: number;
          strokeColor?: string;
      };

/**
 * Game owns the drawing surface and the camera.
 *
 * Coordinate system:
 *  - All shapes are stored in WORLD space (infinite plane).
 *  - The camera maps world -> screen via: screen = (world - camera) * zoom.
 *  - Mouse events arrive in viewport pixels; we convert to canvas-local pixels
 *    (via getBoundingClientRect) and then to world coordinates via camera.
 *
 * The Shape schema and WS payloads are unchanged so existing rooms keep
 * working. Before this refactor the "screen" coords happened to equal "world"
 * coords (camera was implicit identity), so pre-existing shapes render in the
 * same place as before.
 */
export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private existingShapes: Shape[];
    private roomId: string;
    private selectedTool: Tool = "circle";

    // Drawing state (in world coords)
    private clicked = false;
    private startX = 0;
    private startY = 0;

    // Pan state (tracked in screen pixels because panning is a screen-delta)
    private isPanning = false;
    private panLastX = 0;
    private panLastY = 0;

    // Pencil tool state
    private currentPencilPath: Array<{ x: number; y: number }> = [];
    private isDrawingPencil = false;
    private pencilStrokeWidth = 2;

    // Camera
    private camera: Camera = { x: 0, y: 0, zoom: 1 };
    private onCameraChange?: (cam: Camera) => void;

    socket: WebSocket;

    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.existingShapes = [];
        this.roomId = roomId;
        this.socket = socket;
        this.init();
        this.initHandlers();
        this.initMouseHandlers();
    }

    destroy() {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler);
        this.canvas.removeEventListener("mouseup", this.mouseUpHandler);
        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.removeEventListener("wheel", this.wheelHandler);
        this.canvas.removeEventListener("contextmenu", this.contextMenuHandler);
    }

    setTool(tool: Tool) {
        this.selectedTool = tool;
        this.updateCursor();
    }

    setPencilStrokeWidth(width: number) {
        this.pencilStrokeWidth = Math.max(1, Math.min(20, width));
    }

    getPencilStrokeWidth(): number {
        return this.pencilStrokeWidth;
    }

    // ----- Camera API (exposed to React for UI) ---------------------------

    getCamera(): Camera {
        return { ...this.camera };
    }

    setCameraListener(cb: (cam: Camera) => void) {
        this.onCameraChange = cb;
        cb(this.camera);
    }

    /**
     * Zoom by a factor around a screen point (defaults to viewport center).
     * Useful for toolbar +/- buttons.
     */
    zoomBy(factor: number, screenX?: number, screenY?: number) {
        const sx = screenX ?? this.canvas.width / 2;
        const sy = screenY ?? this.canvas.height / 2;
        this.camera = zoomAt(this.camera, sx, sy, factor);
        this.emitCameraChange();
        this.render();
    }

    resetView() {
        this.camera = { x: 0, y: 0, zoom: 1 };
        this.emitCameraChange();
        this.render();
    }

    // ----- Init -----------------------------------------------------------

    async init() {
        this.existingShapes = await getExistingShapes(this.roomId);
        this.render();
    }

    initHandlers() {
        // Drawing messages arrive on the shared socket. We use .onmessage here
        // (property) while Canvas.tsx uses addEventListener for presence, so
        // they coexist without stepping on each other.
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type == "chat") {
                try {
                    const payload = JSON.parse(message.message);
                    if (payload?.action === "delete" && typeof payload?.index === "number") {
                        if (payload.index >= 0 && payload.index < this.existingShapes.length) {
                            this.existingShapes.splice(payload.index, 1);
                        }
                    } else if (payload?.action === "add" && payload?.shape) {
                        this.existingShapes.push(payload.shape);
                    } else if (payload?.shape) {
                        // legacy format
                        this.existingShapes.push(payload.shape);
                    }
                } catch {
                    // ignore malformed payloads
                }
                this.render();
            }
        };
    }

    initMouseHandlers() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler);
        this.canvas.addEventListener("mouseup", this.mouseUpHandler);
        this.canvas.addEventListener("mousemove", this.mouseMoveHandler);
        this.canvas.addEventListener("wheel", this.wheelHandler, { passive: false });
        this.canvas.addEventListener("contextmenu", this.contextMenuHandler);
        this.updateCursor();
    }

    // ----- Coordinate helpers --------------------------------------------

    private canvasPoint(e: MouseEvent): { x: number; y: number } {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    private toWorld(e: MouseEvent): { x: number; y: number } {
        const p = this.canvasPoint(e);
        return screenToWorld(this.camera, p.x, p.y);
    }

    private emitCameraChange() {
        this.onCameraChange?.(this.camera);
    }

    private updateCursor() {
        if (this.isPanning) {
            this.canvas.style.cursor = "grabbing";
            return;
        }
        this.canvas.style.cursor = this.selectedTool === "hand" ? "grab" : "crosshair";
    }

    // ----- Rendering ------------------------------------------------------

    /**
     * Clear + repaint the entire scene.
     *
     * Rendering order:
     *  1. Reset ctx to identity and paint the viewport background in screen space.
     *     (An infinite canvas has no intrinsic background; the viewport is what
     *     we paint.)
     *  2. Apply the camera transform so subsequent draws interpret their
     *     coordinates as world space.
     *  3. Draw every shape in world coordinates directly.
     *
     * Using ctx.setTransform keeps per-shape code free of projection logic,
     * which is critical for future features (selection handles, marquee,
     * snap-to-grid, AI-inserted elements).
     */
    render() {
        const ctx = this.ctx;
        const cam = this.camera;

        // Screen-space background
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // World-space transform: screen = (world - cam) * zoom
        ctx.setTransform(cam.zoom, 0, 0, cam.zoom, -cam.x * cam.zoom, -cam.y * cam.zoom);

        this.existingShapes.forEach((shape) => {
            if (!shape) return;
            this.drawShape(shape);
        });
    }

    // Back-compat alias (internal code & any external references)
    private clearCanvas() {
        this.render();
    }

    private drawShape(shape: Shape) {
        const ctx = this.ctx;
        if (shape.type === "rect") {
            ctx.strokeStyle = "rgba(255, 255, 255, 1)";
            ctx.lineWidth = 2;
            ctx.lineCap = "butt";
            ctx.lineJoin = "miter";
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.type === "circle") {
            ctx.strokeStyle = "rgba(255, 255, 255, 1)";
            ctx.lineWidth = 2;
            ctx.lineCap = "butt";
            ctx.lineJoin = "miter";
            ctx.beginPath();
            ctx.arc(shape.centerX, shape.centerY, Math.abs(shape.radius), 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        } else if (shape.type === "pencil") {
            this.drawPencilPath(shape.points, ctx, false, shape.strokeWidth, shape.strokeColor);
        }
    }

    // ----- Mouse handlers -------------------------------------------------

    mouseDownHandler = (e: MouseEvent) => {
        // Middle mouse button OR hand tool => start panning.
        if (e.button === 1 || this.selectedTool === "hand") {
            e.preventDefault();
            this.isPanning = true;
            const p = this.canvasPoint(e);
            this.panLastX = p.x;
            this.panLastY = p.y;
            this.updateCursor();
            return;
        }

        // Only react to left-click for drawing tools
        if (e.button !== 0) return;

        this.clicked = true;
        const w = this.toWorld(e);
        this.startX = w.x;
        this.startY = w.y;

        if (this.selectedTool === "pencil") {
            this.isDrawingPencil = true;
            this.currentPencilPath = [{ x: w.x, y: w.y }];
        }
    };

    mouseMoveHandler = (e: MouseEvent) => {
        // Pan: translate screen delta by 1/zoom to get world delta.
        if (this.isPanning) {
            const p = this.canvasPoint(e);
            const dx = p.x - this.panLastX;
            const dy = p.y - this.panLastY;
            this.panLastX = p.x;
            this.panLastY = p.y;
            this.camera.x -= dx / this.camera.zoom;
            this.camera.y -= dy / this.camera.zoom;
            this.emitCameraChange();
            this.render();
            return;
        }

        if (!this.clicked) return;

        // Draw preview in world space
        const w = this.toWorld(e);
        const width = w.x - this.startX;
        const height = w.y - this.startY;

        this.render();
        const ctx = this.ctx;
        const tool = this.selectedTool;

        if (tool === "pencil" && this.isDrawingPencil) {
            this.currentPencilPath.push({ x: w.x, y: w.y });
            this.drawPencilPath(this.currentPencilPath, ctx, true, this.pencilStrokeWidth);
        } else if (tool === "rect") {
            ctx.strokeStyle = "rgba(255, 255, 255, 1)";
            ctx.lineWidth = 2;
            ctx.lineCap = "butt";
            ctx.lineJoin = "miter";
            ctx.strokeRect(this.startX, this.startY, width, height);
        } else if (tool === "circle") {
            ctx.strokeStyle = "rgba(255, 255, 255, 1)";
            ctx.lineWidth = 2;
            ctx.lineCap = "butt";
            ctx.lineJoin = "miter";
            const radius = Math.max(width, height) / 2;
            ctx.beginPath();
            ctx.arc(this.startX + radius, this.startY + radius, Math.abs(radius), 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();
        }
    };

    mouseUpHandler = (e: MouseEvent) => {
        if (this.isPanning) {
            this.isPanning = false;
            this.updateCursor();
            return;
        }

        if (!this.clicked) return;
        this.clicked = false;

        const w = this.toWorld(e);
        const width = w.x - this.startX;
        const height = w.y - this.startY;

        const tool = this.selectedTool;
        let shape: Shape | null = null;

        if (tool === "erase") {
            const hitIndex = this.hitTest(w.x, w.y);
            if (hitIndex !== -1) {
                // Do NOT mutate locally; the echoed WS message will apply the delete.
                this.socket.send(
                    JSON.stringify({
                        type: "chat",
                        message: JSON.stringify({ action: "delete", index: hitIndex }),
                        roomId: this.roomId,
                    })
                );
            }
            return;
        } else if (tool === "pencil") {
            if (this.isDrawingPencil && this.currentPencilPath.length > 1) {
                const smoothedPath = this.smoothPath(this.currentPencilPath);
                shape = {
                    type: "pencil",
                    points: smoothedPath,
                    strokeWidth: this.pencilStrokeWidth,
                    strokeColor: "rgba(255, 255, 255, 1)",
                };
            }
            this.isDrawingPencil = false;
            this.currentPencilPath = [];
        } else if (tool === "rect") {
            shape = { type: "rect", x: this.startX, y: this.startY, height, width };
        } else if (tool === "circle") {
            const radius = Math.max(width, height) / 2;
            shape = {
                type: "circle",
                radius,
                centerX: this.startX + radius,
                centerY: this.startY + radius,
            };
        }

        if (!shape) return;

        this.existingShapes.push(shape);
        this.socket.send(
            JSON.stringify({
                type: "chat",
                message: JSON.stringify({ action: "add", shape }),
                roomId: this.roomId,
            })
        );
    };

    /**
     * Wheel = cursor-centered zoom.
     *
     * Converting deltaY through Math.exp gives a smooth multiplicative response
     * that feels identical on trackpads and mouse wheels. The 0.0015 factor
     * controls zoom speed; too high feels twitchy, too low feels sluggish.
     */
    wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        const p = this.canvasPoint(e);
        const factor = Math.exp(-e.deltaY * 0.0015);
        this.camera = zoomAt(this.camera, p.x, p.y, factor);
        this.emitCameraChange();
        this.render();
    };

    // Middle-mouse-drag would otherwise open the browser context menu on
    // right-click-like gestures; keep this to avoid accidental popups while
    // panning in some environments.
    contextMenuHandler = (e: MouseEvent) => {
        if (this.selectedTool === "hand") e.preventDefault();
    };

    // ----- Pencil rendering & smoothing (unchanged, now in world space) ---

    private drawPencilPath(
        points: Array<{ x: number; y: number }>,
        ctx: CanvasRenderingContext2D,
        _isPreview: boolean = false,
        strokeWidth?: number,
        strokeColor?: string
    ) {
        if (points.length < 2) return;

        ctx.strokeStyle = strokeColor || "rgba(255, 255, 255, 1)";
        ctx.lineWidth = strokeWidth || 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            const currentPoint = points[i];
            const previousPoint = points[i - 1];

            if (i === 1) {
                ctx.lineTo(currentPoint.x, currentPoint.y);
            } else {
                const controlPoint = {
                    x: (previousPoint.x + currentPoint.x) / 2,
                    y: (previousPoint.y + currentPoint.y) / 2,
                };
                ctx.quadraticCurveTo(previousPoint.x, previousPoint.y, controlPoint.x, controlPoint.y);
            }
        }

        ctx.stroke();
        ctx.closePath();
    }

    private smoothPath(
        points: Array<{ x: number; y: number }>
    ): Array<{ x: number; y: number }> {
        if (points.length < 3) return points;

        const smoothed: Array<{ x: number; y: number }> = [];
        smoothed.push(points[0]);

        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];
            smoothed.push({
                x: (prev.x + curr.x + next.x) / 3,
                y: (prev.y + curr.y + next.y) / 3,
            });
        }

        smoothed.push(points[points.length - 1]);
        return smoothed;
    }

    // ----- Hit testing (now takes WORLD coords) --------------------------

    private hitTest(wx: number, wy: number): number {
        for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            const s = this.existingShapes[i];
            if (s.type === "rect") {
                const minX = Math.min(s.x, s.x + s.width);
                const maxX = Math.max(s.x, s.x + s.width);
                const minY = Math.min(s.y, s.y + s.height);
                const maxY = Math.max(s.y, s.y + s.height);
                if (wx >= minX && wx <= maxX && wy >= minY && wy <= maxY) return i;
            } else if (s.type === "circle") {
                const dx = wx - s.centerX;
                const dy = wy - s.centerY;
                const dist2 = dx * dx + dy * dy;
                if (dist2 <= s.radius * s.radius) return i;
            } else if (s.type === "pencil") {
                if (this.isPointNearPencilPath(wx, wy, s.points)) return i;
            }
        }
        return -1;
    }

    /**
     * Point-to-path hit test. Threshold is in world units so that zooming
     * out doesn't magically make erasing easier: you still have to click on
     * the stroke's footprint. (If we wanted it to scale inversely with zoom
     * we'd divide the threshold by cam.zoom.)
     */
    private isPointNearPencilPath(
        x: number,
        y: number,
        points: Array<{ x: number; y: number }>
    ): boolean {
        const threshold = 10 / this.camera.zoom;

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];

            const A = x - p1.x;
            const B = y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;

            if (lenSq === 0) {
                const dist = Math.sqrt(A * A + B * B);
                if (dist <= threshold) return true;
            } else {
                const param = dot / lenSq;
                let xx, yy;

                if (param < 0) {
                    xx = p1.x;
                    yy = p1.y;
                } else if (param > 1) {
                    xx = p2.x;
                    yy = p2.y;
                } else {
                    xx = p1.x + param * C;
                    yy = p1.y + param * D;
                }

                const dx = x - xx;
                const dy = y - yy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= threshold) return true;
            }
        }

        return false;
    }
}
