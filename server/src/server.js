import express from "express";
import cors from "cors";
import {
  getOrCreateDefaultProject,
  getProject,
  updateProjectInfo,
  setPrices,
  addElement,
  removeElement,
  clearElements,
} from "./db.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

function currentProjectId() {
  return getOrCreateDefaultProject();
}

app.get("/api/project", (req, res) => {
  const project = getProject(currentProjectId());
  res.json(project);
});

app.patch("/api/project", (req, res) => {
  const id = currentProjectId();
  updateProjectInfo(id, req.body ?? {});
  res.json(getProject(id));
});

app.put("/api/project/prices", (req, res) => {
  const id = currentProjectId();
  setPrices(id, req.body ?? {});
  res.json(getProject(id));
});

app.post("/api/project/elements", (req, res) => {
  const id = currentProjectId();
  const el = req.body;
  if (!el || !el.id || !el.module || !el.name) {
    return res.status(400).json({ error: "Elemento inválido" });
  }
  addElement(id, el);
  res.status(201).json(getProject(id));
});

app.delete("/api/project/elements/:elementId", (req, res) => {
  const id = currentProjectId();
  removeElement(id, req.params.elementId);
  res.json(getProject(id));
});

app.delete("/api/project/elements", (req, res) => {
  const id = currentProjectId();
  clearElements(id);
  res.json(getProject(id));
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MetraPro API escuchando en http://localhost:${PORT}`);
});
