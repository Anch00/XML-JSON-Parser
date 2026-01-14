import React, { useMemo, useRef, useState } from "react";
import {
  FaCalendarAlt,
  FaClock,
  FaEuroSign,
  FaInfoCircle,
  FaMapMarkedAlt,
  FaRoute,
  FaStopwatch,
} from "react-icons/fa";
import type { TripActivity, TripPlan } from "../types";

interface Attraction {
  name: string;
  description: string;
  url?: string;
}

interface LLMTripPlannerProps {
  savedAttractions: Attraction[];
}

const LLMTripPlanner: React.FC<LLMTripPlannerProps> = ({
  savedAttractions,
}) => {
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
  const [useSavedAttractions, setUseSavedAttractions] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setPlan(null);
    setElapsedTime(0);

    // Start timer
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedTime((Date.now() - startTimeRef.current) / 1000);
    }, 100);

    try {
      const requestBody: any = {
        city,
        country: country || undefined,
        startDate,
        endDate: endDate || undefined,
      };

      // Include saved attractions if checkbox is checked
      if (useSavedAttractions && savedAttractions.length > 0) {
        requestBody.attractions = savedAttractions;
      }

      const resp = await fetch("/api/llm/trip-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to generate plan");
      }
      setPlan(data as TripPlan);
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
    <div className='max-w-6xl mx-auto'>
      <div className='bg-gray-800 rounded-lg shadow-lg p-6 mb-6'>
        <h2 className='text-3xl font-bold text-teal-400 mb-2 flex items-center'>
          <FaCalendarAlt className='mr-3' /> AI Trip Planner
        </h2>
        <p className='text-gray-400 mb-6'>
          Enter your destination and dates to generate a personalized travel
          itinerary using AI.
        </p>

        <form onSubmit={submit} className='space-y-4'>
          <div className='grid md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                City *
              </label>
              <input
                className='w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder='e.g., Berlin'
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Country (optional)
              </label>
              <input
                className='w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder='e.g., Germany'
              />
            </div>
          </div>

          <div className='grid md:grid-cols-2 gap-4'>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Start Date *
              </label>
              <input
                className='w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                type='date'
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                End Date (optional)
              </label>
              <input
                className='w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                type='date'
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {savedAttractions.length > 0 && (
            <div className='bg-gray-700 rounded-lg p-4'>
              <label className='flex items-center cursor-pointer'>
                <input
                  type='checkbox'
                  checked={useSavedAttractions}
                  onChange={(e) => setUseSavedAttractions(e.target.checked)}
                  className='mr-3 h-5 w-5'
                />
                <span className='text-gray-300'>
                  Use saved attractions ({savedAttractions.length} available) in
                  the itinerary
                </span>
              </label>
            </div>
          )}

          <button
            className='w-full bg-teal-500 hover:bg-teal-600 disabled:bg-gray-600 text-white font-semibold px-6 py-3 rounded-lg flex items-center justify-center transition-colors'
            disabled={loading || !city || !startDate}
            type='submit'>
            <FaRoute className='mr-2' />
            {loading
              ? "Generating your personalized trip..."
              : "Generate Trip Plan"}
          </button>

          {loading && (
            <div className='mt-3 flex items-center justify-center text-teal-400'>
              <FaStopwatch className='mr-2 animate-spin' />
              <span className='font-mono text-lg'>
                {elapsedTime.toFixed(1)}s
              </span>
            </div>
          )}
        </form>

        {error && (
          <div className='mt-4 bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg'>
            {error}
          </div>
        )}
      </div>

      {plan && (
        <div className='space-y-6'>
          <div className='bg-gray-800 rounded-lg shadow-lg p-6'>
            <div className='flex items-center justify-between mb-4'>
              <div>
                <h3 className='text-2xl font-bold text-teal-400 flex items-center'>
                  <FaMapMarkedAlt className='mr-3' />
                  {plan.destination}
                </h3>
                <p className='text-gray-400 mt-1'>
                  {plan.startDate}
                  {plan.endDate ? ` to ${plan.endDate}` : ""}
                </p>
              </div>
              <div className='flex items-center bg-teal-900 px-4 py-2 rounded-lg'>
                <FaStopwatch className='mr-2 text-teal-400' />
                <span className='text-white font-mono text-lg'>
                  {elapsedTime.toFixed(2)}s
                </span>
              </div>
            </div>
            {plan._generatedAt && (
              <p className='text-sm text-gray-500 mt-2'>
                Generated: {new Date(plan._generatedAt).toLocaleString()}
              </p>
            )}

            {(plan as any).googleMapsRoute && (
              <div className='mt-4'>
                <a
                  href={(plan as any).googleMapsRoute}
                  target='_blank'
                  rel='noreferrer'
                  className='inline-flex items-center bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors'>
                  <FaMapMarkedAlt className='mr-2' />
                  View Route on Google Maps
                </a>
              </div>
            )}

            <div className='mt-4'>
              <label className='block text-sm font-medium text-gray-300 mb-2'>
                Filter Activities
              </label>
              <select
                className='w-full md:w-64 bg-gray-700 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400'
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as any)}>
                <option value='all'>All Activities</option>
                <option value='sightseeing'>Sightseeing</option>
                <option value='museum'>Museum</option>
                <option value='food'>Food & Dining</option>
                <option value='outdoor'>Outdoor</option>
                <option value='shopping'>Shopping</option>
                <option value='transport'>Transport</option>
                <option value='other'>Other</option>
              </select>
            </div>
          </div>

          {filteredDays?.map((day) => (
            <div
              key={day.date}
              className='bg-gray-800 rounded-lg shadow-lg p-6'>
              <h4 className='text-xl font-bold text-teal-400 mb-2'>
                {day.date}
              </h4>
              <p className='text-white font-semibold mb-2'>{day.summary}</p>
              <p className='text-gray-400 text-sm mb-4 flex items-center'>
                <FaInfoCircle className='mr-2' />
                {day.weatherNote}
              </p>

              <div className='space-y-3'>
                {day.activities?.map((a, idx) => (
                  <div
                    key={idx}
                    className='bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors'>
                    <div className='flex justify-between items-start mb-2'>
                      <h5 className='text-lg font-semibold text-white'>
                        {a.title}
                      </h5>
                      <span className='text-teal-400 font-semibold flex items-center'>
                        <FaClock className='mr-1' />
                        {a.time}
                      </span>
                    </div>
                    <div className='flex flex-wrap gap-3 text-sm text-gray-400 mb-2'>
                      <span className='bg-gray-600 px-2 py-1 rounded'>
                        {a.type}
                      </span>
                      <span className='flex items-center'>
                        <FaMapMarkedAlt className='mr-1' />
                        {a.address}
                      </span>
                      <span className='flex items-center'>
                        <FaClock className='mr-1' />
                        {a.durationMinutes} min
                      </span>
                      {typeof a.costEstimate === "number" && (
                        <span className='flex items-center'>
                          <FaEuroSign className='mr-1' />~{a.costEstimate}€
                        </span>
                      )}
                    </div>
                    {a.notes && (
                      <p className='text-gray-400 text-sm'>{a.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {plan.tips && plan.tips.length > 0 && (
            <div className='bg-gray-800 rounded-lg shadow-lg p-6'>
              <h4 className='text-xl font-bold text-teal-400 mb-4 flex items-center'>
                <FaInfoCircle className='mr-2' />
                Travel Tips
              </h4>
              <ul className='space-y-2'>
                {plan.tips.map((t, i) => (
                  <li key={i} className='text-gray-300 flex items-start'>
                    <span className='text-teal-400 mr-2'>•</span>
                    {t}
                  </li>
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
