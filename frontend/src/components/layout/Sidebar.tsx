import { NavLink } from "react-router-dom";

function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-800 p-5 text-white">
      <h2 className="mb-8 text-xl font-bold">
        Stock Control
      </h2>

      <nav className="space-y-2">
        <NavLink
          to="/"
          className="block rounded-lg p-2 hover:bg-slate-700"
        >
          📊 Dashboard
        </NavLink>

        <NavLink
          to="/products"
          className="block rounded-lg p-2 hover:bg-slate-700"
        >
          📦 Product
        </NavLink>

        <NavLink
          to="/receive"
          className="block rounded-lg p-2 hover:bg-slate-700"
        >
          📥 Receive
        </NavLink>

        <NavLink
          to="/issue"
          className="block rounded-lg p-2 hover:bg-slate-700"
        >
          📤 Issue
        </NavLink>

        <NavLink
          to="/transactions"
          className="block rounded-lg p-2 hover:bg-slate-700"
        >
          📑 Transaction
        </NavLink>

        <NavLink
          to="/users"
          className="block rounded-lg p-2 hover:bg-slate-700"
        >
          👥 Users
        </NavLink>

        <NavLink
          to="/settings"
          className="block rounded-lg p-2 hover:bg-slate-700"
        >
          ⚙️ Settings
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;