import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import RequireAuth from './RequireAuth.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Home from './pages/Home.jsx';
import CreateRoom from './pages/CreateRoom.jsx';
import JoinRoom from './pages/JoinRoom.jsx';
import Waiting from './pages/Waiting.jsx';
import Game from './pages/Game.jsx';
import Complete from './pages/Complete.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route
                path="/"
                element={
                  <RequireAuth>
                    <Home />
                  </RequireAuth>
                }
              />
              <Route
                path="/create"
                element={
                  <RequireAuth>
                    <CreateRoom />
                  </RequireAuth>
                }
              />
              <Route
                path="/join"
                element={
                  <RequireAuth>
                    <JoinRoom />
                  </RequireAuth>
                }
              />
              <Route
                path="/waiting/:roomCode"
                element={
                  <RequireAuth>
                    <Waiting />
                  </RequireAuth>
                }
              />
              <Route
                path="/game/:roomCode"
                element={
                  <RequireAuth>
                    <Game />
                  </RequireAuth>
                }
              />
              <Route
                path="/complete/:roomCode"
                element={
                  <RequireAuth>
                    <Complete />
                  </RequireAuth>
                }
              />
              <Route
                path="*"
                element={
                  <RequireAuth>
                    <Home />
                  </RequireAuth>
                }
              />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
