"use client";

import { WS_URL } from "@/config";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Canvas } from "./Canvas";

export function RoomCanvas({roomId}: {roomId: string}) {
    const [socket, setSocket] = useState<WebSocket | null>(null);
    const router = useRouter();

    useEffect(() => {
        const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (!token) {
            router.push("/signin");
            return;
        }

        const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

        ws.onopen = () => {
            setSocket(ws);
            const data = JSON.stringify({
                type: "join_room",
                roomId
            });
            ws.send(data)
        }

        ws.onclose = () => {
            setSocket(null);
        }

        return () => {
            try { ws.close(); } catch (e) {}
        }
        
    }, [roomId, router])
   
    if (!socket) {
        return <div>
            Connecting to server....
        </div>
    }

    return <div>
        <Canvas roomId={roomId} socket={socket} />
    </div>
}