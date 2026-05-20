// src/App.jsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './utils/supabaseClient';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeReport from './pages/EmployeeReport';
import AdminDashboard from './pages/AdminDashboard';
import AdminReport from './pages/AdminReport';
import PrivateRoute from './routes/PrivateRoute';

function App() {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (!data) {
              supabase.auth.signOut();
            } else {
              setRole(data.role);
            }
          });
      } else {
        setRole(null);
      }
    });
    // initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => {
            if (!data) {
              supabase.auth.signOut();
            } else {
              setRole(data.role);
            }
          });
      }
    });
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  if (!session) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Employee routes */}
        <Route
          path="/employee/*"
          element={
            <PrivateRoute role={role} allowed="employee">
              <Routes>
                <Route path="dashboard" element={<EmployeeDashboard />} />
                <Route path="report" element={<EmployeeReport />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </PrivateRoute>
          }
        />
        {/* Admin routes */}
        <Route
          path="/admin/*"
          element={
            <PrivateRoute role={role} allowed={['admin', 'super_admin']}>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="report/:userId" element={<AdminReport />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Routes>
            </PrivateRoute>
          }
        />
        {/* Fallback */}
        <Route path="*" element={<Navigate to={['admin', 'super_admin'].includes(role) ? '/admin' : '/employee'} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
