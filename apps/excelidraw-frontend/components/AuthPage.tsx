"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { HTTP_BACKEND } from "@/config";
import { Button } from "@repo/ui/button";
import { Eye, EyeOff, Mail, Lock, User, Pencil, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function AuthPage({isSignin}: {
    isSignin: boolean
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

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
                router.push("/room");
            } else {
                await axios.post(`${HTTP_BACKEND}/signup`, {
                    username: email,
                    password,
                    name
                });
                router.push("/signin");
            }
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-400/10 rounded-full blur-3xl"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Back to home link */}
                <Link href="/" className="inline-flex items-center text-gray-600 hover:text-indigo-600 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to home
                </Link>

                {/* Auth card */}
                <div className="glass-effect bg-white/80 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Pencil className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                            {isSignin ? "Welcome back" : "Create account"}
                        </h1>
                        <p className="text-gray-600">
                            {isSignin 
                                ? "Sign in to continue to your dashboard" 
                                : "Join thousands of creators today"
                            }
                        </p>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                        {/* Email field */}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-gray-700">
                                Email address
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    className="input-field pl-10"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Name field (signup only) */}
                        {!isSignin && (
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium text-gray-700">
                                    Full name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="name"
                                        type="text"
                                        required
                                        className="input-field pl-10"
                                        placeholder="Enter your full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Password field */}
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-gray-700">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="input-field pl-10 pr-10"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-red-800 text-sm">{error}</p>
                            </div>
                        )}

                        {/* Submit button */}
                        <Button
                            variant="primary"
                            size="lg"
                            className="w-full"
                            disabled={loading || !email || !password || (!isSignin && !name)}
                            loading={loading}
                            onClick={handleSubmit}
                        >
                            {loading 
                                ? (isSignin ? "Signing in..." : "Creating account...") 
                                : (isSignin ? "Sign in" : "Create account")
                            }
                        </Button>

                        {/* Forgot password (signin only) */}
                        {isSignin && (
                            <div className="text-center">
                                <a href="#" className="text-sm text-indigo-600 hover:text-indigo-500">
                                    Forgot your password?
                                </a>
                            </div>
                        )}
                    </form>

                    {/* Switch between signin/signup */}
                    <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                        <p className="text-gray-600">
                            {isSignin ? "Don't have an account?" : "Already have an account?"}
                            {" "}
                            <Link 
                                href={isSignin ? "/signup" : "/signin"} 
                                className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
                            >
                                {isSignin ? "Sign up" : "Sign in"}
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Additional info */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        By continuing, you agree to our{" "}
                        <a href="#" className="text-indigo-600 hover:text-indigo-500">Terms of Service</a>
                        {" "}and{" "}
                        <a href="#" className="text-indigo-600 hover:text-indigo-500">Privacy Policy</a>
                    </p>
                </div>
            </div>
        </div>
    );
}