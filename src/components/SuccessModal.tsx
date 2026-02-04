import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import './SuccessModal.css';

interface SuccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, onClose, message }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="success-modal-overlay">
                    <motion.div
                        className="success-modal-content"
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    >
                        <button className="close-success-btn" onClick={onClose}>
                            <X size={24} />
                        </button>

                        <div className="success-image-container">
                            <img src="/success-don-bigotes.png" alt="Success!" className="success-don-img" />
                            <div className="success-glow"></div>
                        </div>

                        <div className="success-text">

                            <h2>¡Compra Realizada!</h2>
                            <p>{message}</p>
                        </div>

                        <button className="success-action-btn" onClick={onClose}>
                            Ir al Portal de Boletos
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default SuccessModal;
