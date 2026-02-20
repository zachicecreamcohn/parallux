import { HashRouter, Link, Route, Routes } from "react-router-dom";
import Home from "./views/home";
import Settings from "./views/settings";
import { createRoot } from 'react-dom/client'
import { StoreProvider } from "./context/StoreContext";

import '@mantine/core/styles.css';
import { MantineProvider } from "@mantine/core";
import Dashboard from "./views/dashboard";

const App = () => {
  return (
    <MantineProvider>
    <StoreProvider>
      <HashRouter>

        <ul>
          <li><Link to="/">Home</Link></li>
          <li><Link to="/settings">Settings</Link></li>
          <li><Link to="/dashboard">Dashboard</Link></li>
        </ul>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dashboard" element={<Dashboard/>} />
        </Routes>
      </HashRouter>
    </StoreProvider>
    </MantineProvider>
  );
};

// --- Render ---

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
