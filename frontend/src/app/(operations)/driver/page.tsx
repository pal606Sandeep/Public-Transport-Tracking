import { AppHeader } from "@/components/layout/AppHeader";

export default function DriverHomePage() {
  return (
    <>
      <AppHeader title="Driver" />
      <main className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
        Assignment card, attendance &amp; trip control — built in Module 4 (Driver).
      </main>
    </>
  );
}
