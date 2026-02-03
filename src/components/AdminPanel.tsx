import React, { useState } from 'react';
import './AdminPanel.css';
import {
    LayoutDashboard,
    Users,
    Ticket,
    Settings,
    ArrowLeft,
    RefreshCcw,
    ShieldCheck,
    Coins,
    Key
} from 'lucide-react';
import ethernalLogo from '../assets/Images/logoethernal.png';
import SeatMap from './SeatMap';
import { formatEtherions, parseAbbreviatedNumber } from '../utils/formatters';

interface AdminPanelProps {
    totalTickets: any[];
    soldSeats: string[];
    onResetSeats: () => void;
    onResetSpecificSeats: (seatIds: string[]) => void;
    onResetEvent: (eventName: string) => void;
    onAddEtherionsByEmail: (email: string, amount: number) => void;
    onAssignAdmin: (email: string) => void;
    onBack: () => void;
    adminList: string[];
    users: any[];
    onChangePassword: (email: string, newPass: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({
    totalTickets,
    soldSeats,
    onResetSeats,
    onResetSpecificSeats,
    onResetEvent,
    onAddEtherionsByEmail,
    onAssignAdmin,
    onBack,
    adminList,
    users,
    onChangePassword
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'tickets' | 'events' | 'settings'>('dashboard');

    // Form states
    const [etherionsEmail, setEtherionsEmail] = useState('');
    const [etherionsAmount, setEtherionsAmount] = useState('1000');
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [changePasswordEmail, setChangePasswordEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [specificSeatsText, setSpecificSeatsText] = useState('');

    const [eventMapTarget, setEventMapTarget] = useState<any>(null);

    const renderDashboard = () => (
        <div className="tab-content">
            <div className="stats-grid">
                <div className="stat-box">
                    <span className="label">Ingresos Totales</span>
                    <div className="value">{formatEtherions(totalTickets.length * 200)} E.</div>
                </div>
                <div className="stat-box">
                    <span className="label">Ventas</span>
                    <div className="value">{totalTickets.length}</div>
                </div>
                <div className="stat-box">
                    <span className="label">Ocupación</span>
                    <div className="value">{soldSeats.length} / 2500</div>
                </div>
                <div className="stat-box">
                    <span className="label">Usuarios</span>
                    <div className="value">{users.length}</div>
                </div>
            </div>

            <div className="content-card">
                <h3 className="card-title"><Ticket size={20} /> Ventas Recientes</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID Ticket</th>
                            <th>Evento</th>
                            <th>Ubicación</th>
                            <th>Fecha</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {totalTickets.slice(-5).reverse().map(ticket => (
                            <tr key={ticket.id}>
                                <td style={{ color: 'white', fontWeight: 'bold' }}>{ticket.id}</td>
                                <td>{ticket.event}</td>
                                <td>{ticket.section}-{ticket.row}{ticket.seat}</td>
                                <td>{ticket.date}</td>
                                <td><span className="status-badge status-paid">PAGADO</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderUsers = () => (
        <div className="tab-content">
            <div className="admin-grid">
                <div className="content-card">
                    <h3 className="card-title"><Coins size={20} /> Asignar Etherions</h3>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Correo del Usuario</label>
                            <input
                                type="email"
                                placeholder="ejemplo@correo.com"
                                value={etherionsEmail}
                                onChange={(e) => setEtherionsEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Cantidad (Ej: 100K, 1M, 10B)</label>
                            <input
                                type="text"
                                placeholder="1000 or 1M"
                                value={etherionsAmount}
                                onChange={(e) => setEtherionsAmount(e.target.value)}
                            />
                        </div>
                        <button className="btn-gray" onClick={() => {
                            const numericAmount = parseAbbreviatedNumber(etherionsAmount);
                            if (numericAmount > 0) {
                                onAddEtherionsByEmail(etherionsEmail, numericAmount);
                                setEtherionsEmail('');
                                setEtherionsAmount('');
                            } else {
                                alert("Por favor ingresa una cantidad válida (ej: 1000, 1M, 10B)");
                            }
                        }}>
                            Conceder Fondos
                        </button>
                    </div>
                </div>

                <div className="content-card">
                    <h3 className="card-title"><ShieldCheck size={20} /> Nuevo Administrador</h3>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Correo para Promover</label>
                            <input
                                type="email"
                                placeholder="usuario@ethernal.com"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                            />
                        </div>
                        <button className="btn-gray" onClick={() => {
                            onAssignAdmin(newAdminEmail);
                            setNewAdminEmail('');
                        }}>
                            Asignar Rango Admin
                        </button>
                    </div>
                </div>

                <div className="content-card">
                    <h3 className="card-title"><Key size={20} /> Cambiar Contraseña</h3>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Correo del Usuario</label>
                            <input
                                type="email"
                                placeholder="usuario@ejemplo.com"
                                value={changePasswordEmail}
                                onChange={(e) => setChangePasswordEmail(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label>Nueva Contraseña</label>
                            <input
                                type="password"
                                placeholder="********"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>
                        <button className="btn-gray" onClick={() => {
                            if (changePasswordEmail && newPassword) {
                                onChangePassword(changePasswordEmail, newPassword);
                                setChangePasswordEmail('');
                                setNewPassword('');
                            } else {
                                alert("Por favor ingresa correo y contraseña");
                            }
                        }}>
                            Actualizar Contraseña
                        </button>
                    </div>
                </div>
            </div>

            <div className="content-card" style={{ marginTop: '24px' }}>
                <h3 className="card-title">Lista de Usuarios</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Usuario / Email</th>
                            <th>Saldo</th>
                            <th>Rango</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ color: 'white', fontWeight: 'bold' }}>{u.username}</span>
                                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email}</span>
                                    </div>
                                </td>
                                <td style={{ color: '#4ade80' }}>{formatEtherions(u.balance)}</td>
                                <td>
                                    {u.is_admin ?
                                        <span className="status-badge status-admin">Administrador</span> :
                                        <span className="status-badge status-paid">Usuario</span>
                                    }
                                </td>
                                <td style={{ color: '#4ade80' }}>Activo</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTickets = () => (
        <div className="tab-content">
            <div className="content-card">
                <h3 className="card-title"><Ticket size={20} /> Base de Datos de Boletos</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Evento</th>
                            <th>Sección</th>
                            <th>Asiento</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {totalTickets.map(ticket => (
                            <tr key={ticket.id}>
                                <td>{ticket.id}</td>
                                <td>{ticket.event}</td>
                                <td>{ticket.section}</td>
                                <td>{ticket.row}-{ticket.seat}</td>
                                <td>
                                    <button
                                        className="btn-danger-outline"
                                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                        onClick={() => onResetSpecificSeats([`seat-6-row-${ticket.row}-item-${ticket.seat}`])}
                                    >
                                        Revocar
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderEvents = () => (
        <div className="tab-content">
            <div className="admin-grid">
                <div className="content-card">
                    <h3 className="card-title">Resetear Asientos</h3>
                    <div className="form-group">
                        <label>ID de Asientos (separados por coma)</label>
                        <textarea
                            placeholder="seat-6-row-B-item-12, seat-6-row-A-item-5"
                            value={specificSeatsText}
                            onChange={(e) => setSpecificSeatsText(e.target.value)}
                        />
                    </div>
                    <button className="btn-danger-outline" onClick={() => {
                        const ids = specificSeatsText.split(',').map(s => s.trim()).filter(s => s);
                        onResetSpecificSeats(ids);
                        setSpecificSeatsText('');
                    }}>
                        Liberar Asientos
                    </button>
                </div>

                <div className="content-card">
                    <h3 className="card-title">Ocupación Actual</h3>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {soldSeats.length === 0 ? <p>No hay asientos ocupados.</p> : (
                            <div className="seat-summary">
                                {soldSeats.map(id => <span key={id} className="seat-id-tag">{id}</span>)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="content-card" style={{ marginTop: '24px' }}>
                <h3 className="card-title">Estado de Eventos</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Evento</th>
                            <th>Ventas</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[...new Set(totalTickets.map(t => t.event))].map(eventName => (
                            <tr key={eventName}>
                                <td>{eventName}</td>
                                <td>{totalTickets.filter(t => t.event === eventName).length} boletos</td>
                                <td>
                                    <button className="btn-danger-outline" onClick={() => onResetEvent(eventName)}>
                                        Limpiar Todo el Evento
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSettings = () => (
        <div className="tab-content">
            <div className="content-card">
                <h3 className="card-title"><Settings size={20} /> Opciones Críticas</h3>
                <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Estas acciones borrarán datos permanentes del sistema.</p>

                <div className="admin-form">
                    <div className="form-group">
                        <label>Limpieza General</label>
                        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Revoca todos los boletos y libera todos los asientos del mapa.</p>
                    </div>
                    <button className="btn-danger" onClick={() => {
                        if (window.confirm("¿Estás SEGURO de que quieres borrar TODOS los boletos vendiddos? Esta acción no se puede deshacer.")) {
                            onResetSeats();
                        }
                    }}>
                        Resetear Todo el Sistema de Tickets
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="admin-panel-overlay">
            <div className="admin-panel-container">
                <div className="admin-sidebar">
                    <div className="admin-logo">
                        <img src={ethernalLogo} alt="Ethernal" />
                        <span>Admin</span>
                    </div>

                    <nav className="admin-nav">
                        <button
                            className={activeTab === 'dashboard' ? 'active' : ''}
                            onClick={() => setActiveTab('dashboard')}
                        >
                            <LayoutDashboard size={20} /> Dashboard
                        </button>
                        <button
                            className={activeTab === 'users' ? 'active' : ''}
                            onClick={() => setActiveTab('users')}
                        >
                            <Users size={20} /> Usuarios
                        </button>
                        <button
                            className={activeTab === 'tickets' ? 'active' : ''}
                            onClick={() => setActiveTab('tickets')}
                        >
                            <Ticket size={20} /> Boletos
                        </button>
                        <button
                            className={activeTab === 'events' ? 'active' : ''}
                            onClick={() => setActiveTab('events')}
                        >
                            <RefreshCcw size={20} /> Gestión Global
                        </button>
                        <button
                            className={activeTab === 'settings' ? 'active' : ''}
                            onClick={() => setActiveTab('settings')}
                        >
                            <Settings size={20} /> Configuración
                        </button>
                    </nav>

                    <button className="back-btn" onClick={onBack}>
                        <ArrowLeft size={20} /> Volver a la Web
                    </button>
                </div>

                <main className="admin-main">
                    <header className="admin-header">
                        <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Panel</h2>
                        <div className="admin-user-info">
                            <span>Admin Mode</span>
                            <div className="admin-avatar">A</div>
                        </div>
                    </header>

                    {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'users' && renderUsers()}
                    {activeTab === 'tickets' && renderTickets()}
                    {activeTab === 'events' && renderEvents()}
                    {activeTab === 'settings' && renderSettings()}
                </main>
            </div>
        </div>
    );
};

export default AdminPanel;
