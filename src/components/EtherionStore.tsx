import React from 'react';
import './EtherionStore.css';
import coinImage from '../assets/etherion-coin.png';
import { ArrowLeft } from 'lucide-react';
import { formatEtherions } from '../utils/formatters';

interface EtherionStoreProps {
    onBack: () => void;
    onBuy: (amount: number) => void;
}

const EtherionStore: React.FC<EtherionStoreProps> = ({ onBack, onBuy }) => {
    const offers = [
        {
            id: 1,
            amount: 400,
            bonus: 0,
            price: 0.49,
            tier: 'tier-1',
            bonusText: ''
        },
        {
            id: 2,
            amount: 1000,
            bonus: 0,
            price: 1.19,
            tier: 'tier-2',
            bonusText: ''
        },
        {
            id: 3,
            amount: 2800,
            bonus: 10,
            price: 2.99,
            tier: 'tier-3',
            bonusText: '10% EXTRA'
        },
        {
            id: 4,
            amount: 5000,
            bonus: 22,
            price: 4.99,
            tier: 'tier-4',
            bonusText: '22% EXTRA'
        },
        {
            id: 5,
            amount: 13500,
            bonus: 35,
            price: 12.99,
            tier: 'tier-5',
            bonusText: '35% EXTRA'
        }
    ];

    return (
        <div className="etherion-store-container">
            <button className="back-store-btn" onClick={onBack}>
                <ArrowLeft size={24} />
                <span>Volver</span>
            </button>

            <div className="store-header">
                <h2>TIENDA ETHERION</h2>
                <p>Consigue monedas para items exclusivos</p>
            </div>

            <div className="offers-grid">
                {offers.map((offer) => (
                    <div
                        key={offer.id}
                        className={`offer-card ${offer.tier}`}
                        onClick={() => onBuy(offer.amount)}
                    >
                        {offer.bonusText && (
                            <div className="bonus-tag">
                                {offer.bonusText}
                            </div>
                        )}

                        <div className="coin-image-container">
                            <img src={coinImage} alt="Etherion Coin" className="coin-image" />
                        </div>

                        <div className="etherion-amount">
                            {formatEtherions(offer.amount)}
                            <span className="etherion-label">ETHERIONS</span>
                        </div>

                        <button className="price-button">
                            ${offer.price}
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EtherionStore;
