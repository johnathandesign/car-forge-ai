import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <img
        src="/carforge-logo.png"
        alt="CarForge AI"
        width={200}
        height={124}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        draggable={false}
        className="h-full w-auto object-contain mix-blend-screen"
      />
    </span>
  );
}
