import Patch from "../components/Patch/Patch";

import { useStore } from "../context/StoreContext";

export default function Settings() {

  const [projectName, setProjectName] = useStore('projectName');

  return (
    <>
      <h1>Settings</h1>
      <p>Current Project Name: {projectName}</p>
      <input
        type="text"
        value={projectName || ''}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Enter new project name"
      />

      <Patch />


    </>
  )
}
