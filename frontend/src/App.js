import React, { useState, useEffect } from "react";

function App() {
  const [data, setData] = useState([]);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [tempName, setTempName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filter, setFilter] = useState({ client_name: "", job_title: "" });
  const [saveTimer, setSaveTimer] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/requirements");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch {
      console.error("Fetch error");
    }
  };

  useEffect(() => {
    if (username) fetchData();
  }, [username]);

  useEffect(() => {
    if (!username) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [username]);

  const updateData = (rowId, field, value) => {
    const newData = [...data];
    const row = newData.find((r) => r.id === rowId);
    row[field] = value;
    setData(newData);

    if (saveTimer) clearTimeout(saveTimer);
    setSaveTimer(
      setTimeout(async () => {
        try {
          const res = await fetch(`/api/requirements/${rowId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(row),
          });
          const result = await res.json();
          if (result.error) alert(result.error);
        } catch (err) {
          console.error(err);
        }
      }, 1000)
    );
  };

  const addRow = async () => {
    const newRow = {
      client_name: "",
      requirement_id: "",
      job_title: "",
      status: "Open",
      slots: 1,
      assigned_recruiter: "",
      working: "",
    };
    try {
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow),
      });
      const result = await res.json();
      setData((prev) => [...prev, result]);
    } catch {
      console.error("Add row error");
    }
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      const aV = a[sortConfig.key] ?? "";
      const bV = b[sortConfig.key] ?? "";
      if (typeof aV === "number") return sortConfig.direction === "asc" ? aV - bV : bV - aV;
      return sortConfig.direction === "asc"
        ? aV.toString().localeCompare(bV.toString())
        : bV.toString().localeCompare(aV.toString());
    });
  }, [data, sortConfig]);

  if (!username) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#2563eb",
          color: "white",
        }}
      >
        <h2>Enter Your Name</h2>
        <input
          style={{ padding: "10px", fontSize: "16px", marginBottom: "10px" }}
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
        />
        <button
          style={{ padding: "10px", background: "#facc15", border: "none", cursor: "pointer" }}
          onClick={() => {
            if (tempName.trim() === "") {
              alert("Enter name");
              return;
            }
            localStorage.setItem("username", tempName);
            setUsername(tempName);
          }}
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "95%", maxWidth: "1200px", margin: "20px auto", background: "white", padding: "15px", borderRadius: "10px" }}>
      <h2 style={{ textAlign: "center" }}>Requirements Tracker</h2>
      <div style={{ marginBottom: "10px" }}>
        <button onClick={addRow} style={{ marginBottom: "10px" }}>
          Add Row
        </button>
      </div>
      <div style={{ background: "#fef3c7", padding: "10px", borderRadius: "6px", marginBottom: "10px" }}>
        <p>1. Enter "Yes" in Working? column to start working on a Requisition</p>
        <p>2. To switch Requirements, reset previous row Working? to blank</p>
      </div>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f3f4f6" }}>
            <tr>
              {["id", "client_name", "requirement_id", "job_title", "status", "slots", "assigned_recruiter", "working"].map((col) => (
                <th
                  key={col}
                  style={{ padding: "8px", borderBottom: "2px solid #e5e7eb", cursor: "pointer" }}
                  onClick={() => handleSort(col)}
                >
                  {col}
                </th>
              ))}
            </tr>
            <tr>
              {["id", "client_name", "requirement_id", "job_title", "status", "slots", "assigned_recruiter", "working"].map((col) => (
                <th key={"filter_" + col}>
                  {["client_name", "job_title"].includes(col) ? (
                    <input value={filter[col] || ""} onChange={(e) => setFilter({ ...filter, [col]: e.target.value })} />
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData
              .filter(
                (r) =>
                  r.client_name.toLowerCase().includes(filter.client_name.toLowerCase()) &&
                  r.job_title.toLowerCase().includes(filter.job_title.toLowerCase())
              )
              .map((row) => {
                const canEditWorking = row.status === "Open" && row.slots > 0;
                return (
                  <tr key={row.id} style={{ background: row.working === "Yes" ? "#fef3c7" : "white" }}>
                    <td>{row.id}</td>
                    <td>
                      <input value={row.client_name} onChange={(e) => updateData(row.id, "client_name", e.target.value)} />
                    </td>
                    <td>
                      <input value={row.requirement_id} onChange={(e) => updateData(row.id, "requirement_id", e.target.value)} />
                    </td>
                    <td>
                      <input value={row.job_title} onChange={(e) => updateData(row.id, "job_title", e.target.value)} />
                    </td>
                    <td>
                      <select value={row.status} onChange={(e) => updateData(row.id, "status", e.target.value)}>
                        <option>Open</option>
                        <option>On Hold</option>
                        <option>Closed</option>
                        <option>Cancelled</option>
                        <option>Filled</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={row.slots}
                        onChange={(e) => updateData(row.id, "slots", parseInt(e.target.value) || 0)}
                      />
                    </td>
                    <td>{row.assigned_recruiter}</td>
                    <td>
                      {canEditWorking ? (
                        <input
                          value={row.working || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateData(row.id, "working", val);
                            if (val.toLowerCase() === "yes") updateData(row.id, "assigned_recruiter", username);
                            if (row.working === "Yes" && val.toLowerCase() !== "yes") updateData(row.id, "assigned_recruiter", "");
                          }}
                        />
                      ) : (
                        "Non-Workable"
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
