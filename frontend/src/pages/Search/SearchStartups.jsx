import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import MarketPlaceCard from '../../components/MarketplaceCard/MarketPlaceCard';
import CollaborationCard from '../../components/CollaborationCard/CollaborationCard';
import styles from './SearchStartups.module.css';
import { searchAPI } from '../../utils/apiServices';
import { useAuth } from '../../contexts/AuthContext';

const SearchStartups = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [startups, setStartups] = useState([]);
  const [loading, setLoading] = useState(false);
  const initialQuery = searchParams.get('query') || searchParams.get('q') || '';

  const [filters, setFilters] = useState({
    query: initialQuery,
    category: searchParams.get('category') || '',
    type: searchParams.get('type') || '', // marketplace or collaboration
    phase: searchParams.get('phase') || '',
    field: searchParams.get('field') || '',
    team_size: searchParams.get('team_size') || '',
    funding_stage: searchParams.get('funding_stage') || ''
  });
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [totalResults, setTotalResults] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setFilters(prev => ({ ...prev, query: searchInput }));
    }, 400); // 400ms debounce

    return () => clearTimeout(handler);
  }, [searchInput]);

  const categories = [
    { value: '', label: 'All Business Models' },
    { value: 'saas', label: 'SaaS' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'ecommerce', label: 'Ecommerce' },
    { value: 'agency', label: 'Agency' },
    { value: 'subscription', label: 'Subscription' },
    { value: 'social_platform', label: 'Social Platform' }
  ];

  const types = [
    { value: '', label: 'All Types' },
    { value: 'marketplace', label: 'For Sale' },
    { value: 'collaboration', label: 'Looking for Team' }
  ];

  const phases = [
    { value: '', label: 'All Stages' },
    { value: 'Idea Stage', label: 'Idea Stage' },
    { value: 'Pre-MVP', label: 'Pre-MVP' },
    { value: 'MVP Built', label: 'MVP Built' },
    { value: 'Early Traction', label: 'Early Traction' },
    { value: 'Product-Market Fit', label: 'Product-Market Fit' },
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

  const filterButtonClass = (isActive) =>
    isActive ? `${styles.filterChip} ${styles.filterChipActive}` : styles.filterChip;
  const toolbarButtonClass = (isActive) =>
    isActive ? `${styles.toolbarButton} ${styles.toolbarButtonActive}` : styles.toolbarButton;

  useEffect(() => {
    performSearch();
  }, [filters]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const response = await searchAPI.searchStartups(queryParams.toString());
      console.log('🔍 Search API Response:', response.data);
      const startupsList = response.data.results || [];
      console.log('🔍 Startups list:', startupsList);
      if (startupsList.length > 0) {
        console.log('🔍 First startup data:', startupsList[0]);
        console.log('🔍 First startup revenue:', startupsList[0].revenue);
        console.log('🔍 First startup profit:', startupsList[0].profit);
        console.log('🔍 First startup asking_price:', startupsList[0].asking_price);
      }
      setStartups(startupsList);
      setTotalResults(response.data.count || 0);
    } catch (error) {
      console.error('Search failed:', error);
      setStartups([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Update URL params
    const newSearchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v);
    });
    setSearchParams(newSearchParams);
  };

  const handleSearch = () => {
    const newFilters = { ...filters, query: searchInput };
    setFilters(newFilters);

    const newSearchParams = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) newSearchParams.set(k, v);
    });
    setSearchParams(newSearchParams);
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      type: '',
      phase: '',
      field: '',
      team_size: '',
      funding_stage: ''
    });
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>Startup Ecosystem</h1>
            <p>Vetted high-growth ventures ready for collaboration and investment.</p>
          </div>

          <div className={styles.heroActions}>
            <button
              type="button"
              className={toolbarButtonClass(showSearch)}
              onClick={() => {
                if (showSearch) {
                  handleFilterChange('query', '');
                  setSearchInput('');
                }
                setShowSearch(prev => !prev);
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
              onClick={() => setShowFilters(prev => !prev)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={styles.toolbarIcon}>
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <div className={styles.resultsCount}>
              <strong>{totalResults}</strong>
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
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  className={styles.searchInput}
                />
              </div>
            </div>
          )}

          {showFilters && (
            <div className={styles.filtersPanel}>
              <div className={styles.filterBlock}>
                <h3>Industry</h3>
                <div className={styles.filterChips}>
                  {industries.map(industryOption => (
                    <button
                      key={industryOption.value || 'all-industries'}
                      type="button"
                      className={filterButtonClass(filters.field === industryOption.value)}
                      onClick={() => handleFilterChange('field', industryOption.value)}
                    >
                      {industryOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterBlock}>
                <h3>Startup Stage</h3>
                <div className={styles.filterChips}>
                  {phases.map(phaseOption => (
                    <button
                      key={phaseOption.value || 'all-phases'}
                      type="button"
                      className={filterButtonClass(filters.phase === phaseOption.value)}
                      onClick={() => handleFilterChange('phase', phaseOption.value)}
                    >
                      {phaseOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterBlock}>
                <h3>Business Model</h3>
                <div className={styles.filterChips}>
                  {categories.map(categoryOption => (
                    <button
                      key={categoryOption.value || 'all-categories'}
                      type="button"
                      className={filterButtonClass(filters.category === categoryOption.value)}
                      onClick={() => handleFilterChange('category', categoryOption.value)}
                    >
                      {categoryOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={clearFilters}
                className={styles.clearButton}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        <div className={styles.results}>
          {startups.length === 0 && !loading ? (
            <div className={styles.noResults}>
              <p>No startups match your search criteria.</p>
              <p>Try adjusting your filters or search terms.</p>
            </div>
          ) : (
            <div className={styles.startupGrid}>
              {startups.map((startup) => (
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
      </div>
      <Footer />
    </>
  );
};

export default SearchStartups;
