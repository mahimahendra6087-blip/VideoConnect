import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import CreateRoom from "./routes/CreateRoom";
import Room from "./routes/Room";
import Auth from "./routes/Auth";
import { AuthProvider, useAuth } from "./context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    // Save current location to redirect back after login
    return <Navigate to="/auth" state={{ from: window.location.pathname }} />;
  }
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={
            <ProtectedRoute>
              <CreateRoom />
            </ProtectedRoute>
          } />
          <Route path="/room/:roomID" element={
            <ProtectedRoute>
              <Room />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
