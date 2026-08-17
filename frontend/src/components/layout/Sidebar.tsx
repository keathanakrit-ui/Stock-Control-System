import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const linkClass = "block rounded-lg p-2 hover:bg-slate-700";

function Sidebar() {
  const { role } = useAuth();
  const canMoveStock = role === "SUPER_ADMIN" || role === "ADMIN" || role === "STORE";
  const canIssueStock = canMoveStock || role === "USER";
  const canMonitorNotifications = role === "SUPER_ADMIN" || role === "ADMIN";

  return (
    <aside className="min-h-screen w-64 bg-slate-800 p-5 text-white">
      <h2 className="mb-8 text-xl font-bold">Stock Control</h2>
      <nav className="space-y-2">
        <NavLink to="/" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/products" className={linkClass}>Products</NavLink>
        {canMoveStock && <NavLink to="/receive" className={linkClass}>Receive</NavLink>}
        {canIssueStock && <NavLink to="/issue" className={linkClass}>Issue</NavLink>}
        <NavLink to="/transactions" className={linkClass}>Transactions</NavLink>
        {canMonitorNotifications && <NavLink to="/notification-monitoring" className={linkClass}>Notification Monitoring</NavLink>}
        {role === "SUPER_ADMIN" && <NavLink to="/users/add" className={linkClass}>Add User</NavLink>}
      </nav>
    </aside>
  );
}

export default Sidebar;
