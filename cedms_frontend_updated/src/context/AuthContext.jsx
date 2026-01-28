import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for stored user on mount
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const response = await authAPI.login({ username, password });
        const { user: userData, token } = response.data;

        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        setUser(userData);

        return userData;
    };

    const register = async (userData) => {
        const response = await authAPI.register(userData);
        const { user: newUser, token } = response.data;

        localStorage.setItem('user', JSON.stringify(newUser));
        localStorage.setItem('token', token);
        setUser(newUser);

        return newUser;
    };

    const setAuth = (userData, token) => {
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
    };

    const isEmployee = () => user?.role === 'EMPLOYEE';
    const isManager = () => user?.role === 'MANAGER';
    const isAdmin = () => user?.role === 'ADMIN';
    const isManagerOrAdmin = () => isManager() || isAdmin();

    const value = {
        user,
        loading,
        login,
        register,
        setAuth,
        logout,
        isAuthenticated: !!user,
        isEmployee,
        isManager,
        isAdmin,
        isManagerOrAdmin
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
