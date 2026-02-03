import React from 'react';
import './UserPortal.css';
import { Calendar, MapPin, Ticket, ArrowLeft, QrCode } from 'lucide-react';
import coinImage from '../assets/etherion-coin.png';

interface TicketData {
    id: string;
    event: string;
    date: string;
    location: string;
    section: string;
    row: string;
    seat: string;
    image?: string;
}

interface UserPortalProps {
    user: string;
    onBack: () => void;
    tickets: TicketData[];
    balance: number;
}

const UserPortal: React.FC<UserPortalProps> = ({ user, onBack, tickets, balance }) => {
    return (
        <div className="user-portal-container">
            <div className="portal-content">
                <button className="back-portal-btn" onClick={onBack}>
                    <ArrowLeft size={20} />
                    Volver al inicio
                </button>

                <div className="portal-header">
                    <div>
                        <h2>MI PORTAL</h2>
                        <p style={{ color: '#94a3b8' }}>Hola, {user.split('@')[0]}! Aquí tienes tus accesos.</p>
                    </div>

                    <div className="user-stats">
                        <div className="stat-card">
                            <img src={coinImage} alt="E" style={{ width: '24px', height: '24px' }} />
                            <div>
                                <div className="stat-label">Balance</div>
                                <div className="stat-value etherions">{balance.toLocaleString()}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <Ticket size={24} color="#3b82f6" />
                            <div>
                                <div className="stat-label">Boletos</div>
                                <div className="stat-value">{tickets.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {tickets.length > 0 ? (
                    <div className="tickets-grid">
                        {tickets.map(ticket => (
                            <div key={ticket.id} className="portal-ticket-card">
                                <div className="ticket-visual">
                                    {ticket.image ? (
                                        <img src={ticket.image} alt={ticket.event} className="ticket-event-thumb" />
                                    ) : (
                                        <QrCode size={60} color="white" className="ticket-qr" />
                                    )}
                                    <span className="ticket-id">{ticket.id}</span>
                                </div>

                                <div className="ticket-details">
                                    <h3 className="ticket-event-name">{ticket.event}</h3>

                                    <div className="ticket-meta">
                                        <div className="meta-item">
                                            <Calendar size={14} />
                                            <span>{ticket.date}</span>
                                        </div>
                                        <div className="meta-item">
                                            <MapPin size={14} />
                                            <span>{ticket.location}</span>
                                        </div>
                                    </div>

                                    <div className="ticket-seat-info">
                                        <div className="seat-detail">
                                            <span>Sección</span>
                                            <span>{ticket.section}</span>
                                        </div>
                                        <div className="seat-detail">
                                            <span>Fila</span>
                                            <span>{ticket.row}</span>
                                        </div>
                                        <div className="seat-detail">
                                            <span>Asiento</span>
                                            <span>{ticket.seat}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '16px', border: '1px dashed #334155' }}>
                        <Ticket size={48} color="#334155" style={{ marginBottom: '16px' }} />
                        <h3 style={{ color: 'white', marginBottom: '8px' }}>No tienes boletos aún</h3>
                        <p style={{ color: '#94a3b8' }}>Explora los eventos y elige tus asientos para empezar.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserPortal;
