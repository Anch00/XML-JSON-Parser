import React, { useState } from "react";
import AttractionsComponent from "./components/AttractionsComponent";
import GenericXMLParserComponent from "./components/GenericXMLParserComponent";
import GRPCDemo from "./components/GRPCDemo";
import NamedPipesDemo from "./components/NamedPipesDemo";
import EventDrivenDemo from "./components/EventDrivenDemo";

const App: React.FC = () => {
  const [tab, setTab] = useState<
    "parser" | "scraper" | "px" | "grpc" | "pipes" | "events" | "llm"
  >("parser");

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
        <button
          className={tab === "grpc" ? "btn" : "btn secondary"}
          onClick={() => setTab("grpc")}>
          gRPC Demo
        </button>
        <button
          className={tab === "pipes" ? "btn" : "btn secondary"}
          onClick={() => setTab("pipes")}>
          Named Pipes
        </button>
        <button
          className={tab === "events" ? "btn" : "btn secondary"}
          onClick={() => setTab("events")}>
          RabbitMQ Events
        </button>
        <button
          className={tab === "llm" ? "btn" : "btn secondary"}
          onClick={() => setTab("llm")}>
          Trip Planner (LLM)
        </button>
      </header>

      <main style={{ padding: 12 }}>
        {tab === "parser" && <GenericXMLParserComponent />}
        {tab === "scraper" && <AttractionsComponent />}
        {tab === "grpc" && <GRPCDemo />}
        {tab === "pipes" && <NamedPipesDemo />}
        {tab === "events" && <EventDrivenDemo />}
        {tab === "px" && (
          // lazy import PXVisualization to avoid bundling issues when deps are missing
          <React.Suspense fallback={<div>Loading PX visualization...</div>}>
            <PXVisualizationLazy />
          </React.Suspense>
        )}
        {tab === "llm" && (
          <React.Suspense fallback={<div>Loading Trip Planner...</div>}>
            <LLMTripPlanner />
          </React.Suspense>
        )}
      </main>
    </div>
  );
};

const PXVisualizationLazy = React.lazy(
  () => import("./components/PXVisualization")
);

const LLMTripPlanner = React.lazy(() => import("./components/LLMTripPlanner"));

export default App;
