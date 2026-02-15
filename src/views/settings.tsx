import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Settings() {

  const [projectName, setProjectName, reset] = useStore('projectName');

  return (
    <>
      <h1>Settings</h1>
      <Link to="/">Home</Link>
      <p>Current Project Name: {projectName}</p>
      <input type="text" value={projectName || ''} onChange={(e) => setProjectName(e.target.value)} placeholder="Enter new project name" />

    </>
  )
}
