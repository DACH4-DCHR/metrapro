import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2, ServerCrash } from "lucide-react";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { LosaAligeradaPage } from "./pages/LosaAligerada";
import { VigasPage } from "./pages/Vigas";
import { EscalerasPage } from "./pages/Escaleras";
import { ZapatasPage } from "./pages/Zapatas";
import { CimientoCorridoPage } from "./pages/CimientoCorrido";
import { SobrecimientoPage } from "./pages/Sobrecimiento";
import { VigasCimentacionPage } from "./pages/VigasCimentacion";
import { ColumnasPage } from "./pages/Columnas";
import { PlacasPage } from "./pages/Placas";
import { MurosAlbanileriaPage } from "./pages/MurosAlbanileria";
import { LoginPage } from "./pages/Login";
import { useAuthStore } from "./store/authStore";
import { useProjectStore } from "./store/projectStore";

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-steel-50 text-navy-800">
      <Loader2 size={32} className="animate-spin" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

function ProjectGate() {
  const status = useProjectStore((s) => s.status);
  const error = useProjectStore((s) => s.error);
  const init = useProjectStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  if (status === "idle" || status === "loading") {
    return <LoadingScreen message="Cargando tu proyecto…" />;
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
          <Route path="/zapatas" element={<ZapatasPage />} />
          <Route path="/cimiento-corrido" element={<CimientoCorridoPage />} />
          <Route path="/sobrecimiento" element={<SobrecimientoPage />} />
          <Route path="/vigas-cimentacion" element={<VigasCimentacionPage />} />
          <Route path="/columnas" element={<ColumnasPage />} />
          <Route path="/placas" element={<PlacasPage />} />
          <Route path="/muros-albanileria" element={<MurosAlbanileriaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  const authStatus = useAuthStore((s) => s.status);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (authStatus === "idle" || authStatus === "loading") {
    return <LoadingScreen message="Verificando sesión…" />;
  }

  if (authStatus === "unauthenticated") {
    return <LoginPage />;
  }

  return <ProjectGate />;
}

export default App;
