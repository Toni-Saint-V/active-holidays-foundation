import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../server/index";

type Request = IncomingMessage & { url?: string };
type Response = ServerResponse;

let appPromise: ReturnType<typeof createApp> | null = null;

async function app() {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

export default async function handler(req: Request, res: Response) {
  const expressApp = await app();
  return expressApp(req, res);
}
