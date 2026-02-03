import React, { useState } from 'react';
import './AuthModal.css';
import { X } from 'lucide-react';
import etherionCoin from '../assets/etherion-coin.png';

interface AuthModalProps {
    onClose: () => void;
    onLogin: (email: string) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const endpoint = isLogin ? '/login' : '/register';
            const body = isLogin
                ? { email, password }
                : { email, password, username: name };

            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const contentType = response.headers.get("content-type");
            let data;

            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await response.json();
            } else {
                const text = await response.text();
                throw new Error(text || `Error del servidor (${response.status})`);
            }

            if (!response.ok) {
                throw new Error(data.error || 'Algo salió mal');
            }

            if (isLogin) {
                localStorage.setItem('token', data.token);
                onLogin(data.user.email);
            } else {
                // After register, automatically switch to login or notify
                alert("Cuenta creada. Ahora inicia sesión.");
                setIsLogin(true);
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-container" onClick={e => e.stopPropagation()}>
                <button className="close-button" onClick={onClose}>
                    <X size={24} />
                </button>

                <div className="auth-header">
                    <img src={etherionCoin} alt="Logo" className="auth-logo" />
                    <h2 className="auth-title">
                        {isLogin ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}
                    </h2>
                    <p className="auth-subtitle">
                        {isLogin
                            ? 'Ingresa para gestionar tus tickets y Etherions'
                            : 'Únete a la experiencia Ethernal hoy mismo'}
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {error && <div style={{ color: '#ef4444', marginBottom: '15px', fontSize: '0.85rem', textAlign: 'center' }}>{error}</div>}
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">Nombre de usuario</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej. GamerOne"
                                value={name}
                                onChange={e => { setName(e.target.value); setError(''); }}
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Correo electrónico</label>
                        <input
                            type="email"
                            className="form-input"
                            placeholder="tucorreo@ejemplo.com"
                            value={email}
                            onChange={e => { setEmail(e.target.value); setError(''); }}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <input
                            type="password"
                            className="form-input"
                            placeholder="••••••••"
                            value={password}
                            onChange={e => { setPassword(e.target.value); setError(''); }}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-button" disabled={loading}>
                        {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Registrarse')}
                    </button>
                </form>

                <div className="auth-footer">
                    {isLogin ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
                    <button
                        className="auth-link"
                        onClick={() => setIsLogin(!isLogin)}
                    >
                        {isLogin ? 'Regístrate' : 'Inicia Sesión'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
