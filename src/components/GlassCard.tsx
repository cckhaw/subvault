import React from "react";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

/** Apple HIG translucent container: 20px radius, blur(20px), hairline border, ambient shadow. */
export const GlassCard: React.FC<GlassCardProps> = ({ children, className = "" }) => {
  return (
    <div
      className={`bg-white/75 dark:bg-zinc-900/75 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 ${className}`}
      style={{ WebkitBackdropFilter: "saturate(180%) blur(20px)", backdropFilter: "saturate(180%) blur(20px)" }}>
      {children}
    </div>
  );
};
