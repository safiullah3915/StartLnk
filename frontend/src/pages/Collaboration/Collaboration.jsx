import React, { useState, useEffect } from "react";
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import CollaborationCard from "../../components/CollaborationCard/CollaborationCard";
import JobCard from "../../components/JobCard/JobCard";
import styles from "./Collaboration.module.css";
import { positionAPI, userAPI, recommendationAPI } from '../../utils/apiServices';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

const Collaboration = () => {
  const [positions, setPositions] = useState([]);
  const [allPositions, setAllPositions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    field: '',
    phase: '',
    team_size: '',
    query: ''
  });
  const [appliedPositionIds, setAppliedPositionIds] = useState(new Set());
  const [appliedStartupIds, setAppliedStartupIds] = useState(new Set());
  const { isStudent, isInvestor, isEntrepreneur, user } = useAuth();
  const positionsPerPage = 9;
  
  // Categories from backend CATEGORY_CHOICES
  const categories = [
    { value: '', label: 'All Business Models' },
    { value: 'saas', label: 'SaaS' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'ecommerce', label: 'Ecommerce' },
    { value: 'agency', label: 'Agency' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'social_platform', label: 'Social Platform' }
  ];

  // Phases from startup creation form stages
  const phases = [
    { value: '', label: 'All Stages' },
    { value: 'Idea Stage', label: 'Idea Stage' },
    { value: 'Pre-MVP', label: 'Pre-MVP' },
    { value: 'MVP Built', label: 'MVP Built' },
    { value: 'Early Traction', label: 'Early Traction' },
    { value: 'Product-Market Fit', label: 'Product-Market Fit' },
    { value: 'Growth Stage', label: 'Growth Stage' },
    { value: 'Fundraising Stage', label: 'Fundraising Stage' }
  ];

  const industries = [
    { value: '', label: 'All Industries' },
    { value: 'Fintech', label: 'Fintech' },
    { value: 'HealthTech', label: 'HealthTech' },
    { value: 'EdTech', label: 'EdTech' },
    { value: 'LegalTech', label: 'LegalTech' },
    { value: 'Real Estate', label: 'Real Estate' },
    { value: 'AI / ML', label: 'AI / ML' },
    { value: 'Web3 / Crypto', label: 'Web3 / Crypto' },
    { value: 'Media', label: 'Media' },
    { value: 'Gaming', label: 'Gaming' },
    { value: 'Robotics / Hardware', label: 'Robotics / Hardware' },
    { value: 'Logistics', label: 'Logistics' },
    { value: 'Other', label: 'Other' }
  ];

  const teamSizes = [
    { value: '', label: 'All Team Sizes' },
    { value: '1', label: 'Just me' },
    { value: '2-5', label: '2-5 people' },
    { value: '6-10', label: '6-10 people' },
    { value: '11-25', label: '11-25 people' },
    { value: '25+', label: '25+ people' }
  ];

  useEffect(() => {
    loadPositions();
  }, [user, isEntrepreneur]);

  useEffect(() => {
    const normalizeText = (value) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ');

    const normalizedPhaseMap = {
      'idea stage': 'idea stage',
      'building mvp': 'building mvp',
      'mvp': 'mvp',
      'mvp stage': 'mvp',
      'product market fit': 'product market fit',
      'fund raising': 'fund raising',
      'fundraising': 'fund raising',
      'growth': 'growth'
    };

    const normalizedTeamSizeMap = {
      '1': '1',
      'just me': '1',
      '2 5': '2-5',
      '2 to 5': '2-5',
      '2 5 people': '2-5',
      '2-5': '2-5',
      '6 10': '6-10',
      '6 to 10': '6-10',
      '6 10 people': '6-10',
      '6-10': '6-10',
      '11 25': '11-25',
      '11 to 25': '11-25',
      '11 25 people': '11-25',
      '11-25': '11-25',
      '25+': '25+',
      '25 plus': '25+',
      '25 people': '25+',
      '25+ people': '25+'
    };

    const filteredPositions = allPositions.filter((position) => {
      const matchesQuery = !filters.query || [
        position.title,
        position.description,
        position.startup?.title,
        position.startup?.description
      ]
        .filter(Boolean)
        .some((value) => normalizeText(value).includes(normalizeText(filters.query)));

      const matchesCategory =
        !filters.category ||
        normalizeText(position.startup?.category) === normalizeText(filters.category);

      const startupPhase = normalizedPhaseMap[normalizeText(position.startup?.phase)] || normalizeText(position.startup?.phase);
      const requestedPhase = normalizedPhaseMap[normalizeText(filters.phase)] || normalizeText(filters.phase);
      const matchesPhase = !filters.phase || startupPhase === requestedPhase;

      const startupTeamSize =
        normalizedTeamSizeMap[normalizeText(position.startup?.team_size)] ||
        normalizeText(position.startup?.team_size);
      const requestedTeamSize =
        normalizedTeamSizeMap[normalizeText(filters.team_size)] ||
        normalizeText(filters.team_size);
      const matchesTeamSize = !filters.team_size || startupTeamSize === requestedTeamSize;

      return matchesQuery && matchesCategory && matchesPhase && matchesTeamSize;
    });

    setPositions(filteredPositions);
    setCurrentPage(1);
  }, [allPositions, filters]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(positions.length / positionsPerPage));
    if (currentPage > total) {
      setCurrentPage(total);
    }
  }, [positions, currentPage, positionsPerPage]);

  useEffect(() => {
    // Check applied positions when component mounts
    checkAppliedPositions();
  }, []);

  const loadPositions = async () => {
    try {
      setLoading(true);
      const response = await positionAPI.getAllPositions({});
      
      let allPositions = response.data?.results || (Array.isArray(response.data) ? response.data : []);
      
      // Filter out positions from startups owned by the current entrepreneur
      /*
      if (isEntrepreneur() && user?.id) {
        allPositions = allPositions.filter(position => {
          return position.startup?.owner?.id !== user.id;
        });
      }
      */
      
      setAllPositions(allPositions);
    } catch (error) {
      console.error('Failed to load positions:', error);
      setAllPositions([]);
      setPositions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const toggleFilters = () => {
    setShowFilters((prev) => !prev);
  };

  const filterButtonClass = (isActive) =>
    isActive ? `${styles.filterChip} ${styles.filterChipActive}` : styles.filterChip;

  const toolbarButtonClass = (isActive) =>
    isActive ? `${styles.toolbarButton} ${styles.toolbarButtonActive}` : styles.toolbarButton;

  const checkAppliedPositions = async () => {
    // Only check for students and entrepreneurs (not investors)
    if (!user || isInvestor()) return;
    
    try {
      const response = await userAPI.getUserApplications();
      
      // Handle both paginated and non-paginated responses
      const applications = response.data.results || response.data;
      
      if (Array.isArray(applications)) {
        // Extract position IDs from all applications
        const appliedIds = new Set(
          applications
            .filter(app => app.position && app.position.id)
            .map(app => app.position.id)
        );
        
        // Extract startup IDs (to check if user has applied to any position in a startup)
        const appliedStartupIdsSet = new Set(
          applications
            .filter(app => app.startup && app.startup.id)
            .map(app => app.startup.id)
        );
        
        setAppliedPositionIds(appliedIds);
        setAppliedStartupIds(appliedStartupIdsSet);
      }
    } catch (error) {
      console.error('Failed to check applied positions:', error);
      // Don't show error to user for this non-critical operation
    }
  };

  const startIndex = (currentPage - 1) * positionsPerPage;
  const paginatedPositions = positions.slice(startIndex, startIndex + positionsPerPage);
  const totalPages = Math.ceil(positions.length / positionsPerPage);

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

  return (
    <>
    <div className={styles.main}>
      <Navbar />
      <div className={styles.marketplace}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>Search all jobs</h1>
            <p>Discover startup roles by keyword, business model, stage, and team size.</p>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={toolbarButtonClass(showSearch)}
              onClick={() => {
                if (showSearch) {
                  handleFilterChange('query', '');
                }
                setShowSearch((prev) => !prev);
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.toolbarIcon}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {showSearch ? 'Hide Search' : 'Show Search'}
            </button>
            <button
              type="button"
              className={toolbarButtonClass(showFilters)}
              onClick={toggleFilters}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.toolbarIcon}>
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <div className={styles.resultsCount}>
              <strong>{positions.length}</strong>
              <span>Results</span>
            </div>
          </div>
        </div>

        <div className={styles.searchSection}>
          {showSearch && (
            <div className={styles.searchForm}>
              <div className={styles.mainSearch}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.searchFieldIcon}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search jobs by title, description, or company..."
                  value={filters.query}
                  onChange={(e) => handleFilterChange('query', e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>
          )}

          {showFilters && (
            <div className={styles.filtersPanel}>
              <div className={styles.filterBlock}>
                <h3>Business Model</h3>
                <div className={styles.filterChips}>
                  {categories.map((cat) => (
                    <button
                      key={cat.value || 'all-categories'}
                      type="button"
                      className={filterButtonClass(filters.category === cat.value)}
                      onClick={() => handleFilterChange('category', cat.value)}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterBlock}>
                <h3>Industry</h3>
                <div className={styles.filterChips}>
                  {industries.map((ind) => (
                    <button
                      key={ind.value || 'all-industries'}
                      type="button"
                      className={filterButtonClass(filters.field === ind.value)}
                      onClick={() => handleFilterChange('field', ind.value)}
                    >
                      {ind.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterBlock}>
                <h3>Startup Stage</h3>
                <div className={styles.filterChips}>
                  {phases.map((phase) => (
                    <button
                      key={phase.value || 'all-phases'}
                      type="button"
                      className={filterButtonClass(filters.phase === phase.value)}
                      onClick={() => handleFilterChange('phase', phase.value)}
                    >
                      {phase.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterBlock}>
                <h3>Team Size</h3>
                <div className={styles.filterChips}>
                  {teamSizes.map((teamSize) => (
                    <button
                      key={teamSize.value || 'all-team-sizes'}
                      type="button"
                      className={filterButtonClass(filters.team_size === teamSize.value)}
                      onClick={() => handleFilterChange('team_size', teamSize.value)}
                    >
                      {teamSize.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setFilters({
                    category: '',
                    field: '',
                    phase: '',
                    team_size: '',
                    query: ''
                  });
                }}
                className={styles.clearButton}
              >
                Clear Filters
              </button>
            </div>
          )}
          </div>

        {/* Cards Grid */}
        <div className={styles.cardsGrid}>
          {loading ? (
            <div className={styles.loading}>Loading job opportunities...</div>
          ) : positions.length > 0 ? (
            paginatedPositions.map((position, index) => {
              const hasAppliedToPosition = appliedPositionIds.has(position.id);
              const hasAppliedToStartup = position.startup?.id && appliedStartupIds.has(position.startup.id);
              return (
                <JobCard 
                  key={position.id || index} 
                  {...position} 
                  isApplied={hasAppliedToPosition || hasAppliedToStartup}
                  hasAppliedToSpecificPosition={hasAppliedToPosition}
                  hasAppliedToStartup={hasAppliedToStartup && !hasAppliedToPosition}
                />
              );
            })
          ) : (
            <div className={styles.noResults}>
              <h3>No job opportunities found</h3>
              <p>Try adjusting your filters or search terms, or check back later for new positions.</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {positions.length > 0 && totalPages > 1 && (
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
      </div>
      <Footer />
    </>
  );
};

export { Collaboration };
