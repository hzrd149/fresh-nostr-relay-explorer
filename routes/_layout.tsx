import { Sidebar } from "../components/Sidebar.tsx";
import { define } from "../utils.ts";

export default define.page(function Layout({ Component, url, state }) {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar relay={state.relay} currentPath={url.pathname} />
      <main className="flex-1 overflow-auto">
        <Component />
      </main>
    </div>
  );
});
