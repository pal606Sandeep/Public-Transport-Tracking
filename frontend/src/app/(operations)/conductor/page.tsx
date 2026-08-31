import { AppHeader } from "@/components/layout/AppHeader";

export default function ConductorHomePage() {
  return (
    <>
      <AppHeader title="Conductor" />
      <main className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Ticketing, QR scan &amp; passenger count — built in Module 5 (Conductor).
      </main>
    </>
  );
}
