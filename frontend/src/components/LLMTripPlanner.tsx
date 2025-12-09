import React, { useMemo, useState } from "react";
import type { TripActivity, TripPlan } from "../types";

const LLMTripPlanner: React.FC = () => {
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plan, setPlan] = useState<TripPlan | null>(null);
    const [activityFilter, setActivityFilter] = useState<
        TripActivity["type"] | "all"
    >("all");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        setPlan(null);

        try {
            const resp = await fetch("/api/llm/trip-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ city, country: country || undefined, startDate, endDate: endDate || undefined }),
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data?.error || "Failed to generate plan");
            }
            setPlan(data as TripPlan);
        } catch (err: any) {
            setError(err?.message || "Unexpected error");
        } finally {
            setLoading(false);
        }
    };

    const filteredDays = useMemo(() => {
        if (!plan) return null;
        if (activityFilter === "all") return plan.days;
        return plan.days.map((d) => ({
            ...d,
            activities: d.activities.filter((a) => a.type === activityFilter),
        }));
    }, [plan, activityFilter]);

    return (
        <div className="container">
            <div className="header">
                <h1>Trip Planner (LLM)</h1>
                <div className="small">Vnesite destinacijo in datume — načrt se generira dinamično.</div>
            </div>

            <div className="card">
                <form onSubmit={submit} className="row" style={{ gap: 12 }}>
                    <label style={{ flex: 1 }}>
                        City
                        <input className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="npr. Berlin" required />
                    </label>
                    <label style={{ flex: 1 }}>
                        Country (optional)
                        <input className="input" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="npr. Germany" />
                    </label>
                    <label style={{ flex: 1 }}>
                        Start Date
                        <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                    </label>
                    <label style={{ flex: 1 }}>
                        End Date (optional)
                        <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </label>
                    <label style={{ flex: 1 }}>
                        Filter aktivnosti
                        <select className="input" value={activityFilter} onChange={(e) => setActivityFilter(e.target.value as any)}>
                            <option value="all">Vse</option>
                            <option value="sightseeing">Sightseeing</option>
                            <option value="museum">Museum</option>
                            <option value="food">Food</option>
                            <option value="outdoor">Outdoor</option>
                            <option value="shopping">Shopping</option>
                            <option value="transport">Transport</option>
                            <option value="other">Other</option>
                        </select>
                    </label>
                    <button className="btn" disabled={loading || !city || !startDate} type="submit">
                        {loading ? "Generating..." : "Generate Plan"}
                    </button>
                </form>
                {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
            </div>

            {plan && (
                <div className="card">
                    <h3>
                        {plan.destination} — {plan.startDate}
                        {plan.endDate ? ` to ${plan.endDate}` : ""}
                    </h3>
                    {plan._generatedAt && (
                        <div className="small">Generated at: {new Date(plan._generatedAt).toLocaleString()}</div>
                    )}

                    {filteredDays?.map((day) => (
                        <div key={day.date} className="card">
                            <h4>{day.date} — {day.summary}</h4>
                            <div className="small" style={{ marginBottom: 8 }}>{day.weatherNote}</div>
                            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                                {day.activities?.map((a, idx) => (
                                    <li key={idx} style={{ padding: "8px 0", borderBottom: "1px solid #e2e8f0" }}>
                                        <div style={{ fontWeight: 600 }}>{a.time} • {a.title}</div>
                                        <div className="small">
                                            {a.type} • {a.address} • {a.durationMinutes} min
                                            {typeof a.costEstimate === "number" ? ` • ~${a.costEstimate}€` : ""}
                                        </div>
                                        {a.notes && <div className="small">{a.notes}</div>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}

                    {plan.tips && plan.tips.length > 0 && (
                        <div className="card">
                            <h4>Tips</h4>
                            <ul>
                                {plan.tips.map((t, i) => (
                                    <li key={i}>{t}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LLMTripPlanner;
