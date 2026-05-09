import { NavLink, Outlet } from "react-router-dom";

export function Layout() {
  return (
    <>
      <nav className="nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Tasks
        </NavLink>
        <NavLink to="/draft" className={({ isActive }) => (isActive ? "active" : "")}>
          Draft
        </NavLink>
      </nav>
      <Outlet />
    </>
  );
}
