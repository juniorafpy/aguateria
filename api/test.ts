export default function handler(req: any, res: any) {
  try {
    const envVars = {
      hasDbUrl: !!process.env.DATABASE_URL,
      hasAuthSecret: !!process.env.BETTER_AUTH_SECRET,
      betterAuthUrl: process.env.BETTER_AUTH_URL,
      vercelUrl: process.env.VERCEL_URL,
      nodeEnv: process.env.NODE_ENV,
    };
    return res.status(200).json({ ok: true, env: envVars });
  } catch (err: any) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
