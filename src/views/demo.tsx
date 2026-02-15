import { Link } from "react-router-dom";
import DemoBackendCommunication from "../components/DemoBackendCommunication/DemoBackendCommunication"


export default function Demo() {
  return (
    <>
      <h1>Demo</h1>
      <p>This is a demo file to show how we communicate with the backend from the frontend</p>
      <Link to="/">Home</Link>
      <DemoBackendCommunication/>
    </>
  )
}
