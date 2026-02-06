import React, { useRef } from 'react';
import { ArrowLeft, Play, Calendar, MapPin } from 'lucide-react';
import './ConcertsPage.css';

interface Concert {
    id: number;
    title: string;
    date: string;
    location: string;
    videoUrl: string;
    thumbnail?: string;
    duration: string;
}

// Data for past concerts
const pastConcerts: Concert[] = [
    {
        id: 1,
        title: "Ethernal Live Experience 2025",
        date: "08 Febrero 2025",
        location: "Auditorio Telmex, GDL",
        videoUrl: "/concerts/concert-2025.mkv", // Points to public/concerts/
        duration: "2h 45m"
    }
];

interface ConcertsPageProps {
    onBack: () => void;
}

const ConcertsPage: React.FC<ConcertsPageProps> = ({ onBack }) => {
    return (
        <div className="concerts-page">
            <header className="concerts-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} />
                    <span>Volver</span>
                </button>
                <h1>Conciertos Anteriores</h1>
            </header>

            <div className="concerts-grid">
                {pastConcerts.map(concert => (
                    <div key={concert.id} className="concert-card">
                        <div className="video-container">
                            <video
                                controls
                                width="100%"
                                poster={concert.thumbnail}
                                style={{ borderRadius: '12px 12px 0 0', backgroundColor: '#000' }}
                            >
                                <source src={concert.videoUrl} type="video/webm" />
                                <source src={concert.videoUrl} type="video/mp4" />
                                {/* Fallback for MKV if browser supports it directly or via some plugins */}
                                <source src={concert.videoUrl} />
                                Tu navegador no soporta la reproducción de este video.
                            </video>
                            <div className="play-overlay">
                                <Play size={48} fill="white" />
                            </div>
                        </div>
                        <div className="concert-info">
                            <h2>{concert.title}</h2>
                            <div className="meta-row">
                                <div className="meta-item">
                                    <Calendar size={16} />
                                    <span>{concert.date}</span>
                                </div>
                                <div className="meta-item">
                                    <MapPin size={16} />
                                    <span>{concert.location}</span>
                                </div>
                            </div>
                            <span className="duration-badge">{concert.duration}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="empty-state-hint">
                <p>Más conciertos legendarios se añadirán pronto a la bóveda.</p>
            </div>
        </div>
    );
};

export default ConcertsPage;
