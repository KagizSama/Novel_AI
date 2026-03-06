import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import LibraryPage from './pages/LibraryPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/chat" element={
            <ProtectedRoute>
              <div className="bg-black text-white flex flex-col h-screen overflow-hidden font-display antialiased">
                <Navbar />
                <main className="flex-1 overflow-hidden"><ChatPage /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/library" element={
            <ProtectedRoute>
              <div className="bg-black text-white min-h-screen flex flex-col font-display antialiased">
                <Navbar />
                <main className="flex-1"><LibraryPage /></main>
              </div>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <AdminRoute>
              <div className="bg-black text-white min-h-screen flex flex-col font-display antialiased">
                <Navbar />
                <main className="flex-1"><AdminPage /></main>
              </div>
            </AdminRoute>
          } />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
