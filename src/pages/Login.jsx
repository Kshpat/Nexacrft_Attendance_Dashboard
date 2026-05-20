import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // In Supabase, if we use username instead of email, we might need a lookup or configure it.
      // Assuming we configured email to look like username@nexacrft.com internally or users login with email.
      // For this implementation, we assume they enter their email. 
      // If strictly username, they can enter "username@example.com" format.
      // Let's assume standard email for auth to work out of the box, but we call the field Username for UI.
      
      const email = username.includes('@') ? username : `${username}@nexacrft.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;
      
      // On success, App.jsx handles the redirect via auth state change
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
      <div className="neo-raised" style={{ width: '100%', maxWidth: '400px', padding: '40px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '24px' }}>Welcome to Nexacrft</h2>
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '16px' }}>{error}</div>}
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username or Email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="neo-input"
            required
          />
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neo-input"
              style={{ paddingRight: '40px' }}
              required
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              style={{ 
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '18px'
              }}
            >
              {showPassword ? '👁️' : '🙈'}
            </button>
          </div>
          <button type="submit" className="neo-button-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Sign Up</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
