"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { HTTP_BACKEND } from "@/config";

export function AuthPage({isSignin}: {
    isSignin: boolean
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const router = useRouter();

    async function handleSubmit() {
        setLoading(true);
        setError("");
        try {
            if (isSignin) {
                const res = await axios.post(`${HTTP_BACKEND}/signin`, {
                    username: email,
                    password
                });
                const token = res.data?.token;
                if (!token) {
                    throw new Error("No token received");
                }
                localStorage.setItem("token", token);
                // We'll wire room navigation in the next step
                router.push("/room");
            } else {
                await axios.post(`${HTTP_BACKEND}/signup`, {
                    username: email,
                    password,
                    name
                });
                // After successful signup, go to signin
                router.push("/signin");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return <div className="w-screen h-screen flex justify-center items-center">
        <div className="p-6 m-2 bg-white rounded w-full max-w-sm">
            <div className="p-2">
                <input
                    className="border rounded px-3 py-2 w-full"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            {!isSignin ? <div className="p-2">
                <input
                    className="border rounded px-3 py-2 w-full"
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </div> : null}
            <div className="p-2">
                <input
                    className="border rounded px-3 py-2 w-full"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            {error ? <div className="p-2 text-red-600 text-sm">{error}</div> : null}
            <div className="pt-2 p-2">
                <button
                    disabled={loading || !email || !password || (!isSignin && !name)}
                    className="bg-red-200 disabled:opacity-60 rounded p-2 w-full"
                    onClick={handleSubmit}
                >
                    {loading ? (isSignin ? "Signing in..." : "Signing up...") : (isSignin ? "Sign in" : "Sign up")}
                </button>
            </div>
        </div>
    </div>

}