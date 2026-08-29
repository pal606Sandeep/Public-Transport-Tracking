export default function AdminHome() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-4 px-8 py-24">
        <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Transport Admin
        </h1>
        <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          Admin dashboard for the Real-Time Public Transport Tracking System.
          Feature modules live in{" "}
          <code className="rounded bg-black/[.06] px-1.5 py-0.5 font-mono text-[0.9em] dark:bg-white/[.08]">
            src/modules
          </code>
          .
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-3">
          <li>fleet / live map</li>
          <li>vehicles</li>
          <li>drivers</li>
          <li>conductors</li>
          <li>routes</li>
          <li>stops</li>
          <li>schedules</li>
          <li>trips</li>
          <li>dispatch</li>
          <li>incidents</li>
          <li>maintenance</li>
          <li>complaints</li>
          <li>fares</li>
          <li>service alerts</li>
          <li>analytics</li>
          <li>audit logs</li>
          <li>system settings</li>
        </ul>
      </main>
    </div>
  );
}
