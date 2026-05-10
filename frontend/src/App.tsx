import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { TasksPage } from "./pages/TasksPage.tsx";
import { DraftPage } from "./pages/DraftPage.tsx";
import { ActivityPage } from "./pages/ActivityPage.tsx";
import { HelpPage } from "./pages/HelpPage.tsx";

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <Layout />,
      children: [
        { index: true, element: <TasksPage /> },
        { path: "draft", element: <DraftPage /> },
        { path: "activity", element: <ActivityPage /> },
        { path: "help", element: <HelpPage /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);

export function App() {
  return <RouterProvider router={router} />;
}
