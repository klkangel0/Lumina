import React from 'react';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-[#6E9EFF] text-white hover:bg-[#5b8fff] focus:ring-[#6E9EFF] shadow-md shadow-blue-500/20",
        secondary: "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 focus:ring-gray-200 shadow-sm",
        danger: "bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-md shadow-red-500/20",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900",
    };

    return (
        <button
            className={`${baseStyle} ${variants[variant]} ${className} px-4 py-2 text-sm`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
