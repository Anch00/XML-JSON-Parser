import React, { useState } from "react";
import AttractionsComponent from "./components/AttractionsComponent";
import GenericXMLParserComponent from "./components/GenericXMLParserComponent";

const App: React.FC = () => {
  const [tab, setTab] = useState<"parser" | "scraper" | "px">("parser");

  return (
    <div>
      <header style={{ padding: 12, display: "flex", gap: 8 }}>
        <button
          className={tab === "parser" ? "btn" : "btn secondary"}
          onClick={() => setTab("parser")}>
          XML Parser
        </button>
        <button
          className={tab === "scraper" ? "btn" : "btn secondary"}
          onClick={() => setTab("scraper")}>
          Scraper
        </button>
        <button
          className={tab === "px" ? "btn" : "btn secondary"}
          onClick={() => setTab("px")}>
          PX Visualization
        </button>
      </header>

      <main style={{ padding: 12 }}>
        {tab === "parser" ? (
          <GenericXMLParserComponent />
        ) : tab === "scraper" ? (
          <AttractionsComponent />
        ) : (
          // lazy import PXVisualization to avoid bundling issues when deps are missing
          <React.Suspense fallback={<div>Loading PX visualization...</div>}>
            <PXVisualizationLazy />
          </React.Suspense>
        )}
      </main>
    </div>
  );
};

const PXVisualizationLazy = React.lazy(
  () => import("./components/PXVisualization")
);

export default App;
