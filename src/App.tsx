import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { ObjectsPage } from './pages/ObjectsPage';
import { ObjectPage } from './pages/ObjectPage';
import { TaskPage } from './pages/TaskPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { Spinner } from './components/States';

function AppRoutes() {
  const { status, profile } = useAuth();

  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-paper">
        <Spinner label="Открываем систему" />
      </div>
    );
  }

  if (status === 'signed-out' || !profile) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<ObjectsPage />} />
        <Route path="/objects/:id" element={<ObjectPage />} />
        <Route path="/tasks/:id" element={<TaskPage />} />
        <Route
          path="/my-tasks"
          element={profile.role === 'worker' ? <MyTasksPage /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
