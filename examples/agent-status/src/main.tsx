import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App";
import "react-emoji-styles/styles.css";
import "./styles.css";

const root = document.getElementById("root")!;
if (root.firstElementChild) hydrateRoot(root, <App />);
else createRoot(root).render(<App />); // Dev serves the unprerendered template.
