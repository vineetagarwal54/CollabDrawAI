"use client";

import { ReactNode } from "react";

interface ButtonProps {
  variant: "primary" | "outline" | "secondary" | "ghost" | "destructive";
  className?: string;
  onClick?: () => void;
  size: "lg" | "sm" | "md" | "xl";
  children: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export const Button = ({ 
  size, 
  variant, 
  className = "", 
  onClick, 
  children, 
  disabled = false,
  loading = false
}: ButtonProps) => {
  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-300 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const sizeClasses = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-4 py-2 text-sm rounded-lg",
    lg: "px-6 py-3 text-base rounded-xl",
    xl: "px-8 py-4 text-lg rounded-xl"
  };
  
  const variantClasses = {
    primary: "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl hover:scale-105 focus:ring-indigo-500",
    secondary: "bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm hover:shadow-md hover:scale-105 focus:ring-gray-500",
    outline: "border-2 border-indigo-500 text-indigo-600 hover:bg-indigo-500 hover:text-white bg-transparent hover:scale-105 focus:ring-indigo-500",
    ghost: "text-gray-700 hover:bg-gray-100 hover:text-gray-900 bg-transparent hover:scale-105 focus:ring-gray-500",
    destructive: "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg hover:shadow-xl hover:scale-105 focus:ring-red-500"
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading && (
        <div className="spinner mr-2"></div>
      )}
      {children}
    </button>
  );
};
