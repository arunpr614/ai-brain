import React from "react";
import { createRoot } from "react-dom/client";
import { HandoffApp } from "./Handoff.jsx";
import "./styles.css";
import "./handoff.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HandoffApp page={document.body.dataset.handoffPage || "overview"} />
  </React.StrictMode>,
);
