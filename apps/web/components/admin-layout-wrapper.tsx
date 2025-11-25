import { AdminSidebar } from '@/components/admin-sidebar';

export async function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 overflow-auto relative">
        <div className="max-w-7xl mx-auto py-8 px-6 h-full">{children}</div>
      </main>
    </div>
  );
}
