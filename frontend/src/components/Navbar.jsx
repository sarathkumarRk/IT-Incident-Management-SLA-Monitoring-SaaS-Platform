import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Menu,
  X,
  Bell,
  LayoutDashboard,
  Users,
  ShieldCheck,
  ClipboardList,
  BarChart3,
  LogOut,
  UserRound,
  Building2,
} from "lucide-react";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  let user = null;

  try {
    user = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    user = null;
  }

  const role = user?.role;
  const name = user?.name || "User";

  const menus = [
    {
      label: "Dashboard",
      path: "/admin",
      roles: ["ADMIN"],
      icon: LayoutDashboard,
    },
    {
      label: "Incidents",
      path: "/incidents",
      roles: ["ADMIN", "MANAGER", "SUPPORT_AGENT", "REPORTER"],
      icon: ClipboardList,
    },
    {
      label: "Users",
      path: "/users",
      roles: ["ADMIN"],
      icon: Users,
    },
    {
      label: "Teams",
      path: "/teams",
      roles: ["ADMIN"],
      icon: Building2,
    },
    {
      label: "Analytics",
      path: "/analytics",
      roles: ["ADMIN", "MANAGER"],
      icon: BarChart3,
    },
    {
      label: "SLA Policies",
      path: "/sla",
      roles: ["ADMIN", "MANAGER"],
      icon: ShieldCheck,
    },
    {
      label: "Notifications",
      path: "/notifications",
      roles: ["ADMIN", "MANAGER", "SUPPORT_AGENT", "REPORTER"],
      icon: Bell,
    },
  ];

  const visibleMenus = menus.filter((item) =>
    item.roles.includes(role)
  );

  const isActive = (path) => {
    if (path === "/incidents") {
      return (
        location.pathname === "/incidents" ||
        location.pathname.startsWith("/incidents/")
      );
    }

    return location.pathname === path;
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
    toastLogout();
    navigate("/login", { replace: true });
    setMobileMenuOpen(false);
  };

  const toastLogout = () => {
    // Logout is handled locally; no browser alert is used.
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-green-200 bg-white shadow-sm">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to={role === "ADMIN" ? "/admin" : "/incidents"}
          className="flex shrink-0 items-center gap-2"
        >
          <div className="rounded-lg bg-green-700 p-2">
            <ShieldCheck size={22} className="text-white" />
          </div>

          <div>
            <span className="block text-base font-bold text-green-950 sm:text-lg">
              Incident Manager
            </span>
            <span className="hidden text-xs text-green-700 sm:block">
              Incident & SLA Monitoring
            </span>
          </div>
        </Link>

        {/* Desktop menu */}
        <div className="hidden items-center gap-1 lg:flex">
          {visibleMenus.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(item.path)
                    ? "bg-green-100 text-green-900"
                    : "text-green-800 hover:bg-green-50"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* User and mobile controls */}
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg bg-green-50 px-3 py-2 sm:flex">
            <UserRound size={18} className="text-green-700" />
            <div>
              <p className="max-w-28 truncate text-sm font-semibold text-green-950">
                {name}
              </p>
              <p className="text-xs text-green-700">
                {role?.replaceAll("_", " ") || "User"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="hidden items-center gap-2 rounded-lg border border-green-200 px-3 py-2 text-sm font-medium text-green-800 transition hover:bg-green-50 sm:inline-flex"
          >
            <LogOut size={17} />
            Logout
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-lg border border-green-200 p-2 text-green-800 hover:bg-green-50 lg:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-green-100 bg-white p-4 lg:hidden">
          <div className="mb-3 rounded-lg bg-green-50 p-3 sm:hidden">
            <p className="font-semibold text-green-950">{name}</p>
            <p className="mt-1 text-xs text-green-700">
              {role?.replaceAll("_", " ") || "User"}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            {visibleMenus.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
                    isActive(item.path)
                      ? "bg-green-100 text-green-900"
                      : "text-green-800 hover:bg-green-50"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 flex items-center gap-3 rounded-lg border border-green-200 px-3 py-3 text-left text-sm font-medium text-green-800 hover:bg-green-50"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
