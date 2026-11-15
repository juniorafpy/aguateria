import { handle } from "hono/vercel";
import app from "../apps/api/dist/app.js";

/**
 * Vercel (runtime Node.js) exige el export Web Standard `fetch`.
 * Un `export default` que devuelve un `Response` se ignora y la petición
 * queda colgada hasta el timeout del runtime.
 *
 * @see https://vercel.com/docs/functions/functions-api-reference#fetch-web-standard
 */
const handler = handle(app);

export default {
  fetch: handler,
};
