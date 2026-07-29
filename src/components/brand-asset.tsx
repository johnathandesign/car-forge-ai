import lockupAsset from "@/assets/primary-lockup.png.asset.json";

export function BrandAsset({
  variant = "logo",
  className,
  alt,
}: {
  variant?: "logo" | "wordmark";
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={lockupAsset.url}
      alt={alt ?? "CarForge AI"}
      className={className}
      decoding="async"
      draggable={false}
    />
  );
}
