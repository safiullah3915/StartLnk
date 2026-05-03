import React, { useState } from "react";
import styles from "./CollaborationCard.module.css";
import { Link } from 'react-router-dom';
import { getStartupDetailPath, normalizeId } from '../../utils/idUtils';

const CollaborationCard = ({ 
  startup, 
  score, 
  matchReasons, 
  appliedPositionIds, 
  appliedStartupIds,
  recommendationContext, // Optional: { sessionId, rank, score, method }
  // Legacy props for backward compatibility
  id, 
  title, 
  description, 
  earn_through, 
  phase, 
  team_size, 
  category, 
  type, owner, ...rest 
}) => {
  const [showPositions, setShowPositions] = useState(false);
  
  // Use startup object if provided, otherwise use legacy props
  const startupData = startup || { id, title, description, earn_through, phase, team_size, category, type, owner, ...rest };
  const startupId = startupData.id;
  const normalizedStartupId = normalizeId(startupId);
  
  // Calculate match percentage from score
  const matchPercentage = score ? Math.round(score * 100) : null;
  
  // Build link destination with recommendation context if available
  const getLinkDestination = () => {
    const basePath = getStartupDetailPath(normalizedStartupId);
    if (recommendationContext?.sessionId) {
      const params = new URLSearchParams({
        recommendation_session_id: recommendationContext.sessionId,
      });
      if (recommendationContext.rank) {
        params.append('recommendation_rank', recommendationContext.rank.toString());
      }
      return `${basePath}?${params.toString()}`;
    }
    return basePath;
  };

  return (
    <div className={styles.cardWrapper}>
      <Link to={getLinkDestination()} className={styles.linkWrapper}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.titleRow}>
              <div className={styles.iconBadge}>
                <img src="/Decentralized Network.svg" alt="" className={styles.iconImage} />
              </div>
              <div className={styles.titleInfo}>
                <h3>{startupData.title || 'Startup Name'}</h3>
                {startupData.owner?.full_name && (
                  <p className={styles.founderName}>
                    FOUNDED BY {startupData.owner.full_name.toUpperCase()}
                  </p>
                )}
              </div>
            </div>
            <div className={styles.headerRight}>
              <span className={styles.tag}>{startupData.category || 'Collaboration'}</span>
              {matchPercentage && (
                <span className={styles.matchBadge}>{matchPercentage}% Match</span>
              )}
            </div>
          </div>
      
      {/* primary position removed to keep consistent card size */}
          
          {/* Match Reasons */}
          {matchReasons && matchReasons.length > 0 && (
            <div className={styles.matchReasons}>
              <strong>Why this matches:</strong>
              <ul>
                {matchReasons.slice(0, 2).map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          <p className={styles.description}>{startupData.description || 'No description available'}</p>
          <div className={styles.stats}>
            <div className={styles.statsheading}>
              <span className={styles.statsLabel}>Industry</span>
              <p>{startupData.field || 'N/A'}</p>
            </div>
            <div className={styles.statsheading}>
              <span className={styles.statsLabel}>Phase</span>
              <p>{startupData.phase || 'N/A'}</p>
            </div>
            <div className={styles.statsheading}>
              <span className={styles.statsLabel}>Team Size</span>
              <p>{startupData.team_size || '1-5'}</p>
            </div>
          </div>
        </div>
      </Link>
      
      {/* positions removed to keep card layout consistent */}
    </div>
  );
};

export default CollaborationCard;
