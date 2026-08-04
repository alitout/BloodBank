import React from "react";
import logo from "../../assets/logo.png"

export const Logo = ({ className = "", size = 64 }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ minWidth: size }}>
      <img src={logo} alt="LSA Logo" style={{ width: size, height: size }} />
    </div>
  );
};
