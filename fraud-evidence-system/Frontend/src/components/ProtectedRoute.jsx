// src/components/ProtectedRoute.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ProtectedRoute = ({ children }) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const userInfo = localStorage.getItem('userInfo');

        if (!token || !userInfo) {
          toast.error('❌ Please login to access this page');
          window.location.href = '/';
          return;
        }

        // Verify admin access by email or role
        const adminEmail = 'admin123@fraud.com';
        try {
          const parsedUser = JSON.parse(userInfo);
          if (parsedUser?.email === adminEmail || parsedUser?.role === 'admin') {
            setIsAuthorized(true);
          } else {
            toast.error('❌ Admin access required');
            window.location.href = '/';
            return;
          }
        } catch (e) {
          toast.error('❌ Authentication error');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
          window.location.href = '/';
          return;
        }
      } catch (error) {
        console.error('Error checking access:', error);
        toast.error('❌ Authentication error');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        window.location.href = '/';
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">🚫</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;