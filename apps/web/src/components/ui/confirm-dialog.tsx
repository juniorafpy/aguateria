import { AlertTriangle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (abierto: boolean) => void;
  titulo: string;
  descripcion: ReactNode;
  confirmar?: string;
  cancelar?: string;
  cargando?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  titulo,
  descripcion,
  confirmar = "Confirmar",
  cancelar = "Cancelar",
  cargando = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="mb-2 grid size-11 place-items-center rounded-xl bg-warning/10 text-warning">
            <AlertTriangle className="size-5" aria-hidden="true" />
          </span>
          <DialogTitle className="text-lg font-bold">{titulo}</DialogTitle>
          <DialogDescription>{descripcion}</DialogDescription>
        </DialogHeader>
        <DialogBody className="pb-5" />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={cargando}>
            {cancelar}
          </Button>
          <Button onClick={onConfirm} disabled={cargando}>
            {cargando && <Loader2 className="animate-spin" aria-hidden="true" />}
            {confirmar}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
