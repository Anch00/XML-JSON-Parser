import React, { useState } from "react";
import AttractionsComponent from "./components/AttractionsComponent";
import GenericXMLParserComponent from "./components/GenericXMLParserComponent";

const App: React.FC = () => {
  const [tab, setTab] = useState<"parser" | "scraper">("parser");

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
      </header>

      <main style={{ padding: 12 }}>
        {tab === "parser" ? (
          <GenericXMLParserComponent />
        ) : (
          <AttractionsComponent />
        )}
      </main>
    </div>
  );
};

export default App;
