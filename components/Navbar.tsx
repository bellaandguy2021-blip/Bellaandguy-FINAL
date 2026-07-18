"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";
import { CalendarDays, User, LogOut, Phone, ChevronDown, ShoppingBag } from "lucide-react";
import { useCart } from "./CartProvider";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("home");
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { count, openCart } = useCart();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCustomerLoggedIn(true);
        const meta = session.user.user_metadata;
        const name = meta?.full_name || session.user.email || "";
        setCustomerName(name.split(" ")[0]);
        setCustomerEmail(session.user.email || "");
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCustomerLoggedIn(!!session);
      if (session) {
        const meta = session.user.user_metadata;
        const name = meta?.full_name || session.user.email || "";
        setCustomerName(name.split(" ")[0]);
        setCustomerEmail(session.user.email || "");
      } else {
        setCustomerName("");
        setCustomerEmail("");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [profileOpen]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => { setScrolled(window.scrollY > 60); ticking = false; });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  async function handleLogout() {
    setProfileOpen(false);
    await supabase.auth.signOut();
    setCustomerLoggedIn(false);
    window.location.href = "/";
  }

  const navLinks = [
    { label: "Home", href: "#home", id: "home" },
    { label: "Home Services", href: "#services", id: "services" },
    { label: "Gallery", href: "#gallery", id: "gallery" },
    { label: "Reviews", href: "#reviews", id: "reviews" },
    { label: "Contact", href: "#contact", id: "contact" },
    { label: "About Us", href: "/about", id: "about" },
  ];

  const menuItems = [
    { icon: <CalendarDays size={14}/>, label: "My Bookings", href: "/my-bookings" },
    { icon: <User size={14}/>, label: "Edit Profile", href: "/my-bookings?tab=profile" },
    { icon: <Phone size={14}/>, label: "Contact Salon", href: "#contact" },
  ];

  return (
    <>
      <style>{`
        .nav-link {
          position: relative;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 11.5px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          transition: color 0.25s ease;
          padding-bottom: 2px;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background: #C9A84C;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .nav-link:hover { color: #C9A84C; }
        .nav-link:hover::after { width: 100%; }
        .nav-link.active { color: #C9A84C; }
        .nav-link.active::after { width: 100%; }

        .nav-book-btn {
          position: relative;
          background: transparent;
          border: 1px solid rgba(201, 168, 76, 0.5);
          color: #C9A84C;
          padding: 9px 22px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          text-decoration: none;
          transition: all 0.3s ease;
          overflow: hidden;
          display: inline-block;
        }
        .nav-book-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #E8C96D, #C9A84C);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: -1;
        }
        .nav-book-btn:hover {
          color: #0A0A0A;
          border-color: transparent;
          box-shadow: 0 8px 24px rgba(201, 168, 76, 0.3);
        }
        .nav-book-btn:hover::before { transform: scaleX(1); }

        .mobile-nav-link {
          display: flex;
          align-items: center;
          padding: 14px 0;
          color: rgba(255,255,255,0.7);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          transition: color 0.2s ease;
        }
        .mobile-nav-link:hover { color: #C9A84C; }

        @media (min-width: 768px) {
          .desktop-nav { display: flex !important; }
          .mobile-btn { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-nav { display: none !important; }
          .mobile-btn { display: flex !important; }
        }

        .hamburger-line {
          display: block;
          width: 22px;
          height: 1.5px;
          background: #C9A84C;
          transition: all 0.3s ease;
          transform-origin: center;
        }

        /* Profile pill */
        .profile-pill {
          display: flex; align-items: center; gap: 8px;
          border: 1px solid rgba(201,168,76,0.4);
          padding: 5px 12px 5px 5px;
          border-radius: 20px;
          background: none;
          cursor: pointer;
          transition: border-color 0.25s, background 0.25s;
          font-family: 'Inter', sans-serif;
        }
        .profile-pill:hover { border-color: rgba(201,168,76,0.75); background: rgba(201,168,76,0.06); }
        .profile-pill.open { border-color: rgba(201,168,76,0.75); background: rgba(201,168,76,0.08); }

        /* Profile dropdown */
        .profile-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          width: 220px;
          background: rgba(14,11,7,0.96);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(201,168,76,0.18);
          border-radius: 14px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.07);
          overflow: hidden;
          animation: dropIn 0.18s cubic-bezier(0.4,0,0.2,1);
          z-index: 9999;
        }
        @keyframes dropIn {
          from { opacity:0; transform: translateY(-6px) scale(0.97); }
          to   { opacity:1; transform: translateY(0)   scale(1); }
        }

        .profile-header {
          padding: 16px 16px 14px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
          display: flex; align-items: center; gap: 12px;
          transition: background 0.2s;
        }
        .profile-header:hover { background: rgba(201,168,76,0.07); }

        .profile-menu-item {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px;
          color: rgba(255,255,255,0.7);
          font-size: 12.5px; font-weight: 500; letter-spacing: 0.04em;
          text-decoration: none;
          transition: background 0.2s, color 0.2s;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          border: none; background: none; width: 100%; text-align: left;
        }
        .profile-menu-item:hover { background: rgba(201,168,76,0.08); color: #C9A84C; }

        .profile-divider {
          height: 1px; background: rgba(255,255,255,0.06); margin: 4px 0;
        }

        .profile-logout {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px;
          color: rgba(245,101,101,0.8);
          font-size: 12.5px; font-weight: 500; letter-spacing: 0.04em;
          transition: background 0.2s, color 0.2s;
          font-family: 'Inter', sans-serif;
          cursor: pointer; border: none; background: none; width: 100%; text-align: left;
        }
        .profile-logout:hover { background: rgba(245,101,101,0.08); color: #f87171; }
      `}</style>

      <nav style={{
        position: "fixed", zIndex: 1000,
        transition: "top 0.6s cubic-bezier(0.4,0,0.2,1), left 0.6s cubic-bezier(0.4,0,0.2,1), right 0.6s cubic-bezier(0.4,0,0.2,1), border-radius 0.6s cubic-bezier(0.4,0,0.2,1), background 0.6s cubic-bezier(0.4,0,0.2,1), box-shadow 0.6s cubic-bezier(0.4,0,0.2,1), border 0.6s cubic-bezier(0.4,0,0.2,1)",
        top:    scrolled ? "10px" : "0",
        left:   scrolled ? "16px" : "0",
        right:  scrolled ? "16px" : "0",
        borderRadius: scrolled ? "16px" : "0",
        background: (scrolled || menuOpen) ? "rgba(10,8,5,0.95)" : "transparent",
        backdropFilter: (scrolled || menuOpen) ? "blur(40px) saturate(180%) brightness(90%)" : "none",
        WebkitBackdropFilter: (scrolled || menuOpen) ? "blur(40px) saturate(180%) brightness(90%)" : "none",
        border: scrolled ? "1px solid rgba(255,255,255,0.10)" : "none",
        boxShadow: scrolled
          ? "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)"
          : "none",
      }}>
        <div style={{ maxWidth: "1520px", margin: "0 auto", padding: scrolled ? "0 24px" : "0 48px", transition: "padding 0.4s ease" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: scrolled ? "58px" : "80px", transition: "height 0.4s ease" }}>

            {/* Logo */}
            <a href="#home" style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none" }}>
              <div style={{
                width: "42px", height: "42px", borderRadius: "50%",
                border: "1px solid rgba(201,168,76,0.4)", overflow: "hidden",
                background: "#141414", flexShrink: 0,
                transition: "border-color 0.3s ease"
              }}>
                <Image src="/images/logo.png" alt="Bella & Guy" width={42} height={42} style={{ objectFit: "cover" }} />
              </div>
              <div>
                <div style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "20px", fontWeight: "600", color: "#FFFFFF",
                  letterSpacing: "0.04em", lineHeight: "1.1"
                }}>
                  Bella <span style={{ color: "#C9A84C" }}>&</span> Guy
                </div>
                <div style={{ fontSize: "8px", color: "rgba(201,168,76,0.7)", letterSpacing: "0.28em", textTransform: "uppercase" }}>
                  Unisex Salon
                </div>
              </div>
            </a>

            {/* Desktop nav */}
            <div className="desktop-nav" style={{ alignItems: "center", gap: "36px" }}>
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className={`nav-link ${activeLink === link.id ? "active" : ""}`}
                  onClick={() => setActiveLink(link.id)}>
                  {link.label}
                </a>
              ))}
              <a href="/book" className="nav-book-btn">Book Now</a>

              {customerLoggedIn ? (
                <div ref={profileRef} style={{ position: "relative" }}>
                  {/* Profile pill button */}
                  <button
                    className={`profile-pill ${profileOpen ? "open" : ""}`}
                    onClick={() => setProfileOpen(p => !p)}
                  >
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#e8c55a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#1a1000", flexShrink: 0 }}>
                      {customerName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ color: "#C9A84C", fontSize: "11.5px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{customerName}</span>
                    <ChevronDown size={12} color="#C9A84C" style={{ transition: "transform 0.2s", transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)" }}/>
                  </button>

                  {/* Dropdown */}
                  {profileOpen && (
                    <div className="profile-dropdown">
                      {/* Header — clickable, opens Profile tab */}
                      <a href="/my-bookings?tab=profile" className="profile-header" onClick={() => setProfileOpen(false)} style={{ textDecoration: "none", cursor: "pointer" }}>
                        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#c9a84c,#e8c55a)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#1a1000", flexShrink: 0 }}>
                          {customerName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{customerName}</div>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{customerEmail}</div>
                        </div>
                        <div style={{ marginLeft: "auto", color: "rgba(201,168,76,0.5)", fontSize: 10, flexShrink: 0 }}>›</div>
                      </a>

                      {/* Menu items */}
                      {menuItems.map(item => (
                        <a
                          key={item.label}
                          href={item.href}
                          className="profile-menu-item"
                          onClick={() => setProfileOpen(false)}
                        >
                          {item.icon}
                          {item.label}
                        </a>
                      ))}

                      <div className="profile-divider" />

                      {/* Logout */}
                      <button className="profile-logout" onClick={handleLogout}>
                        <LogOut size={14}/>
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <a href="/customer-login" style={{ color: "rgba(255,255,255,0.6)", fontSize: "11.5px", fontWeight: 500, letterSpacing: "0.1em", textDecoration: "none", textTransform: "uppercase" }}>
                  Login
                </a>
              )}
            </div>

            {/* Cart icon — always visible, opens the cart drawer */}
            <button
              onClick={openCart}
              aria-label="Open cart"
              style={{
                position: "relative", background: "none", border: "none", cursor: "pointer",
                color: "#C9A84C", display: "flex", alignItems: "center", padding: 6,
              }}
            >
              <ShoppingBag size={19} />
              {count > 0 && (
                <span style={{
                  position: "absolute", top: -2, right: -2, background: "#C9A84C", color: "#080808",
                  borderRadius: 20, minWidth: 16, height: 16, padding: "0 3px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9.5, fontWeight: 800,
                }}>
                  {count}
                </span>
              )}
            </button>

            {/* Mobile hamburger */}
            <button className="mobile-btn" onClick={() => setMenuOpen(!menuOpen)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "8px", flexDirection: "column", gap: "5px", alignItems: "center" }}>
              <span className="hamburger-line" style={{ transform: menuOpen ? "rotate(45deg) translate(4.5px, 4.5px)" : "none" }} />
              <span className="hamburger-line" style={{ opacity: menuOpen ? 0 : 1, transform: menuOpen ? "scaleX(0)" : "none" }} />
              <span className="hamburger-line" style={{ transform: menuOpen ? "rotate(-45deg) translate(4.5px, -4.5px)" : "none" }} />
            </button>
          </div>

          {/* Mobile menu */}
          <div style={{
            maxHeight: menuOpen ? "500px" : "0",
            overflow: "hidden",
            transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <div style={{ paddingBottom: "24px" }}>
              {navLinks.map((link) => (
                <a key={link.label} href={link.href} className="mobile-nav-link" onClick={() => setMenuOpen(false)}>
                  {link.label}
                </a>
              ))}
              {customerLoggedIn ? (
                <>
                  <a href="/my-bookings" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>My Bookings</a>
                  <button className="mobile-nav-link" style={{ background:"none",border:"none",color:"rgba(245,101,101,0.8)",cursor:"pointer",width:"100%",textAlign:"left",fontFamily:"inherit",fontSize:13,letterSpacing:"0.1em",textTransform:"uppercase" }} onClick={handleLogout}>Logout</button>
                </>
              ) : (
                <a href="/customer-login" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Login</a>
              )}
              <a href="/book" onClick={() => setMenuOpen(false)} style={{
                display: "inline-block", marginTop: "20px",
                background: "linear-gradient(135deg, #E8C96D, #C9A84C)",
                color: "#0A0A0A", padding: "13px 32px", borderRadius: "4px",
                fontSize: "12px", fontWeight: "700", letterSpacing: "0.12em",
                textTransform: "uppercase", textDecoration: "none"
              }}>
                Book Appointment
              </a>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
