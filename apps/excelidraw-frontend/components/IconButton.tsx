import { ReactNode } from "react";

export function IconButton({
    icon, onClick, activated, tooltip
}: {
    icon: ReactNode,
    onClick: () => void,
    activated: boolean,
    tooltip?: string
}) {
    return (
        <button 
            className={`
                relative group w-12 h-12 rounded-xl border transition-all duration-200 transform hover:scale-105 active:scale-95
                ${activated 
                    ? "bg-indigo-500 border-indigo-600 text-white shadow-lg" 
                    : "bg-white/90 backdrop-blur-sm border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm hover:shadow-md"
                }
            `} 
            onClick={onClick}
            title={tooltip}
        >
            <div className="flex items-center justify-center w-full h-full">
                {icon}
            </div>
            
            {/* Tooltip */}
            {tooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-50">
                    {tooltip}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                </div>
            )}
        </button>
    );
}

