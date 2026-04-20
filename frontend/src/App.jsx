import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import SharedFile from './pages/SharedFile';
import DownloadPage from './pages/DownloadPage';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    }
  }, []);

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
  };

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">SecureShare</div>
          <div className="nav-links">
            {user ? (
              <>
                <span className="user-greeting">Welcome, {user.username}</span>
                <button className="btn-logout" onClick={logout}>Logout</button>
              </>
            ) : (
              <>
                <Link to="/login">Login</Link>
                <Link to="/register">Register</Link>
              </>
            )}
          </div>
        </nav>
        <main className="main-content">
          <Routes>
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
            <Route path="/register" element={!user ? <Register setUser={setUser} /> : <Navigate to="/" />} />
            <Route path="/shared/:token" element={<SharedFile />} />
            <Route path="/download/:token" element={<DownloadPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
