import { AuthHeader } from "@/components/auth-header";

export default function AdminAuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center relative">
      <AuthHeader />
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

