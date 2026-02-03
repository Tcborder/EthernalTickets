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
    Coins
} from 'lucide-react';
import ethernalLogo from '../assets/Images/logoethernal.png';

interface AdminPanelProps {
    totalTickets: any[];
    soldSeats: string[];
    onResetSeats: () => void;
    onAddEtherionsByEmail: (email: string, amount: number) => void;
    onAssignAdmin: (email: string) => void;
    onBack: () => void;
    adminList: string[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({
    totalTickets,
    soldSeats,
    onResetSeats,
    onAddEtherionsByEmail,
    onAssignAdmin,
    onBack,
    adminList
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'tickets' | 'settings'>('dashboard');

    // Form states
    const [etherionsEmail, setEtherionsEmail] = useState('');
    const [etherionsAmount, setEtherionsAmount] = useState('1000');
    const [newAdminEmail, setNewAdminEmail] = useState('');

    const renderDashboard = () => (
        <div className="tab-content">
            <div className="stats-grid">
                <div className="stat-box">
                    <span className="label">Ingresos Totales</span>
                    <div className="value">{(totalTickets.length * 200).toLocaleString()} E.</div>
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
                    <span className="label">Administradores</span>
                    <div className="value">{adminList.length}</div>
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
                            <label>Cantidad de Etherions</label>
                            <input
                                type="number"
                                value={etherionsAmount}
                                onChange={(e) => setEtherionsAmount(e.target.value)}
                            />
                        </div>
                        <button className="btn-gray" onClick={() => {
                            onAddEtherionsByEmail(etherionsEmail, parseInt(etherionsAmount));
                            setEtherionsEmail('');
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
            </div>

            <div className="content-card" style={{ marginTop: '24px' }}>
                <h3 className="card-title">Lista de Administradores</h3>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Rango</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adminList.map(email => (
                            <tr key={email}>
                                <td>{email}</td>
                                <td><span className="status-badge status-admin">Administrador</span></td>
                                <td style={{ color: '#4ade80' }}>Activo</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderTickets = () => (
        <div className="content-card">
            <h3 className="card-title"><Ticket size={20} /> Base de Datos de Boletos</h3>
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Evento</th>
                        <th>Sección</th>
                        <th>Asiento</th>
                        <th>Fecha Compra</th>
                    </tr>
                </thead>
                <tbody>
                    {totalTickets.map(ticket => (
                        <tr key={ticket.id}>
                            <td>{ticket.id}</td>
                            <td>{ticket.event}</td>
                            <td>{ticket.section}</td>
                            <td>{ticket.row}-{ticket.seat}</td>
                            <td>Hoy</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderSettings = () => (
        <div className="content-card">
            <h3 className="card-title"><Settings size={20} /> Mantenimiento del Sistema</h3>
            <div className="admin-form">
                <div className="form-group">
                    <label>Zona de Peligro</label>
                    <p style={{ color: '#737373', fontSize: '0.85rem' }}>Elimina toda la información de ventas y libera todos los asientos del mapa.</p>
                </div>
                <button className="btn-danger-outline" onClick={() => {
                    if (confirm("¿RESET TOTAL? Esta acción borrará boletos y liberará asientos.")) {
                        onResetSeats();
                    }
                }}>
                    <RefreshCcw size={16} /> Resetear Sistema de Ventas
                </button>
            </div>
        </div>
    );

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="sidebar-logo">
                    <img src={ethernalLogo} alt="Ethernal" />
                    <span>ADMIN</span>
                </div>

                <nav className="sidebar-nav">
                    <div
                        className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        <LayoutDashboard size={18} />
                        <span>Dashboard</span>
                    </div>
                    <div
                        className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <Users size={18} />
                        <span>Usuarios & Roles</span>
                    </div>
                    <div
                        className={`sidebar-item ${activeTab === 'tickets' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tickets')}
                    >
                        <Ticket size={18} />
                        <span>Ventas / Boletos</span>
                    </div>
                    <div
                        className={`sidebar-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        <Settings size={18} />
                        <span>Ajustes</span>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <div className="sidebar-item" onClick={onBack}>
                        <ArrowLeft size={18} />
                        <span>Salir del Panel</span>
                    </div>
                </div>
            </aside>

            <main className="admin-main">
                <header className="admin-header">
                    <h2>
                        {activeTab === 'dashboard' && 'Resumen de Ventas'}
                        {activeTab === 'users' && 'Gestión de Usuarios'}
                        {activeTab === 'tickets' && 'Base de Datos'}
                        {activeTab === 'settings' && 'Mantenimiento'}
                    </h2>
                </header>

                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'users' && renderUsers()}
                {activeTab === 'tickets' && renderTickets()}
                {activeTab === 'settings' && renderSettings()}
            </main>
        </div>
    );
};

export default AdminPanel;
