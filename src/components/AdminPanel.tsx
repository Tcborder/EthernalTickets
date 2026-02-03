import React from 'react';
import './AdminPanel.css';
import { LayoutDashboard, Users, Ticket, Settings, ArrowLeft, RefreshCcw } from 'lucide-react';

interface AdminPanelProps {
    totalTickets: any[];
    soldSeats: string[];
    onResetSeats: () => void;
    onAddEtherions: (amount: number) => void;
    onBack: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ totalTickets, soldSeats, onResetSeats, onAddEtherions, onBack }) => {
    return (
        <div className="admin-panel-container">
            <div className="admin-content">
                <button className="back-admin-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                    Volver al sitio
                </button>

                <div className="admin-header">
                    <div>
                        <h2>PANEL DE ADMINISTRACIÓN <span className="admin-badge">Admin Mode</span></h2>
                        <p style={{ color: '#94a3b8' }}>Gestiona los eventos, usuarios y ventas globales.</p>
                    </div>
                </div>

                <div className="admin-grid">
                    {/* Stats Cards */}
                    <div className="admin-card">
                        <h3><LayoutDashboard size={18} /> Resumen General</h3>
                        <div className="admin-stats-row">
                            <div className="admin-stat-item">
                                <span className="admin-stat-label">Ventas Totales</span>
                                <span className="admin-stat-value">{(totalTickets.length * 200).toLocaleString()} E.</span>
                            </div>
                            <div className="admin-stat-item">
                                <span className="admin-stat-label">Boletos Emitidos</span>
                                <span className="admin-stat-value">{totalTickets.length}</span>
                            </div>
                        </div>
                        <div className="admin-stat-item">
                            <span className="admin-stat-label">Asientos Ocupados</span>
                            <span className="admin-stat-value" style={{ color: '#fbbf24' }}>{soldSeats.length}</span>
                        </div>
                    </div>

                    <div className="admin-card">
                        <h3><Settings size={18} /> Acciones Rápidas</h3>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
                            Herramientas de mantenimiento para el sistema de tickets.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button className="btn-admin btn-admin-danger" onClick={() => {
                                if (confirm("¿Estás seguro de resetear TODOS los asientos vendidos? Esta acción no se puede deshacer.")) {
                                    onResetSeats();
                                }
                            }}>
                                <RefreshCcw size={16} style={{ marginRight: '8px' }} />
                                Resetear Mapa de Asientos
                            </button>
                            <button className="btn-admin btn-admin-primary" onClick={() => onAddEtherions(1000)}>
                                <RefreshCcw size={16} style={{ marginRight: '8px' }} />
                                Añadir 1,000 Etherions (Test)
                            </button>
                            <button className="btn-admin btn-admin-primary">
                                <Users size={16} style={{ marginRight: '8px' }} />
                                Ver Usuarios Activos
                            </button>
                        </div>
                    </div>
                </div>

                <div className="admin-card" style={{ marginTop: '24px', width: '100%', overflowX: 'auto' }}>
                    <h3><Ticket size={18} /> Últimas Ventas</h3>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID Ticket</th>
                                <th>Evento</th>
                                <th>Ubicación</th>
                                <th>Asiento</th>
                                <th>Estado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {totalTickets.length > 0 ? (
                                totalTickets.map(ticket => (
                                    <tr key={ticket.id}>
                                        <td style={{ color: '#4ade80', fontWeight: 'bold' }}>{ticket.id}</td>
                                        <td>{ticket.event}</td>
                                        <td style={{ color: '#94a3b8' }}>{ticket.section} - {ticket.row}</td>
                                        <td>{ticket.seat}</td>
                                        <td><span style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>PAGADO</span></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                                        No se han detectado ventas recientes.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
