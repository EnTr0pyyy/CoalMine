import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { hasAdminAccess } from '../../utils/roles.js';

export default function ProtectedRoute({ children, roles, adminOnly = false }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !hasAdminAccess(user)) {
    return <Navigate to="/mines" replace />;
  }

  if (roles && !roles.includes(user?.role) && !hasAdminAccess(user)) {
    return <Navigate to="/mines" replace />;
  }

  return children;
}
