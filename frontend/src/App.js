import React, { useState, useEffect, useMemo } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [tempName, setTempName] = useState("");
  const [filters, setFilters] = useState({});
  const [sortConfig, setSortConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data from backend
  const fetchData = async () => {
    try {
      const res = await fetch("/api/requirements");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  useEffect(() => {
    if (username) fetchData();
  }, [username]);

  // Refresh data every 10s
  useEffect(() => {
    if (!username) return;
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [username]);

  // Handle cell updates
  const updateCell = async (rowId, field, value) => {
    const newData = [...data];
    const row = newData.find((r) => r.id === rowId);
    if (!row) return;
    row[field] = value;
    setData(newData);

    try {
      const res = await fetch(`/api/requirements/${rowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(row),
      });
      const result = await res.json();
      if (result.error) alert(result.error);
    } catch (err) {
      console.error("Update error:", err);
    }
  };

  // Add new row
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
    } catch (err) {
      console.error("Add row error:", err);
    }
  };

  // Sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    return [...data].sort((a, b) => {
      const aV = a[sortConfig.key] ?? "";
      const bV = b[sortConfig.key] ?? "";
      if (typeof aV === "number" && typeof bV === "number") {
        return sortConfig.direction === "asc" ? aV - bV : bV - aV;
      }
      return sortConfig.direction === "asc"
        ? aV.toString().localeCompare(bV.toString())
        : bV.toString().localeCompare(aV.toString());
    });
  }, [data, sortConfig]);

  // Filtering
  const filteredData = sortedData.filter((row) =>
    Object.keys(filters).every((key) =>
      String(row[key] || "")
        .toLowerCase()
        .includes(filters[key]?.toLowerCase() || "")
    )
  );

  if (!username) {
    return (
      <div className="login-container">
        <h2>Enter Your Name</h2>
        <input
          value={tempName}
          onChange={(e) => setTempName(e.target.value)}
          placeholder="Your Name"
        />
        <button
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

  if (loading) return <p>Loading...</p>;

  const columns = Object.keys(data[0] || {});

  return (
    <div className="app-container">
      <h2>Requirements Tracker</h2>
      <button onClick={addRow}>Add Row</button>

      <div className="instructions">
        <p>1. Enter "Yes" in Working? column to start working on a Requisition.</p>
        <p>2. To switch Requirements, reset previous row Working? to blank.</p>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} onClick={() => handleSort(col)}>
                  {col}{" "}
                  {sortConfig?.key === col
                    ? sortConfig.direction === "asc"
                      ? "▲"
                      : "▼"
                    : ""}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map((col) => (
                <th key={"filter_" + col}>
                  <input
                    type="text"
                    placeholder="Filter..."
                    value={filters[col] || ""}
                    onChange={(e) =>
                      setFilters({ ...filters, [col]: e.target.value })
                    }
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => {
              const canEditWorking = row.status === "Open" && row.slots > 0;
              return (
                <tr key={row.id}>
                  {columns.map((col) => {
                    if (col === "status") {
                      return (
                        <td key={col}>
                          <select
                            value={row[col]}
                            onChange={(e) =>
                              updateCell(row.id, col, e.target.value)
                            }
                          >
                            <option>Open</option>
                            <option>On Hold</option>
                            <option>Closed</option>
                            <option>Cancelled</option>
                            <option>Filled</option>
                          </select>
                        </td>
                      );
                    }
                    if (col === "slots") {
                      return (
                        <td key={col}>
                          <input
                            type="number"
                            value={row[col]}
                            onChange={(e) =>
                              updateCell(row.id, col, parseInt(e.target.value) || 0)
                            }
                          />
                        </td>
                      );
                    }
                    if (col === "working") {
                      return (
                        <td key={col}>
                          {canEditWorking ? (
                            <input
                              value={row[col] || ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                updateCell(row.id, "working", val);
                                if (val.toLowerCase() === "yes") {
                                  updateCell(row.id, "assigned_recruiter", username);
                                } else if (
                                  row.working === "Yes" &&
                                  val.toLowerCase() !== "yes"
                                ) {
                                  updateCell(row.id, "assigned_recruiter", "");
                                }
                              }}
                            />
                          ) : (
                            "Non-Workable"
                          )}
                        </td>
                      );
                    }
                    if (col === "id" || col === "assigned_recruiter") {
                      return <td key={col}>{row[col]}</td>;
                    }
                    return (
                      <td key={col}>
                        <input
                          value={row[col] || ""}
                          onChange={(e) => updateCell(row.id, col, e.target.value)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
