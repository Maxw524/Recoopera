import { Outlet } from "react-router-dom";
import InactivityWatcher from "./InactivityWatcher";

export default function ProtectedLayout() {
  return (
    <>
      <InactivityWatcher />
      <Outlet />
    </>
  );
}
