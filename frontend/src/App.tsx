import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { TicketList } from './pages/TicketList';
import { TicketDetailPage } from './pages/TicketDetail';
import { CreateTicket } from './pages/CreateTicket';
import { TemplateBuilder } from './pages/TemplateBuilder';
import { Reports } from './pages/Reports';
import { Admin } from './pages/Admin';
import { Board } from './pages/Board';
import { Profile } from './pages/Profile';

function Protected({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'grid', placeItems: 'center', height: '100vh' }}><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/login" element={<Login />} />
              <Route
                element={
                  <Protected>
                    <Layout />
                  </Protected>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/board" element={<Board />} />
                <Route path="/tickets" element={<TicketList />} />
                <Route path="/tickets/new" element={<CreateTicket />} />
                <Route path="/tickets/:id" element={<TicketDetailPage />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/templates" element={<TemplateBuilder />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/admin" element={<Admin />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
