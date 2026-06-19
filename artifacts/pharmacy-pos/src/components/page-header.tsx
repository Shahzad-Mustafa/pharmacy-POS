import type { ReactNode, ElementType } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon: ElementType;
  actions?: ReactNode;
  gradient?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  gradient = "from-teal-600 via-teal-500 to-emerald-500",
}: PageHeaderProps) {
  return (
    <div className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br ${gradient} p-4 sm:p-7 text-white shadow-lg`}>
      {/* blobs */}
      <div className="pointer-events-none absolute -top-10 -right-10 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 right-24 h-28 w-28 rounded-full bg-white/10 blur-xl" />
      {/* dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      {/* content */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg sm:rounded-xl bg-white/20 p-2 sm:p-3 backdrop-blur-sm shrink-0">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs sm:text-sm text-white/70 mt-0.5 hidden sm:block">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-wrap justify-end">{actions}</div>}
      </div>
    </div>
  );
}
