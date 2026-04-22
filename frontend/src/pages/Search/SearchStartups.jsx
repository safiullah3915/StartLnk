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
  const [showSearch, setShowSearch] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'saas', label: 'SaaS' },
    { value: 'ecommerce', label: 'E-commerce' },
    { value: 'agency', label: 'Agency' },
    { value: 'legal', label: 'Legal' },
    { value: 'marketplace', label: 'Marketplace' },
    { value: 'media', label: 'Media' },
    { value: 'platform', label: 'Platform' },
    { value: 'real_estate', label: 'Real Estate' },
    { value: 'robotics', label: 'Robotics' },
    { value: 'software', label: 'Software' },
    { value: 'web3', label: 'Web3' },
    { value: 'crypto', label: 'Crypto' },
    { value: 'other', label: 'Other' }
  ];

  const types = [
    { value: '', label: 'All Types' },
    { value: 'marketplace', label: 'For Sale' },
    { value: 'collaboration', label: 'Looking for Team' }
  ];

  const phases = [
    { value: '', label: 'All Phases' },
    { value: 'Idea Stage', label: 'Idea Stage' },
    { value: 'Building MVP', label: 'Building MVP' },
    { value: 'MVP Stage', label: 'MVP Stage' },
    { value: 'Product Market Fit', label: 'Product Market Fit' },
    { value: 'Fund raising', label: 'Fund Raising' },
    { value: 'Growth', label: 'Growth' },
    { value: 'Exit', label: 'Exit' }
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

  const handleSearch = (e) => {
    e.preventDefault();
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
              onClick={() => setShowSearch(prev => !prev)}
            >
              <span className={styles.toolbarIcon} aria-hidden="true">⌕</span>
              {showSearch ? 'Hide Search' : 'Show Search'}
            </button>
            <button
              type="button"
              className={toolbarButtonClass(showFilters)}
              onClick={() => setShowFilters(prev => !prev)}
            >
              <span className={styles.toolbarIcon} aria-hidden="true">☷</span>
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
            <form onSubmit={handleSearch} className={styles.searchForm}>
              <div className={styles.mainSearch}>
                <span className={styles.searchFieldIcon} aria-hidden="true">⌕</span>
                <input
                  type="text"
                  placeholder="Search by name, keyword, or industry..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </form>
          )}

          {showFilters && (
            <div className={styles.filtersPanel}>
              <div className={styles.filterBlock}>
                <h3>Startup Type</h3>
                <div className={styles.filterChips}>
                  {types.map(type => (
                    <button
                      key={type.value || 'all-types'}
                      type="button"
                      className={filterButtonClass(filters.type === type.value)}
                      onClick={() => handleFilterChange('type', type.value)}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.filterBlock}>
                <h3>Industry Category</h3>
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
