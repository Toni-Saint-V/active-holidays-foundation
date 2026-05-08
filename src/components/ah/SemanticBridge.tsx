import { cn } from "@/ui/utils";

type NodeTone = "need" | "info" | "result" | "manual";

type BridgeNode = {
  id: string;
  label: string;
  tone: NodeTone;
};

const nodeToneClass: Record<NodeTone, string> = {
  need: "bg-accent",
  info: "bg-info",
  result: "bg-success",
  manual: "bg-manual"
};

type Props = {
  leftChip: string;
  rightChip: string;
  nodes: BridgeNode[];
  activeNodeId: string;
  onNodeSelect?: (id: string) => void;
  onBridgeTap?: () => void;
  className?: string;
};

export function SemanticBridge({
  leftChip,
  rightChip,
  nodes,
  activeNodeId,
  onNodeSelect,
  onBridgeTap,
  className
}: Props) {
  const widthDivisor = Math.max(nodes.length - 1, 1);

  return (
    <div
      role={onBridgeTap ? "button" : undefined}
      tabIndex={onBridgeTap ? 0 : undefined}
      onClick={onBridgeTap}
      onKeyDown={
        onBridgeTap
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onBridgeTap();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-[28px] border border-border bg-[rgba(11,12,15,0.92)] px-3 py-4 shadow-soft sm:rounded-[32px] sm:px-5 sm:py-5",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <BridgeChip>{leftChip}</BridgeChip>
        <BridgeChip align="right">{rightChip}</BridgeChip>
      </div>

      <div className="relative mt-6 sm:mt-8">
        <div className="ah-route-line absolute left-3 right-3 top-[18px] h-[4px] rounded-full bg-route/55 sm:left-5 sm:right-5" />
        <div className="relative flex items-start justify-between px-3 sm:px-5">
          {nodes.map((node, index) => {
            const isActive = node.id === activeNodeId;
            return (
              <button
                key={node.id}
                type="button"
                aria-pressed={isActive}
                onClick={(event) => {
                  event.stopPropagation();
                  onNodeSelect?.(node.id);
                }}
                className="relative flex w-[84px] flex-col items-center gap-4 text-center transition focus-visible:outline-none sm:w-[96px] sm:gap-6"
                style={{
                  marginLeft: index === 0 ? 0 : undefined,
                  marginRight: index === nodes.length - 1 ? 0 : undefined
                }}
              >
                <span
                  className={cn(
                    "relative z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-transparent transition",
                    nodeToneClass[node.tone],
                    isActive ? "ah-soft-pulse scale-100 text-base ring-8 ring-current/10" : "scale-[0.88] opacity-92"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-[0.16em] sm:text-[11px] sm:tracking-[0.24em]",
                    isActive ? "text-textPrimary" : "text-textMuted"
                  )}
                >
                  {node.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BridgeChip({
  children,
  align = "left"
}: {
  children: string;
  align?: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "inline-flex min-h-[44px] items-center rounded-full border border-border bg-surface2 px-4 py-1.5 text-lg font-semibold leading-tight text-textPrimary sm:h-11 sm:px-5 sm:py-0 sm:text-xl",
        align === "right" && "justify-end text-right"
      )}
    >
      {children}
    </div>
  );
}
