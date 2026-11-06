import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = "primary",
  size = "md",
  children,
  ...props
}) => {
  const base = "inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20",
    secondary: "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700",
    danger: "bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20",
    outline: "border border-slate-700 hover:bg-slate-800 text-slate-300",
    ghost: "hover:bg-slate-800 text-slate-400 hover:text-white"
  };

  const sizes = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-4 py-2 text-xs",
    lg: "px-5 py-2.5 text-sm"
  };

  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
};

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, children, ...props }) => {
  return (
    <div className={cn("glass-card rounded-2xl border border-surface-border p-4", className)} {...props}>
      {children}
    </div>
  );
};

export const Badge: React.FC<{
  label: string;
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}> = ({ label, variant = "neutral", className }) => {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    info: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    neutral: "bg-slate-800 text-slate-300 border-slate-700"
  };

  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border", styles[variant], className)}>
      {label}
    </span>
  );
};

export const KPICard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeVariant?: "success" | "warning" | "danger" | "info" | "neutral";
  className?: string;
}> = ({ title, value, subtitle, icon, badge, badgeVariant = "neutral", className }) => {
  return (
    <Card className={cn("flex flex-col justify-between p-3.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        {icon && <div className="p-1.5 rounded-lg bg-slate-800/80 text-slate-300">{icon}</div>}
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
        {badge && <Badge label={badge} variant={badgeVariant} />}
      </div>
      {subtitle && <div className="mt-1 text-[10px] text-slate-400">{subtitle}</div>}
    </Card>
  );
};
