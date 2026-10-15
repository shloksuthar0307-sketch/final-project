import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userRole = payload.user?.role;
    
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      // If they are logged in but don't have the right role, send them to their dashboard
      if (userRole === 'CUSTOMER') {
        return <Navigate to="/customer/dashboard" replace />;
      } else if (userRole === 'TECHNICIAN') {
        return <Navigate to="/technician/dashboard" replace />;
      } else if (userRole === 'SERVICE_ADVISOR') {
        return <Navigate to="/advisor" replace />;
      } else if (userRole === 'BRANCH_MANAGER') {
        return <Navigate to="/manager" replace />;
      } else if (userRole === 'INVENTORY_MANAGER') {
        return <Navigate to="/inventory-manager" replace />;
      } else if (userRole === 'SUPER_ADMIN' || userRole === 'ORG_ADMIN') {
        return <Navigate to="/admin" replace />;
      }
      return <Navigate to="/login" replace />;
    }

    
    return <Outlet />;
  } catch (e) {
    // Invalid token
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return <Navigate to="/login" replace />;
  }
}

