import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const linkClass = "block rounded-lg p-2 hover:bg-slate-700";
const mobileLinkClass = "shrink-0 rounded-lg px-3 py-2 text-center text-xs hover:bg-slate-700";

function Sidebar() {
  const { role } = useAuth();
  const canMoveStock = role === "SUPER_ADMIN" || role === "ADMIN" || role === "STORE";
  const canIssueStock = canMoveStock || role === "USER";
  const canMonitorNotifications = role === "SUPER_ADMIN" || role === "ADMIN";
  const canGenerateQr = role === "SUPER_ADMIN" || role === "ADMIN";

  const links = (
    <>
      <NavLink to="/" className={linkClass}>Dashboard</NavLink>
      <NavLink to="/products" className={linkClass}>Products</NavLink>
      {canMoveStock && <NavLink to="/receive" className={linkClass}>Receive</NavLink>}
      {canIssueStock && <NavLink to="/issue" className={linkClass}>Issue</NavLink>}
      <NavLink to="/transactions" className={linkClass}>Transactions</NavLink>
      {canGenerateQr && <NavLink to="/qr-generator" className={linkClass}>QR Generator</NavLink>}
      {canMonitorNotifications && <NavLink to="/notification-monitoring" className={linkClass}>Notification Monitoring</NavLink>}
      {role === "SUPER_ADMIN" && <NavLink to="/users" className={linkClass}>Manage Users</NavLink>}
      {role === "SUPER_ADMIN" && <NavLink to="/users/add" className={linkClass}>Add User</NavLink>}
    </>
  );

  return (
    <>
    <aside className="hidden min-h-screen w-64 shrink-0 bg-slate-800 p-5 text-white md:block">
      <h2 className="mb-8 text-xl font-bold">Stock Control</h2>
      <nav className="space-y-2">
        {links}
      </nav>
    </aside>
    <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-1 overflow-x-auto bg-slate-800 p-2 text-white shadow-[0_-2px_8px_rgba(0,0,0,0.2)] md:hidden">
      <NavLink to="/" className={mobileLinkClass}>Dashboard</NavLink>
      <NavLink to="/products" className={mobileLinkClass}>Products</NavLink>
      {canMoveStock && <NavLink to="/receive" className={mobileLinkClass}>Receive</NavLink>}
      {canIssueStock && <NavLink to="/issue" className={mobileLinkClass}>Issue</NavLink>}
      <NavLink to="/transactions" className={mobileLinkClass}>History</NavLink>
    </nav>
    </>
  );
}

export default Sidebar;
