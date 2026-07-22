import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import "@verne/editor/editor.css";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Falta #root en index.html");
createRoot(root).render(<App />);
