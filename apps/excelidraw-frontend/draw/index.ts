import { HTTP_BACKEND } from "@/config";
import axios from "axios";

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

export async function initDraw(canvas: HTMLCanvasElement, roomId: string, socket: WebSocket) {
    const ctx = canvas.getContext("2d");

    let existingShapes: Shape[] = await getExistingShapes(roomId)

    if (!ctx) {
        return
    }

    socket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if (message.type == "chat") {
            const parsedShape = JSON.parse(message.message)
            existingShapes.push(parsedShape.shape)
            clearCanvas(existingShapes, canvas, ctx);
        }
    }
    

    clearCanvas(existingShapes, canvas, ctx);
    let clicked = false;
    let startX = 0;
    let startY = 0;

    canvas.addEventListener("mousedown", (e) => {
        clicked = true
        startX = e.clientX
        startY = e.clientY
    })

    canvas.addEventListener("mouseup", (e) => {
        clicked = false
        const width = e.clientX - startX;
        const height = e.clientY - startY;

        // @ts-ignore
        const selectedTool = window.selectedTool;
        let shape: Shape | null = null;
        if (selectedTool === "rect") {

            shape = {
                type: "rect",
                x: startX,
                y: startY,
                height,
                width
            }
        } else if (selectedTool === "circle") {
            const radius = Math.max(width, height) / 2;
            shape = {
                type: "circle",
                radius: radius,
                centerX: startX + radius,
                centerY: startY + radius,
            }
        }

        if (!shape) {
            return;
        }

        existingShapes.push(shape);

        socket.send(JSON.stringify({
            type: "chat",
            message: JSON.stringify({
                shape
            }),
            roomId
        }))

    })

    canvas.addEventListener("mousemove", (e) => {
        if (clicked) {
            const width = e.clientX - startX;
            const height = e.clientY - startY;
            clearCanvas(existingShapes, canvas, ctx);
            ctx.strokeStyle = "rgba(255, 255, 255)"
            // @ts-ignore
            const selectedTool = window.selectedTool;
            if (selectedTool === "rect") {
                ctx.strokeRect(startX, startY, width, height);   
            } else if (selectedTool === "circle") {
                const radius = Math.max(width, height) / 2;
                const centerX = startX + radius;
                const centerY = startY + radius;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.closePath();                
            }
        }
    })            
}

function clearCanvas(existingShapes: Shape[], canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0, 0, 0)"
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    existingShapes.map((shape) => {
        if (shape.type === "rect") {
            ctx.strokeStyle = "rgba(255, 255, 255)"
            ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        } else if (shape.type === "circle") {
            ctx.beginPath();
            ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.closePath();                
        } else if (shape.type === "pencil") {
            // Render pencil paths as smooth curves
            drawPencilPath(shape.points, ctx, false, shape.strokeWidth, shape.strokeColor);
        }
    })
}

/**
 * Draws a pencil path using quadratic curves for smooth appearance
 * @param points Array of points defining the path
 * @param ctx Canvas rendering context
 * @param isPreview Whether this is a preview (real-time drawing) or final render
 * @param strokeWidth Optional stroke width (defaults to 2)
 * @param strokeColor Optional stroke color (defaults to white)
 */
function drawPencilPath(
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

async function getExistingShapes(roomId: string) {
    const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`);
    const messages = res.data.messages;

    const shapes = messages.map((x: {message: string}) => {
        const messageData = JSON.parse(x.message)
        return messageData.shape;
    })

    return shapes;
}