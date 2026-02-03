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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Here we would call the Turso API
        // For now, simulate success
        onLogin(email);
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
                    {!isLogin && (
                        <div className="form-group">
                            <label className="form-label">Nombre de usuario</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Ej. GamerOne"
                                value={name}
                                onChange={e => setName(e.target.value)}
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
                            onChange={e => setEmail(e.target.value)}
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
                            onChange={e => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="auth-button">
                        {isLogin ? 'Iniciar Sesión' : 'Registrarse'}
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
