import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

const SignUp = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const email = username.includes('@') ? username : `${username}@nexacrft.com`;

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            username: username
          }
        }
      });

      if (error) throw error;
      
      // On success, we might be logged in automatically or need to verify email.
      // Default supabase sets role as 'employee' based on our db setup default.
      if (data.session) {
        navigate('/employee/dashboard');
      } else {
        setError('Check your email to verify your account, or login if auto-login is disabled.');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="neo-raised auth-card">
        <h2 style={{ marginBottom: '24px' }}>Create an Account</h2>
        {error && <div style={{ color: 'var(--danger-color)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        <form onSubmit={handleSignUp}>
          <input
            type="text"
            placeholder="Username"
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
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="neo-input"
              style={{ paddingRight: '40px' }}
              required
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={{ 
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6, fontSize: '18px'
              }}
            >
              {showConfirmPassword ? '👁️' : '🙈'}
            </button>
          </div>
          <button type="submit" className="neo-button-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Signing up...' : 'Sign Up'}
          </button>
        </form>
        <div style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Login</Link>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
