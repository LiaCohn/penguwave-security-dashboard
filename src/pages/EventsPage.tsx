import { useEffect, useState } from "react";
import { getEvents } from "../api";
import type { SecurityEvent } from "../types";

export default function EventsPage() {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getEvents();
        if (cancelled) return;
        if (!Array.isArray(data)) {
          setLoadError("Unexpected response from server");
          return;
        }
        setEvents(data as SecurityEvent[]);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load events");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.assetHostname.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "ALL" || e.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  const severityColor = (s: string) => {
    if (s === "HIGH") return "red";
    if (s === "MEDIUM") return "orange";
    return "green";
  };

  if (loading) {
    return (
      <div className="page-container">
        <h1>Security Events</h1>
        <p style={{ color: "#666" }}>Loading events…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page-container">
        <h1>Security Events</h1>
        <p style={{ color: "#c00" }} role="alert">
          {loadError}
        </p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1>Security Events</h1>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 400 }}
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="ALL">All Severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {search && (
        <p>
          Showing results for: <strong>{search}</strong> ({filtered.length} events)
        </p>
      )}

      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Title</th>
            <th>Asset</th>
            <th>Source IP</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((event) => (
            <tr
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              style={{ cursor: "pointer" }}
            >
              <td style={{ color: severityColor(event.severity), fontWeight: 600 }}>
                {event.severity}
              </td>
              <td>{event.title}</td>
              <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                {event.assetHostname}
              </td>
              <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                {event.sourceIp}
              </td>
              <td style={{ fontSize: 13 }}>
                {new Date(event.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && <p style={{ color: "#999" }}>No events found.</p>}

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(filtered, null, 2)], {
              type: "application/json",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "penguwave_events_export.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ fontSize: 13 }}
          type="button"
        >
          Export Events (JSON)
        </button>
      </div>

      {selectedEvent && (
        <div className="event-detail">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{selectedEvent.title}</h2>
            <button type="button" onClick={() => setSelectedEvent(null)} style={{ cursor: "pointer" }}>
              Close
            </button>
          </div>
          <p>
            <strong>Severity:</strong>{" "}
            <span style={{ color: severityColor(selectedEvent.severity) }}>
              {selectedEvent.severity}
            </span>
          </p>
          <p>
            <strong>Description:</strong>
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>{selectedEvent.description}</p>
          <p>
            <strong>Asset:</strong> {selectedEvent.assetHostname} ({selectedEvent.assetIp})
          </p>
          <p>
            <strong>Source IP:</strong> {selectedEvent.sourceIp}
          </p>
          <p>
            <strong>Tags:</strong> {selectedEvent.tags.join(", ")}
          </p>
          <p>
            <strong>Timestamp:</strong> {new Date(selectedEvent.timestamp).toLocaleString()}
          </p>
          <h3>Raw Event Data</h3>
          <pre>{JSON.stringify(selectedEvent, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
