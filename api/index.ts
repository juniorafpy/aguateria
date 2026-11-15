import { handle } from "hono/vercel";
import app from "../apps/api/dist/app.js";

export default handle(app);
