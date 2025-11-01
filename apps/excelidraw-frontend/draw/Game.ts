import { getExistingShapes } from "./http";

type Tool = "circle" | "rect" | "pencil" | "erase";

type Shape = {
    type: "rect";
    x: number;
    y: number;
    width: number;
    height: number;
} | {
    type: "circle";
    centerX: number;
    centerY: number;
    radius: number;
} | {
    type: "pencil";
    // Pencil paths are stored as arrays of points for smooth drawing
    points: Array<{x: number, y: number}>;
    // Optional styling properties for future enhancement
    strokeWidth?: number;
    strokeColor?: string;
}

export class Game {

    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private existingShapes: Shape[]
    private roomId: string;
    private clicked: boolean;
    private startX = 0;
    private startY = 0;
    private selectedTool: Tool = "circle";

    // Pencil tool specific properties
    private currentPencilPath: Array<{x: number, y: number}> = [];
    private isDrawingPencil: boolean = false;
    private pencilStrokeWidth: number = 2; // Default stroke width

    socket: WebSocket;

    constructor(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d")!;
        this.existingShapes = [];
        this.roomId = roomId;
        this.socket = socket;
        this.clicked = false;
        this.init();
        this.initHandlers();
        this.initMouseHandlers();
    }
    
    destroy() {
        this.canvas.removeEventListener("mousedown", this.mouseDownHandler)

        this.canvas.removeEventListener("mouseup", this.mouseUpHandler)

        this.canvas.removeEventListener("mousemove", this.mouseMoveHandler)
    }

    setTool(tool: Tool) {
        this.selectedTool = tool;
    }

    /**
     * Sets the stroke width for pencil drawings
     * @param width Stroke width in pixels (1-10 recommended)
     */
    setPencilStrokeWidth(width: number) {
        this.pencilStrokeWidth = Math.max(1, Math.min(20, width)); // Clamp between 1-20
    }

    /**
     * Gets the current pencil stroke width
     * @returns Current stroke width in pixels
     */
    getPencilStrokeWidth(): number {
        return this.pencilStrokeWidth;
    }

    async init() {
        this.existingShapes = await getExistingShapes(this.roomId);
        console.log(this.existingShapes);
        this.clearCanvas();
    }

    initHandlers() {
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
                this.clearCanvas();
            }
        }
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "rgba(0, 0, 0)"
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.existingShapes.forEach((shape) => {
            if (!shape) return;
            if (shape.type === "rect") {
                // Reset canvas context properties for rectangles
                this.ctx.strokeStyle = "rgba(255, 255, 255)";
                this.ctx.lineWidth = 2; // Default line width for rectangles
                this.ctx.lineCap = "butt"; // Default line cap for rectangles
                this.ctx.lineJoin = "miter"; // Default line join for rectangles
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            } else if (shape.type === "circle") {
                // Reset canvas context properties for circles
                this.ctx.strokeStyle = "rgba(255, 255, 255)";
                this.ctx.lineWidth = 2; // Default line width for circles
                this.ctx.lineCap = "butt"; // Default line cap for circles
                this.ctx.lineJoin = "miter"; // Default line join for circles
                this.ctx.beginPath();
                this.ctx.arc(shape.centerX, shape.centerY, Math.abs(shape.radius), 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.closePath();                
            } else if (shape.type === "pencil") {
                // Render pencil paths as smooth curves with their own width
                this.drawPencilPath(shape.points, this.ctx, false, shape.strokeWidth, shape.strokeColor);
            }
        })
    }

    mouseDownHandler = (e: MouseEvent) => {
        this.clicked = true
        this.startX = e.clientX
        this.startY = e.clientY

        // Initialize pencil drawing if pencil tool is selected
        if (this.selectedTool === "pencil") {
            this.isDrawingPencil = true;
            this.currentPencilPath = [{x: e.clientX, y: e.clientY}];
        }
    }
    mouseUpHandler = (e: MouseEvent) => {
        this.clicked = false
        const width = e.clientX - this.startX;
        const height = e.clientY - this.startY;

        const selectedTool = this.selectedTool;
        let shape: Shape | null = null;
        
        if (selectedTool === "erase") {
            // hit-test: prefer last drawn first (top-most)
            const hitIndex = this.hitTest(e.clientX, e.clientY);
            if (hitIndex !== -1) {
                // Do NOT mutate locally to avoid double-delete when our own WS message arrives
                this.socket.send(JSON.stringify({
                    type: "chat",
                    message: JSON.stringify({ action: "delete", index: hitIndex }),
                    roomId: this.roomId
                }))
            }
            return;
        } else if (selectedTool === "pencil") {
            // Complete pencil drawing - create shape from collected points
            if (this.isDrawingPencil && this.currentPencilPath.length > 1) {
                // Apply smoothing to the path for more natural looking strokes
                const smoothedPath = this.smoothPath(this.currentPencilPath);
                shape = {
                    type: "pencil",
                    points: smoothedPath,
                    strokeWidth: this.pencilStrokeWidth, // Use current stroke width setting
                    strokeColor: "rgba(255, 255, 255, 1)" // Default white stroke
                };
            }
            // Reset pencil drawing state
            this.isDrawingPencil = false;
            this.currentPencilPath = [];
        } else if (selectedTool === "rect") {
            shape = {
                type: "rect",
                x: this.startX,
                y: this.startY,
                height,
                width
            }
        } else if (selectedTool === "circle") {
            const radius = Math.max(width, height) / 2;
            shape = {
                type: "circle",
                radius: radius,
                centerX: this.startX + radius,
                centerY: this.startY + radius,
            }
        }

        if (!shape) {
            return;
        }

        this.existingShapes.push(shape);

        this.socket.send(JSON.stringify({
            type: "chat",
            message: JSON.stringify({ action: "add", shape }),
            roomId: this.roomId
        }))
    }
    mouseMoveHandler = (e: MouseEvent) => {
        if (this.clicked) {
            const width = e.clientX - this.startX;
            const height = e.clientY - this.startY;
            this.clearCanvas();
            const selectedTool = this.selectedTool;
            
            if (selectedTool === "pencil" && this.isDrawingPencil) {
                // Add current point to pencil path
                this.currentPencilPath.push({x: e.clientX, y: e.clientY});
                
                // Draw the current pencil path in real-time for visual feedback
                this.drawPencilPath(this.currentPencilPath, this.ctx, true, this.pencilStrokeWidth);
            } else if (selectedTool === "rect") {
                // Set proper context properties for rectangle preview
                this.ctx.strokeStyle = "rgba(255, 255, 255)";
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = "butt";
                this.ctx.lineJoin = "miter";
                this.ctx.strokeRect(this.startX, this.startY, width, height);   
            } else if (selectedTool === "circle") {
                // Set proper context properties for circle preview
                this.ctx.strokeStyle = "rgba(255, 255, 255)";
                this.ctx.lineWidth = 2;
                this.ctx.lineCap = "butt";
                this.ctx.lineJoin = "miter";
                const radius = Math.max(width, height) / 2;
                const centerX = this.startX + radius;
                const centerY = this.startY + radius;
                this.ctx.beginPath();
                this.ctx.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
                this.ctx.stroke();
                this.ctx.closePath();                
            }
        }
    }

    initMouseHandlers() {
        this.canvas.addEventListener("mousedown", this.mouseDownHandler)

        this.canvas.addEventListener("mouseup", this.mouseUpHandler)

        this.canvas.addEventListener("mousemove", this.mouseMoveHandler)    

    }

    /**
     * Draws a pencil path using quadratic curves for smooth appearance
     * @param points Array of points defining the path
     * @param ctx Canvas rendering context
     * @param isPreview Whether this is a preview (real-time drawing) or final render
     * @param strokeWidth Optional stroke width (defaults to 2)
     * @param strokeColor Optional stroke color (defaults to white)
     */
    private drawPencilPath(
        points: Array<{x: number, y: number}>, 
        ctx: CanvasRenderingContext2D, 
        isPreview: boolean = false,
        strokeWidth?: number,
        strokeColor?: string
    ) {
        if (points.length < 2) return;

        // Set stroke properties
        ctx.strokeStyle = strokeColor || "rgba(255, 255, 255, 1)";
        ctx.lineWidth = strokeWidth || 2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Start drawing the path
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);

        // For smooth curves, use quadratic curves between points
        // This creates the hand-drawn aesthetic similar to Excalidraw
        for (let i = 1; i < points.length; i++) {
            const currentPoint = points[i];
            const previousPoint = points[i - 1];
            
            if (i === 1) {
                // First segment - just draw a line
                ctx.lineTo(currentPoint.x, currentPoint.y);
            } else {
                // Use quadratic curves for smoothness
                const controlPoint = {
                    x: (previousPoint.x + currentPoint.x) / 2,
                    y: (previousPoint.y + currentPoint.y) / 2
                };
                ctx.quadraticCurveTo(previousPoint.x, previousPoint.y, controlPoint.x, controlPoint.y);
            }
        }

        ctx.stroke();
        ctx.closePath();
    }

    /**
     * Applies smoothing to a pencil path to make it look more natural
     * Uses a simple moving average filter to reduce jitter
     * @param points Raw points from mouse movement
     * @returns Smoothed points array
     */
    private smoothPath(points: Array<{x: number, y: number}>): Array<{x: number, y: number}> {
        if (points.length < 3) return points;

        const smoothed: Array<{x: number, y: number}> = [];
        
        // Keep first point unchanged
        smoothed.push(points[0]);

        // Apply smoothing to middle points using a simple moving average
        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const curr = points[i];
            const next = points[i + 1];

            // Simple 3-point moving average for smoothing
            smoothed.push({
                x: (prev.x + curr.x + next.x) / 3,
                y: (prev.y + curr.y + next.y) / 3
            });
        }

        // Keep last point unchanged
        smoothed.push(points[points.length - 1]);

        return smoothed;
    }

    private hitTest(x: number, y: number): number {
        // iterate from end for top-most hit
        for (let i = this.existingShapes.length - 1; i >= 0; i--) {
            const s = this.existingShapes[i];
            if (s.type === "rect") {
                const within = x >= s.x && x <= s.x + s.width && y >= s.y && y <= s.y + s.height;
                if (within) return i;
            } else if (s.type === "circle") {
                const dx = x - s.centerX;
                const dy = y - s.centerY;
                const dist2 = dx * dx + dy * dy;
                if (dist2 <= s.radius * s.radius) return i;
            } else if (s.type === "pencil") {
                // Hit testing for pencil paths - check if point is near any segment
                if (this.isPointNearPencilPath(x, y, s.points)) return i;
            }
        }
        return -1;
    }

    /**
     * Checks if a point is near a pencil path for hit testing
     * @param x X coordinate to test
     * @param y Y coordinate to test
     * @param points Pencil path points
     * @returns True if point is near the path
     */
    private isPointNearPencilPath(x: number, y: number, points: Array<{x: number, y: number}>): boolean {
        const threshold = 10; // Hit test threshold in pixels

        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            
            // Calculate distance from point to line segment
            const A = x - p1.x;
            const B = y - p1.y;
            const C = p2.x - p1.x;
            const D = p2.y - p1.y;

            const dot = A * C + B * D;
            const lenSq = C * C + D * D;
            
            if (lenSq === 0) {
                // Line segment has zero length
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