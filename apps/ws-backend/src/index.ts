import "dotenv/config";
import { WebSocket, WebSocketServer } from "ws";
import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "@repo/backend-common/config";
import { prismaClient } from "@repo/db/client";

const PORT = Number(process.env.PORT) || 8081;
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server running on port ${PORT}`);

interface User {
    ws: WebSocket;
    rooms: string[];
    userId: string;
    userName?: string;
}

const users: User[] = [];

function checkUser(token: string): string | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (typeof decoded === "string") return null;
        const payload = decoded as JwtPayload;
        if (!payload || !payload.userId) return null;
        return payload.userId as string;
    } catch {
        return null;
    }
}

function broadcastUserCount(roomId: string) {
    const roomUsers = users.filter(u => u.rooms.includes(roomId));
    const payload = JSON.stringify({
        type: "user_count",
        roomId,
        count: roomUsers.length,
        users: roomUsers.map(u => ({ userId: u.userId, userName: u.userName }))
    });
    roomUsers.forEach(u => {
        if (u.ws.readyState === WebSocket.OPEN) u.ws.send(payload);
    });
}

wss.on("connection", function connection(ws, request) {
    const url = request.url;
    if (!url) {
        ws.close();
        return;
    }
    const queryParams = new URLSearchParams(url.split("?")[1]);
    const token = queryParams.get("token") || "";
    const userId = checkUser(token);

    if (!userId) {
        ws.close();
        return;
    }

    console.log(`User ${userId} connected`);

    const newUser: User = { userId, rooms: [], ws };
    users.push(newUser);

    ws.on("message", async function message(data) {
        let parsedData: any;
        try {
            parsedData = typeof data === "string" ? JSON.parse(data) : JSON.parse(data.toString());
        } catch {
            return;
        }

        if (parsedData.type === "join_room") {
            const user = users.find(x => x.ws === ws);
            if (user && !user.rooms.includes(parsedData.roomId)) {
                user.rooms.push(parsedData.roomId);
                broadcastUserCount(parsedData.roomId);
            }
            return;
        }

        if (parsedData.type === "leave_room") {
            const user = users.find(x => x.ws === ws);
            if (user) {
                const roomId = parsedData.roomId;
                user.rooms = user.rooms.filter(x => x !== roomId);
                broadcastUserCount(roomId);
            }
            return;
        }

        if (parsedData.type === "chat") {
            const roomId = parsedData.roomId;
            const message = parsedData.message;

            try {
                await prismaClient.chat.create({
                    data: {
                        roomId: Number(roomId),
                        message,
                        userId
                    }
                });

                // Broadcast to everyone in the room EXCEPT the sender.
                // The sender has already applied the change locally; this avoids duplicates.
                users.forEach(user => {
                    if (
                        user.rooms.includes(roomId) &&
                        user.ws !== ws &&
                        user.ws.readyState === WebSocket.OPEN
                    ) {
                        user.ws.send(JSON.stringify({
                            type: "chat",
                            message,
                            roomId,
                            userId
                        }));
                    }
                });
            } catch (error) {
                console.error("Error saving chat message:", error);
            }
        }
    });

    ws.on("close", () => {
        console.log(`User ${userId} disconnected`);
        const idx = users.findIndex(u => u.ws === ws);
        if (idx !== -1) {
            const disconnected = users[idx];
            users.splice(idx, 1);
            if (disconnected) {
                disconnected.rooms.forEach(roomId => broadcastUserCount(roomId));
            }
        }
    });

    ws.on("error", (error) => {
        console.error(`WebSocket error for user ${userId}:`, error);
    });
});
