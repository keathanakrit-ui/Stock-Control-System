function Header() {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6 shadow-sm">
      <h1 className="text-xl font-bold text-slate-700">
        Stock Consumption Control
      </h1>

      <div className="flex items-center gap-3">
        <span className="text-slate-600">
          👤 Admin
        </span>
      </div>
    </header>
  )
}

export default Header