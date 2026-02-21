// Admin access is now enforced server-side in app/admin/layout.tsx
// This file is kept as a no-op passthrough for backwards compatibility
export default function AdminGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
