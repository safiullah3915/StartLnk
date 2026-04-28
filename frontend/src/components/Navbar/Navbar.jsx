import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "./Navbar.module.css";
import { useAuth } from "../../contexts/AuthContext";
import MessageService from "../../services/MessageService";
import { notificationAPI } from "../../utils/apiServices";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, isEntrepreneur, isStudent, isInvestor } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePicError, setProfilePicError] = useState(false);

  const profileDropdownRef = useRef(null);

  // Fetch profile picture when authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfilePicture(null);
      return;
    }
    import('../../utils/apiServices').then(({ userAPI }) => {
      userAPI.getProfileData()
        .then(res => {
          const pic = res?.data?.profile?.profile_picture;
          setProfilePicture(pic || null);
          setProfilePicError(false);
        })
        .catch(() => setProfilePicture(null));
    });
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Change navbar style on scroll
  // useEffect(() => {
  //   const handleScroll = () => {
  //     setIsScrolled(window.scrollY > 100);
  //   };

  //   window.addEventListener("scroll", handleScroll);
  //   return () => window.removeEventListener("scroll", handleScroll);
  // }, []);

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setIsMenuOpen(false);
    setIsProfileOpen(false);
  }, [location]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Unread messages indicator
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setUnreadCount(0);
      return;
    }

    const storageKey = "messages:lastSeenAt";
    const getLastSeen = () => {
      const v = localStorage.getItem(storageKey);
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const markSeenIfOnMessages = () => {
      if (location.pathname.startsWith("/message")) {
        localStorage.setItem(storageKey, String(Date.now()));
        setUnreadCount(0);
      }
    };

    const computeUnread = async () => {
      try {
        const [conversations, notificationsResp] = await Promise.all([
          MessageService.getConversations(),
          notificationAPI.getNotifications(),
        ]);
        const lastSeen = getLastSeen();

        // Unread messages since last seen (from other users only)
        const msgCount = (Array.isArray(conversations) ? conversations : []).reduce((acc, conv) => {
          const lm = conv?.last_message;
          if (!lm) return acc;
          const ts = new Date(lm.created_at).getTime();
          const isFromOther = lm?.sender?.id && user?.id && lm.sender.id !== user.id;
          return acc + (isFromOther && ts > lastSeen ? 1 : 0);
        }, 0);

        // Unread interest-related notifications since last seen
        const notifications = Array.isArray(notificationsResp?.data) ? notificationsResp.data : notificationsResp?.data?.results || [];
        const interestTypes = new Set(["new_application", "interest", "new_interest"]);
        const interestCount = notifications.reduce((acc, n) => {
          const ts = n?.created_at ? new Date(n.created_at).getTime() : 0;
          const isInterest = interestTypes.has(n?.type);
          const isUnread = n?.is_read === false;
          return acc + (isInterest && isUnread && ts > lastSeen ? 1 : 0);
        }, 0);

        setUnreadCount(msgCount + interestCount);
      } catch (e) {
        // silent fail
      }
    };

    // initial mark if on messages page
    markSeenIfOnMessages();
    // initial fetch
    computeUnread();
    // poll every 5s for snappier updates
    const interval = setInterval(computeUnread, 5000);

    // also recompute on route change
    computeUnread();

    return () => clearInterval(interval);
  }, [isAuthenticated, user, location.pathname]);

  // Role-based navigation links
  const getNavLinks = () => {
    const baseLinks = [];

    if (isAuthenticated) {
      baseLinks.push(
        { path: "/dashboard", label: "Dashboard" },
        { path: "/people", label: "Network" },
        { path: "/message", label: "Messages" }
      );

      if (isInvestor()) {
        baseLinks.splice(1, 0, { path: "/marketplace", label: "Marketplace" });
      }

      // Role-specific links
      if (isEntrepreneur()) {
        baseLinks.push(
          { path: "/collaboration", label: "Collaboration" },
          { path: "/createstartup", label: "Create Startup" }
        );
      }
      
      if (isStudent()) {
        baseLinks.push(
          { path: "/collaboration", label: "Collaboration" }
        );
      }
    } else {
      baseLinks.push(
        { path: "/", label: "Home" },
        { path: "/login", label: "Login" },
        { path: "/signup", label: "Signup" }
      );
    }

    return baseLinks;
  };

  const navLinks = getNavLinks();
  
  const toggleProfileDropdown = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const getMobileIcon = (path) => {
    switch(path) {
      case '/people':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        );
      case '/dashboard':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        );
      case '/message':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        );
      case '/collaboration':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        );
      case '/createstartup':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
        );
      default:
        return null;
    }
  };

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ""} ${isMenuOpen ? styles.menuOpen : ""}`}>
      <Link to={isAuthenticated ? "/dashboard" : "/"} className={styles.logoContainer}>
          <img src="/logo.png" alt="Logo" className={styles.logo} />
      </Link>

      <div className={styles.navLinks}>
        {navLinks.map((link, index) => {
          if (link.type === "dropdown") {
            const isMatchedActive = link.dropdown.some(item => location.pathname === item.path);
            return (
              <div key={index} className={styles.dropdownContainer} ref={matchedDropdownRef}>
                <button
                  onClick={toggleMatchedDropdown}
                  className={`${styles.navLink} ${styles.dropdownToggle} ${isMatchedActive ? styles.active : ""}`}
                >
                  <span className={styles.navLinkLabel}>{link.label}</span>
                  <span className={styles.dropdownArrow}>▼</span>
                </button>
                {isMatchedDropdownOpen && (
                  <div className={styles.dropdownMenu}>
                    {link.dropdown.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`${styles.dropdownItem} ${location.pathname === item.path ? styles.active : ""}`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          
          const isMessages = link.path === "/message";
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`${styles.navLink} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.navLinkLabel}>{link.label}</span>
              {isMessages && unreadCount > 0 && (
                <span className={styles.badgeDot} aria-label="unread messages" />
              )}
            </Link>
          );
        })}
      </div>

      {isAuthenticated && (
        <div className={styles.userMenu}>
          <div className={styles.profileContainer} ref={profileDropdownRef}>
            <button onClick={toggleProfileDropdown} className={styles.profileButton}>
              <div className={styles.profileAvatarRing}>
                <div className={styles.profileAvatar}>
                  {profilePicture && !profilePicError ? (
                    <img
                      src={profilePicture}
                      alt={user?.username}
                      className={styles.profileAvatarImg}
                      onError={() => setProfilePicError(true)}
                    />
                  ) : (
                    user?.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </div>
            </button>
            {isProfileOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileInfo}>
                  <div className={styles.profileName}>{user?.username}</div>
                  <div className={styles.profileRole}>{user?.role}</div>
                </div>
                <Link to="/account" className={styles.profileMenuItem}>
                  Profile Settings
                </Link>
                <button onClick={handleLogout} className={styles.profileMenuItem}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        className={`${styles.mobileMenuButton} ${
          isMenuOpen ? styles.active : ""
        }`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div
        className={`${styles.mobileMenu} ${isMenuOpen ? styles.active : ""}`}
      >
        <div className={styles.mobileMenuHeader}>
          {isAuthenticated ? (
            <div className={styles.logoContainer}>
              <img src="/logo.png" alt="Logo" className={styles.logo} />
            </div>
          ) : (
          <Link to="/" onClick={closeMenu}>
              <img src="/logo.png" alt="Logo" className={styles.logo} />
          </Link>
          )}
        </div>
        <div className={styles.mobileNavLinks}>
          {navLinks.map((link, index) => {
            if (link.type === "dropdown") {
              return (
                <div key={index} className={styles.mobileDropdownSection}>
                  <div className={styles.mobileDropdownLabel}>{link.label}</div>
                  {link.dropdown.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`${styles.navLink} ${styles.mobileDropdownItem} ${
                        location.pathname === item.path ? styles.active : ""
                      }`}
                      onClick={closeMenu}
                    >
                      <span className={styles.mobileLinkLabel}>{item.label}</span>
                      <div className={styles.navIcon}>{getMobileIcon(item.path)}</div>
                    </Link>
                  ))}
                </div>
              );
            }
            
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`${styles.navLink} ${
                  location.pathname === link.path ? styles.active : ""
                }`}
                onClick={closeMenu}
              >
                <span className={styles.mobileLinkLabel}>{link.label}</span>
                <div className={styles.navIcon}>{getMobileIcon(link.path)}</div>
              </Link>
            );
          })}
        </div>
        
        {isAuthenticated && (
          <div className={styles.mobileUserMenu}>
            <Link to="/account" className={styles.mobileProfileLink} onClick={closeMenu}>
              <div className={styles.mobileProfileAvatar}>
                <div className={styles.mobileProfileAvatarInner}>
                  {profilePicture && !profilePicError ? (
                    <img
                      src={profilePicture}
                      alt={user?.username}
                      className={styles.mobileProfileAvatarImg}
                      onError={() => setProfilePicError(true)}
                    />
                  ) : (
                    user?.username?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
              </div>
              <div className={styles.mobileProfileInfo}>
                <div className={styles.mobileProfileName}>{user?.username}</div>
                <div className={styles.mobileProfileRole}>{user?.role}</div>
              </div>
            </Link>
            <button onClick={() => { handleLogout(); closeMenu(); }} className={styles.mobileLogoutBtn}>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export { Navbar };
