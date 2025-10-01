import { HTTP_BACKEND } from "@/config";
import axios from "axios";

export async function getExistingShapes(roomId: string) {
    const res = await axios.get(`${HTTP_BACKEND}/chats/${roomId}`);
    const messages = res.data.messages;

    // Apply messages in chronological order to reconstruct current shapes
    const ordered = [...messages].reverse();
    const shapes: any[] = [];
    ordered.forEach((x: { message: string }) => {
        try {
            const msg = JSON.parse(x.message);
            if (msg?.action === "delete" && typeof msg?.index === "number") {
                if (msg.index >= 0 && msg.index < shapes.length) {
                    shapes.splice(msg.index, 1);
                }
            } else if (msg?.action === "add" && msg?.shape) {
                shapes.push(msg.shape);
            } else if (msg?.shape) {
                // Backward compatibility: treat as add
                shapes.push(msg.shape);
            }
        } catch {}
    })

    return shapes;
}