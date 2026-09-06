import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/Dashboard";
import { LosaAligeradaPage } from "./pages/LosaAligerada";
import { VigasPage } from "./pages/Vigas";
import { EscalerasPage } from "./pages/Escaleras";

function App() {
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
