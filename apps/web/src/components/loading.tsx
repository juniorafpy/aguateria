import { Droplets } from "lucide-react";

export function PantallaCarga({ mensaje = "Cargando…" }: { mensaje?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
          <Droplets className="size-6 animate-pulse" aria-hidden="true" />
        </div>
        <p className="text-sm text-muted-foreground">{mensaje}</p>
      </div>
    </div>
  );
}
