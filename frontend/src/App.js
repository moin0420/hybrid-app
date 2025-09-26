// frontend/src/App.js
import React, { useState, useEffect } from "react";

function App() {
  const [data, setData] = useState([]);
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [tempName, setTempName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filter, setFilter] = useState({});
  const [saveTimer, setSaveTimer] = useState(null);

  const columns = ["id","client_name","requirement_id","job_title","status","slots","assigned_recruiter","working"];

  const fetchData = async () => {
    try {
      const res = await fetch("/api/requirements");
      const json = await res.json();
      setData(json);
      setLoading(false);
    } catch (err) {
      console.error("Fetch error", err);
    }
  };

  useEffect(() => { if (username) fetchData(); }, [username]);
  useEffect(() => {
    if (!username) return;
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [username]);

  const updateData = (rowId, field, value) => {
    const newData = [...data];
    const row = newData.find(r => r.id === rowId);

    if(field === "working") {
      value = value.trim().toLowerCase() === "yes" ? "Yes" : "";
      if(value === "Yes" && data.some(r => r.assigned_recruiter === username && r.working === "Yes" && r.id !== rowId)) {
        alert("You're already working on another requisition. Please mark it free and try again.");
        return;
      }
      row.assigned_recruiter = value === "Yes" ? username : "";
    }

    row[field] = value;
    setData(newData);

    if(saveTimer) clearTimeout(saveTimer);
    setSaveTimer(setTimeout(async () => {
      try {
        const res = await fetch(`/api/requirements/${rowId}`, {
          method: "PUT",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(row),
        });
        const result = await res.json();
        if(result.error) alert(result.error);
      } catch(err) { console.error(err); }
    }, 500));
  };

  const addRow = async () => {
    const newRow = { client_name:"", requirement_id:"", job_title:"", status:"Open", slots:1, assigned_recruiter:"", working:"" };
    try {
      const res = await fetch("/api/requirements", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(newRow) });
      const result = await res.json();
      setData(prev => [...prev, result]);
    } catch(err) { console.error("Add row error", err); }
  };

  const handleSort = key => {
    let direction = "asc";
    if(sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const sortedData = React.useMemo(() => {
    if(!sortConfig.key) return data;
    return [...data].sort((a,b)=>{
      const aV = a[sortConfig.key] ?? "";
      const bV = b[sortConfig.key] ?? "";
      if(typeof aV === "number") return sortConfig.direction==="asc"?aV-bV:bV-aV;
      return sortConfig.direction==="asc"?aV.toString().localeCompare(bV.toString()):bV.toString().localeCompare(aV.toString());
    });
  }, [data, sortConfig]);

  const filteredData = React.useMemo(() => {
    return sortedData.filter(r => columns.every(col => {
      const val = r[col] ?? "";
      const filterVal = filter[col] ?? "";
      return val.toString().toLowerCase().includes(filterVal.toLowerCase());
    }));
  }, [sortedData, filter]);

  if(!username) {
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:"#2563eb",color:"white"}}>
        <h2>Enter Your Name</h2>
        <input style={{padding:"10px",fontSize:"16px",marginBottom:"10px"}} value={tempName} onChange={e=>setTempName(e.target.value)} />
        <button style={{padding:"10px",background:"#facc15",border:"none",cursor:"pointer"}}
          onClick={()=>{ if(tempName.trim()===""){alert("Enter name"); return;} localStorage.setItem("username",tempName); setUsername(tempName); }}>
          Login
        </button>
      </div>
    );
  }

  return (
    <div style={{width:"95%",maxWidth:"1200px",margin:"20px auto",background:"white",padding:"15px",borderRadius:"10px", overflowX:"auto"}}>
      <h2 style={{textAlign:"center"}}>Requirements Tracker</h2>
      <div style={{marginBottom:"10px"}}>
        <button onClick={addRow}>Add Row</button>
      </div>
      <div style={{background:"#fef3c7",padding:"10px",borderRadius:"6px",marginBottom:"10px"}}>
        <p>Enter "Yes" in Working? column to start working on a Requisition (case-insensitive)</p>
        <p>Only one row per user can have "Yes" at a time.</p>
      </div>
      {loading ? <p>Loading...</p> :
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead style={{background:"#f3f4f6"}}>
            <tr>
              {columns.map(col => (
                <th key={col} style={{padding:"8px",borderBottom:"2px solid #e5e7eb",cursor:"pointer"}} onClick={()=>handleSort(col)}>
                  {col}
                </th>
              ))}
            </tr>
            <tr>
              {columns.map(col => (
                <th key={"filter_"+col}>
                  <input placeholder="Filter..." value={filter[col]||""} onChange={e=>setFilter({...filter,[col]:e.target.value})} style={{width:"90%"}} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map(row=>{
              const canEditWorking = row.status==="Open" && row.slots>0;
              return (
                <tr key={row.id} style={{background:row.working==="Yes"?"#fef3c7":"white"}}>
                  <td>{row.id}</td>
                  <td><input value={row.client_name} onChange={e=>updateData(row.id,"client_name",e.target.value)} /></td>
                  <td><input value={row.requirement_id} onChange={e=>updateData(row.id,"requirement_id",e.target.value)} /></td>
                  <td><input value={row.job_title} onChange={e=>updateData(row.id,"job_title",e.target.value)} /></td>
                  <td>
                    <select value={row.status} onChange={e=>updateData(row.id,"status",e.target.value)}>
                      <option>Open</option><option>On Hold</option><option>Closed</option><option>Cancelled</option><option>Filled</option>
                    </select>
                  </td>
                  <td><input type="number" value={row.slots} onChange={e=>updateData(row.id,"slots",parseInt(e.target.value)||0)} /></td>
                  <td>{row.assigned_recruiter}</td>
                  <td>
                    {canEditWorking ?
                      <input value={row.working||""} onChange={e=>updateData(row.id,"working",e.target.value)} /> :
                      "Non-Workable"
                    }
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      }
    </div>
  );
}

export default App;
