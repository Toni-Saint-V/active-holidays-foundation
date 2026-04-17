const flags: Record<string, string> = {
  RU: "🇷🇺",
  TR: "🇹🇷",
  US: "🇺🇸",
  IT: "🇮🇹",
  RS: "🇷🇸",
  AE: "🇦🇪",
  GE: "🇬🇪",
  AM: "🇦🇲",
  BY: "🇧🇾"
};

export function FlagIcon({ code, size = 20 }: { code: string; size?: number }) {
  const flag = flags[code];
  return (
    <span
      aria-label={code}
      role="img"
      style={{ fontSize: size, lineHeight: 1 }}
      className="inline-block leading-none"
    >
      {flag ?? "🏳"}
    </span>
  );
}
