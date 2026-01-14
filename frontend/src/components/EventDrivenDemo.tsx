import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaPaperPlane,
  FaPause,
  FaPlay,
  FaStream,
  FaSync,
  FaTimesCircle,
} from "react-icons/fa";

interface ProcessedEvent {
  event: { type: string; id: string; timestamp: string; data?: any };
  result: { status: string; message: string; action: string };
  processedAt: string;
}

const EventDrivenDemo: React.FC = () => {
  const backendPort = 3000;
  const [connected, setConnected] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [stats, setStats] = useState<{
    messageCount?: number;
    consumerCount?: number;
  } | null>(null);
  const [listening, setListening] = useState(false);
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [attractions, setAttractions] = useState<
    { name: string; description?: string; visits?: number }[]
  >([]);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const [eventType, setEventType] = useState("attraction-added");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedName, setSelectedName] = useState<string>("");

  const esRef = useRef<EventSource | null>(null);

  const checkHealth = async () => {
    setChecking(true);
    setError("");
    try {
      const r = await axios.get(
        `http://localhost:${backendPort}/api/events/health`
      );
      setConnected(!!r.data?.available);
    } catch (e: any) {
      setConnected(false);
      setError(e?.message || String(e));
    } finally {
      setChecking(false);
    }
  };

  const fetchStats = async () => {
    try {
      const r = await axios.get(
        `http://localhost:${backendPort}/api/events/stats`
      );
      setStats({
        messageCount: r.data?.messageCount,
        consumerCount: r.data?.consumerCount,
      });
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    }
  };

  const fetchAttractions = async () => {
    try {
      const r = await axios.get(
        `http://localhost:${backendPort}/api/events/attractions`
      );
      setAttractions(r.data?.items || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    }
  };

  const publish = async () => {
    // For delete/update, if dropdown selected, ensure name is set
    if (
      (eventType === "attraction-deleted" ||
        eventType === "attraction-updated") &&
      selectedName &&
      !name.trim()
    ) {
      setName(selectedName);
    }
    if (!name.trim()) {
      setError("Ime atrakcije je obvezno");
      return;
    }
    setPublishing(true);
    setError("");
    try {
      const payload: any = { name, description: desc || undefined };
      if (
        eventType === "attraction-updated" &&
        selectedName &&
        selectedName !== name
      ) {
        payload.originalName = selectedName;
      }
      await axios.post(`http://localhost:${backendPort}/api/events/publish`, {
        type: eventType,
        data: payload,
      });
      setName("");
      setDesc("");
      setSelectedName("");
      fetchStats();
      fetchAttractions();
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || String(e));
    } finally {
      setPublishing(false);
    }
  };

  const startListening = () => {
    if (esRef.current) return;
    const es = new EventSource(
      `http://localhost:${backendPort}/api/events/subscribe`
    );
    es.onopen = () => setListening(true);
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        // Handle meta messages: connected/snapshot update state but don't add to events list
        if (data?.type === "connected" || data?.type === "snapshot") {
          if (Array.isArray(data?.state)) setAttractions(data.state);
          return;
        }
        // Only push messages that contain a processed event payload
        if (data?.event) {
          setEvents((prev) => [data, ...prev].slice(0, 30));
        }
        // If state is included, update attractions
        if (Array.isArray(data?.state)) {
          setAttractions(data.state);
        }
      } catch {}
    };
    es.onerror = () => {
      setListening(false);
      es.close();
      esRef.current = null;
    };
    esRef.current = es;
  };
  const stopListening = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
      setListening(false);
    }
  };

  useEffect(() => () => stopListening(), []);

  const label = (t: string) =>
    ((
      {
        "attraction-added": "Dodana atrakcija",
        "attraction-updated": "Posodobljena atrakcija",
        "attraction-deleted": "Izbrisana atrakcija",
        "attraction-visited": "Obisk atrakcije",
      } as any
    )[t] || t);

  const uiHints = (t: string) => {
    switch (t) {
      case "attraction-added":
        return {
          note: "Ustvari novo atrakcijo.",
          namePh: "Npr. Brandenburška vrata",
          descPh: "Kratek opis (neobvezno)",
          descDisabled: false,
        };
      case "attraction-updated":
        return {
          note: "Posodobi podrobnosti obstoječe atrakcije.",
          namePh: "Ime obstoječe atrakcije",
          descPh: "Nov opis (neobvezno)",
          descDisabled: false,
        };
      case "attraction-deleted":
        return {
          note: "Označi atrakcijo kot izbrisano.",
          namePh: "Ime atrakcije za izbris",
          descPh: "Opis ni potreben",
          descDisabled: true,
        };
      case "attraction-visited":
        return {
          note: "Zabeleži obisk atrakcije.",
          namePh: "Ime obiskane atrakcije",
          descPh: "Dodatna opomba (neobvezno)",
          descDisabled: false,
        };
      default:
        return { note: "", namePh: "Ime", descPh: "Opis", descDisabled: false };
    }
  };
  const hints = uiHints(eventType);

  return (
    <div className='max-w-6xl mx-auto'>
      <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
        <h2 className='text-3xl font-bold text-teal-400 mb-2 flex items-center'>
          <FaStream className='mr-3' /> RabbitMQ Events
        </h2>
        <p className='text-gray-400 mb-6'>
          Event-driven architecture with RabbitMQ (AMQP) + Server-Sent Events
        </p>

        <div className='bg-gray-700 rounded-lg p-4 mb-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            Connection Status
          </h3>
          <div className='flex gap-3 items-center flex-wrap'>
            <button
              className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors'
              onClick={checkHealth}
              disabled={checking}>
              {checking ? "Checking..." : "Check Connection"}
            </button>
            {connected === true && (
              <span className='flex items-center text-green-400 font-medium'>
                <FaCheckCircle className='mr-2' /> Connected
              </span>
            )}
            {connected === false && (
              <span className='flex items-center text-red-400 font-medium'>
                <FaTimesCircle className='mr-2' /> Disconnected
              </span>
            )}
            {stats && (
              <span className='text-gray-400 text-sm'>
                Queue:{" "}
                <span className='text-teal-300'>{stats.messageCount || 0}</span>{" "}
                | Consumers:{" "}
                <span className='text-teal-300'>
                  {stats.consumerCount || 0}
                </span>
              </span>
            )}
            <button
              className='bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg flex items-center transition-colors'
              onClick={fetchStats}>
              <FaSync className='mr-2' /> Refresh Stats
            </button>
          </div>
          {error && (
            <div className='mt-3 bg-red-900 border border-red-700 text-red-200 px-3 py-2 rounded-lg text-sm'>
              {error}
            </div>
          )}
        </div>

        <div className='bg-gray-700 rounded-lg p-4 mb-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            Publish Event
          </h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Event Type
              </label>
              <select
                className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}>
                <option value='attraction-added'>Added Attraction</option>
                <option value='attraction-updated'>Updated Attraction</option>
                <option value='attraction-deleted'>Deleted Attraction</option>
                <option value='attraction-visited'>Visited Attraction</option>
              </select>
            </div>

            {(eventType === "attraction-deleted" ||
              eventType === "attraction-updated") && (
              <div>
                <label className='block text-sm font-medium text-gray-300 mb-2'>
                  Select Attraction
                </label>
                <select
                  className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                  value={selectedName}
                  onChange={(e) => {
                    const n = e.target.value;
                    setSelectedName(n);
                    const item = attractions.find((a) => a.name === n);
                    if (eventType === "attraction-updated" && item) {
                      setName(item.name);
                      setDesc(item.description || "");
                    }
                    if (eventType === "attraction-deleted") {
                      setName(n);
                      setDesc("");
                    }
                  }}>
                  <option value=''>(select)</option>
                  {attractions.map((a) => (
                    <option key={a.name} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Name
              </label>
              <input
                className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                placeholder={hints.namePh}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Description
              </label>
              <input
                className='w-full bg-gray-600 text-white border border-gray-500 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50'
                placeholder={hints.descPh}
                disabled={hints.descDisabled}
                value={hints.descDisabled ? "" : desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>

          <div className='mt-4 flex gap-3 items-center'>
            <button
              className='bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-6 py-2 rounded-lg flex items-center transition-colors'
              onClick={publish}
              disabled={publishing || !name.trim()}>
              <FaPaperPlane className='mr-2' />
              {publishing ? "Publishing..." : "Publish"}
            </button>
            <button
              className='bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors'
              onClick={fetchAttractions}>
              View Attractions
            </button>
          </div>

          <div className='mt-3 text-gray-400 text-sm'>
            {hints.note} Events go to{" "}
            <code className='bg-gray-900 px-2 py-1 rounded text-teal-300'>
              attraction-events
            </code>{" "}
            queue, consumer processes them asynchronously and sends SSE.
          </div>
        </div>

        <div className='bg-gray-700 rounded-lg p-4'>
          <h3 className='text-xl font-semibold text-white mb-3'>
            Listen (SSE)
          </h3>
          {!listening ? (
            <button
              className='bg-teal-500 hover:bg-teal-600 text-white font-semibold px-6 py-2 rounded-lg flex items-center transition-colors'
              onClick={startListening}>
              <FaPlay className='mr-2' /> Start Listening
            </button>
          ) : (
            <button
              className='bg-gray-600 hover:bg-gray-500 text-white font-semibold px-6 py-2 rounded-lg flex items-center transition-colors'
              onClick={stopListening}>
              <FaPause className='mr-2' /> Stop Listening
            </button>
          )}

          {events.length > 0 && (
            <div className='mt-4'>
              <h4 className='text-lg font-semibold text-teal-300 mb-3'>
                Processed Events ({events.length})
              </h4>
              <div className='max-h-96 overflow-y-auto space-y-3'>
                {events.map((e, i) => (
                  <div
                    key={i}
                    className='bg-gray-600 rounded-lg p-4 border border-gray-500'>
                    <div className='flex justify-between items-start mb-2'>
                      <strong className='text-white'>
                        {label(e.event.type)}
                      </strong>
                      <span className='text-gray-400 text-sm'>
                        {new Date(e.event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className='text-gray-300 text-sm'>
                      {e.result.message}
                    </div>
                    {e.event.data?.description && (
                      <div className='text-gray-400 text-sm mt-1'>
                        {e.event.data.description}
                      </div>
                    )}
                    <div className='text-gray-500 text-xs mt-2'>
                      ID: {e.event.id}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {attractions.length > 0 && (
            <div className='mt-4'>
              <h4 className='text-lg font-semibold text-teal-300 mb-3'>
                Attractions List ({attractions.length})
              </h4>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                {attractions.map((a) => (
                  <div
                    key={a.name}
                    className='bg-gray-600 rounded-lg p-3 border border-dashed border-gray-500'>
                    <div className='text-white font-semibold'>{a.name}</div>
                    {a.description && (
                      <div className='text-gray-300 text-sm mt-1'>
                        {a.description}
                      </div>
                    )}
                    {typeof a.visits === "number" && a.visits > 0 && (
                      <div className='text-teal-400 text-xs mt-1'>
                        Visits: {a.visits}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {listening && events.length === 0 && (
            <div className='mt-4 text-gray-400 text-sm'>
              Waiting for events...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventDrivenDemo;
