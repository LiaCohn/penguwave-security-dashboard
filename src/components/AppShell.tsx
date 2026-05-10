import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import WelcomeBanner from "./WelcomeBanner";

export default function AppShell() {
  return (
    <>
      <Navbar />
      <div className="container">
        <WelcomeBanner />
        <Outlet />
      </div>
    </>
  );
}
