function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-center">
          Stock Consumption Control
        </h1>

        <p className="mt-2 text-center text-gray-500">
          Sign in to continue
        </p>

        <div className="mt-6">
          <label className="block text-sm font-medium">
            Employee ID
          </label>

          <input
            type="text"
            className="mt-2 w-full rounded-lg border p-3"
            placeholder="Enter Employee ID"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium">
            Password
          </label>

          <input
            type="password"
            className="mt-2 w-full rounded-lg border p-3"
            placeholder="Enter Password"
          />
        </div>

        <button
          className="mt-6 w-full rounded-lg bg-blue-600 py-3 text-white hover:bg-blue-700"
        >
          Login
        </button>
      </div>
    </div>
  )
}

export default LoginPage