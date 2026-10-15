import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { routes } from "./routes.tsx";

const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });

export function App() {
  return <RouterProvider router={router} />;
}
