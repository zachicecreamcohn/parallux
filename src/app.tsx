import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./views/home";
import Settings from "./views/settings";
import { createRoot } from 'react-dom/client'
import Demo from "./views/demo";

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/demo" element={<Demo />} />
      </Routes>
    </HashRouter>
  );
};

// --- Render ---

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
