import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileNav } from "@/components/layout/mobile-nav";

export const metadata: Metadata = {
  title: "HabitFlow — Performance, every day",
  description: "Build consistent habits, log training, and understand your momentum.",
};

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="habitflow-app min-h-screen bg-background text-foreground">
      <Sidebar />
      <main className="min-h-screen pb-28 lg:pl-[17.5rem] lg:pb-0">
        <MobileHeader />
        <div className="mx-auto w-full max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7 lg:px-10 lg:py-8">
          {children}
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
