// Simple skeleton components
export function SkeletonBox({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />
}

export function VideoCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-border/30">
      <SkeletonBox className="aspect-video w-full" />
      <div className="p-4 space-y-2">
        <SkeletonBox className="h-4 w-3/4" />
        <SkeletonBox className="h-3 w-1/2" />
        <div className="flex gap-4 pt-1">
          <SkeletonBox className="h-3 w-16" />
          <SkeletonBox className="h-3 w-16" />
        </div>
      </div>
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="liquid-glass rounded-xl p-5 space-y-3">
      <SkeletonBox className="h-3 w-24" />
      <SkeletonBox className="h-8 w-16" />
      <SkeletonBox className="h-3 w-32" />
    </div>
  )
}
