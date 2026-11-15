import { handle } from "hono/vercel";
import { Hono } from "hono";
import app from "../apps/api/src/app";

const root = new Hono();
root.route("/", app);

export default handle(root);
