import React from "react";
import { Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Dashboard from "./pages/Dashboard";
import Models from "./pages/Models";
import Datasets from "./pages/Datasets";
import AttackCenter from "./pages/AttackCenter";
import DefenseCenter from "./pages/DefenseCenter";
import Evaluation from "./pages/Evaluation";
import Explainability from "./pages/Explainability";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import DemoMode from "./pages/DemoMode";

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/models" element={<Models />} />
        <Route path="/datasets" element={<Datasets />} />
        <Route path="/attacks" element={<AttackCenter />} />
        <Route path="/defenses" element={<DefenseCenter />} />
        <Route path="/evaluation" element={<Evaluation />} />
        <Route path="/explainability" element={<Explainability />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/demo" element={<DemoMode />} />
      </Route>
    </Routes>
  );
}
