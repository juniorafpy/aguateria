import { Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandProps {
  compact?: boolean;
  variant?: "default" | "light";
  className?: string;
}

export function Brand({ compact = false, variant = "default", className }: BrandProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-sm shadow-sky-600/25">
        <Droplets className="size-5" aria-hidden="true" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p
            className={cn(
              "text-sm font-bold tracking-tight",
              variant === "light" ? "text-white" : "text-foreground",
            )}
          >
            Aguatería
          </p>
          <p
            className={cn(
              "text-xs",
              variant === "light" ? "text-sky-100/70" : "text-muted-foreground",
            )}
          >
            Gestión de agua
          </p>
        </div>
      )}
    </div>
  );
}
