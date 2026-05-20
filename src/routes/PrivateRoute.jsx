import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ children, role, allowed }) => {
  if (role === null) {
    return <div>Loading...</div>;
  }

  const isAllowed = Array.isArray(allowed) ? allowed.includes(role) : role === allowed;

  if (!isAllowed) {
    return <Navigate to={['admin', 'super_admin'].includes(role) ? '/admin' : '/employee'} replace />;
  }

  return children;
};

export default PrivateRoute;
