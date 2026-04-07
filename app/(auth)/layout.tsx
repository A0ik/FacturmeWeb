export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg mb-4">
            <span className="text-white font-black text-2xl">F</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900">Factu.me</h1>
          <p className="text-gray-500 mt-1 text-sm">Facturation intelligente</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
