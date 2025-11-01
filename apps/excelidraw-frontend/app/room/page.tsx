"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { HTTP_BACKEND } from "@/config";
import { Button } from "@repo/ui/button";
import { Plus, Users, Hash, ArrowLeft, Pencil, Share2 } from "lucide-react";
import Link from "next/link";

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

    async function joinRoomById() {
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
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                    {/* Back to home link */}
                    <Link href="/" className="inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors mb-8">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to home
                    </Link>

                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="w-20 h-20 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Pencil className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-4xl font-bold text-gray-900 mb-4">
                            Choose Your Canvas
                        </h1>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Create a new collaborative space or join an existing room to start drawing together.
                        </p>
                    </div>

                    {/* Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                        {/* Create Room Card */}
                        <div className="glass-effect bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-6">
                                <Plus className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Create New Room</h3>
                            <p className="text-gray-600 mb-6">
                                Start a fresh canvas and invite others to collaborate with you in real-time.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Room Name
                                    </label>
                                    <input
                                        className="input-field"
                                        placeholder="Enter room name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    disabled={loading || !name}
                                    loading={loading}
                                    onClick={createRoom}
                                >
                                    Create & Open Canvas
                                </Button>
                            </div>
                        </div>

                        {/* Join by Slug Card */}
                        <div className="glass-effect bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mb-6">
                                <Share2 className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Join by Link</h3>
                            <p className="text-gray-600 mb-6">
                                Have a room link? Enter the room name to join an existing collaborative session.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Room Slug
                                    </label>
                                    <input
                                        className="input-field"
                                        placeholder="Enter room slug"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    disabled={loading || !slug}
                                    loading={loading}
                                    onClick={joinRoomBySlug}
                                >
                                    Join Room
                                </Button>
                            </div>
                        </div>

                        {/* Join by ID Card */}
                        <div className="glass-effect bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-6">
                                <Hash className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-4">Join by ID</h3>
                            <p className="text-gray-600 mb-6">
                                Enter a specific room ID number to directly access a collaborative canvas.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Room ID
                                    </label>
                                    <input
                                        className="input-field"
                                        placeholder="Enter room ID (number)"
                                        value={roomIdInput}
                                        onChange={(e) => setRoomIdInput(e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    disabled={loading || !roomIdInput}
                                    loading={loading}
                                    onClick={joinRoomById}
                                >
                                    Go to Canvas
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                                <p className="text-red-800 text-center">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Quick tips */}
                    <div className="max-w-3xl mx-auto mt-12">
                        <div className="glass-effect bg-white/60 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                <Users className="w-5 h-5 mr-2 text-indigo-600" />
                                Quick Tips
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <p>Share room links with teammates for instant collaboration</p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <p>All changes are saved automatically in real-time</p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <p>Use multiple drawing tools and customize colors</p>
                                </div>
                                <div className="flex items-start space-x-3">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full mt-2 flex-shrink-0"></div>
                                    <p>See live cursors and collaborators in the same space</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


