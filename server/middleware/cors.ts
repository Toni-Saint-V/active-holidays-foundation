import cors from "cors";

const LOCAL_DEVELOPMENT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function parseOrigins(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function allowedCorsOrigins(): string[] {
  const configured = parseOrigins(process.env.CORS_ORIGINS ?? process.env.ALLOWED_ORIGINS);
  if (configured.length > 0) return configured;
  if (process.env.NODE_ENV === "production") return [];
  return LOCAL_DEVELOPMENT_ORIGINS;
}

export function configuredCors() {
  return cors({
    credentials: false,
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const allowed = allowedCorsOrigins();
      callback(null, allowed.includes(origin));
    }
  });
}
