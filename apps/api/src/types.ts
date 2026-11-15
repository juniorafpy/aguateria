import type { auth } from "./auth";

export type SesionAuth = typeof auth.$Infer.Session;

export type AppEnv = {
  Variables: {
    user: SesionAuth["user"];
    session: SesionAuth["session"];
  };
};
