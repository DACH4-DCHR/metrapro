import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2, ServerCrash } from "lucide-react";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { LosaAligeradaPage } from "./pages/LosaAligerada";
import { VigasPage } from "./pages/Vigas";
import { EscalerasPage } from "./pages/Escaleras";
import { useProjectStore } from "./store/projectStore";

function App() {
  const status = useProjectStore((s) => s.status);
  const error = useProjectStore((s) => s.error);
  const init = useProjectStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-steel-50 text-navy-800">
        <Loader2 size={32} className="animate-spin" />
        <p className="text-sm font-medium">Conectando con el servidor…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-steel-50 px-6 text-center text-navy-800">
        <ServerCrash size={36} className="text-red-500" />
        <p className="max-w-md text-sm font-medium">{error}</p>
        <button
          onClick={() => init()}
          className="mt-2 rounded-md bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/losa-aligerada" element={<LosaAligeradaPage />} />
          <Route path="/vigas" element={<VigasPage />} />
          <Route path="/escaleras" element={<EscalerasPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
