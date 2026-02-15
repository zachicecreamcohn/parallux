import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./views/home";
import Settings from "./views/settings";
import { createRoot } from 'react-dom/client'
import { StoreProvider } from "./context/StoreContext";

const App = () => {
  return (
    <StoreProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </HashRouter>
    </StoreProvider>
  );
};

// --- Render ---

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
