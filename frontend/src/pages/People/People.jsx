import React, { useState, useEffect, useCallback, useRef } from 'react';
import SEOHead from '../../components/SEOHead/SEOHead';
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import { userAPI } from '../../utils/apiServices';
import styles from './People.module.css';

// ── Avatar helper ──────────────────────────────────────────────
const AVATAR_COLORS = [
  '#5B4FCF', '#2563EB', '#0891B2', '#059669',
  '#D97706', '#DC2626', '#7C3AED', '#DB2777',
];
function colorFor(name = '') {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}
function initials(username = '') {
  return username.charAt(0).toUpperCase() || 'U';
}

// ── Social icon components ─────────────────────────────────────
const GithubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58
    0-.29-.01-1.04-.01-2.04-3.34.72-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75
    -1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99
    .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22
    -.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005
    2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84
    1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6
    -.01 2.9-.01 3.29 0 .32.21.7.82.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);
const LinkedinIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
  </svg>
);
const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);
const BriefcaseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);
const StarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
);
const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
  </svg>
);
const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ── People page ────────────────────────────────────────────────
export default function People() {
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const peoplePerPage = 6;
  const panelRef = useRef(null);
  const debounceRef = useRef(null);
  const viewTimerRef = useRef(null);

  const fetchPeople = useCallback(async (q = '') => {
    try {
      setLoading(true);
      const res = await userAPI.getPeople(q);
      setPeople(res.data?.results || []);
      setCurrentPage(1); // Reset to page 1 on new search
    } catch {
      setPeople([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPeople(); }, [fetchPeople]);

  // Debounced search
  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPeople(val), 400);
  };

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setSelected(null);
      }
    };
    if (selected) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selected]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setSelected(null); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Pagination logic
  const startIndex = (currentPage - 1) * peoplePerPage;
  const paginatedPeople = people.slice(startIndex, startIndex + peoplePerPage);
  const totalPages = Math.ceil(people.length / peoplePerPage);

  // Lock body scroll on mobile when panel is open
  useEffect(() => {
    const isMobile = window.innerWidth <= 900;
    if (isMobile && selected) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [selected]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    };
  }, []);

  // Capture last person for smooth exit animation
  useEffect(() => {
    if (selected && panelRef.current) {
      panelRef.current.lastPerson = selected;
    }
  }, [selected]);

  const getVisiblePages = () => {
    if (totalPages <= 3) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }
    if (currentPage <= 2) {
      return [1, 2, 3];
    }
    if (currentPage >= totalPages - 1) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }
    return [currentPage - 1, currentPage, currentPage + 1];
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handlePersonClick = (person) => {
    // Clear any existing timer if we're switching or closing
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current);
      viewTimerRef.current = null;
    }

    if (selected?.id === person.id) {
      // Closing the current one
      setSelected(null);
    } else {
      // Opening a new one
      setSelected(person);

      // Start 3-second timer for meaningful view
      viewTimerRef.current = setTimeout(() => {
        userAPI.recordProfileView(person.id).catch(() => { });
        viewTimerRef.current = null;
      }, 3000);
    }
  };

  return (
    <>
      <SEOHead
        title="Startup Founders, Developers & Investors Directory"
        description="Discover founders, co-founders, developers, designers, investors, and startup professionals on StartLnk. Build your startup network and find the right people for your team."
        canonical="https://startlnk.xyz/people"
        og={{ title: "Startup People Directory | StartLnk", description: "Find founders, investors, developers, and startup professionals.", url: "https://startlnk.xyz/people" }}
        twitter={{ title: "Startup People Directory | StartLnk", description: "Connect with startup founders, investors, and professionals on StartLnk." }}
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Startup People Directory",
          "description": "Directory of founders, investors, and startup professionals on StartLnk.",
          "url": "https://startlnk.xyz/people"
        }}
      />
      <Navbar />
      <div className={styles.page}>

        {/* ── Header ────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <h1 className={styles.title}>Collaborator Network</h1>
            <p className={styles.subtitle}>
              Connect with skilled individuals, founders, and specialists ready for the next big venture.
            </p>
          </div>
          <div className={styles.searchWrap}>
            {searchOpen && (
              <input
                className={styles.searchInput}
                type="text"
                placeholder="Search collaborators..."
                value={query}
                onChange={handleSearch}
                autoFocus
              />
            )}
            <button
              className={`${styles.searchBtn} ${searchOpen ? styles.searchBtnActive : ''}`}
              onClick={() => {
                if (searchOpen && query) {
                  setQuery('');
                  fetchPeople('');
                }
                setSearchOpen(prev => !prev);
              }}
              aria-label={searchOpen ? 'Close search' : 'Open search'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────── */}
        <div className={`${styles.content} ${selected ? styles.withPanel : ''}`}>

          {/* Cards grid */}
          <div className={styles.grid}>
            {loading && (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className={`${styles.card} ${styles.skeleton}`} />
              ))
            )}
            {!loading && people.length === 0 && (
              <div className={styles.empty}>
                <UserIcon />
                <p>No public profiles found{query ? ` matching "${query}"` : ''}.</p>
                <p className={styles.emptyHint}>Users need to make their profile public in Account Settings to appear here.</p>
              </div>
            )}
            {!loading && paginatedPeople.map(person => (
              <PersonCard
                key={person.id}
                person={person}
                isSelected={selected?.id === person.id}
                onClick={() => handlePersonClick(person)}
              />
            ))}
          </div>

          {/* Detail panel with smooth transition */}
          <div
            className={`${styles.panelOverlay} ${selected ? styles.overlayShow : ''}`}
            onClick={() => setSelected(null)}
          />
          <aside
            className={`${styles.panel} ${selected ? styles.panelShow : ''}`}
            ref={panelRef}
            onClick={e => e.stopPropagation()}
          >
            {/* Render content if selected exists; if closing, it will still show last person */}
            {(selected || (panelRef.current && panelRef.current.lastPerson)) && (
              <PersonPanel
                person={selected || panelRef.current.lastPerson}
                onClose={() => setSelected(null)}
              />
            )}
          </aside>
        </div>

        {/* Pagination */}
        {people.length > 0 && totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              &larr;
            </button>
            {totalPages > 3 && currentPage > 3 && <span>...</span>}
            {getVisiblePages().map((page) => (
              <button
                type="button"
                key={page}
                onClick={() => handlePageChange(page)}
                disabled={page === currentPage}
              >
                {page}
              </button>
            ))}
            {totalPages > 3 && currentPage < totalPages - 2 && <span>...</span>}
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              &rarr;
            </button>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

// ── PersonCard ─────────────────────────────────────────────────
function PersonCard({ person, isSelected, onClick }) {
  const displayName = person.full_name || person.username;
  const hasBio = !!person.bio?.trim();
  const hasGit = !!person.github_url;
  const hasLinked = !!person.linkedin_url;
  const hasWeb = !!person.website;
  const hasSocials = hasGit || hasLinked || hasWeb;

  return (
    <article className={`${styles.card} ${isSelected ? styles.cardActive : ''}`}>

      {/* ── Header row: avatar + name left ── */}
      <div className={styles.cardHeader}>
        {/* Avatar */}
        {person.profile_picture
          ? <img src={person.profile_picture} alt={displayName} className={styles.avatarImg} />
          : <div className={styles.avatar} style={{ background: colorFor(person.username) }}>{initials(person.username)}</div>
        }
        <div className={styles.cardTitleGroup}>
          <h2 className={styles.cardTitle}>
            {person.full_name || person.username}{' '}
            {person.full_name && <span className={styles.usernameLabel}>@{person.username}</span>}
          </h2>
          {person.location && (
            <p className={styles.cardSubtitle}>from {person.location}</p>
          )}
        </div>
      </div>

      {/* ── Bio body ── */}
      {hasBio && (
        <p className={styles.cardBio}>{person.bio}</p>
      )}

      {/* ── Divider ── */}
      {hasSocials && <div className={styles.cardDivider} />}

      {/* ── Footer: social icons + view button ── */}
      <div className={styles.cardFooter}>
        <div className={styles.socialIcons}>
          {hasGit && <a href={person.github_url} target="_blank" rel="noreferrer" className={styles.socialIcon} title="GitHub"><GithubIcon /></a>}
          {hasLinked && <a href={person.linkedin_url} target="_blank" rel="noreferrer" className={styles.socialIcon} title="LinkedIn"><LinkedinIcon /></a>}
          {hasWeb && <a href={person.website} target="_blank" rel="noreferrer" className={styles.socialIcon} title="Website"><GlobeIcon /></a>}
        </div>
        <button className={styles.viewBtn} onClick={onClick}>
          VIEW DETAILS
        </button>
      </div>

    </article>
  );
}

// ── PersonPanel ────────────────────────────────────────────────
function PersonPanel({ person, onClose }) {
  if (!person) return null;
  const bg = colorFor(person.username);
  const ini = initials(person.username);
  const displayName = person.full_name || person.username;

  const hasBio = !!person.bio?.trim();
  const hasSkills = Array.isArray(person.skills) && person.skills.some(sk => (typeof sk === 'string' ? sk.trim() : sk?.title?.trim()));
  const hasExp = Array.isArray(person.experience) && person.experience.some(ex => (typeof ex === 'string' ? ex.trim() : ex?.title?.trim()));
  const hasRefs = Array.isArray(person.references) && person.references.some(ref => (typeof ref === 'string' ? ref.trim() : ref?.title?.trim()));
  const hasGit = !!person.github_url;
  const hasLinked = !!person.linkedin_url;
  const hasWeb = !!person.website;
  const hasEmail = !!person.email;
  const hasRegion = Array.isArray(person.selected_regions) && person.selected_regions.length > 0;

  return (
    <div className={styles.panelInner}>
      {/* Header */}
      <div className={styles.panelHeader}>
        <div className={styles.panelHeaderLeft}>
          <UserIcon />
          <span>MEMBER PROFILE</span>
        </div>
        <button className={styles.panelClose} onClick={onClose}><CloseIcon /></button>
      </div>

      {/* Avatar + name */}
      <div className={styles.panelHero}>
        {person.profile_picture
          ? <img src={person.profile_picture} alt={person.username} className={styles.panelAvatarImg} />
          : <div className={styles.panelAvatar} style={{ background: bg }}>{ini}</div>
        }
        <h2 className={styles.panelName}>
          {person.full_name || person.username}{' '}
          {person.full_name && <span className={styles.usernameLabel}>@{person.username}</span>}
        </h2>
        {(person.location || hasRegion) && (
          <p className={styles.panelMeta}>
            {[
              hasRegion ? person.selected_regions.join(', ') : '',
              person.location,
              person.email ? `(@${person.username})` : ''
            ].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className={styles.panelSocial}>
          {hasGit && <a href={person.github_url} target="_blank" rel="noreferrer" className={styles.panelSocialIcon} title="GitHub"><GithubIcon /></a>}
          {hasLinked && <a href={person.linkedin_url} target="_blank" rel="noreferrer" className={styles.panelSocialIcon} title="LinkedIn"><LinkedinIcon /></a>}
          {hasWeb && <a href={person.website} target="_blank" rel="noreferrer" className={styles.panelSocialIcon} title="Website"><GlobeIcon /></a>}
          {hasEmail && <a href={`mailto:${person.email}`} className={styles.panelSocialIcon} title="Email"><MailIcon /></a>}
        </div>
      </div>

      {/* Body sections — each hidden if empty */}
      <div className={styles.panelBody}>

        {hasBio && (
          <section className={styles.panelSection}>
            <h3 className={styles.panelSectionTitle}>BIOGRAPHY</h3>
            <p className={styles.panelText}>{person.bio}</p>
          </section>
        )}

        {hasRefs && (
          <section className={styles.panelSection}>
            <h3 className={styles.panelSectionTitle}>
              <StarIcon /> TOP SKILLS
            </h3>
            {person.references.map((ref, i) => {
              const title = typeof ref === 'string' ? ref : ref?.title;
              const desc = typeof ref === 'object' ? ref?.description : '';
              if (!title) return null;
              return (
                <div key={i} className={styles.panelItem}>
                  <strong className={styles.panelItemTitle}>{title}</strong>
                  {desc && <p className={styles.panelItemDesc}>{desc}</p>}
                </div>
              );
            })}
          </section>
        )}

        {hasSkills && (
          <section className={styles.panelSection}>
            <h3 className={styles.panelSectionTitle}>
              <HeartIcon /> SKILLS &amp; HOBBIES
            </h3>
            {person.skills.map((sk, i) => {
              const title = typeof sk === 'string' ? sk : sk?.title;
              const desc = typeof sk === 'object' ? sk?.description : '';
              if (!title) return null;
              return (
                <div key={i} className={styles.panelItem}>
                  <strong className={styles.panelItemTitle}>{title}</strong>
                  {desc && <p className={styles.panelItemDesc}>{desc}</p>}
                </div>
              );
            })}
          </section>
        )}

        {hasExp && (
          <section className={styles.panelSection}>
            <h3 className={styles.panelSectionTitle}>
              <BriefcaseIcon /> EXPERIENCE
            </h3>
            {person.experience.map((ex, i) => {
              const title = typeof ex === 'string' ? ex : ex?.title;
              const desc = typeof ex === 'object' ? ex?.description : '';
              if (!title) return null;
              return (
                <div key={i} className={styles.panelItem}>
                  <strong className={styles.panelItemTitle}>{title}</strong>
                  {desc && <p className={styles.panelItemDesc}>{desc}</p>}
                </div>
              );
            })}
          </section>
        )}

      </div>
    </div>
  );
}
