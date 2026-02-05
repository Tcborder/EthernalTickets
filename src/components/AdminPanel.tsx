import React, { useState } from 'react';
import './AdminPanel.css';
import SeatMap from './SeatMap';
import {
    LayoutDashboard,
    Users,
    Ticket,
    ArrowLeft,
    ShieldCheck,
    Coins,
    Key,
    Eye,
    Search as SearchIcon,
    MapPin,
    Upload,
    Trash2,
    Plus,
    FileJson,
    Shapes
} from 'lucide-react';
import ethernalLogo from '../assets/Images/logoethernal.png';
import { formatEtherions, parseAbbreviatedNumber } from '../utils/formatters';
import coinImage from '../assets/etherion-coin.png';

interface AdminPanelProps {
    totalTickets: any[];
    soldSeats: string[];
    onResetSpecificSeats: (seatIds: string[]) => void;
    onAddEtherionsByEmail: (email: string, amount: number) => void;
    onAssignAdmin: (email: string) => void;
    onRemoveAdmin: (email: string) => void;
    onBack: () => void;
    users: any[];
    onChangePassword: (email: string, newPass: string) => void;
    events: any[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({
    totalTickets,
    soldSeats,
    onResetSpecificSeats,
    onAddEtherionsByEmail,
    onAssignAdmin,
    onRemoveAdmin,
    onBack,
    users,
    onChangePassword,
    events
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'tickets' | 'venues'>('dashboard');

    // Form states
    const [etherionsEmail, setEtherionsEmail] = useState('');
    const [etherionsAmount, setEtherionsAmount] = useState('1000');
    const [viewEventMap, setViewEventMap] = useState<any | null>(null);
    const [eventSoldSeats, setEventSoldSeats] = useState<string[]>([]);
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [changePasswordEmail, setChangePasswordEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [venues, setVenues] = useState<any[]>([]);
    const [showAddVenue, setShowAddVenue] = useState(false);
    const [venueName, setVenueName] = useState('');
    const [svgFile, setSvgFile] = useState<File | null>(null);
    const [jsonFile, setJsonFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const fetchVenues = async () => {
        const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
        const token = localStorage.getItem('token');
        try {
            const response = await fetch(`${API_URL}/admin/venues`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setVenues(data);
            }
        } catch (error) {
            console.error("Error fetching venues:", error);
        }
    };

    React.useEffect(() => {
        if (activeTab === 'venues') {
            fetchVenues();
        }
    }, [activeTab]);

    const handleUploadVenue = async () => {
        if (!venueName || !svgFile || !jsonFile) {
            alert("Por favor completa todos los campos y selecciona ambos archivos");
            return;
        }

        setIsUploading(true);
        const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

        try {
            const svgContent = await svgFile.text();
            const jsonText = await jsonFile.text();
            const parsedData = JSON.parse(jsonText);

            // Support the "elements" structure from the export
            let rawElements = Array.isArray(parsedData) ? parsedData : (parsedData.elements || parsedData.seats || []);

            // Filter only elements that are actually seats/clickable
            const interactiveElements = rawElements.filter((el: any) =>
                el.type === 'seat' || el.interaction?.clickable === true
            );

            if (interactiveElements.length === 0 && rawElements.length > 0) {
                console.warn("No se encontraron elementos interactivos (clickable: true). Intentando usar todos los elementos como asientos.");
            }

            const activeSeats = interactiveElements.length > 0 ? interactiveElements : rawElements;

            if (activeSeats.length === 0) {
                alert("El archivo JSON no tiene el formato esperado o no contiene elementos.");
                setIsUploading(false);
                return;
            }

            // Optimize: Send only necessary fields to avoid Vercel's 4.5MB payload limit
            const seatData = activeSeats.map((seat: any) => ({
                id: seat.id || seat.identifier,
                section: seat.section || 'General',
                row: seat.row || (seat.id ? seat.id.split('-')[3] : ''),
                number: seat.number || (seat.id ? seat.id.split('-').pop() : ''),
                x: seat.svgX || seat.x || 0,
                y: seat.svgY || seat.y || 0,
                type: seat.type || 'regular'
            }));

            // 1. First create the venue with SVG
            const venueResponse = await fetch(`${API_URL}/admin/venues`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ name: venueName, svgContent })
            });

            if (!venueResponse.ok) {
                const err = await venueResponse.json();
                throw new Error(err.error || "Error al crear el venue base");
            }

            const { venueId } = await venueResponse.json();

            // 2. Upload seats in chunks to avoid payload limits
            const CHUNK_SIZE = 500;
            for (let i = 0; i < seatData.length; i += CHUNK_SIZE) {
                const chunk = seatData.slice(i, i + CHUNK_SIZE);
                const chunkResponse = await fetch(`${API_URL}/admin/venues/${venueId}/seats`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ seatData: chunk })
                });

                if (!chunkResponse.ok) {
                    console.error(`Error en chunk ${i / CHUNK_SIZE}`);
                }
            }

            alert("Venue registrado correctamente con todos sus asientos!");
            setShowAddVenue(false);
            setVenueName('');
            setSvgFile(null);
            setJsonFile(null);
            fetchVenues();
        } catch (error: any) {
            console.error("Error uploading venue:", error);
            alert("Error al procesar los archivos: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteVenue = async (id: number) => {
        if (!window.confirm("¿Estás seguro de eliminar este venue? Se borrarán todos los asientos asociados.")) return;

        const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
        const token = localStorage.getItem('token');

        try {
            const response = await fetch(`${API_URL}/admin/venues/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchVenues();
            }
        } catch (error) {
            console.error("Error deleting venue:", error);
        }
    };

    const renderDashboard = () => (
        <div className="tab-content">
            <div className="stats-grid">
                <div className="stat-box">
                    <span className="label">Ingresos Totales</span>
                    <div className="value">
                        {formatEtherions(totalTickets.length * 200)}
                        <img src={coinImage} alt="Etherions" style={{ width: '0.8em', height: '0.8em', verticalAlign: 'middle', marginLeft: '8px', marginBottom: '4px' }} />
                    </div>
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
                    <div className="value">{users.filter(u => u.is_admin).length}</div>
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
                    <h3 className="card-title"><ShieldCheck size={20} /> Gestión de Administradores</h3>
                    <div className="admin-form">
                        <div className="form-group">
                            <label>Correo del Usuario</label>
                            <input
                                type="email"
                                placeholder="usuario@ethernal.com"
                                value={newAdminEmail}
                                onChange={(e) => setNewAdminEmail(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn-gray" style={{ flex: 1 }} onClick={() => {
                                onAssignAdmin(newAdminEmail);
                                setNewAdminEmail('');
                            }}>
                                Promover a Admin
                            </button>
                            <button className="btn-danger-outline" style={{ flex: 1 }} onClick={() => {
                                onRemoveAdmin(newAdminEmail);
                                setNewAdminEmail('');
                            }}>
                                Remover Admin
                            </button>
                        </div>
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
                            <th>Acciones</th>
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
                                <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {u.is_admin ? (
                                            <button
                                                className="btn-danger-outline"
                                                style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                onClick={() => onRemoveAdmin(u.email)}
                                            >
                                                Quitar Admin
                                            </button>
                                        ) : (
                                            <button
                                                className="btn-gray"
                                                style={{ padding: '4px 8px', fontSize: '0.7rem', background: '#334155' }}
                                                onClick={() => onAssignAdmin(u.email)}
                                            >
                                                Hacer Admin
                                            </button>
                                        )}
                                        <button
                                            className="btn-gray"
                                            style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                            onClick={() => {
                                                setEtherionsEmail(u.email);
                                                setActiveTab('users');
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }}
                                        >
                                            Dar Fondos
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const fetchEventSoldSeats = async (eventTitle: string) => {
        const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
        try {
            const response = await fetch(`${API_URL}/tickets/sold/${encodeURIComponent(eventTitle)}`);
            if (response.ok) {
                const data = await response.json();
                setEventSoldSeats(data);
            }
        } catch (error) {
            console.error("Error fetching event sold seats:", error);
        }
    };

    const renderTickets = () => {
        if (viewEventMap) {
            return (
                <div style={{ position: 'fixed', inset: 0, zIndex: 3000, background: '#020617' }}>
                    <SeatMap
                        adminMode={true}
                        soldSeats={eventSoldSeats}
                        onBack={() => setViewEventMap(null)}
                        onPurchase={async (seatsToRevoke) => {
                            if (window.confirm(`¿Estás seguro de revocar ${seatsToRevoke.length} boletos?`)) {
                                await onResetSpecificSeats(seatsToRevoke);
                                // Refresh sold seats for this event
                                fetchEventSoldSeats(viewEventMap.title);
                                return true;
                            }
                            return false;
                        }}
                    />
                </div>
            );
        }

        return (
            <div className="tab-content">
                <div className="content-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 className="card-title" style={{ margin: 0 }}><Ticket size={24} /> Gestión de Boletos por Evento</h3>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="search-bar-mini" style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                padding: '8px 16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <SearchIcon size={16} color="#94a3b8" />
                                <input
                                    type="text"
                                    placeholder="Buscar evento..."
                                    style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="admin-events-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '24px'
                    }}>
                        {events.map(event => {
                            const eventTickets = totalTickets.filter(t => t.event === event.title);
                            return (
                                <div key={event.id} className="admin-event-card" style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    transition: 'transform 0.2s, border-color 0.2s',
                                    cursor: 'default'
                                }}>
                                    <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }}>
                                        <img src={event.image} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: 0,
                                            left: 0,
                                            right: 0,
                                            padding: '16px',
                                            background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)'
                                        }}>
                                            <span style={{
                                                fontSize: '0.7rem',
                                                background: '#3b82f6',
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '4px',
                                                fontWeight: 'bold',
                                                textTransform: 'uppercase'
                                            }}>{event.category}</span>
                                        </div>
                                    </div>
                                    <div style={{ padding: '20px' }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: '1.1rem', color: 'white' }}>{event.title}</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                <span style={{ color: '#94a3b8' }}>Boletos Vendidos</span>
                                                <span style={{ color: '#4ade80', fontWeight: 'bold' }}>{eventTickets.length}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                                <span style={{ color: '#94a3b8' }}>Ingresos</span>
                                                <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {formatEtherions(eventTickets.reduce((acc, t) => acc + (t.price || 0), 0))}
                                                    <img src={coinImage} alt="Etherions" style={{ width: '14px', height: '14px' }} />
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            className="btn-gray"
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                padding: '12px',
                                                borderRadius: '10px',
                                                background: 'rgba(255,255,255,0.08)'
                                            }}
                                            onClick={() => {
                                                setViewEventMap(event);
                                                fetchEventSoldSeats(event.title);
                                            }}
                                        >
                                            <Eye size={18} /> Ver Sold Tickets
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };



    const renderVenues = () => (
        <div className="tab-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 className="card-title" style={{ margin: 0 }}><MapPin size={24} /> Gestión de Venues</h3>
                <button className="btn-gray" onClick={() => setShowAddVenue(!showAddVenue)}>
                    {showAddVenue ? 'Cancelar' : <><Plus size={18} /> Nuevo Venue</>}
                </button>
            </div>

            {showAddVenue && (
                <div className="content-card" style={{ marginBottom: '24px', animation: 'slideDown 0.3s ease-out' }}>
                    <h3 className="card-title">Registrar Nuevo Recinto</h3>
                    <div className="admin-form" style={{ maxWidth: '600px' }}>
                        <div className="form-group">
                            <label>Nombre del Venue</label>
                            <input
                                type="text"
                                placeholder="Ej: Teatro Gran Ethernal"
                                value={venueName}
                                onChange={(e) => setVenueName(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                            <div className="form-group">
                                <label>Mapa SVG (Diseño)</label>
                                <div className="file-upload-box" onClick={() => document.getElementById('svg-input')?.click()}>
                                    <Shapes size={24} color={svgFile ? '#4ade80' : '#94a3b8'} />
                                    <span>{svgFile ? svgFile.name : 'Seleccionar SVG'}</span>
                                    <input
                                        id="svg-input"
                                        type="file"
                                        accept=".svg"
                                        style={{ display: 'none' }}
                                        onChange={(e) => setSvgFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Data JSON (Asientos)</label>
                                <div className="file-upload-box" onClick={() => document.getElementById('json-input')?.click()}>
                                    <FileJson size={24} color={jsonFile ? '#4ade80' : '#94a3b8'} />
                                    <span>{jsonFile ? jsonFile.name : 'Seleccionar JSON'}</span>
                                    <input
                                        id="json-input"
                                        type="file"
                                        accept=".json"
                                        style={{ display: 'none' }}
                                        onChange={(e) => setJsonFile(e.target.files?.[0] || null)}
                                    />
                                </div>
                            </div>
                        </div>
                        <button
                            className="btn-gray"
                            style={{ width: '100%', background: '#3b82f6' }}
                            onClick={handleUploadVenue}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Procesando...' : <><Upload size={18} /> Cargar Venue al Sistema</>}
                        </button>
                    </div>
                </div>
            )}

            <div className="venues-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px'
            }}>
                {venues.map(venue => (
                    <div key={venue.id} className="content-card" style={{ padding: '20px', position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', color: 'white' }}>{venue.name}</h4>
                                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: VENUE-{venue.id}</span>
                            </div>
                            <button
                                className="btn-danger-outline"
                                style={{ padding: '8px' }}
                                onClick={() => handleDeleteVenue(venue.id)}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Capacidad</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'white' }}>{venue.capacity}</span>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Asientos</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#4ade80' }}>MAP LISTO</span>
                            </div>
                        </div>

                        <div style={{
                            height: '100px',
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px dashed rgba(255,255,255,0.1)'
                        }}>
                            <div dangerouslySetInnerHTML={{ __html: venue.svg_content }} style={{ width: '100%', height: '100%', padding: '10px', opacity: 0.5, pointerEvents: 'none' }} />
                        </div>
                    </div>
                ))}

                {venues.length === 0 && !showAddVenue && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <MapPin size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
                        <p>No hay venues registrados todavía.</p>
                        <button className="btn-gray" style={{ marginTop: '16px' }} onClick={() => setShowAddVenue(true)}>
                            Registrar mi primer Venue
                        </button>
                    </div>
                )}
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
                            className={activeTab === 'venues' ? 'active' : ''}
                            onClick={() => setActiveTab('venues')}
                        >
                            <MapPin size={20} /> Venues
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

                    {activeTab === 'venues' && renderVenues()}
                </main>
            </div>
        </div>
    );
};

export default AdminPanel;
