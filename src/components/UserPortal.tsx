import React from 'react';
import './UserPortal.css';
import { Calendar, MapPin, Ticket, ArrowLeft, QrCode } from 'lucide-react';
import coinImage from '../assets/etherion-coin.png';

interface UserPortalProps {
    user: string;
    onBack: () => void;
}

const UserPortal: React.FC<UserPortalProps> = ({ user, onBack }) => {
    // Mocked purchased tickets
    const myTickets = [
        {
            id: 'TK-88219',
            event: 'Tame Impala: Slow Rush Tour',
            date: 'Noviembre 17, 2026',
            location: 'Auditorio Telmex, GDL',
            section: 'AZU201',
            row: 'B',
            seat: '14'
        },
        {
            id: 'TK-88220',
            event: 'Tame Impala: Slow Rush Tour',
            date: 'Noviembre 17, 2026',
            location: 'Auditorio Telmex, GDL',
            section: 'AZU201',
            row: 'B',
            seat: '15'
        },
        {
            id: 'TK-99102',
            event: 'EMC Mexico 2026',
            date: 'Febrero 27, 2026',
            location: 'Autódromo H. Rodríguez, CDMX',
            section: 'VIP',
            row: 'GA',
            seat: '102'
        }
    ];

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
                                <div className="stat-value etherions">1,250</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <Ticket size={24} color="#3b82f6" />
                            <div>
                                <div className="stat-label">Boletos</div>
                                <div className="stat-value">{myTickets.length}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="tickets-grid">
                    {myTickets.map(ticket => (
                        <div key={ticket.id} className="portal-ticket-card">
                            <div className="ticket-visual">
                                <QrCode size={60} color="white" className="ticket-qr" />
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
            </div>
        </div>
    );
};

export default UserPortal;
