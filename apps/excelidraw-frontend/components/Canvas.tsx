import { useEffect, useRef, useState } from "react";
import { IconButton } from "./IconButton";
import { Circle, Eraser, Pencil, RectangleHorizontal, Palette, Settings, Users, Home, Save } from "lucide-react";
import { Game } from "@/draw/Game";
import Link from "next/link";

export type Tool = "circle" | "rect" | "pencil" | "erase";

export function Canvas({
    roomId,
    socket
}: {
    socket: WebSocket;
    roomId: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [game, setGame] = useState<Game>();
    const [selectedTool, setSelectedTool] = useState<Tool>("circle");
    const [pencilWidth, setPencilWidth] = useState<number>(2);
    const [showWidthSelector, setShowWidthSelector] = useState<boolean>(false);
    const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
    const [selectedColor, setSelectedColor] = useState<string>("#4F46E5");
    const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
    const [userCount, setUserCount] = useState<number>(1);
    const [isConnected, setIsConnected] = useState<boolean>(false);

    // Handle window resize and initial dimensions
    useEffect(() => {
        const updateDimensions = () => {
            if (typeof window !== 'undefined') {
                setDimensions({
                    width: window.innerWidth,
                    height: window.innerHeight
                });
            }
        };

        updateDimensions();
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', updateDimensions);
            return () => window.removeEventListener('resize', updateDimensions);
        }
    }, []);

    // Handle WebSocket messages
    useEffect(() => {
        if (!socket) return;

        const handleMessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.type === "user_count") {
                    setUserCount(data.count);
                }
                
                if (data.type === "drawing") {
                    // Handle drawing updates from other users
                    // TODO: Implement remote drawing handling in Game class
                    console.log("Received drawing data from another user:", data);
                }
            } catch (error) {
                console.error("Error parsing WebSocket message:", error);
            }
        };

        socket.addEventListener('message', handleMessage);
        
        // Set connected state
        if (socket.readyState === WebSocket.OPEN) {
            setIsConnected(true);
        }

        socket.addEventListener('open', () => setIsConnected(true));
        socket.addEventListener('close', () => setIsConnected(false));
        socket.addEventListener('error', () => setIsConnected(false));

        return () => {
            socket.removeEventListener('message', handleMessage);
        };
    }, [socket, game]);

    useEffect(() => {
        game?.setTool(selectedTool);
    }, [selectedTool, game]);

    useEffect(() => {
        game?.setPencilStrokeWidth(pencilWidth);
    }, [pencilWidth, game]);

    useEffect(() => {
        if (selectedTool !== "pencil") {
            setShowWidthSelector(false);
        }
    }, [selectedTool]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showWidthSelector || showColorPicker) {
                setShowWidthSelector(false);
                setShowColorPicker(false);
            }
        };

        if (showWidthSelector || showColorPicker) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showWidthSelector, showColorPicker]);

    useEffect(() => {
        if (canvasRef.current) {
            const g = new Game(canvasRef.current, roomId, socket);
            setGame(g);

            return () => {
                g.destroy();
            }
        }
    }, [canvasRef, roomId, socket]);

    return (
        <div className="h-screen w-screen relative overflow-hidden bg-gray-50">
            {/* Canvas */}
            <canvas 
                ref={canvasRef} 
                width={dimensions.width} 
                height={dimensions.height}
                className="absolute inset-0 cursor-crosshair"
            />
            
            {/* Top Toolbar */}
            <Topbar 
                setSelectedTool={setSelectedTool} 
                selectedTool={selectedTool}
                pencilWidth={pencilWidth}
                setPencilWidth={setPencilWidth}
                showWidthSelector={showWidthSelector}
                setShowWidthSelector={setShowWidthSelector}
                showColorPicker={showColorPicker}
                setShowColorPicker={setShowColorPicker}
                selectedColor={selectedColor}
                setSelectedColor={setSelectedColor}
                roomId={roomId}
                userCount={userCount}
                isConnected={isConnected}
            />
            
            {/* Bottom Status Bar */}
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 glass-effect bg-white/80 backdrop-blur-xl rounded-full px-6 py-3 shadow-lg border border-white/20">
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div>Room: {roomId}</div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{userCount} {userCount === 1 ? 'user' : 'users'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Topbar({
    selectedTool, 
    setSelectedTool,
    pencilWidth,
    setPencilWidth,
    showWidthSelector,
    setShowWidthSelector,
    showColorPicker,
    setShowColorPicker,
    selectedColor,
    setSelectedColor,
    roomId,
    userCount,
    isConnected
}: {
    selectedTool: Tool,
    setSelectedTool: (s: Tool) => void,
    pencilWidth: number,
    setPencilWidth: (w: number) => void,
    showWidthSelector: boolean,
    setShowWidthSelector: (show: boolean) => void,
    showColorPicker: boolean,
    setShowColorPicker: (show: boolean) => void,
    selectedColor: string,
    setSelectedColor: (color: string) => void,
    roomId: string,
    userCount: number,
    isConnected: boolean
}) {
    return (
        <div className="fixed top-4 left-4 right-4 z-50">
            <div className="flex items-center justify-between">
                {/* Left: Main Tools */}
                <div className="glass-effect bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/20">
                    <div className="flex items-center space-x-2">
                        <IconButton 
                            onClick={() => {
                                if (selectedTool === "pencil") {
                                    setShowWidthSelector(!showWidthSelector);
                                } else {
                                    setSelectedTool("pencil");
                                    setShowWidthSelector(true);
                                }
                            }}
                            activated={selectedTool === "pencil"}
                            icon={<Pencil className="w-5 h-5" />}
                            tooltip="Pencil"
                        />
                        <IconButton 
                            onClick={() => setSelectedTool("rect")} 
                            activated={selectedTool === "rect"} 
                            icon={<RectangleHorizontal className="w-5 h-5" />}
                            tooltip="Rectangle"
                        />
                        <IconButton 
                            onClick={() => setSelectedTool("circle")} 
                            activated={selectedTool === "circle"} 
                            icon={<Circle className="w-5 h-5" />}
                            tooltip="Circle"
                        />
                        <IconButton 
                            onClick={() => setSelectedTool("erase")} 
                            activated={selectedTool === "erase"} 
                            icon={<Eraser className="w-5 h-5" />}
                            tooltip="Eraser"
                        />
                        
                        <div className="w-px h-8 bg-gray-200 mx-2"></div>
                        
                        {/* Color Picker */}
                        <button
                            onClick={() => setShowColorPicker(!showColorPicker)}
                            className="relative w-12 h-12 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-sm hover:shadow-md"
                            style={{ backgroundColor: selectedColor }}
                            title="Color"
                        >
                            <Palette className="w-5 h-5 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{
                                filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.5))'
                            }} />
                        </button>
                    </div>

                    {/* Pencil Width Selector */}
                    {selectedTool === "pencil" && showWidthSelector && (
                        <div className="absolute top-full mt-2 left-0">
                            <PencilWidthSelector 
                                currentWidth={pencilWidth}
                                onWidthChange={(width) => {
                                    setPencilWidth(width);
                                    setShowWidthSelector(false);
                                }}
                                onClose={() => setShowWidthSelector(false)}
                            />
                        </div>
                    )}

                    {/* Color Picker */}
                    {showColorPicker && (
                        <div className="absolute top-full mt-2 right-0">
                            <ColorPicker 
                                selectedColor={selectedColor}
                                onColorChange={setSelectedColor}
                                onClose={() => setShowColorPicker(false)}
                            />
                        </div>
                    )}
                </div>

                {/* Center: Room Info */}
                <div className="glass-effect bg-white/80 backdrop-blur-xl rounded-2xl px-6 py-3 shadow-xl border border-white/20">
                    <div className="text-center">
                        <div className="text-sm font-medium text-gray-900">CollabDraw</div>
                        <div className="text-xs text-gray-500">Room {roomId}</div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="glass-effect bg-white/80 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/20">
                    <div className="flex items-center space-x-2">
                        <IconButton 
                            onClick={() => {}}
                            activated={false}
                            icon={<Save className="w-5 h-5" />}
                            tooltip="Save"
                        />
                        <IconButton 
                            onClick={() => {}}
                            activated={false}
                            icon={<Settings className="w-5 h-5" />}
                            tooltip="Settings"
                        />
                        <Link href="/room">
                            <IconButton 
                                onClick={() => {}}
                                activated={false}
                                icon={<Home className="w-5 h-5" />}
                                tooltip="Back to Rooms"
                            />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Pencil Width Selector Component
 */
function PencilWidthSelector({
    currentWidth,
    onWidthChange,
    onClose
}: {
    currentWidth: number;
    onWidthChange: (width: number) => void;
    onClose: () => void;
}) {
    const widthOptions = [
        { value: 1, label: "Thin" },
        { value: 2, label: "Medium" },
        { value: 4, label: "Thick" },
        { value: 6, label: "Extra Thick" },
        { value: 8, label: "Marker" }
    ];

    return (
        <div 
            className="glass-effect bg-white/90 backdrop-blur-xl rounded-xl p-4 shadow-xl border border-white/20 min-w-48"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-900">Brush Size</div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Close"
                >
                    ✕
                </button>
            </div>
            <div className="space-y-2">
                {widthOptions.map((option) => (
                    <button
                        key={option.value}
                        onClick={() => onWidthChange(option.value)}
                        className={`
                            flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-all duration-200
                            ${currentWidth === option.value 
                                ? 'bg-indigo-500 text-white shadow-md' 
                                : 'text-gray-700 hover:bg-gray-100'
                            }
                        `}
                    >
                        <span>{option.label}</span>
                        <div 
                            className="bg-current rounded-full"
                            style={{
                                width: `${Math.max(4, option.value * 2)}px`,
                                height: `${Math.max(4, option.value * 2)}px`
                            }}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Color Picker Component
 */
function ColorPicker({
    selectedColor,
    onColorChange,
    onClose
}: {
    selectedColor: string;
    onColorChange: (color: string) => void;
    onClose: () => void;
}) {
    const colors = [
        "#000000", "#374151", "#6B7280", "#9CA3AF",
        "#EF4444", "#F97316", "#EAB308", "#22C55E",
        "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
        "#14B8A6", "#F59E0B", "#84CC16", "#06B6D4"
    ];

    return (
        <div 
            className="glass-effect bg-white/90 backdrop-blur-xl rounded-xl p-4 shadow-xl border border-white/20 w-48"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-medium text-gray-900">Colors</div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Close"
                >
                    ✕
                </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                    <button
                        key={color}
                        onClick={() => {
                            onColorChange(color);
                            onClose();
                        }}
                        className={`
                            w-8 h-8 rounded-lg border-2 transition-all duration-200 transform hover:scale-110
                            ${selectedColor === color 
                                ? 'border-indigo-500 shadow-md' 
                                : 'border-gray-200 hover:border-gray-300'
                            }
                        `}
                        style={{ backgroundColor: color }}
                        title={color}
                    />
                ))}
            </div>
        </div>
    );
}