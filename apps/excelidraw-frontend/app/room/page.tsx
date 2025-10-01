"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { HTTP_BACKEND } from "@/config";

export default function RoomPage() {
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();
    const [roomIdInput, setRoomIdInput] = useState("");

    async function createRoom() {
        setLoading(true);
        setError("");
        try {
            const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
            if (!token) {
                router.push("/signin");
                return;
            }
            const res = await axios.post(`${HTTP_BACKEND}/room`, {
                name
            }, {
                headers: {
                    authorization: token
                }
            });
            const roomId = res.data?.roomId;
            if (!roomId) throw new Error("No roomId returned");
            router.push(`/canvas/${roomId}`);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "Failed to create room");
        } finally {
            setLoading(false);
        }
    }

    async function joinRoomBySlug() {
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${HTTP_BACKEND}/room/${encodeURIComponent(slug)}`);
            const roomId = res.data?.room?.id;
            if (!roomId) throw new Error("Room not found");
            router.push(`/canvas/${roomId}`);
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "Failed to join room");
        } finally {
            setLoading(false);
        }
    }

    return <div className="w-screen h-screen flex justify-center items-center">
        <div className="p-6 m-2 bg-white rounded w-full max-w-sm">
            <div className="font-semibold mb-2">Create a room</div>
            <div className="p-2">
                <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Room name (slug)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div>
            <div className="p-2">
                <button
                    disabled={loading || !name}
                    className="bg-blue-500 text-white rounded p-2 w-full disabled:opacity-60"
                    onClick={createRoom}
                >{loading ? "Creating..." : "Create & Open"}</button>
            </div>

            <div className="h-px bg-gray-200 my-4" />

            <div className="font-semibold mb-2">Join by slug</div>
            <div className="p-2">
                <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Existing room slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                />
            </div>
            <div className="p-2">
                <button
                    disabled={loading || !slug}
                    className="bg-green-600 text-white rounded p-2 w-full disabled:opacity-60"
                    onClick={joinRoomBySlug}
                >{loading ? "Joining..." : "Join"}</button>
            </div>

            <div className="h-px bg-gray-200 my-4" />

            <div className="font-semibold mb-2">Join by room ID</div>
            <div className="p-2">
                <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Room ID (number)"
                    value={roomIdInput}
                    onChange={(e) => setRoomIdInput(e.target.value)}
                />
            </div>
            <div className="p-2">
                <button
                    disabled={loading || !roomIdInput}
                    className="bg-purple-600 text-white rounded p-2 w-full disabled:opacity-60"
                    onClick={async () => {
                        if (!roomIdInput.trim()) return;
                        const id = Number(roomIdInput.trim());
                        if (Number.isNaN(id)) {
                            setError("Room ID must be a number");
                            return;
                        }
                        setLoading(true);
                        setError("");
                        try {
                            const res = await axios.get(`${HTTP_BACKEND}/room/id/${id}`);
                            const roomId = res.data?.room?.id;
                            if (!roomId) throw new Error("Room not found");
                            router.push(`/canvas/${roomId}`);
                        } catch (e: any) {
                            setError(e?.response?.data?.message || e?.message || "Failed to join room");
                        } finally {
                            setLoading(false);
                        }
                    }}
                >Go to Canvas</button>
            </div>

            {error ? <div className="p-2 text-red-600 text-sm">{error}</div> : null}
        </div>
    </div>
}


