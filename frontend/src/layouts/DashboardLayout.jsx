// import { Outlet } from "react-router-dom";
// import { Sidebar } from "./Sidebar.jsx";
// import { useAuth } from "../context/AuthContext.jsx";
// import { Button } from "../components/ui/Button.jsx";

// export const DashboardLayout = () => {
//   const { user, logout } = useAuth();

//   return (
//     <div className="flex min-h-screen bg-slate-50">
//       <Sidebar />
//       <div className="flex min-w-0 flex-1 flex-col">
//         <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
//           <p className="text-sm text-slate-500">
//             Welcome,{" "}
//             <span className="font-medium text-slate-800">
//               {user?.fullName || user?.username}
//             </span>
//           </p>
//           <Button variant="secondary" size="sm" onClick={logout}>
//             Logout
//           </Button>
//         </header>
//         <main className="flex-1 overflow-auto p-6">
//           <Outlet />
//         </main>
//       </div>
//     </div>
//   );
// };
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export const DashboardLayout = () => {
  const { user, logout } = useAuth();

  const initials =
    user?.fullName
      ?.split(" ")
      ?.map((w) => w[0])
      ?.join("")
      ?.slice(0, 2)
      ?.toUpperCase() ||
    user?.username?.slice(0, 2)?.toUpperCase();

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* sidebar */}
      <Sidebar />

      {/* main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* top header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-6 py-4">
            {/* left */}
            <div className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-sm font-bold text-violet-700 shadow-sm">
                {initials}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Welcome Back
                </p>

                <h2 className="mt-0.5 text-sm font-semibold text-slate-800">
                  {user?.fullName || user?.username}
                </h2>
              </div>
            </div>

            {/* right */}
            <button
              onClick={logout}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all duration-150 hover:bg-slate-50 hover:shadow-sm"
            >
              Logout
            </button>
          </div>
        </header>

        {/* page content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};