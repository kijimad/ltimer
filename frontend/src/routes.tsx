import { Navigate, type RouteObject } from "react-router-dom";
import { Layout } from "./components/Layout.tsx";
import { TasksPage } from "./pages/TasksPage.tsx";
import { NotesPage } from "./pages/NotesPage.tsx";
import { ActivityPage } from "./pages/ActivityPage.tsx";
import { HelpPage } from "./pages/HelpPage.tsx";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <TasksPage /> },
      { path: "notes", element: <NotesPage /> },
      // 以前の Draft タブの URL を残す
      { path: "draft", element: <Navigate to="/notes" replace /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "help", element: <HelpPage /> },
    ],
  },
];
