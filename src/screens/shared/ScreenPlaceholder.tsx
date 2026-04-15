type ScreenPlaceholderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function ScreenPlaceholder({
  eyebrow,
  title,
  description
}: ScreenPlaceholderProps) {
  return (
    <section className="rounded-[20px] border border-border bg-surface p-6 shadow-soft">
      <p className="text-xs uppercase tracking-[0.24em] text-textSecondary">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold text-textPrimary">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-textSecondary">
        {description}
      </p>
    </section>
  );
}
