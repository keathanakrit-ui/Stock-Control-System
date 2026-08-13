import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const linkClass = "block rounded-lg p-2 hover:bg-slate-700";

function Sidebar() {
  const { role } = useAuth();
  const canMoveStock = role === "SUPER_ADMIN" || role === "ADMIN" || role === "STORE";

  return (
    <aside className="min-h-screen w-64 bg-slate-800 p-5 text-white">
      <h2 className="mb-8 text-xl font-bold">Stock Control</h2>
      <nav className="space-y-2">
        <NavLink to="/" className={linkClass}>Dashboard</NavLink>
        <NavLink to="/products" className={linkClass}>Products</NavLink>
        {canMoveStock && <NavLink to="/receive" className={linkClass}>Receive</NavLink>}
        {canMoveStock && <NavLink to="/issue" className={linkClass}>Issue</NavLink>}
        <NavLink to="/transactions" className={linkClass}>Transactions</NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;
