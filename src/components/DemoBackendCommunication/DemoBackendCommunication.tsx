import { useState } from "react";

export default function DemoBackendCommunication() {

const [response, setResponse] = useState('');

  const handleCallBackend = async () => {
    // Calling the function we exposed in preload.ts
    const result = await window.api.demo.getSystemInfo();

    setResponse(JSON.stringify(result));
  };

  return (
    <div>
      <h2>Backend Connector</h2>
      <button onClick={handleCallBackend}>Ping Backend</button>
      <p>Response: {response}</p>
    </div>
  );
};
