import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [data, setData] = useState([]);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [tempName, setTempName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filter, setFilter] = useState({});
  const [saveTimer, setSaveTimer] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/requirements");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch { console.error("Fetch error"); }
  };

  useEffect(() => { if (username) fetchData(); }, [username]);

  const updateData = (rowId, field, value) => {
    const newData = [...data];
    const row = newData.find(r => r.id === rowId);

    // Working field logic
    if (field === "working") {
      const val = value.trim().toLowerCase();
      if (val === "yes") {
        // Check if user already has a Yes row
        const existing = newData.find(r => r.working === "Yes" && r.assigned_recruiter === username);
        if (existing && existing.id !== rowId) {
          alert("You're already working on another requisition. Please mark it free and try again.");
          return;
        }
        row.working = "Yes";
        row.assigned_recruiter = username;
      } else {
        row.working = "";
        row.assigned_recruiter = "";
      }
    } else {
      row[field] = value;
    }

    setData(newData);

    if (saveTimer) clearTimeout(saveTimer);
    setSaveTimer(setTimeout(async () => {
      try {
        const res = await fetch(`/api/requirements/${rowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        const result = await res.json();
        if (result.error) alert(result.error);
      } catch (err) { console.error(err); }
    }, 1000));
  };

  const addRow = async () => {
    const newRow = { client_name:"", requirement_id:"", job_title:"", status:"Open", slots:1, assigned_recruiter:"", working:"" };
    try {
      const res = await fetch("/api/requirements", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(newRow) });
      const result = await res.json();
      setData(prev => [...prev, result]);
    } catch { console.error("Add row error"); }
  };

  const handleSort = key => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return data;
    return [...data].sort((a,b) => {
      const aV = a[sortConfig.key] ?? "";
      const bV = b[sortConfig.key] ?? "";
      if (typeof aV === "number") return sortConfig.direction==="asc"?aV-bV:bV-aV;
      return sortConfig.direction==="asc"?aV.toString().localeCompare(bV.toString()):bV.toString().localeCompare(aV.toString());
    });
  }, [data, sortConfig]);

  if (!username) {
    return (
      <div className="login-container">
        <h2>Enter Your Name</h2>
        <input value={tempName} onChange={e=>setTempName(e.target.value)} />
        <button onClick={()=>{
          if(tempName.trim()===""){alert("Enter name"); return;}
          localStorage.setItem("username",tempName);
          setUsername(tempName);
        }}>Login</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <h2>Requirements Tracker</h2>
      <button onClick={addRow}>Add Row</button>
      <table>
        <thead>
          <tr>
            {["id","client_name","requirement_id","job_title","status","slots","assigned_recruiter","working"].map(col=>(
              <th key={col} onClick={()=>handleSort(col)}>
                {col}
              </th>
            ))}
          </tr>
          <tr>
            {["id","client_name","requirement_id","job_title","status","slots","assigned_recruiter","working"].map(col=>(
              <th key={"filter_"+col}>
                <input placeholder={`Filter ${col}`} value={filter[col]||""} onChange={e=>setFilter({...filter,[col]:e.target.value})} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData
            .filter(r => Object.keys(filter).every(f => (r[f]+"").toLowerCase().includes((filter[f]||"").toLowerCase())))
            .map(row=>{
              const canEditWorking = row.status==="Open" && row.slots>0;
              return (
                <tr key={row.id} className={row.working==="Yes"?"working-row":""}>
                  <td>{row.id}</td>
                  <td><input value={row.client_name} onChange={e=>updateData(row.id,"client_name",e.target.value)} /></td>
                  <td><input value={row.requirement_id} onChange={e=>updateData(row.id,"requirement_id",e.target.value)} /></td>
                  <td><input value={row.job_title} onChange={e=>updateData(row.id,"job_title",e.target.value)} /></td>
                  <td>
                    <select value={row.status} onChange={e=>updateData(row.id,"status",e.target.value)}>
                      {["Open","On Hold","Closed","Cancelled","Filled"].map(s=><option key={s}>{s}</option>)}
                    </select>
                  </td>
                  <td><input type="number" value={row.slots} onChange={e=>updateData(row.id,"slots",parseInt(e.target.value)||0)} /></td>
                  <td>{row.assigned_recruiter}</td>
                  <td>
                    {canEditWorking?
                      <input value={row.working} onChange={e=>updateData(row.id,"working",e.target.value)} />
                      :"Non-Workable"
                    }
                  </td>
                </tr>
              )
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
