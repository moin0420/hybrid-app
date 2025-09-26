import React, { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({});

  const fetchData = async () => {
    const res = await fetch("http://localhost:5000/api/requirements");
    const rows = await res.json();
    setData(rows);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFilterChange = (col, value) => {
    setFilters({ ...filters, [col]: value });
  };

  const filteredData = data.filter((row) =>
    Object.keys(filters).every((col) =>
      String(row[col]).toLowerCase().includes(String(filters[col] || "").toLowerCase())
    )
  );

  const handleCellChange = async (id, col, value, assigned_recruiter) => {
    const updated = { ...data.find((d) => d.id === id), [col]: value };
    if (col === "working") {
      updated.working = value.toLowerCase() === "yes" ? "Yes" : "";
      if (updated.working === "") updated.assigned_recruiter = "";
      else updated.assigned_recruiter = assigned_recruiter || "You";
    }
    try {
      const res = await fetch(`http://localhost:5000/api/requirements/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const updatedRow = await res.json();
      if (res.status === 400) alert(updatedRow.error);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="App">
      <h1>Requirements</h1>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {data[0] &&
                Object.keys(data[0]).map((col) => (
                  <th key={col}>
                    {col}
                    <input
                      type="text"
                      placeholder="Filter..."
                      value={filters[col] || ""}
                      onChange={(e) => handleFilterChange(col, e.target.value)}
                    />
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((row) => (
              <tr key={row.id}>
                {Object.keys(row).map((col) => (
                  <td key={col}>
                    {col === "working" || col === "assigned_recruiter" ? (
                      <input
                        type="text"
                        value={row[col]}
                        onChange={(e) =>
                          handleCellChange(row.id, col, e.target.value, row.assigned_recruiter)
                        }
                      />
                    ) : (
                      row[col]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
