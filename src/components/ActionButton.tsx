import React from "react";

import { cn } from "../lib/utils";

type Variant = "filled" | "tinted" | "plain" | "destructive";

interface ActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  size?: "sm" | "md";
}

const VARIANTS: Record<Variant, string> = {
  filled: "bg-[#007AFF] text-white hover:brightness-110",
  tinted: "bg-[#007AFF]/[0.12] text-[#007AFF] hover:bg-[#007AFF]/[0.2]",
  plain: "bg-transparent text-[#007AFF] hover:bg-black/5 dark:hover:bg-white/10",
  destructive: "bg-[#FF3B30]/[0.12] text-[#FF3B30] hover:bg-[#FF3B30]/[0.2]"
};

/** Haptic-feeling tactile button: scales on press and fires a tiny vibration where supported. */
export const ActionButton: React.FC<ActionButtonProps> = ({
  variant = "filled",
  icon,
  fullWidth,
  size = "md",
  className,
  children,
  onClick,
  type = "button",
  ...rest
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      navigator.vibrate?.(8);
    } catch {
      /* haptics are best-effort */
    }
    onClick?.(e);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      className={cn(
        "sv-press inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold border-0 cursor-pointer select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100",
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2.5 text-[13px]",
        fullWidth && "w-full",
        VARIANTS[variant],
        className
      )}
      {...rest}>
      {icon}
      {children}
    </button>
  );
};
