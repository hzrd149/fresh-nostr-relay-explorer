export interface SidebarProps {
  relay: string;
  currentPath: string;
}

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: "/", label: "Dashboard", icon: "📊" },
  { path: "/notes", label: "Notes", icon: "📝" },
  { path: "/users", label: "Users", icon: "👥" },
  { path: "/relay-info", label: "Relay Info", icon: "⚡" },
  { path: "/live", label: "Live Feed", icon: "🔴" },
];

export function Sidebar({ relay, currentPath }: SidebarProps) {
  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">
          Nostr Explorer
        </h1>
        <div className="text-xs text-neutral-600 dark:text-neutral-400 break-all">
          <span className="font-medium">Relay:</span>
          <br />
          {relay}
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <li key={item.path}>
                <a
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? "bg-neutral-900 dark:bg-neutral-700 text-white"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 text-xs text-neutral-500 dark:text-neutral-400">
        Fresh Nostr Relay Explorer
      </div>
    </aside>
  );
}
