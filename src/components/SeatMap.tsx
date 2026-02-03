import React, { useEffect, useRef, useState } from 'react';
import { ZoomIn, ZoomOut, Maximize, Loader2, Trash2, RefreshCcw, X } from 'lucide-react';
import './SeatMap.css';


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
    onPurchase: (seats: string[]) => void | Promise<any>;
    soldSeats: string[];
    onSelectionChange?: (seats: string[]) => void;
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

const SeatMap: React.FC<SeatMapProps> = ({ onBack, onPurchase, soldSeats, onSelectionChange, adminMode = false }) => {
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
    const hasMovedRef = useRef(false);
    const dragStartRef = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<HTMLDivElement>(null);
    const svgContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
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

    useEffect(() => {
        if (!loading && venueData && svgContainerRef.current) {
            const container = svgContainerRef.current;
            container.querySelectorAll('.selected, .sold, .admin-selected').forEach(el => {
                el.classList.remove('selected');
                el.classList.remove('sold');
                el.classList.remove('admin-selected');
            });

            soldSeats.forEach(id => {
                const element = container.querySelector(`[id = '${id}']`);
                if (element) element.classList.add('sold');
            });

            selectedSeats.forEach(id => {
                const element = container.querySelector(`[id = '${id}']`);
                if (element) {
                    element.classList.add('selected');
                    if (adminMode) element.classList.add('admin-selected');
                }
            });
        }
    }, [loading, venueData, svgContent, selectedSeats, soldSeats, adminMode]);

    useEffect(() => {
        if (onSelectionChange) {
            onSelectionChange(selectedSeats);
        }
    }, [selectedSeats, onSelectionChange]);

    const toggleSeat = (id: string) => {
        setSelectedSeats(prev => {
            const isSold = soldSeats.includes(id);
            const isSelected = prev.includes(id);

            if (adminMode) {
                // In admin mode, we can only select seats to release (they must be in soldSeats)
                if (!isSold) return prev;
                if (isSelected) return prev.filter(s => s !== id);
                return [...prev, id];
            } else {
                if (isSold) return prev;
                if (isSelected) return prev.filter(s => s !== id);
                return [...prev, id];
            }
        });
    };

    const handleSeatClick = React.useCallback((event: React.MouseEvent) => {
        if (hasMovedRef.current) return;
        const target = event.target as SVGElement;
        const element = target.id ? target : target.closest('[id]');
        const id = element?.id;
        if (id && venueData) {
            const type = target.getAttribute('data-type') || "";
            const isSeat = type.includes('purple_wool') ||
                target.classList.contains('seat') ||
                target.classList.contains('purple_wool');
            if (isSeat) toggleSeat(id);
        }
    }, [venueData, adminMode, soldSeats]);

    const handleWheel = React.useCallback((e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setScale(prevScale => Math.min(Math.max(0.2, prevScale * delta), 8));
    }, []);

    useEffect(() => {
        const view = viewRef.current;
        if (view) {
            view.addEventListener('wheel', handleWheel, { passive: false });
            return () => view.removeEventListener('wheel', handleWheel);
        }
    }, [handleWheel]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true;
        hasMovedRef.current = false;
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
            setPosition({ x: transformRef.current.x, y: transformRef.current.y });
            if (contentRef.current) contentRef.current.style.transition = 'transform 0.1s ease-out';
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
            {/* FLOATING ACTION BUTTON - IMPOSSIBLE TO MISS */}
            {adminMode && selectedSeats.length > 0 && (
                <button
                    className="apply-changes-btn-floating pulse-button"
                    onClick={async () => {
                        await onPurchase(selectedSeats);
                        setSelectedSeats([]);
                    }}
                    style={{
                        position: 'fixed',
                        top: '40px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 2000,
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '20px 40px',
                        borderRadius: '16px',
                        fontWeight: '900',
                        fontSize: '1.4rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 0 50px rgba(239, 68, 68, 0.8)',
                        pointerEvents: 'all',
                        animation: 'pulse 2s infinite'
                    }}
                >
                    <RefreshCcw size={28} />
                    REESTABLECER {selectedSeats.length} ASIENTOS
                </button>
            )}

            {/* FLOATING EXIT BUTTON FOR ADMIN */}
            {adminMode && (
                <button
                    onClick={onBack}
                    style={{
                        position: 'fixed',
                        top: '20px',
                        right: '20px',
                        zIndex: 2001,
                        background: 'rgba(0,0,0,0.8)',
                        color: 'white',
                        border: '1px solid rgba(255,255,255,0.2)',
                        padding: '10px 20px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <X size={18} />
                    Cerrar Mapa
                </button>
            )}

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
                    <SeatSvg
                        ref={svgContainerRef}
                        html={svgContent}
                        onClick={handleSeatClick}
                    />
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
                                            <span className="label">FILA</span>
                                            <span className="value">{id.split('-')[1]}</span>
                                        </div>
                                        <div className="ticket-info-item">
                                            <span className="label">ASIENTO</span>
                                            <span className="value">{id.split('-')[3]}</span>
                                        </div>
                                    </div>
                                    <div className="ticket-footer-row">
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
                            <p>{adminMode ? "Ningún asiento seleccionado para restaurar" : "No has seleccionado asientos"}</p>
                            <span className="empty-hint">Toca los asientos para seleccionarlos</span>
                        </div>
                    )}
                </div>

                <div className="panel-footer">
                    <button
                        className={adminMode ? "checkout-btn release-btn" : "checkout-btn"}
                        disabled={selectedSeats.length === 0}
                        onClick={async () => {
                            await onPurchase(selectedSeats);
                            setSelectedSeats([]);
                        }}
                    >
                        {adminMode ? "RESTAURAR ASIENTOS" : "Comprar boletos"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SeatMap;
