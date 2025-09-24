import React, { useState, useEffect } from "react";

function App() {
  const [data, setData] = useState([]);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [tempName, setTempName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filter, setFilter] = useState({});

  // Fetch data
  const fetchData = async () => {
    try {
      const response = await fetch("/api/requirements");
      const json = await response.json();
      setData(json);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    if (username) fetchData();
  }, [username]);

  // Auto-refresh every 5s
  useEffect(() => {
    if (!username) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [username]);

  // Delayed update
  const updateData = (() => {
    let timeout;
    return (rowId, field, value) => {
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const rowToUpdate = data.find(r => r.id === rowId);
          const updatedRow = { ...rowToUpdate, [field]: value };

          const response = await fetch(`/api/requirements/${rowId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedRow),
          });
          const result = await response.json();
          if (result.error) alert(result.error);
          else setData(prev => prev.map(row => (row.id === rowId ? result : row)));
        } catch (error) {
          console.error("Error updating data:", error);
        }
      }, 1000); // 1s delay
    };
  })();

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
      const response = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRow),
      });
      const result = await response.json();
      setData(prev => [...prev, result]);
    } catch (err) {
      console.error("Error adding row:", err);
    }
  };

  // Login
  const handleLogin = () => {
    if (tempName.trim() === "") return alert("Enter name");
    localStorage.setItem("username", tempName);
    setUsername(tempName);
  };

  if (!username) {
    return (
      <div style={{ textAlign: "center", marginTop: "100px" }}>
        <h2>Enter Your Name</h2>
        <input value={tempName} onChange={e => setTempName(e.target.value)} />
        <button onClick={handleLogin}>Login</button>
      </div>
    );
  }

  // Table with inline CSS
  return (
    <div style={{ width: "95%", margin: "20px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <h2 style={{ textAlign: "center" }}>Requirements Tracker</h2>
      <div style={{ marginBottom: "10px", fontWeight: "bold", background: "#fef3c7", padding: "10px" }}>
        <p>1. Enter "Yes" in Working? column to start working on a Requisition</p>
        <p>2. To switch, reset Working? column of previous row to blank before switching.</p>
      </div>
      <button onClick={addRow} style={{ marginBottom: "10px" }}>Add Row</button>
      {loading ? <p>Loading...</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["id","client_name","requirement_id","job_title","status","slots","assigned_recruiter","working"].map(col => (
                <th key={col} style={{ borderBottom: "2px solid #e5e7eb", padding: "8px" }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(row => {
              const canEditWorking = row.status === "Open" && row.slots > 0;
              return (
                <tr key={row.id} style={{ background: row.working==="Yes"?"#fef3c7":"white" }}>
                  <td>{row.id}</td>
                  {["client_name","requirement_id","job_title"].map(f => (
                    <td key={f}><input value={row[f]} onChange={e=>{
                      const newData=[...data]; newData.find(r=>r.id===row.id)[f]=e.target.value; setData(newData);
                    }} onBlur={e=>updateData(row.id,f,e.target.value)} /></td>
                  ))}
                  <td>
                    <select value={row.status} onChange={e=>{
                      const newData=[...data]; newData.find(r=>r.id===row.id).status=e.target.value; setData(newData);
                    }} onBlur={e=>updateData(row.id,"status",row.status)}>
                      <option>Open</option>
                      <option>On Hold</option>
                      <option>Closed</option>
                      <option>Cancelled</option>
                      <option>Filled</option>
                    </select>
                  </td>
                  <td><input type="number" value={row.slots} onChange={e=>{
                    const newData=[...data]; newData.find(r=>r.id===row.id).slots=parseInt(e.target.value)||0; setData(newData);
                  }} onBlur={e=>updateData(row.id,"slots",parseInt(e.target.value)||0)} /></td>
                  <td>{row.assigned_recruiter}</td>
                  <td>
                    {canEditWorking ? <input value={row.working} onChange={e=>{
                      const val = e.target.value.toLowerCase()==="yes"?"Yes":e.target.value;
                      const newData=[...data]; newData.find(r=>r.id===row.id).working=val;
                      if(val==="Yes") newData.find(r=>r.id===row.id).assigned_recruiter=username;
                      if(row.working==="Yes" && val!=="Yes") newData.find(r=>r.id===row.id).assigned_recruiter="";
                      setData(newData);
                    }} onBlur={e=>updateData(row.id,"working",row.working)} /> : "Non-Workable"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;
