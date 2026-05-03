import React, { useState, useEffect, useRef } from "react";
import styles from "./ApplyJob.module.css";
import { Navbar } from "../../components/Navbar/Navbar";
import { Footer } from "../../components/Footer/Footer";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import apiClient from '../../utils/axiosConfig';
import { userAPI } from '../../utils/apiServices';
import { getStartupDetailPath, normalizeId } from '../../utils/idUtils';

const ApplyJob = () => {
  const { startupId } = useParams();
  const navigate = useNavigate();
  const { user, isStudent, isEntrepreneur } = useAuth();
  const normalizedStartupId = normalizeId(startupId);
  const [startup, setStartup] = useState(null);
  const [positions, setPositions] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [isPositionMenuOpen, setIsPositionMenuOpen] = useState(false);
  const positionDropdownRef = useRef(null);
  const [formData, setFormData] = useState({
    position_id: '',
    cover_letter: '',
    experience: '',
    portfolio_url: '',
    resume: null
  });

  const selectedPositionTitle =
    positions.find(position => String(position.id) === String(formData.position_id))?.title ||
    'Select Position';

  useEffect(() => {
    if (!isStudent() && !isEntrepreneur()) {
      toast.error('Only students and entrepreneurs can apply for positions', { toastId: 'role-error' });
      navigate('/dashboard');
      return;
    }
    loadStartupDetails();
    loadPositions();
    
    const urlParams = new URLSearchParams(window.location.search);
    const positionId = urlParams.get('position');
    if (positionId) {
      setFormData(prev => ({ ...prev, position_id: positionId }));
    }
  }, [startupId, isStudent, isEntrepreneur, user, navigate]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (positionDropdownRef.current && !positionDropdownRef.current.contains(event.target)) {
        setIsPositionMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const loadStartupDetails = async () => {
    try {
      const response = await apiClient.get(`/api/startups/${normalizedStartupId}`);
      const startupData = response.data;
      setStartup(startupData);
      
      if (isEntrepreneur() && user?.id === startupData?.owner?.id) {
        toast.error('You cannot apply to positions in your own startup', { toastId: 'own-startup-error' });
        navigate(getStartupDetailPath(normalizedStartupId));
        return;
      }
      
      if (user && (isStudent() || isEntrepreneur())) {
        try {
          const appsResponse = await userAPI.getUserApplications();
          const applications = appsResponse.data.results || appsResponse.data;
          if (Array.isArray(applications)) {
            const hasAppliedToStartup = applications.some(app => app.startup?.id === startupData.id);
            if (hasAppliedToStartup) {
              toast.error(`You have already applied to a position at ${startupData.title}.`, { toastId: 'already-applied-error' });
              navigate(getStartupDetailPath(normalizedStartupId));
              return;
            }
          }
        } catch (error) {
          console.error('Failed to check existing applications:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load startup details:', error);
      toast.error('Failed to load startup details');
      navigate('/collaboration');
    } finally {
      setLoading(false);
    }
  };

  const loadPositions = async () => {
    try {
      const response = await apiClient.get(`/api/startups/${normalizedStartupId}/positions`);
      const positionData = response.data.positions || response.data;
      setPositions(positionData);
      const positionId = formData.position_id || new URLSearchParams(window.location.search).get('position');
      if (positionId && positionData.length > 0) {
        const position = positionData.find(p => p.id === positionId);
        setSelectedPosition(position);
        if (!formData.position_id) setFormData(prev => ({ ...prev, position_id: positionId }));
      }
    } catch (error) {
      console.error('Failed to load positions:', error);
      setPositions([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, resume: e.target.files[0] }));
  };

  const handlePositionSelect = (positionId) => {
    setFormData(prev => ({ ...prev, position_id: positionId }));
    setSelectedPosition(positions.find(p => p.id === positionId) || null);
    setIsPositionMenuOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const coverLetterWords = formData.cover_letter.trim().split(/\s+/).filter(w => w.length > 0).length;
    const experienceWords = formData.experience.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (coverLetterWords > 300) {
      toast.error('Cover letter exceed the word count of 300');
      return;
    }
    if (experienceWords > 200) {
      toast.error('Experience exceed the word count of 200');
      return;
    }
    if (!formData.cover_letter.trim() || !formData.experience.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!formData.position_id && positions.length > 0) {
      toast.error('Please select a position to apply for');
      return;
    }
    if (!formData.resume) {
      toast.error('Please attach your resume (PDF, DOC, or DOCX)');
      return;
    }

    setSubmitting(true);
    try {
      setUploadingResume(true);
      const resumeData = new FormData();
      resumeData.append('file', formData.resume);
      const resumeResponse = await apiClient.post('/api/upload/resume', resumeData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const resumeUrl = resumeResponse.data?.file_url || resumeResponse.data?.file || '';
      if (!resumeUrl) throw new Error('Resume URL failed');
      setUploadingResume(false);

      const payload = {
        cover_letter: formData.cover_letter.trim(),
        experience: formData.experience.trim(),
        resume_url: resumeUrl,
        position_id: formData.position_id,
        portfolio_url: formData.portfolio_url.trim()
      };

      await apiClient.post(`/api/collaborations/${normalizedStartupId}/apply`, payload);
      toast.success('Application submitted successfully! You can track the status from your dashboard.');
      navigate('/dashboard?tab=applications');
    } catch (error) {
      console.error('Submission failed:', error);
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setSubmitting(false);
      setUploadingResume(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className={styles.loadingContainer}>
          <div className={styles.premiumSpinner} />
          <p className={styles.loadingText}>Initializing application process...</p>
        </div>
      </>
    );
  }
  if (!startup) {
    return (
      <>
        <Navbar />
        <div className={styles.loadingContainer}>
          <p className={styles.loadingText}>Startup information could not be retrieved.</p>
          <button onClick={() => navigate('/collaboration')} className={styles.submitButton} style={{ marginTop: '1rem' }}>
            Return to Collaboration
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar/>
      <div className={styles.container}>
        <h1 className={styles.title}>Apply for Collaboration</h1>
        <h2 className={styles.startupName}>{startup.title}</h2>
        <div className={styles.tags}>
          <span className={`${styles.tag} ${styles.fund}`}>{startup.category}</span>
          <span className={`${styles.tag} ${styles.equity}`}>{startup.type}</span>
          <span className={`${styles.tag} ${styles.collab}`}>{startup.field}</span>
        </div>

        <h3 className={styles.sectionTitle}>{selectedPosition ? 'Position' : 'Company'} Description</h3>
        <p className={styles.description}>
          {selectedPosition ? selectedPosition.description || startup.description : startup.description}
        </p>

        {selectedPosition && selectedPosition.requirements && (
          <>
            <h4 className={styles.requirementsTitle}>Requirements</h4>
            <p className={styles.requirements}>{selectedPosition.requirements}</p>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {positions.length > 0 && (
            <div className={`${styles.formGroup} ${styles.positionFormGroup}`}>
              <label>Select Position *</label>
              <div className={styles.positionDropdown} ref={positionDropdownRef}>
                <button
                  type="button"
                  className={styles.positionSelect}
                  onClick={() => setIsPositionMenuOpen(prev => !prev)}
                >
                  <span className={styles.positionSelectText}>{selectedPositionTitle}</span>
                  <span className={`${styles.positionChevron} ${isPositionMenuOpen ? styles.positionChevronOpen : ''}`} />
                </button>
                {isPositionMenuOpen && (
                  <div className={styles.positionMenu}>
                    <button type="button" className={`${styles.positionOption} ${!formData.position_id ? styles.positionOptionActive : ''}`} onClick={() => handlePositionSelect('')}>Select Position</button>
                    {positions.map(p => (
                      <button key={p.id} type="button" className={`${styles.positionOption} ${formData.position_id === p.id ? styles.positionOptionActive : ''}`} onClick={() => handlePositionSelect(p.id)}>{p.title}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.formGroup}>
            <label>Attach Resume *</label>
            <div className={styles.fileInputWrapper}>
              <input type="file" accept=".pdf,.doc,.docx" onChange={handleFileChange} className={styles.fileInput} id="resume-input" required />
              <label htmlFor="resume-input" className={styles.fileInputLabel}>Choose File</label>
            </div>
            {formData.resume && <p className={styles.fileName}>Selected: {formData.resume.name}</p>}
          </div>

          <div className={styles.formGroup}>
            <label>Cover Letter *</label>
            <textarea name="cover_letter" value={formData.cover_letter} onChange={handleInputChange} rows="4" required />
            <div className={`${styles.wordCount} ${formData.cover_letter.trim().split(/\s+/).filter(w => w.length > 0).length > 300 ? styles.wordCountError : ''}`}>
              {formData.cover_letter.trim().split(/\s+/).filter(w => w.length > 0).length} / 300 words
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Experience & Skills *</label>
            <textarea name="experience" value={formData.experience} onChange={handleInputChange} rows="4" required />
            <div className={`${styles.wordCount} ${formData.experience.trim().split(/\s+/).filter(w => w.length > 0).length > 200 ? styles.wordCountError : ''}`}>
              {formData.experience.trim().split(/\s+/).filter(w => w.length > 0).length} / 200 words
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Portfolio URL (Optional)</label>
            <input type="url" name="portfolio_url" value={formData.portfolio_url} onChange={handleInputChange} placeholder="https://yourportfolio.com" />
          </div>
          
          <div className={styles.actionButtons}>
            <button type="button" onClick={() => navigate('/collaboration')} className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.submitBtn} disabled={submitting || uploadingResume}>
              {uploadingResume ? 'Uploading resume...' : (submitting ? 'Submitting...' : 'Submit Application')}
            </button>
          </div>
        </form>
      </div>
      <Footer/>
    </>
  );
};

export default ApplyJob;
