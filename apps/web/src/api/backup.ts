import { api } from "@/lib/api";

/** Descarga el respaldo lógico JSON de la base y dispara la descarga. */
export async function descargarRespaldo(): Promise<void> {
  const { data } = await api.get<Blob>("/backup", { responseType: "blob" });

  const url = URL.createObjectURL(data);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `aguateria-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  URL.revokeObjectURL(url);
}
