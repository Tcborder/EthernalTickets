import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, Loader2, Trash2, Ticket, ArrowLeft, RefreshCcw } from 'lucide-react';
import './SeatMap.css';
import coinImage from '../assets/etherion-coin.png';

// We use ?raw to import the SVG string directly
import auditoriumSvgRaw from '../assets/venueInfo/Auditorio Telmex/AuditorioTelmex.svg?raw';

interface SeatData {
    id: string;
    type: string;
    svgX: number;
    svgY: number;
    blockType: string;
    interaction: {
        clickable: boolean;
        section?: string;
        row?: string;
        number?: string;
        price?: number;
    };
}

interface VenueData {
    mapDimensions: { width: number; height: number };
    elements: SeatData[];
}

interface SeatMapProps {
    onBack: () => void;
    selectedEvent: any;
    onPurchase: (seats: string[]) => void;
    soldSeats: string[];
    adminMode?: boolean;
}

const SeatSvg = React.memo(
    React.forwardRef<HTMLDivElement, { html: string; onClick: (e: React.MouseEvent) => void }>(
        ({ html, onClick }, ref) => {
            return (
                <div
                    ref={ref}
                    className="seat-map-svg-content"
                    onClick={onClick}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            );
        }
    )
);

const SeatMap: React.FC<SeatMapProps> = ({ onBack, selectedEvent, onPurchase, soldSeats, adminMode = false }) => {
    const [loading, setLoading] = useState(true);
    const [svgContent, setSvgContent] = useState<string>('');
    const [venueData, setVenueData] = useState<VenueData | null>(null);
    const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    // Performance refs
    const transformRef = useRef({ x: 0, y: 0, scale: 1 });
    const contentRef = useRef<HTMLDivElement>(null);
    const isDraggingRef = useRef(false);
    const hasMovedRef = useRef(false); // Track if current press moved enough to be a drag
    const dragStartRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null); // Specific ref for the interactive area
    const svgContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Load JSON dynamically
                const dataModule = await import('../assets/venueInfo/Auditorio Telmex/AuditorioTelmex.json');
                const data = dataModule.default as VenueData;
                setVenueData(data);
                setSvgContent(auditoriumSvgRaw);
            } catch (error) {
                console.error("Error loading venue data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        transformRef.current = { x: position.x, y: position.y, scale: scale };
        updateTransform();
    }, [position, scale]);

    const updateTransform = () => {
        if (contentRef.current) {
            const { x, y, scale } = transformRef.current;
            contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
        }
    };

    // Initialize interactive elements
    useEffect(() => {
        if (!loading && venueData && svgContainerRef.current) {
            const container = svgContainerRef.current;

            // Clear previous selections first to ensure sync
            container.querySelectorAll('.selected, .sold').forEach(el => {
                el.classList.remove('selected');
                el.classList.remove('sold');
            });

            // Apply sold state (priority)
            soldSeats.forEach(id => {
                const element = container.querySelector(`[id='${id}']`);
                if (element) element.classList.add('sold');
            });

            // Re-apply selected state
            selectedSeats.forEach(id => {
                // In admin mode, selected seats are those that were sold and are now selected for release
                // In normal mode, selected seats are just normal selected seats
                if (adminMode) {
                    const element = container.querySelector(`[id='${id}']`);
                    if (element) {
                        element.classList.add('selected');
                        element.classList.add('admin-selected');
                    }
                } else {
                    if (soldSeats.includes(id)) return; // Ensure normal user can't select sold seats
                    const element = container.querySelector(`[id='${id}']`);
                    if (element) element.classList.add('selected');
                }
            });
        }
    }, [loading, venueData, svgContent, selectedSeats, soldSeats, adminMode]); // selectedSeats is now a dependency

    const toggleSeat = (id: string) => {
        setSelectedSeats(prev => {
            const isSold = soldSeats.includes(id);
            const isSelected = prev.includes(id);
            const domEl = document.getElementById(id);

            if (adminMode) {
                // In admin mode, only sold seats can be selected/deselected
                if (!isSold) return prev; // Admin can only interact with sold seats

                if (domEl) {
                    if (!isSelected) {
                        domEl.classList.add('selected');
                        domEl.classList.add('admin-selected');
                    } else {
                        domEl.classList.remove('selected');
                        domEl.classList.remove('admin-selected');
                    }
                }

                if (isSelected) return prev.filter(s => s !== id);
                return [...prev, id];
            } else {
                // In normal mode, sold seats cannot be selected
                if (isSold) return prev;

                if (domEl) {
                    if (!isSelected) domEl.classList.add('selected');
                    else domEl.classList.remove('selected');
                }

                if (isSelected) return prev.filter(s => s !== id);
                return [...prev, id];
            }
        });
    };

    // Optimized click handler using delegating logic
    const handleSeatClick = React.useCallback((event: React.MouseEvent) => {
        // Prevent click if we were dragging
        if (hasMovedRef.current) return;

        const target = event.target as SVGElement;
        const element = target.id ? target : target.closest('[id]');
        const id = element?.id;

        if (id && venueData) {
            // Check if it's a seat based on attribute or class (FAST)
            const type = target.getAttribute('data-type') || "";
            const isSeat = type.includes('purple_wool') ||
                target.classList.contains('seat') ||
                target.classList.contains('purple_wool');

            if (isSeat) {
                toggleSeat(id);
            }
        }
    }, [venueData, adminMode, soldSeats]); // Added adminMode and soldSeats dependencies

    // Zoom / Pan logic
    // Zoom logic - now triggered directly by wheel without needing Ctrl
    const handleWheel = React.useCallback((e: WheelEvent) => {
        e.preventDefault(); // Bloquear scroll de la página
        e.stopPropagation(); // Evitar que el evento suba

        const delta = e.deltaY > 0 ? 0.9 : 1.1;

        setScale(prevScale => {
            const newScale = Math.min(Math.max(0.2, prevScale * delta), 8);
            return newScale;
        });
    }, []);

    // Use native listener to ensure we can prevent default scrolling
    useEffect(() => {
        const view = viewRef.current;
        if (view) {
            // passive: false es CRÍTICO para poder hacer preventDefault()
            view.addEventListener('wheel', handleWheel, { passive: false });
            return () => view.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        hasMovedRef.current = false; // Reset on every press
        dragStartRef.current = {
            x: e.clientX - transformRef.current.x,
            y: e.clientY - transformRef.current.y
        };
        if (contentRef.current) contentRef.current.style.transition = 'none';
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDraggingRef.current) {
            e.preventDefault();
            const newX = e.clientX - dragStartRef.current.x;
            const newY = e.clientY - dragStartRef.current.y;

            // Simple move threshold to differentiate click vs drag
            if (Math.abs(newX - transformRef.current.x) > 3 || Math.abs(newY - transformRef.current.y) > 3) {
                hasMovedRef.current = true;
            }

            transformRef.current.x = newX;
            transformRef.current.y = newY;

            requestAnimationFrame(updateTransform);
        }
    };

    const handleMouseUp = () => {
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            // Sync React state at the end of dragging
            setPosition({ x: transformRef.current.x, y: transformRef.current.y });
            if (contentRef.current) contentRef.current.style.transition = 'transform 0.1s ease-out';

            // Note: we don't reset hasMovedRef here because the click event fires AFTER mouseUp
            // We'll reset it on mouseDown
        }
    };

    const zoomIn = () => setScale(s => Math.min(s * 1.2, 8));
    const zoomOut = () => setScale(s => Math.max(s / 1.2, 0.2));
    const resetView = () => { setScale(1); setPosition({ x: 0, y: 0 }); };

    if (loading) {
        return (
            <div className="seat-map-loading">
                <Loader2 className="spinner" />
                <p>Cargando mapa del auditorio...</p>
            </div>
        );
    }



    return (
        <div className="seat-map-container" ref={containerRef}>
            <div
                ref={viewRef}
                className="seat-map-view"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <div
                    ref={contentRef}
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                        transformOrigin: 'center',
                        transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        height: '100%'
                    }}
                >
                    {selectedEvent && selectedEvent.title.includes("EMC") ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center', alignItems: 'center', width: '100%', maxWidth: '800px', pointerEvents: 'auto' }}>
                            {/* General Admission */}
                            <div
                                style={{
                                    background: 'linear-gradient(90deg, #334155, #0f172a)',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    padding: '24px 40px',
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    transition: 'transform 0.2s, border-color 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = '#3b82f6'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#334155'; }}
                            >
                                <div style={{ textAlign: 'left' }}>
                                    <h3 style={{ color: '#3b82f6', fontSize: '1.5rem', marginBottom: '4px', margin: 0 }}>Admisión General</h3>
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Acceso a todas las áreas generales del festival.</p>
                                </div>
                                <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>$3,200.00</span>
                            </div>

                            {/* VIP */}
                            <div
                                style={{
                                    background: 'linear-gradient(90deg, #334155, #0f172a)',
                                    border: '1px solid #4f46e5',
                                    borderRadius: '12px',
                                    padding: '24px 40px',
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                    transition: 'transform 0.2s, border-color 0.2s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.borderColor = '#fbbf24'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = '#4f46e5'; }}
                            >
                                <div style={{ textAlign: 'left' }}>
                                    <h3 style={{ color: '#fbbf24', fontSize: '1.5rem', marginBottom: '4px', margin: 0 }}>VIP Experience</h3>
                                    <p style={{ color: '#e2e8f0', fontSize: '0.9rem', margin: 0 }}>Acceso preferencial, zonas exclusivas y baños privados.</p>
                                </div>
                                <span style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>$5,800.00</span>
                            </div>
                        </div>
                    ) : (
                        <SeatSvg
                            ref={svgContainerRef}
                            html={svgContent}
                            onClick={handleSeatClick}
                        />
                    )}
                </div>
            </div>

            <div className="seat-map-controls">
                <button className="control-btn" onClick={zoomIn} title="Zoom In">
                    <ZoomIn size={18} />
                </button>
                <button className="control-btn" onClick={zoomOut} title="Zoom Out">
                    <ZoomOut size={18} />
                </button>
                <button className="control-btn" onClick={resetView} title="Reset View">
                    <Maximize size={18} />
                </button>
            </div>

            <div className="seat-info-panel">
                <div className="seat-map-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '15px' }}>
                        <button className="back-btn" onClick={onBack}>
                            <ArrowLeft size={20} />
                            {adminMode ? "Volver a Gestión" : "Cambiar Evento"}
                        </button>
                        {adminMode && selectedSeats.length > 0 && (
                            <button
                                className="release-btn-top"
                                onClick={() => onPurchase(selectedSeats)}
                                style={{
                                    background: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '8px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
                                }}
                            >
                                <RefreshCcw size={16} />
                                Aplicar Cambios ({selectedSeats.length})
                            </button>
                        )}
                    </div>
                    <div className="event-info-map">
                        <h2>{selectedEvent.title} {adminMode && <span className="admin-badge">ADMIN MAP</span>}</h2>
                        <p>{selectedEvent.location} • {selectedEvent.date}</p>
                    </div>
                </div>

                <div className="selected-seats-list">
                    {selectedSeats.length > 0 ? (
                        selectedSeats.map(id => (
                            <div key={id} className="ticket-card">
                                <div className="ticket-header">
                                    <span>Boleto normal</span>
                                </div>
                                <div className="ticket-body">
                                    <div className="ticket-info-row">
                                        <div className="ticket-info-item">
                                            <span className="label">SECCIÓN</span>
                                            <span className="value">AZU201</span>
                                        </div>
                                        <div className="ticket-info-item">
                                            <span className="label">FILA</span>
                                            <span className="value">{id.split('-')[1]}</span>
                                        </div>
                                        <div className="ticket-info-item">
                                            <span className="label">ASIENTO</span>
                                            <span className="value">{id.split('-')[3]}</span>
                                        </div>
                                    </div>
                                    <div className="ticket-footer-row">
                                        <span className="price" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80' }}>
                                            <img src={coinImage} alt="E" style={{ width: '16px', height: '16px' }} />
                                            200
                                        </span>
                                        <button
                                            className="delete-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSeat(id);
                                            }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">
                            <p>No has seleccionado asientos</p>
                            <span className="empty-hint">Selecciona asientos en el mapa para continuar</span>
                        </div>
                    )}
                </div>

                <div className="panel-footer">
                    <div className="total-summary">
                        <span className="ticket-icon">
                            <Ticket size={24} />
                            × {selectedSeats.length}
                        </span>
                        {!adminMode && (
                            <span className="total-price" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4ade80' }}>
                                <img src={coinImage} alt="E" style={{ width: '24px', height: '24px' }} />
                                {(selectedSeats.length * 200).toLocaleString()}
                            </span>
                        )}
                    </div>
                    <button
                        className={adminMode ? "checkout-btn release-btn" : "checkout-btn"}
                        disabled={selectedSeats.length === 0}
                        onClick={() => onPurchase(selectedSeats)}
                    >
                        {adminMode ? "Liberar Asientos" : "Comprar boletos"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeatMap;
