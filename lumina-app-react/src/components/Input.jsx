import React from 'react';

const Input = ({ className = '', ...props }) => {
    return (
        <input
            className={`w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#6E9EFF]/20 focus:border-[#6E9EFF] outline-none transition-all text-sm text-gray-800 placeholder-gray-400 ${className}`}
            {...props}
        />
    );
};

export default Input;
