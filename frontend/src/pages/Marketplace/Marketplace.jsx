import React, { useState, useEffect } from "react";
import { Navbar } from '../../components/Navbar/Navbar';
import { Footer } from '../../components/Footer/Footer';
import MarketPlaceCard from "../../components/MarketplaceCard/MarketPlaceCard";
import styles from "./MarketPlace.module.css";
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../utils/axiosConfig';
import { recommendationAPI, marketplaceAPI } from '../../utils/apiServices';
import { toast } from 'react-toastify';

const Marketplace = () => {
  const [startups, setStartups] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const startupsPerPage = 9;
  const [filters, setFilters] = useState({
    sortBy: 'date',
    order: 'desc',
    type: '',
    minRevenue: '',
    maxRevenue: '',
    category: ''
  });
  const { isInvestor, isStudent, user } = useAuth();
  
  useEffect(() => {
    loadStartups();
  }, [filters]);

  const loadStartups = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.order) params.order = filters.order;
      if (filters.type) params.type = filters.type;
      if (filters.category) params.category = filters.category;
      if (filters.minRevenue) params.minRevenue = filters.minRevenue;
      if (filters.maxRevenue) params.maxRevenue = filters.maxRevenue;

      const response = await marketplaceAPI.getMarketplace(params);
      
      setStartups(response.data.results || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Failed to load startups:', error);
      setStartups([]);
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

  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'saas', label: 'SaaS' },
    { value: 'ecommerce', label: 'Ecommerce' },
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

  const toggleFilters = () => {
    setShowFilters((prev) => !prev);
  };

  const startIndex = (currentPage - 1) * startupsPerPage;
  const paginatedStartups = startups.slice(startIndex, startIndex + startupsPerPage);
  const totalPages = Math.ceil(startups.length / startupsPerPage);

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

  const handlePageChange = (page) => {
    if (page === currentPage || page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
    <div className={styles.main}>

    
      <Navbar />
      <div className={styles.marketplace}>
        <div className={styles.header}>
          <h2>Explore Marketplace</h2>

          {/* Mobile Filter Toggle Button */}
          <button className={styles.filterToggle} onClick={toggleFilters}>
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>

          {/* Filters Section */}
          <div
            className={`${styles.filters} ${
              showFilters ? styles.showFilters : ""
            }`}
          >
            <div className={styles.filterRow}>
              <select 
                value={filters.sortBy} 
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="date">Sort by Date</option>
                <option value="price">Sort by Price</option>
                <option value="revenue">Sort by Revenue</option>
              </select>
              
              <select 
                value={filters.order} 
                onChange={(e) => handleFilterChange('order', e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
              
              <select 
                value={filters.category} 
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className={styles.cardsGrid}>
          {loading ? (
            <div className={styles.loading}>Loading startups...</div>
          ) : startups.length > 0 ? (
            paginatedStartups.map((startup, index) => (
              <MarketPlaceCard key={startup.id || index} {...startup} />
            ))
          ) : (
            <div className={styles.noResults}>
              <h3>No startups found</h3>
              <p>Try adjusting your filters or check back later for new listings.</p>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {startups.length > 0 && totalPages > 1 && (
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

export { Marketplace };
