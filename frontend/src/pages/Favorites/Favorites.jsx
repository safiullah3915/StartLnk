import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import MarketPlaceCard from '../../components/MarketplaceCard/MarketPlaceCard';
import CollaborationCard from '../../components/CollaborationCard/CollaborationCard';
import styles from './Favorites.module.css';
import { userAPI } from '../../utils/apiServices';

const ITEMS_PER_PAGE = 9;

const Favorites = () => {
  const [allFavorites, setAllFavorites] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Load favorites on mount
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await userAPI.getUserFavorites();
        // API returns paginated or plain list of Favorite objects with a `.startup` field
        const raw = res.data?.results || res.data || [];
        const startups = raw.map(fav => fav.startup || fav).filter(Boolean);
        setAllFavorites(startups);
      } catch (err) {
        console.error('Failed to load favorites:', err);
        setAllFavorites([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Apply search filter whenever allFavorites or query changes
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setFiltered(allFavorites);
    } else {
      setFiltered(
        allFavorites.filter(s =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.description || '').toLowerCase().includes(q) ||
          (s.category || '').toLowerCase().includes(q)
        )
      );
    }
    setCurrentPage(1);
  }, [allFavorites, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSearch = () => {
    setQuery(searchInput);
  };

  const getVisiblePages = () => {
    if (totalPages <= 3) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 2) return [1, 2, 3];
    if (currentPage >= totalPages - 1) return [totalPages - 2, totalPages - 1, totalPages];
    return [currentPage - 1, currentPage, currentPage + 1];
  };

  const toolbarButtonClass = (isActive) =>
    isActive ? `${styles.toolbarButton} ${styles.toolbarButtonActive}` : styles.toolbarButton;

  return (
    <>
      <Navbar />
      <div className={styles.container}>

        {/* Hero */}
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>My Favorites</h1>
            <p>All the startups you've bookmarked in one place.</p>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={toolbarButtonClass(showSearch)}
              onClick={() => {
                if (showSearch) {
                  setSearchInput('');
                  setQuery('');
                }
                setShowSearch(prev => !prev);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.toolbarIcon}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {showSearch ? 'Hide Search' : 'Show Search'}
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className={styles.searchSection}>
          {showSearch && (
            <div className={styles.searchForm}>
              <div className={styles.mainSearch}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.searchFieldIcon}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search your favorites by name, keyword, or industry..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                  className={styles.searchInput}
                />
              </div>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className={styles.results}>
          {loading ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              <p>Loading your favorites...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.noResults}>
              {allFavorites.length === 0 ? (
                <>
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                  </svg>
                  <p>You haven't saved any startups yet.</p>
                  <p>Browse startups and tap the heart icon to save them here.</p>
                </>
              ) : (
                <>
                  <p>No favorites match your search.</p>
                  <p>Try a different keyword.</p>
                </>
              )}
            </div>
          ) : (
            <div className={styles.startupGrid}>
              {paginated.map(startup => (
                <div key={startup.id} className={styles.startupItem}>
                  {startup.type === 'marketplace' ? (
                    <MarketPlaceCard {...startup} />
                  ) : (
                    <CollaborationCard {...startup} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              disabled={currentPage === 1}
            >
              &larr;
            </button>

            {totalPages > 3 && currentPage > 3 && <span className={styles.pageDots}>...</span>}

            {getVisiblePages().map(page => (
              <button
                type="button"
                key={page}
                className={`${styles.pageBtn} ${page === currentPage ? styles.pageBtnActive : ''}`}
                onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {page}
              </button>
            ))}

            {totalPages > 3 && currentPage < totalPages - 2 && <span className={styles.pageDots}>...</span>}

            <button
              type="button"
              className={styles.pageBtn}
              onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
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
};

export default Favorites;
