import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Calendar, MapPin, Globe, Search, ChevronDown, User, ArrowRight, ArrowLeft, LogOut, Ticket, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SeatMap from './components/SeatMap';
import EtherionStore from './components/EtherionStore';
import AuthModal from './components/AuthModal';
import UserPortal from './components/UserPortal';
import AdminPanel from './components/AdminPanel';
import ethernalLogo from './assets/Images/logoethernal.png';
import coinImage from './assets/etherion-coin.png';
import { formatEtherions } from './utils/formatters';
import './App.css';

interface Event {
  id: number;
  title: string;
  category: string;
  date: string;
  location: string;
  price: string;
  image: string;
}

const events: Event[] = [
  {
    id: 1,
    title: "Tame Impala: Slow Rush Tour",
    category: "Concert",
    date: "Noviembre 17, 2026",
    location: "Auditorio Telmex, GDL",
    price: "$1,388.75",
    image: "/events/tame-impala.png",
  },
  {
    id: 2,
    title: "Coachella: Desert Vibes",
    category: "Festival",
    date: "Abril 14, 2026",
    location: "Empire Polo Club, CA",
    price: "$5,400.00",
    image: "/events/coachella.png",
  },
  {
    id: 3,
    title: "EMC Mexico 2026",
    category: "Festival",
    date: "Febrero 27, 2026",
    location: "Autódromo H. Rodríguez, CDMX",
    price: "$3,200.00",
    image: "/events/emc.png",
  }
];

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedCategory] = useState("All");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);



  const filteredEvents = events.filter(event =>
    (selectedCategory === "All" || event.category === selectedCategory)
  );

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showStore, setShowStore] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Initialize state from localStorage
  const [user, setUser] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showUserPortal, setShowUserPortal] = useState(false);
  const showAdminPanel = location.pathname === '/adminpanel';

  const [adminList, setAdminList] = useState<string[]>(() => {
    const saved = localStorage.getItem('ethernal_admins');
    return saved ? JSON.parse(saved) : ['admin@ethernal.com', 'tcborder020@gmail.com'];
  });

  const [isAdmin, setIsAdmin] = useState(false); // Changed to state variable

  const [etherionBalances, setEtherionBalances] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('ethernal_all_balances');
    return saved ? JSON.parse(saved) : {};
  });

  const [etherionBalance, setEtherionBalance] = useState(0); // Changed to state variable
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const checkData = async () => {
      const token = localStorage.getItem('token');
      const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

      // 1. Check User
      if (token) {
        try {
          const response = await fetch(`${API_URL}/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (response.ok) {
            const userData = await response.json();
            setUser(userData.email);
            setEtherionBalance(userData.balance);
            setIsAdmin(userData.is_admin === 1 || userData.is_admin === true);

            // 2. Fetch Tickets (only if user is logged in)
            const tResponse = await fetch(`${API_URL}/my-tickets`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (tResponse.ok) {
              const tickets = await tResponse.json();
              setPurchasedTickets(tickets);
            }
          } else {
            localStorage.removeItem('token');
            setUser(null);
            setEtherionBalance(0);
            setIsAdmin(false);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
        }
      }

      // 3. Fetch Sold Seats (public)
      try {
        const sResponse = await fetch(`${API_URL}/tickets/sold`);
        if (sResponse.ok) {
          const seats = await sResponse.json();
          setGloballySoldSeats(seats);
        }
      } catch (err) {
        console.error("Error fetching sold seats:", err);
      }

      // 4. Fetch All Users (if Admin)
      if (token) {
        try {
          const uResponse = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (uResponse.ok) {
            const usersData = await uResponse.json();
            setUsers(usersData);
          }
        } catch (err) {
          console.error("Error fetching users list:", err);
        }
      }
    };

    checkData();
  }, [user]);




  const [purchasedTickets, setPurchasedTickets] = useState<any[]>([]);
  const [globallySoldSeats, setGloballySoldSeats] = useState<string[]>([]);

  // Persist state to localStorage
  // The 'ethernal_user' persistence is now handled by 'token' and 'user' in the new auth flow
  // The 'ethernal_all_balances' might still be useful for admin view or if balances are managed client-side for other users
  useEffect(() => {
    localStorage.setItem('ethernal_all_balances', JSON.stringify(etherionBalances));
  }, [etherionBalances]);

  // Removed manual localStorage persistence for tickets/seats as we now use the DB

  useEffect(() => {
    localStorage.setItem('ethernal_admins', JSON.stringify(adminList));
  }, [adminList]);

  // Sync state across tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ethernal_admins' && e.newValue) {
        setAdminList(JSON.parse(e.newValue));
      }
      if (e.key === 'token') { // Listen for token changes
        const token = e.newValue;
        if (!token) {
          setUser(null);
          setIsAdmin(false);
          setEtherionBalance(0);
        }
        // A full re-check might be better here if token appears
        // checkUser(); // This would re-fetch user data
      }
      // The 'ethernal_user' key is no longer directly used for user state
      if (e.key === 'ethernal_all_balances' && e.newValue) {
        setEtherionBalances(JSON.parse(e.newValue));
      }
      if (e.key === 'ethernal_tickets' && e.newValue) {
        setPurchasedTickets(JSON.parse(e.newValue));
      }
      if (e.key === 'ethernal_sold_seats' && e.newValue) {
        setGloballySoldSeats(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    console.log("Logging out user...");
    setUser(null);
    setIsAdmin(false);
    setEtherionBalance(0);
    setShowUserMenu(false);
    setShowUserPortal(false);
    localStorage.removeItem('token');
    localStorage.removeItem('ethernal_user');
    localStorage.removeItem('user'); // For backward compatibility
    navigate('/');
  };

  // Scroll to top when an event is selected
  useEffect(() => {
    if (selectedEvent) {
      window.scrollTo(0, 0);
      setShowStore(false); // Close store if event is selected from somewhere else
    }
  }, [selectedEvent]);

  const handleBuyEtherions = async (amount: number, targetEmail?: string) => {
    const token = localStorage.getItem('token');
    const emailToUpdate = targetEmail || user;

    if (!token || !emailToUpdate) {
      alert("Debes iniciar sesión para realizar esta acción.");
      return;
    }

    try {
      const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
      const response = await fetch(`${API_URL}/admin/add-balance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: emailToUpdate, amount })
      });

      const data = await response.json();
      if (response.ok) {
        // If we updated ourselves, update the local balance state too
        if (emailToUpdate === user) {
          setEtherionBalance(prev => prev + amount);
        }
        // Refresh users list to show new balance in admin table
        const tokenForUsers = localStorage.getItem('token');
        const API_URL_REFR = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
        fetch(`${API_URL_REFR}/admin/users`, { headers: { 'Authorization': `Bearer ${tokenForUsers}` } })
          .then(res => res.json()).then(data => setUsers(data)).catch(console.error);

        alert(data.message || `¡Se han añadido ${amount} Etherions!`);
        setShowStore(false);
      } else {
        alert(data.error || "Error al actualizar saldo");
      }
    } catch (error) {
      console.error("Error updating balance:", error);
      alert("Error de conexión con el servidor");
    }
  };

  const handleAssignAdmin = async (email: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
      const response = await fetch(`${API_URL}/admin/set-admin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, isAdmin: true })
      });

      const data = await response.json();
      if (response.ok) {
        if (!adminList.includes(email)) {
          setAdminList(prev => [...prev, email]);
        }
        // Refresh users list
        const API_URL_REFR = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
        fetch(`${API_URL_REFR}/admin/users`, { headers: { 'Authorization': `Bearer ${token}` } })
          .then(res => res.json()).then(data => setUsers(data)).catch(console.error);

        alert(data.message || `Rango de ${email} actualizado.`);
      } else {
        alert(data.error || "Error al asignar admin");
      }
    } catch (error) {
      console.error("Error setting admin role:", error);
      alert("Error de conexión");
    }
  };

  const handleChangePassword = async (email: string, newPass: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
      const response = await fetch(`${API_URL}/admin/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, newPassword: newPass })
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Contraseña actualizada");
      } else {
        alert(data.error || "Error al cambiar contraseña");
      }
    } catch (error) {
      console.error("Error setting password:", error);
      alert("Error de conexión");
    }
  };

  const handlePurchaseSeats = async (seatIds: string[]) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    const totalCost = seatIds.length * 200;
    if (etherionBalance < totalCost) {
      alert("No tienes suficientes Etherions. Visita la tienda para recargar.");
      setShowStore(true);
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';
      const response = await fetch(`${API_URL}/tickets/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          eventTitle: selectedEvent?.title || 'Evento Desconocido',
          seats: seatIds,
          totalPrice: totalCost
        })
      });

      const data = await response.json();
      if (response.ok) {
        setEtherionBalance(prev => prev - totalCost);
        setGloballySoldSeats(prev => [...prev, ...seatIds]);

        // Refresh tickets
        const tResponse = await fetch(`${API_URL}/my-tickets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (tResponse.ok) {
          const tickets = await tResponse.json();
          setPurchasedTickets(tickets);
        }

        setSelectedEvent(null);
        setShowUserPortal(true);
        alert("¡Compra realizada con éxito! Revisa tus boletos en el portal.");
      } else {
        alert(data.error || "Error al realizar la compra");
      }
    } catch (error) {
      console.error("Purchase error:", error);
      alert("Error de conexión al procesar la compra");
    }
  };

  const handleResetSeats = () => {
    setGloballySoldSeats([]);
    setPurchasedTickets([]);
    localStorage.removeItem('ethernal_sold_seats');
    localStorage.removeItem('ethernal_tickets');
    alert("Mapa de asientos reseteado con éxito.");
  };

  const handleResetSpecificSeats = (seatIds: string[]) => {
    setGloballySoldSeats(prev => prev.filter(id => !seatIds.includes(id)));

    // Use the stored originalSeatId for perfect matching during removal
    setPurchasedTickets(prev => prev.filter(ticket =>
      !seatIds.includes(ticket.originalSeatId)
    ));
    alert(`Operación completada: ${seatIds.length} asientos gestionados.`);
  };

  const handleResetEvent = (eventName: string) => {
    // Collect all seat IDs for this event to free them
    const ticketsToRemove = purchasedTickets.filter(t => t.event === eventName);
    const seatIdsToRemove = ticketsToRemove.map(t => `seat-6-row-${t.row}-item-${t.seat}`);

    setGloballySoldSeats(prev => prev.filter(id => !seatIdsToRemove.includes(id)));
    setPurchasedTickets(prev => prev.filter(t => t.event !== eventName));
    alert(`Se ha reseteado el evento "${eventName}".`);
  };

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [viewDate, setViewDate] = useState(new Date(2026, 1)); // Start at Feb 2026

  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendarGrid = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Empty cells for start padding
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day" style={{ opacity: 0 }}></div>);
    }

    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(
        <div
          key={i}
          className={getDayClass(i, month, year)}
          onClick={() => handleDateClick(i, month, year)}
        >
          {i}
        </div>
      );
    }

    return days;
  };

  const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  const handleDateClick = (day: number, month: number, year: number) => {
    const clickedDate = new Date(year, month, day);

    if (!startDate || (startDate && endDate)) {
      setStartDate(clickedDate);
      setEndDate(null);
    } else {
      if (clickedDate < startDate) {
        setStartDate(clickedDate);
      } else {
        setEndDate(clickedDate);
      }
    }
  };



  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  const getDayClass = (day: number, month: number, year: number) => {
    let classes = 'calendar-day';
    const current = new Date(year, month, day);

    if (startDate && current.getTime() === startDate.getTime()) {
      classes += ' selected start-date';
    } else if (endDate && current.getTime() === endDate.getTime()) {
      classes += ' selected end-date';
    } else if (startDate && endDate && current > startDate && current < endDate) {
      classes += ' in-range';
    }

    return classes;
  };

  return (
    <div className="app-container">
      <header className={`header ${isScrolled ? 'scrolled' : ''}`} style={{ display: showAdminPanel ? 'none' : 'block' }}>
        <div className="header-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <a
              href="/"
              className="logo"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
                setSelectedEvent(null);
                setShowStore(false);
                setShowUserPortal(false);
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <img src={ethernalLogo} alt="Ethernal" style={{ height: '32px', width: 'auto' }} />
              <span style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-0.5px', color: '#ffffff' }}>Tickets</span>
            </a>

            <nav className="nav-new">
              {["Conciertos y Festivales", "Teatro y Cultura", "Deportes", "Familiares", "Especiales", "Ciudades"].map((item) => (
                <a href="#" key={item} className="nav-link-new" onClick={(e) => e.preventDefault()}>
                  {item}
                </a>
              ))}
            </nav>
          </div>

          <div className="header-actions" style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div
              className="nav-link-new"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(74, 222, 128, 0.2)' }}
              onClick={() => { setShowStore(true); setSelectedEvent(null); }}
            >
              <img src={coinImage} alt="Etherion" style={{ width: '24px', height: '24px' }} />
              <span style={{ color: '#4ade80', fontWeight: '600' }}>{formatEtherions(etherionBalance)} Etherions</span>
            </div>
            <div
              className="nav-link-new"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', position: 'relative' }}
              onClick={() => user ? setShowUserMenu(!showUserMenu) : setShowAuthModal(true)}
            >
              <User size={20} />
              <span>{user ? user.split('@')[0] : "Mi Cuenta"}</span>

              {user && showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '10px',
                  background: '#171717',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  padding: '8px',
                  minWidth: '150px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                  zIndex: 1000,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserPortal(true);
                      setShowUserMenu(false);
                      setSelectedEvent(null);
                      setShowStore(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: 'white',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Ticket size={16} />
                    Mis Boletos
                  </button>
                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUserMenu(false);
                        setSelectedEvent(null);
                        setShowStore(false);
                        setShowUserPortal(false);
                        navigate('/adminpanel');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'transparent',
                        border: 'none',
                        color: '#4ade80',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        width: '100%',
                        textAlign: 'left',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(74, 222, 128, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <LayoutDashboard size={16} />
                      Panel Admin
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                      setShowUserPortal(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      width: '100%',
                      textAlign: 'left',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={16} />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main>
        {showAuthModal && (
          <AuthModal
            onClose={() => setShowAuthModal(false)}
            onLogin={(userData) => {
              console.log("Login successful, updating state:", userData);
              localStorage.setItem('ethernal_user', userData.email);
              setUser(userData.email);
              setEtherionBalance(userData.balance);
              setIsAdmin(userData.is_admin === 1 || userData.is_admin === true);
              setShowAuthModal(false);
            }}
          />
        )}
        {showAdminPanel ? (
          isAdmin ? (
            <AdminPanel
              totalTickets={purchasedTickets}
              soldSeats={globallySoldSeats}
              onResetSeats={handleResetSeats}
              onResetSpecificSeats={handleResetSpecificSeats}
              onResetEvent={handleResetEvent}
              onAddEtherionsByEmail={(email, amount) => handleBuyEtherions(amount, email)}
              onAssignAdmin={handleAssignAdmin}
              onChangePassword={handleChangePassword}
              adminList={adminList}
              users={users}
              onBack={() => {
                navigate('/');
              }}
            />
          ) : <Navigate to="/" />
        ) : showUserPortal && user ? (
          <UserPortal
            user={user}
            tickets={purchasedTickets.filter(t => t.owner === user)}
            balance={etherionBalance}
            onBack={() => setShowUserPortal(false)}
          />
        ) : showStore ? (
          <EtherionStore onBack={() => setShowStore(false)} onBuy={handleBuyEtherions} />
        ) : selectedEvent ? (
          <section className="section" style={{ paddingTop: '80px', minHeight: '100vh', maxWidth: '100%', padding: '0' }}>
            <div style={{ width: '100%', height: 'calc(100vh - 80px)' }}>
              <SeatMap
                onBack={() => setSelectedEvent(null)}
                onPurchase={handlePurchaseSeats}
                soldSeats={globallySoldSeats}
              />
            </div>
          </section>
        ) : (
          <>
            <section className="hero" id="home" style={{
              background: 'linear-gradient(to bottom, #020617, #0f172a)',
              height: '60vh',
              minHeight: '400px'
            }}>
              <div className="hero-content" style={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px' }}>

                <h1 className="hero-title" style={{ fontSize: '3rem', textAlign: 'center' }}>
                  <span className="gradient-text">Encuentra tu próxima experiencia</span>
                </h1>

                <div className="tm-search-bar" style={{
                  display: 'flex',
                  background: 'white',
                  borderRadius: '8px',
                  width: '100%',
                  height: '80px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  position: 'relative'
                }}>
                  {/* Location Segment */}
                  <div className="search-segment" style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', borderRight: '1px solid #e2e8f0', cursor: 'pointer' }}>
                    <MapPin color="#334155" size={20} style={{ marginRight: '12px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>UBICACIÓN</span>
                      <span style={{ color: '#1e293b', fontWeight: '600' }}>Todo México</span>
                    </div>
                    <ChevronDown color="#94a3b8" size={16} />
                  </div>

                  {/* Date Segment */}
                  <div
                    className="search-segment"
                    style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 20px', borderRight: '1px solid #e2e8f0', cursor: 'pointer', position: 'relative' }}
                    onClick={() => setShowDatePicker(!showDatePicker)}
                  >
                    <Calendar color="#334155" size={20} style={{ marginRight: '12px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>FECHAS</span>
                      <span style={{ color: '#1e293b', fontWeight: '600' }}>Todas las fechas</span>
                    </div>
                    <ChevronDown color="#94a3b8" size={16} />

                    {/* Date Picker Modal */}
                    {showDatePicker && (
                      <div className="date-picker-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="date-inputs-row">
                          <div className="date-input-group">
                            <label>Fecha de inicio</label>
                            <input type="text" placeholder="DD/MM/AAAA" value={formatDate(startDate)} readOnly />
                          </div>
                          <div className="date-input-group">
                            <label>Fecha final</label>
                            <input type="text" placeholder="DD/MM/AAAA" value={formatDate(endDate)} readOnly />
                          </div>
                        </div>

                        <div className="calendars-container">
                          {/* Left Calendar */}
                          <div className="calendar">
                            <div className="calendar-header">
                              <ArrowLeft size={16} color="#64748b" style={{ cursor: 'pointer' }} onClick={prevMonth} />
                              <span>{`${monthNames[viewDate.getMonth()]} ${viewDate.getFullYear()}`}</span>
                            </div>
                            <div className="calendar-grid">
                              {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map(d => (
                                <div key={d} className="calendar-day-label">{d}</div>
                              ))}
                              {renderCalendarGrid(viewDate)}
                            </div>
                          </div>

                          {/* Right Calendar */}
                          <div className="calendar">
                            <div className="calendar-header">
                              {(() => {
                                const nextViewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
                                return (
                                  <>
                                    <span>{`${monthNames[nextViewDate.getMonth()]} ${nextViewDate.getFullYear()}`}</span>
                                    <ArrowRight size={16} color="#64748b" style={{ cursor: 'pointer' }} onClick={nextMonth} />
                                  </>
                                );
                              })()}
                            </div>
                            <div className="calendar-grid">
                              {['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'].map(d => (
                                <div key={d} className="calendar-day-label">{d}</div>
                              ))}
                              {renderCalendarGrid(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                            </div>
                          </div>
                        </div>

                        <div className="modal-footer">
                          <button className="btn-text" onClick={() => { setStartDate(null); setEndDate(null); }}>Reiniciar</button>
                          <div>
                            <button className="btn-outline" onClick={() => setShowDatePicker(false)}>Cancelar</button>
                            <button className="btn-fill" onClick={() => setShowDatePicker(false)}>Aplicar</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Search Input Segment */}
                  <div className="search-segment main-input" style={{ flex: 2, display: 'flex', alignItems: 'center', padding: '0 8px 0 20px' }}>
                    <Search color="#334155" size={20} style={{ marginRight: '12px' }} />
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginRight: '12px' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', letterSpacing: '0.5px' }}>BUSCAR</span>
                      <input
                        type="text"
                        placeholder="Artista, evento o inmueble"
                        style={{
                          border: 'none',
                          outline: 'none',
                          fontSize: '1rem',
                          fontWeight: '500',
                          color: '#1e293b',
                          width: '100%',
                          padding: 0
                        }}
                      />
                    </div>
                    <button style={{
                      background: '#334155',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '6px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      height: '48px'
                    }}>
                      Buscar
                    </button>
                  </div>
                </div>

              </div>
            </section>

            <section className="section" id="events">
              <div className="cards-grid">
                <AnimatePresence mode='popLayout'>
                  {filteredEvents.map((event, index) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      key={event.id}
                      className="event-card"
                    >
                      <img src={event.image} alt={event.title} className="event-image" />
                      <div className="event-content">
                        <span className="event-tag">{event.category}</span>
                        <h3 className="event-title">{event.title}</h3>
                        <div className="event-details">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={14} />
                            <span>{event.date}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={14} />
                            <span>{event.location}</span>
                          </div>
                        </div>
                        <div className="event-footer" style={{
                          flexDirection: 'column',
                          gap: '0.8rem',
                          alignItems: 'stretch',
                          paddingTop: '1rem',
                          marginTop: 'auto'
                        }}>
                          <button
                            className="btn btn-secondary"
                            style={{
                              padding: '0.8rem',
                              width: '100%',
                              borderRadius: '8px',
                              fontSize: '0.85rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em'
                            }}
                            onClick={() => setSelectedEvent(event)}
                          >
                            Detalles
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </section>

            <section className="section" id="about" style={{ background: 'var(--color-bg-secondary)' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
                <h2 className="section-title">Sobre <span className="gradient-text">Nosotros</span></h2>
                <p className="hero-subtitle" style={{ fontSize: '1.1rem' }}>
                  Somos la plataforma líder en venta de tickets para eventos exclusivos.
                  Con un enfoque en la tecnología y la experiencia del usuario,
                  conectamos a las personas con sus pasiones.
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="footer" id="contact">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="gradient-text">Ethernal Tickets</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', lineHeight: '1.8' }}>
              Estudio de desarrollo y plataforma de tickets especializada en conciertos dentro de Minecraft.
              Creando experiencias musicales inolvidables.
            </p>
          </div>
          <div className="footer-section">
            <h3>Empresa</h3>
            <ul className="footer-links">
              <li><a href="#events" className="footer-link">Eventos</a></li>
              <li><a href="#about" className="footer-link">Portafolio</a></li>
              <li><a href="#contact" className="footer-link">Contacto</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Comunidad</h3>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">Discord</a></li>
              <li><a href="#" className="footer-link">Twitter</a></li>
            </ul>
          </div>
          <div className="footer-section">
            <h3>Legal</h3>
            <ul className="footer-links">
              <li><a href="#" className="footer-link">Privacidad</a></li>
              <li><a href="#" className="footer-link">Términos</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Ethernal Tickets®. Todos los derechos reservados.</p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* Using text for social links as icons replacement if needed, but Lucide works */}
            <Globe size={18} />
          </div>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<AppContent />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
