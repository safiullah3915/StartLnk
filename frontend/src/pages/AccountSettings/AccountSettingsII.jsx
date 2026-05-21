import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Country, City } from 'country-state-city';
import Select from 'react-select';
import { useSpring, animated } from 'react-spring';
import { Navbar } from "../../components/Navbar/Navbar"
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI, applicationAPI, uploadAPI } from '../../utils/apiServices';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';
import { API_BASE_URL } from '../../utils/api';

// Resolves a relative media path to a full URL using the configured API base.
// In development: API_BASE_URL = 'http://127.0.0.1:8000' → full URL.
// In production:  API_BASE_URL = '' → path stays relative, served by Nginx.
const resolveMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${API_BASE_URL}${path}`;
};

// This is the main component that renders the settings page.
const App = () => {
  const { user, isStudent, isEntrepreneur, isInvestor, logout, loading: authLoading } = useAuth();
  const [isProfilePublic, setIsProfilePublic] = useState(false);
  const [profileDescription, setProfileDescription] = useState(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [references, setReferences] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);

  // Personal Info State
  const [savedFullName, setSavedFullName] = useState('');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const getWordCount = (text) => {
    if (!text || typeof text !== 'string') return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };

  const [referencesPage, setReferencesPage] = useState(1);
  const [skillsPage, setSkillsPage] = useState(1);
  const [experiencesPage, setExperiencesPage] = useState(1);
  const [newReference, setNewReference] = useState({ title: '', description: '' });
  const [newSkill, setNewSkill] = useState({ title: '', description: '' });
  const [newExperience, setNewExperience] = useState({ title: '', description: '' });
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const PAGE_SIZE = 3;

  // Application management state
  const [applications, setApplications] = useState([]);
  const [startupApplications, setStartupApplications] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [interests, setInterests] = useState([]);
  const [profileStats, setProfileStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bannerState, setBannerState] = useState({ type: null, message: '' });
  const [profilePicture, setProfilePicture] = useState(null);
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const fileInputRef = useRef(null);

  // Crop Modal States
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [originalFileObject, setOriginalFileObject] = useState(null);
  const [dbOriginalPicture, setDbOriginalPicture] = useState(null);
  const [cropError, setCropError] = useState('');

  // Collapse/expand state for form sections
  const [isReferencesFormOpen, setIsReferencesFormOpen] = useState(false);
  const [isSkillsFormOpen, setIsSkillsFormOpen] = useState(false);
  const [isExperiencesFormOpen, setIsExperiencesFormOpen] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);

      // Load user profile data
      const profileResponse = await userAPI.getProfileData();

      const data = profileResponse.data;

      if (data.profile) {
        setIsProfilePublic(data.profile.is_public || false);
        setProfileDescription(data.profile.bio || data.profile.description || '');
        setProfilePicture(data.profile.profile_picture || null);
        setDbOriginalPicture(data.profile.original_profile_picture || null);
        if (data.profile.profile_picture_crop) {
          setCrop(data.profile.profile_picture_crop.crop || { x: 0, y: 0 });
          setZoom(data.profile.profile_picture_crop.zoom || 1);
        }
        setGithubUrl(data.profile.github_url || '');
        setLinkedinUrl(data.profile.linkedin_url || '');
        setPortfolioUrl(data.profile.website || '');
        setSkills(data.profile.skills || []);
        setExperiences(data.profile.experience || []);
        setReferences(data.profile.references || []);

        if (data.profile.user?.full_name) {
          setFullName(data.profile.user.full_name);
          setSavedFullName(data.profile.user.full_name);
        } else if (data.profile.full_name) {
          setFullName(data.profile.full_name);
          setSavedFullName(data.profile.full_name);
        }

        if (data.profile.location) {
          const parts = data.profile.location.split(',').map(s => s.trim());
          if (parts.length > 1) {
            setCity(parts[0]);
            setCountry(parts[1]);
          } else {
            setCountry(parts[0]);
          }
        }

        setReferencesPage(1);
        setSkillsPage(1);
        setExperiencesPage(1);
      }

      // Update stats
      if (data.stats) {
        setProfileStats(data.stats);
      }

      // Load role-specific data
      if (isStudent()) {
        setApplications(data.applications || []);
        setFavorites(data.favorites || []);
      } else if (isEntrepreneur()) {
        setStartupApplications(data.applications || []);
      } else if (isInvestor()) {
        setFavorites(data.favorites || []);
        setInterests(data.interests || []);
      }

    } catch (error) {
      console.error('Failed to load user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const customSelectStyles = {
    control: (provided) => ({
      ...provided,
      backgroundColor: 'rgba(15, 23, 42, 0.4)',
      borderColor: '#1E293B',
      borderRadius: '0.85rem',
      padding: '0.1rem 0',
      minHeight: '48px',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#3B82F6'
      }
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '0 1rem',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#0F172A',
      border: '1px solid #1E293B',
      borderRadius: '0.5rem',
      zIndex: 9999
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isFocused ? '#1E293B' : 'transparent',
      color: '#F8FAFC',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: '#3B82F6'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#F8FAFC'
    }),
    input: (provided) => ({
      ...provided,
      color: '#F8FAFC'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#6B7280'
    })
  };

  const fade = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration: 500 },
  });

  // Toggle visibility and persist directly to DB
  const handleToggle = async () => {
    const newValue = !isProfilePublic;
    setIsProfilePublic(newValue);
    try {
      await userAPI.updateProfileData({ is_public: newValue });
      toast.success(`Profile visibility set to ${newValue ? 'Public' : 'Private'}`);
    } catch (err) {
      console.error("Failed to update visibility:", err);
      // Revert local state if API fails
      setIsProfilePublic(!newValue);
      toast.error("Failed to update visibility. Please try again.");
    }
  };

  // Application management functions
  const handleApproveApplication = async (applicationId) => {
    try {
      await applicationAPI.approveApplication(applicationId);
      toast.success('Application approved');
      loadUserData(); // Reload data
    } catch (error) {
      console.error('Failed to approve application:', error);
      toast.error('Failed to approve application');
    }
  };

  const handleDeclineApplication = async (applicationId) => {
    try {
      await applicationAPI.declineApplication(applicationId);
      toast.success('Application declined');
      loadUserData(); // Reload data
    } catch (error) {
      console.error('Failed to decline application:', error);
      toast.error('Failed to decline application');
    }
  };

  const formatUrl = (url) => {
    if (!url || typeof url !== 'string' || url.trim() === '') return '';
    const trimmed = url.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleProfilePictureClick = () => {
    if (!isUploadingPicture) {
      if (dbOriginalPicture) {
        // If an original picture exists, open the crop modal with it
        setCropImageSrc(resolveMediaUrl(dbOriginalPicture));
        setCropError('');
        setIsCropModalOpen(true);
      } else {
        // Otherwise, open file selector directly
        fileInputRef.current?.click();
      }
    }
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    // Read full file to string for Cropper
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setCropImageSrc(reader.result);
      setOriginalFileObject(file);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropError('');
      setIsCropModalOpen(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
    });
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    setIsUploadingPicture(true);
    setCropError('');
    try {
      if (!croppedAreaPixels) throw new Error("Please wait for the image to load fully.");
      // 1. Physically crop the image using canvas
      const croppedBlob = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to process image block. Try another image.");

      // Some mobile webviews crash on `new File()`, wrap it safely:
      let croppedFile;
      try {
        croppedFile = new File([croppedBlob], 'profile_cropped.jpg', { type: 'image/jpeg' });
      } catch (e) {
        // Fallback for older browsers: use the blob directly, uploadAPI handles formData
        croppedFile = croppedBlob;
        croppedFile.name = 'profile_cropped.jpg';
      }

      const cropData = { crop, zoom };

      const response = await uploadAPI.uploadProfilePicture(croppedFile, originalFileObject, cropData);

      if (response.data && response.data.file_url) {
        setProfilePicture(response.data.file_url);
        toast.success('Profile picture updated successfully');
        loadUserData();
        setIsCropModalOpen(false);
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error('Failed to crop and upload:', error);
      let userMsg = 'An unexpected error occurred. Please try again later.';
      const rawMsg = error.message ? error.message.toLowerCase() : '';

      if (rawMsg.includes('timeout') || error.code === 'ECONNABORTED') {
        userMsg = 'Upload took too long due to a slow connection. Please try again.';
      } else if (rawMsg.includes('network error') || !window.navigator.onLine) {
        userMsg = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error.response && error.response.status >= 500) {
        userMsg = 'Our servers are currently experiencing issues. Please try again later.';
      } else if (error.response && error.response.status === 413) {
        userMsg = 'The image file is too large. Please select a smaller photo.';
      } else if (error.message && !error.response) {
        // Safe standard Javascript errors if thrown locally
        userMsg = error.message;
      }

      setCropError(userMsg);
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleRemovePicture = async () => {
    // Save a blank profile update to remove picture
    // But since uploadAPI doesn't have a specific `deleteProfilePicture` endpoint,
    // we can use `userAPI.updateProfileData({ profile_picture: null })`
    // However, Django's REST framework handles wiping fields using PATCH nicely
    try {
      setIsUploadingPicture(true);
      await userAPI.updateProfileData({ profile_picture: null, original_profile_picture: null, profile_picture_crop: {} });
      setProfilePicture(null);
      setDbOriginalPicture(null);
      setIsCropModalOpen(false);
      toast.success('Profile picture removed');
    } catch (error) {
      console.error('Failed to remove picture:', error);
      toast.error('Failed to remove picture');
    } finally {
      setIsUploadingPicture(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setBannerState({ type: null, message: '' });

    try {
      const profileData = {
        bio: profileDescription || '',
        github_url: formatUrl(githubUrl),
        linkedin_url: formatUrl(linkedinUrl),
        website: formatUrl(portfolioUrl),
        skills: skills,
        experience: experiences,
        references: references,
        full_name: fullName,
        location: [city, country].filter(Boolean).join(', ')
      };

      await userAPI.updateProfileData(profileData);
      setSavedFullName(fullName);
      setBannerState({ type: 'success', message: 'Profile saved successfully' });
      setTimeout(() => setBannerState({ type: null, message: '' }), 5000);
    } catch (error) {
      console.error('Failed to update profile:', error);
      let errMsg = 'Failed to save profile. Please check your data and try again.';
      if (error.response && error.response.data) {
        const data = error.response.data;
        if (typeof data === 'object') {
          const firstKey = Object.keys(data)[0];
          if (firstKey && Array.isArray(data[firstKey])) {
            errMsg = `${firstKey}: ${data[firstKey][0]}`;
          } else if (data.detail) {
            errMsg = data.detail;
          }
        }
      }
      setBannerState({ type: 'error', message: errMsg });
      setTimeout(() => setBannerState({ type: null, message: '' }), 6000);
    } finally {
      setIsSaving(false);
    }
  };

  // Generic handler to add a new item to a specific list.
  const handleNewItemChange = (type, field, value) => {
    const updater = type === 'references'
      ? setNewReference
      : type === 'skills'
        ? setNewSkill
        : setNewExperience;
    updater(prev => ({ ...prev, [field]: value }));
  };

  const handleAddItem = (type) => {
    const { title, description } =
      type === 'references'
        ? newReference
        : type === 'skills'
          ? newSkill
          : newExperience;

    if (!title.trim() || !description.trim()) {
      toast.error('Please fill in both name and description before adding.');
      return;
    }

    const wordCount = getWordCount(description);
    if (wordCount > 35) {
      toast.error(`Description exceeds the word limit of 35 words (Current: ${wordCount})`);
      return;
    }

    const newItem = { title: title.trim(), description: description.trim() };

    if (type === 'references') {
      const updated = [...references, newItem];
      setReferences(updated);
      setReferencesPage(Math.ceil(updated.length / PAGE_SIZE));
      setNewReference({ title: '', description: '' });
    } else if (type === 'skills') {
      const updated = [...skills, newItem];
      setSkills(updated);
      setSkillsPage(Math.ceil(updated.length / PAGE_SIZE));
      setNewSkill({ title: '', description: '' });
    } else {
      const updated = [...experiences, newItem];
      setExperiences(updated);
      setExperiencesPage(Math.ceil(updated.length / PAGE_SIZE));
      setNewExperience({ title: '', description: '' });
    }
    toast.success('Entry added — press Finalize Profile to save.');
  };

  // persistProfileCollections is now a no-op — all saves go through Finalize Profile
  const persistProfileCollections = useCallback(() => { }, []);

  const openDeleteConfirm = (type, index) => setDeleteConfirm({ type, index });

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    const { type, index } = deleteConfirm;
    setDeleteConfirm(null);
    handleRemoveItem(type, index);
  };

  const handleRemoveItem = (type, index) => {
    if (type === 'references') {
      const updated = references.filter((_, i) => i !== index);
      setReferences(updated);
      setReferencesPage(prev => Math.min(prev, Math.max(1, Math.ceil(updated.length / 3))));
    } else if (type === 'skills') {
      const updated = skills.filter((_, i) => i !== index);
      setSkills(updated);
      setSkillsPage(prev => Math.min(prev, Math.max(1, Math.ceil(updated.length / 3))));
    } else {
      const updated = experiences.filter((_, i) => i !== index);
      setExperiences(updated);
      setExperiencesPage(prev => Math.min(prev, Math.max(1, Math.ceil(updated.length / 3))));
    }
    toast.success('Entry removed — press Finalize Profile to save.');
  };

  const handleEditItem = (type, index) => {
    if (type === 'profile_description') {
      setEditingItem({ type, index: 0 });
      setEditForm({
        title: 'Profile Description',
        description: profileDescription || ''
      });
      return;
    }
    const getter = type === 'references' ? references : type === 'skills' ? experiences : experiences; // Fixed typo if skills was used
    const realGetter = type === 'references' ? references : type === 'skills' ? skills : experiences;
    const currentItem = realGetter[index];
    if (!currentItem) {
      return;
    }

    setEditingItem({ type, index });
    setEditForm({
      title: currentItem.title || '',
      description: currentItem.description || ''
    });
  };

  const handleEditFieldChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const closeEditModal = () => {
    if (isEditSaving) return;
    setEditingItem(null);
    setEditForm({ title: '', description: '' });
  };

  const handleSaveEdit = (event) => {
    event.preventDefault();
    if (!editingItem) return;

    const title = editForm.title.trim();
    const description = editForm.description.trim();

    if ((editingItem.type !== 'profile_description' && !title) || !description) {
      toast.error('Both fields are required.');
      return;
    }

    const wordCount = getWordCount(description);
    if (editingItem.type === 'profile_description') {
      if (wordCount > 50) {
        toast.error(`Bio exceeds the word limit of 50 words (Current: ${wordCount})`);
        return;
      }
    } else {
      if (wordCount > 35) {
        toast.error(`Description exceeds the word limit of 35 words (Current: ${wordCount})`);
        return;
      }
    }

    if (editingItem.type === 'profile_description') {
      setProfileDescription(description);
      toast.success('Bio updated — press Finalize Profile to save.');
      closeEditModal();
      return;
    }

    if (editingItem.type === 'references') {
      setReferences(prev => prev.map((item, i) =>
        i === editingItem.index ? { ...item, title, description } : item
      ));
    } else if (editingItem.type === 'skills') {
      setSkills(prev => prev.map((item, i) =>
        i === editingItem.index ? { ...item, title, description } : item
      ));
    } else {
      setExperiences(prev => prev.map((item, i) =>
        i === editingItem.index ? { ...item, title, description } : item
      ));
    }
    toast.success('Entry updated — press Finalize Profile to save.');
    closeEditModal();
  };

  const paginateList = useCallback((list, page) => {
    const start = (page - 1) * PAGE_SIZE;
    return list.slice(start, start + PAGE_SIZE);
  }, []);

  const referencesPaginated = useMemo(() => paginateList(references, referencesPage), [references, referencesPage, paginateList]);
  const skillsPaginated = useMemo(() => paginateList(skills, skillsPage), [skills, skillsPage, paginateList]);
  const experiencesPaginated = useMemo(() => paginateList(experiences, experiencesPage), [experiences, experiencesPage, paginateList]);

  const renderPagination = (page, setPage, totalItems) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    if (totalPages <= 1) return null;

    const goPrev = () => setPage(prev => Math.max(1, prev - 1));
    const goNext = () => setPage(prev => Math.min(totalPages, prev + 1));

    return (
      <div className="pagination-container">
        <button type="button" className="page-btn" onClick={goPrev} disabled={page === 1}>
          ‹
        </button>
        <span style={{ fontSize: '0.9rem', color: '#9CA3AF', fontWeight: '600', minWidth: '40px', textAlign: 'center', letterSpacing: '0.05em' }}>
          {page} <span style={{ opacity: 0.5, margin: '0 2px' }}>/</span> {totalPages}
        </span>
        <button type="button" className="page-btn" onClick={goNext} disabled={page === totalPages}>
          ›
        </button>
      </div>
    );
  };

  return (
    <>
      <style>
        {`
        body {
          background-color: #0A0B10; /* Very dark navy/black matching the image */
          color: #F3F4F6;
          font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
          margin: 0;
          padding: 0;
        }
        .container {
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding: 2rem 1rem;
          margin-top: 6rem;
        }
        @media (min-width: 640px) {
          .container {
            padding: 4rem 2rem;
            margin-top: 7rem;
          }
        }
        
        /* ── 2-Column Layout ── */
        .main-layout {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
          max-width: 1200px;
          margin: 0 auto;
          position: relative;
        }
        @media (min-width: 1024px) {
          .main-layout {
            flex-direction: row;
            align-items: flex-start;
          }
        }
        .left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
          max-width: 100%;
        }
        @media (min-width: 1024px) {
          .left-panel {
            max-width: 320px;
            position: sticky;
            top: 2rem;
          }
        }
        .right-panel {
          flex: 2.5;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          width: 100%;
        }

        /* ── Left Panel: Profile Card ── */
        .profile-card {
          background-color: #151828;
          border: 1px solid #2A2F45;
          border-radius: 1.25rem;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .profile-picture {
          position: relative;
          width: 6.5rem;
          height: 6.5rem;
          border-radius: 50%;
          background: linear-gradient(135deg, #EC4899, #8B5CF6, #3B82F6);
          padding: 0.2rem;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .profile-picture-inner {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: #151828;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2.5rem;
          font-weight: 700;
          color: white;
          overflow: hidden;
          border: 2px solid #151828;
        }
        .profile-picture-inner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .edit-plus-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          background: #3B82F6;
          color: white;
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          border: 2px solid #151828;
          cursor: pointer;
          transition: transform 0.2s, background 0.2s;
        }
        .edit-plus-badge:hover {
          transform: scale(1.1);
          background: #2563EB;
        }
        .profile-name {
          font-size: 1.35rem;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0 0 0.25rem 0;
        }
        .role-badge {
          background: rgba(59, 130, 246, 0.15);
          color: #60A5FA;
          padding: 0.35rem 0.85rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.05em;
          margin-bottom: 1rem;
          display: inline-block;
          text-transform: uppercase;
        }
        .profile-desc {
          margin: 0 0 1.5rem 0;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
        }
        .bio-text {
          font-size: 0.85rem;
          line-height: 1.5;
          color: #9CA3AF;
          font-style: italic;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
        }
        .desc-edit-btn {
          background: transparent;
          border: none;
          color: #4B5563;
          cursor: pointer;
          font-size: 0.85rem;
          padding: 2px 5px;
          border-radius: 6px;
          transition: background 0.15s, color 0.15s;
          vertical-align: middle;
        }
        .desc-edit-btn:hover {
          background: rgba(139, 92, 246, 0.15);
          color: #A78BFA;
        }
        
        .profile-stats-list {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          margin-bottom: 2rem;
        }
        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          background: rgba(30, 35, 55, 0.6);
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          font-size: 0.85rem;
          color: #D1D5DB;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .stat-icon {
          font-size: 1.1rem;
        }
        .logout-btn-bottom {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: rgba(239, 68, 68, 0.08);
          color: #EF4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn-bottom:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #F87171;
        }

        /* ── Left Panel: Pro Tip Card ── */
        .pro-tip-card {
          background: linear-gradient(135deg, #4C1D95, #7C3AED, #2563EB);
          border-radius: 1.25rem;
          padding: 1.5rem;
          color: white;
          position: relative;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(124, 58, 237, 0.25);
        }
        .pro-tip-icon {
          font-size: 1.25rem;
          margin-bottom: 0.5rem;
        }
        .pro-tip-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
        }
        .pro-tip-text {
          font-size: 0.85rem;
          line-height: 1.5;
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
        }

        /* ── Right Panel: Sections ── */
        .top-actions-wrapper {
          width: 100%;
          display: flex;
          justify-content: flex-end;
          margin-bottom: -1rem;
        }
        @media (min-width: 1024px) {
          .top-actions-wrapper {
            position: absolute;
            top: -3.5rem;
            right: 0;
            margin-bottom: 0;
          }
        }
        .visibility-pill {
          background: #151828;
          border: 1px solid #2A2F45;
          border-radius: 999px;
          padding: 0.6rem 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        .vp-left {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-weight: 700;
          font-size: 0.9rem;
          color: #E5E7EB;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .public-visibility-icon {
          font-size: 1.1rem;
          transition: filter 0.3s ease, opacity 0.3s ease;
          opacity: 0.35;
        }
        .public-visibility-icon.active {
          opacity: 1;
          filter: drop-shadow(0 0 5px rgba(139, 92, 246, 0.8));
        }

        .toggle-switch {
          position: relative;
          display: inline-block;
          width: 3rem;
          height: 1.5rem;
        }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: #374151; transition: .4s; border-radius: 999px;
        }
        .slider:before {
          position: absolute; content: ""; height: 1.15rem; width: 1.15rem;
          left: 0.175rem; bottom: 0.175rem; background-color: white;
          transition: .4s; border-radius: 50%;
        }
        input:checked + .slider { background-color: #8B5CF6; }
        input:checked + .slider:before { transform: translateX(1.5rem); }

        .form-section {
          background: transparent;
        }
        .section-header {
          display: flex;
          align-items: center;
          margin-bottom: 1rem;
        }
        .section-title {
          font-size: 1.1rem;
          font-weight: 700;
          color: #F9FAFB;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .collection-form {
          background: #151828;
          border: 1px solid #2A2F45;
          border-radius: 1rem;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 640px) {
          .form-row {
            grid-template-columns: 1fr 1.5fr;
          }
        }
        .location-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
          margin-top: 1.25rem;
        }
        @media (min-width: 640px) {
          .location-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .form-field label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748B !important;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        /* ── Input Overrides with Max Specificity ── */
        body #root .container .main-layout input[type="text"].collection-input,
        body #root .container .main-layout textarea.collection-input,
        body #root .container .modal-card input[type="text"].collection-input,
        body #root .container .modal-card textarea.collection-input,
        div .collection-input {
          background-color: #0F172A !important;
          border: 1px solid #1E293B !important;
          color: #F8FAFC !important;
          border-radius: 0.85rem !important;
          padding: 0.75rem 1rem !important;
          font-size: 0.9rem !important;
          transition: all 0.2s ease !important;
          width: 100% !important;
          box-sizing: border-box !important;
          outline: none !important;
          box-shadow: none !important;
          -webkit-appearance: none !important;
        }
        body #root .container .main-layout input[type="text"].collection-input:focus,
        body #root .container .main-layout textarea.collection-input:focus,
        body #root .container .modal-card input[type="text"].collection-input:focus,
        body #root .container .modal-card textarea.collection-input:focus,
        div .collection-input:focus {
          border-color: #3B82F6 !important;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2) !important;
          background-color: #151A2D !important;
        }
        div .collection-input::placeholder {
          color: #475569 !important;
        }
        .add-button-full {
          width: 100%;
          background: linear-gradient(135deg, #7C3AED, #6D28D9);
          color: white;
          padding: 0.85rem;
          border-radius: 0.5rem;
          border: none;
          font-size: 0.95rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
        }
        .add-button-full:hover {
          background: linear-gradient(135deg, #6D28D9, #5B21B6);
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(109, 40, 217, 0.45);
        }
        
        .empty-state-box {
          border: 2px dashed #374151;
          border-radius: 1rem;
          padding: 2.5rem 1rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          background: rgba(31, 41, 55, 0.2);
        }
        .empty-icon { font-size: 1.5rem; }
        .empty-text { color: #9CA3AF; font-size: 0.9rem; margin: 0; }
        
        /* ── Data List Items ── */
        .data-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .data-item {
          background: #151828;
          border: 1px solid #2A2F45;
          border-radius: 1rem;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          transition: transform 0.2s, border-color 0.2s;
        }
        .data-item:hover {
          transform: translateY(-2px);
          border-color: #4B5563;
        }
        .data-item-content { flex: 1; }
        .data-item-title {
          font-size: 1.05rem;
          font-weight: 700;
          color: #F9FAFB;
          margin: 0 0 0.4rem 0;
        }
        .data-item-desc {
          font-size: 0.9rem;
          color: #9CA3AF;
          line-height: 1.5;
          margin: 0;
        }
        .data-item-actions {
          display: flex;
          gap: 0.25rem;
          margin-left: 1rem;
        }
        .action-icon-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.95rem;
          color: #6B7280;
          transition: background 0.18s ease, color 0.18s ease;
          padding: 0;
        }
        .action-icon-btn.edit:hover { background: rgba(156, 163, 175, 0.18); color: #D1D5DB; }
        .action-icon-btn.delete:hover { background: rgba(239, 68, 68, 0.15); color: #F87171; }
        
        .pagination-container {
          display: flex;
          justify-content: center;
          gap: 1rem;
          align-items: center;
          margin-top: 1rem;
        }
        .page-btn {
          width: 32px; height: 32px; border-radius: 50%;
          background: #1F2937; color: white; border: none;
          font-weight: bold; cursor: pointer; transition: 0.2s;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; padding: 0; padding-bottom: 2px;
          user-select: none; outline: none; -webkit-user-select: none;
        }
        .page-btn:hover:not(:disabled) { background: #3B82F6; }
        .page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* ── Finalize Section ── */
        .finalize-container {
          margin-top: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .finalize-btn {
          width: 100%;
          background: #FFFFFF;
          color: #000000;
          padding: 1rem;
          border-radius: 999px;
          font-size: 1rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
        }
        .finalize-btn:hover {
          background: #F3F4F6;
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(255, 255, 255, 0.15);
        }
        .security-note {
          text-align: center;
          font-size: 0.7rem;
          letter-spacing: 0.05em;
          color: #6B7280;
          margin-top: 1rem;
          font-weight: 700;
        }
        .finalize-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }
        .finalize-spinner {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(0,0,0,0.2);
          border-left-color: #000;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
          flex-shrink: 0;
        }
        .save-success-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.6rem 1.25rem;
          border-radius: 999px;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.35);
          color: #34D399;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          animation: fadeIn 0.3s ease;
        }
        .save-error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1rem;
          padding: 0.6rem 1.25rem;
          border-radius: 999px;
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #F87171;
          font-size: 0.85rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          animation: fadeIn 0.3s ease;
        }

        /* ── Modals (Edit & Delete) ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(10, 12, 22, 0.85);
          display: flex; align-items: center; justify-content: center;
          padding: 1.5rem; z-index: 70; animation: fadeIn 0.2s ease;
        }
        .modal-card {
          background: #151828; border: 1px solid #2A2F45;
          border-radius: 1.25rem; padding: 1.75rem; width: 100%; max-width: 420px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
        }
        .modal-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: 1.5rem;
        }
        .modal-title { margin: 0; color: #F9FAFB; font-size: 1.15rem; font-weight: 700; }
        .modal-close {
          background: transparent; border: none; color: #6B7280; cursor: pointer;
          font-size: 1.5rem; line-height: 1; transition: color 0.15s;
        }
        .modal-close:hover { color: #E5E7EB; }
        
        .modal-body-warn {
          display: flex; align-items: flex-start; gap: 0.85rem;
          background: rgba(239, 68, 68, 0.07); border: 1px solid rgba(239, 68, 68, 0.18);
          border-radius: 0.75rem; padding: 1rem 1.1rem; margin-bottom: 1.5rem;
        }
        .modal-body-warn p { margin: 0; color: #D1D5DB; font-size: 0.88rem; line-height: 1.55; }
        
        .modal-actions {
          display: flex; justify-content: flex-end; gap: 0.75rem; align-items: center;
        }
        .modal-btn-cancel {
          background: transparent; border: none; color: #9CA3AF;
          font-size: 0.9rem; font-weight: 600; cursor: pointer;
          padding: 0.55rem 1rem; border-radius: 999px; transition: color 0.15s;
        }
        .modal-btn-cancel:hover { color: #FFFFFF; }
        .modal-btn-save {
          background: linear-gradient(135deg, #7C3AED, #6D28D9); color: white;
          border: none; font-size: 0.9rem; font-weight: 700; cursor: pointer;
          padding: 0.6rem 1.35rem; border-radius: 999px; transition: 0.2s;
        }
        .modal-btn-save:hover:not(:disabled) {
          background: linear-gradient(135deg, #6D28D9, #5B21B6); transform: translateY(-1px);
        }
        .modal-btn-delete {
          background: linear-gradient(135deg, #DC2626, #B91C1C); color: white;
          border: none; font-size: 0.9rem; font-weight: 700; cursor: pointer;
          padding: 0.6rem 1.35rem; border-radius: 999px; transition: 0.2s;
        }
        .modal-btn-delete:hover {
          background: linear-gradient(135deg, #B91C1C, #991B1B); transform: translateY(-1px);
        }

        .social-icons-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 1.25rem;
          padding: 1rem 0 1.25rem 0;
          border-top: 1px solid rgba(255,255,255,0.06);
          margin-top: 0.5rem;
        }
        .social-icon-link {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.4rem;
          height: 2.4rem;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          transition: all 0.2s;
          text-decoration: none;
        }
        .social-icon-link--active {
          color: #E5E7EB;
          cursor: pointer;
        }
        .social-icon-link--active:hover {
          background: rgba(255,255,255,0.12);
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.2);
        }
        .social-icon-link--disabled {
          color: #374151;
          cursor: default;
          opacity: 0.4;
        }

        /* ── Crop Modal ── */
        .crop-modal-card {
          background: #151828; border: 1px solid #2A2F45;
          border-radius: 1.25rem; padding: 1.75rem; width: 100%; max-width: 500px;
          box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6);
          position: relative;
        }
        .crop-container {
          position: relative;
          width: 100%;
          height: 300px;
          background: #0A0C10;
          border-radius: 0.75rem;
          overflow: hidden;
          margin-bottom: 1.5rem;
        }
        .crop-controls {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }
        .crop-controls input[type="range"] {
          flex: 1;
        }
        .crop-modal-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
        }
        .crop-btn-save, .crop-btn-remove, .crop-btn-new {
          flex: 1; 
          padding: 0.6rem 0.25rem; 
          border-radius: 0.5rem;
          font-weight: 600; 
          cursor: pointer; 
          transition: 0.2s;
          font-size: 0.85rem;
          text-align: center;
          display: flex;
          justify-content: center;
          align-items: center;
          white-space: nowrap;
        }
        .crop-btn-save { background: #3B82F6; color: #FFF; border: none; }
        .crop-btn-save:hover:not(:disabled) { background: #2563EB; }
        .crop-btn-remove { background: rgba(239, 68, 68, 0.1); color: #EF4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .crop-btn-remove:hover:not(:disabled) { background: rgba(239, 68, 68, 0.2); }
        .crop-btn-new { background: #1F2937; color: #E5E7EB; border: 1px solid #374151; }
        .crop-btn-new:hover:not(:disabled) { background: #374151; }

        .online-presence-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 1rem;
        }
        @media (max-width: 640px) {
          .online-presence-grid {
            grid-template-columns: 1fr;
          }
        }
        .online-presence-hint {
          font-size: 0.78rem;
          color: #4B5563;
          font-style: italic;
          text-align: center;
          margin: 0.75rem 0 0 0;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .page-loader-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(10, 11, 16, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .page-loader-spinner {
          width: 3.5rem;
          height: 3.5rem;
          border: 4px solid rgba(139, 92, 246, 0.2);
          border-left-color: #8B5CF6;
          border-radius: 50%;
          animation: spin 0.9s linear infinite;
        }
        `}
      </style>
      <Navbar />
      {/* Page-level loader — only shown after auth resolves, so it never overlaps the global auth spinner */}
      {!authLoading && loading && (
        <div className="page-loader-overlay">
          <div className="page-loader-spinner" />
        </div>
      )}
      <animated.div style={fade} className="container">
        <div className="main-layout">

          {/* ── Left Panel ── */}
          <div className="left-panel">
            <div className="profile-card">
              <div
                className="profile-picture"
                onClick={handleProfilePictureClick}
                style={{ cursor: isUploadingPicture ? 'not-allowed' : 'pointer', position: 'relative' }}
              >
                <div className="profile-picture-inner">
                  {isUploadingPicture ? (
                    <span className="finalize-spinner" style={{ borderColor: 'rgba(255,255,255,0.2)', borderLeftColor: '#fff', width: '2rem', height: '2rem' }} />
                  ) : profilePicture ? (
                    <img
                      src={resolveMediaUrl(profilePicture)}
                      alt="Profile"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        setProfilePicture(null); // Fallback to initials if image fails to load
                      }}
                    />
                  ) : (
                    user?.username?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>
                {!isUploadingPicture && (
                  <div className="edit-plus-badge" title="Change Profile Picture">+</div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  style={{ display: 'none' }}
                />
              </div>
              <h2 className="profile-name" style={{ marginBottom: '4px' }}>{savedFullName || user?.username || 'Unknown User'}</h2>
              <div className="username-role-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
                <span className="username-text" style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>@{user?.username}</span>
                <span className="bullet-separator" style={{ color: '#4B5563', fontSize: '0.8rem' }}>•</span>
                <div className="role-badge" style={{ margin: 0 }}>{user?.role || 'MEMBER'}</div>
              </div>
              <div className="profile-desc">
                <span className="bio-text">
                  {profileDescription === null
                    ? (user ? `${user.username} is a ${user.role} on our platform.` : 'No user information available.')
                    : profileDescription || (user ? `${user.username} is a ${user.role} on our platform.` : 'No user information available.')}
                </span>
                <button type="button" className="desc-edit-btn" title="Edit description" onClick={() => handleEditItem('profile_description', 0)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>

              <div className="profile-stats-list">
                <div className="stat-item">
                  <span className="stat-icon" style={{ color: '#60A5FA', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  {user?.email || 'No email provided'}
                </div>
                <div className="stat-item">
                  <span className="stat-icon" style={{ color: '#F59E0B', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span>
                  {experiences.length} Experiences
                </div>
                <div className="stat-item">
                  <span className="stat-icon" style={{ color: '#10B981', display: 'flex', alignItems: 'center' }}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </span>
                  Verified Member
                </div>
                {isStudent() && (
                  <div className="stat-item">
                    <span className="stat-icon">📝</span> {profileStats.applications_submitted || 0} Applications
                  </div>
                )}
                {isEntrepreneur() && (
                  <div className="stat-item">
                    <span className="stat-icon">🚀</span> {profileStats.startups_created || 0} Startups
                  </div>
                )}
                {isInvestor() && (
                  <div className="stat-item">
                    <span className="stat-icon">⭐</span> {profileStats.favorites_count || 0} Favorites
                  </div>
                )}
              </div>

              {/* Social / Online Presence Icons */}
              <div className="social-icons-row">
                {githubUrl ? (
                  <a href={githubUrl.startsWith('http') ? githubUrl : `https://${githubUrl}`} target="_blank" rel="noopener noreferrer" className="social-icon-link social-icon-link--active" title="GitHub">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                  </a>
                ) : (
                  <span className="social-icon-link social-icon-link--disabled" title="Add your GitHub link">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                  </span>
                )}
                {linkedinUrl ? (
                  <a href={linkedinUrl.startsWith('http') ? linkedinUrl : `https://${linkedinUrl}`} target="_blank" rel="noopener noreferrer" className="social-icon-link social-icon-link--active" title="LinkedIn" style={{ color: '#0A66C2' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </a>
                ) : (
                  <span className="social-icon-link social-icon-link--disabled" title="Add your LinkedIn link">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                  </span>
                )}
                {portfolioUrl ? (
                  <a href={portfolioUrl.startsWith('http') ? portfolioUrl : `https://${portfolioUrl}`} target="_blank" rel="noopener noreferrer" className="social-icon-link social-icon-link--active" title="Portfolio" style={{ color: '#10B981' }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                  </a>
                ) : (
                  <span className="social-icon-link social-icon-link--disabled" title="Add your portfolio link">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                  </span>
                )}
              </div>

              <button className="logout-btn-bottom" onClick={logout}>
                Logout
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
              </button>
            </div>

            <div className="pro-tip-card">
              <div className="pro-tip-icon">✨</div>
              <h4 className="pro-tip-title">Pro Tip</h4>
              <p className="pro-tip-text">Did you know? Complete profiles get 3x more visibility on the platform and connect with better opportunities.</p>
            </div>
          </div>

          {/* ── Top Right Absolute Actions ── */}
          <div className="top-actions-wrapper">
            <div className="visibility-pill">
              <div className="vp-left">
                <span className={`public-visibility-icon ${isProfilePublic ? 'active' : ''}`}>🌐</span>
                PUBLIC VISIBILITY
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={isProfilePublic} onChange={handleToggle} />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="right-panel">

            {/* Personal Information Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#8B5CF6' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
              </div>
              <div className="collection-form">
                <div className="form-field">
                  <label>FULL NAME</label>
                  <input
                    type="text"
                    className="collection-input"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="E.g. Ahsan Ali"
                  />
                </div>
                <div className="location-grid">
                  <div className="form-field">
                    <label>COUNTRY</label>
                    <Select
                      options={Country.getAllCountries().map(c => ({ value: c.name, label: c.name, isoCode: c.isoCode }))}
                      value={country ? { value: country, label: country } : null}
                      onChange={option => {
                        setCountry(option ? option.value : '');
                        setCity('');
                      }}
                      styles={customSelectStyles}
                      menuPlacement="bottom"
                      placeholder="Select Country"
                      isSearchable={false}
                      isClearable
                    />
                  </div>
                  <div className="form-field">
                    <label>CITY</label>
                    <Select
                      options={
                        country && Country.getAllCountries().find(c => c.name === country)
                          ? City.getCitiesOfCountry(Country.getAllCountries().find(c => c.name === country).isoCode).map(c => ({ value: c.name, label: c.name }))
                          : []
                      }
                      value={city ? { value: city, label: city } : null}
                      onChange={option => setCity(option ? option.value : '')}
                      styles={customSelectStyles}
                      menuPlacement="bottom"
                      placeholder="Select City"
                      isDisabled={!country}
                      isSearchable={false}
                      isClearable
                    />
                  </div>
                </div>
                <p className="online-presence-hint" style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                  Your location and full name are used for networking and establishing local presence.
                </p>
              </div>
            </div>

            {/* Online Presence Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#3B82F6' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Online Presence
                </h3>
              </div>
              <div className="collection-form">
                <div className="online-presence-grid">
                  <div className="form-field">
                    <label>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                      GITHUB
                    </label>
                    <input
                      type="text"
                      className="collection-input"
                      value={githubUrl}
                      onChange={e => setGithubUrl(e.target.value)}
                      placeholder="github.com/username"
                    />
                  </div>
                  <div className="form-field">
                    <label>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style={{ marginRight: '4px', verticalAlign: 'middle' }}><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                      LINKEDIN
                    </label>
                    <input
                      type="text"
                      className="collection-input"
                      value={linkedinUrl}
                      onChange={e => setLinkedinUrl(e.target.value)}
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                  <div className="form-field">
                    <label>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                      PORTFOLIO
                    </label>
                    <input
                      type="text"
                      className="collection-input"
                      value={portfolioUrl}
                      onChange={e => setPortfolioUrl(e.target.value)}
                      placeholder="yourwebsite.com"
                    />
                  </div>
                </div>
                <p className="online-presence-hint">Social links are optional and help partners verify your identity and background.</p>
              </div>
            </div>

            {/* Top Skills Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#A855F7' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Top Skills
                </h3>
              </div>
              <div className="collection-form">
                <div className="form-row">
                  <div className="form-field">
                    <label>Skill Name</label>
                    <input
                      type="text"
                      className="collection-input"
                      placeholder="e.g., Python Architecture"
                      value={newReference.title}
                      onChange={(e) => handleNewItemChange('references', 'title', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Description</label>
                    <input
                      type="text"
                      className="collection-input"
                      placeholder="Briefly describe your expertise"
                      value={newReference.description}
                      onChange={(e) => handleNewItemChange('references', 'description', e.target.value)}
                    />
                  </div>
                </div>
                <button className="add-button-full" onClick={() => handleAddItem('references')}>
                  + Add New Skill
                </button>
              </div>

              {references.length > 0 ? (
                <div className="data-list">
                  {referencesPaginated.map((item, index) => {
                    const globalIndex = (referencesPage - 1) * PAGE_SIZE + index;
                    return (
                      <div className="data-item" key={globalIndex}>
                        <div className="data-item-content">
                          <h4 className="data-item-title">{item.title}</h4>
                          <p className="data-item-desc">{item.description}</p>
                        </div>
                        <div className="data-item-actions">
                          <button className="action-icon-btn edit" title="Edit" onClick={() => handleEditItem('references', globalIndex)}>✏️</button>
                          <button className="action-icon-btn delete" title="Delete" onClick={() => openDeleteConfirm('references', globalIndex)}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                  {renderPagination(referencesPage, setReferencesPage, references.length)}
                </div>
              ) : (
                <div className="empty-state-box">
                  <span className="empty-icon">✨</span>
                  <p className="empty-text">No entries yet. Add one above.</p>
                </div>
              )}
            </div>

            {/* Skills & Hobbies Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#EC4899' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  Skills & Hobbies
                </h3>
              </div>
              <div className="collection-form">
                <div className="form-row">
                  <div className="form-field">
                    <label>Name</label>
                    <input
                      type="text"
                      className="collection-input"
                      placeholder="e.g., UI Design, Photography"
                      value={newSkill.title}
                      onChange={(e) => handleNewItemChange('skills', 'title', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Description</label>
                    <input
                      type="text"
                      className="collection-input"
                      placeholder="Share details about this skill or hobby"
                      value={newSkill.description}
                      onChange={(e) => handleNewItemChange('skills', 'description', e.target.value)}
                    />
                  </div>
                </div>
                <button className="add-button-full" onClick={() => handleAddItem('skills')}>
                  + Add Hobby Entry
                </button>
              </div>

              {skills.length > 0 ? (
                <div className="data-list">
                  {skillsPaginated.map((item, index) => {
                    const globalIndex = (skillsPage - 1) * PAGE_SIZE + index;
                    return (
                      <div className="data-item" key={globalIndex}>
                        <div className="data-item-content">
                          <h4 className="data-item-title">{item.title}</h4>
                          <p className="data-item-desc">{item.description}</p>
                        </div>
                        <div className="data-item-actions">
                          <button className="action-icon-btn edit" title="Edit" onClick={() => handleEditItem('skills', globalIndex)}>✏️</button>
                          <button className="action-icon-btn delete" title="Delete" onClick={() => openDeleteConfirm('skills', globalIndex)}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                  {renderPagination(skillsPage, setSkillsPage, skills.length)}
                </div>
              ) : (
                <div className="empty-state-box">
                  <span className="empty-icon">✨</span>
                  <p className="empty-text">No entries yet. Add one above.</p>
                </div>
              )}
            </div>

            {/* Business Experience Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#F59E0B' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Experience
                </h3>
              </div>
              <div className="collection-form">
                <div className="form-row">
                  <div className="form-field">
                    <label>Company / Role</label>
                    <input
                      type="text"
                      className="collection-input"
                      placeholder="e.g., Product Manager at StartupX"
                      value={newExperience.title}
                      onChange={(e) => handleNewItemChange('experiences', 'title', e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label>Description</label>
                    <input
                      type="text"
                      className="collection-input"
                      placeholder="Summarize your responsibilities"
                      value={newExperience.description}
                      onChange={(e) => handleNewItemChange('experiences', 'description', e.target.value)}
                    />
                  </div>
                </div>
                <button className="add-button-full" onClick={() => handleAddItem('experiences')}>
                  + Add Experience
                </button>
              </div>

              {experiences.length > 0 ? (
                <div className="data-list">
                  {experiencesPaginated.map((item, index) => {
                    const globalIndex = (experiencesPage - 1) * PAGE_SIZE + index;
                    return (
                      <div className="data-item" key={globalIndex}>
                        <div className="data-item-content">
                          <h4 className="data-item-title">{item.title}</h4>
                          <p className="data-item-desc">{item.description}</p>
                        </div>
                        <div className="data-item-actions">
                          <button className="action-icon-btn edit" title="Edit" onClick={() => handleEditItem('experiences', globalIndex)}>✏️</button>
                          <button className="action-icon-btn delete" title="Delete" onClick={() => openDeleteConfirm('experiences', globalIndex)}>🗑️</button>
                        </div>
                      </div>
                    );
                  })}
                  {renderPagination(experiencesPage, setExperiencesPage, experiences.length)}
                </div>
              ) : (
                <div className="empty-state-box">
                  <span className="empty-icon">✨</span>
                  <p className="empty-text">No entries yet. Add one above.</p>
                </div>
              )}
            </div>

            <div className="finalize-container">
              <button
                className="finalize-btn"
                onClick={handleSave}
                disabled={isSaving}
                style={{ opacity: isSaving ? 0.8 : 1, cursor: isSaving ? 'not-allowed' : 'pointer' }}
              >
                {isSaving ? (
                  <><span className="finalize-spinner" />Saving...</>
                ) : (
                  'Finalize Profile'
                )}
              </button>
              {bannerState.type === 'success' && (
                <div className="save-success-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  {bannerState.message}
                </div>
              )}
              {bannerState.type === 'error' && (
                <div className="save-error-banner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  {bannerState.message}
                </div>
              )}
              <div className="security-note">ALL CHANGES ARE ENCRYPTED AND SECURE</div>
            </div>
          </div>
        </div>

        {/* ── Modals ── */}
        {editingItem && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-header">
                <h4 className="modal-title">{editingItem.type === 'profile_description' ? 'Edit Bio' : 'Edit Entry'}</h4>
                <button type="button" className="modal-close" onClick={closeEditModal} disabled={isEditSaving}>&times;</button>
              </div>
              {editingItem.type !== 'profile_description' && (
                <div className="form-field" style={{ marginBottom: "1rem" }}>
                  <label>NAME</label>
                  <input
                    type="text"
                    className="collection-input"
                    value={editForm.title}
                    onChange={(e) => handleEditFieldChange('title', e.target.value)}
                    disabled={isEditSaving}
                    autoFocus
                  />
                </div>
              )}
              <div className="form-field" style={{ marginBottom: "1.5rem" }}>
                <label>{editingItem.type === 'profile_description' ? 'BIO / DESCRIPTION' : 'DESCRIPTION'}</label>
                <textarea
                  className="collection-input"
                  style={{ minHeight: "100px", resize: "vertical" }}
                  value={editForm.description}
                  onChange={(e) => handleEditFieldChange('description', e.target.value)}
                  disabled={isEditSaving}
                  autoFocus={editingItem.type === 'profile_description'}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn-cancel" onClick={closeEditModal} disabled={isEditSaving}>Cancel</button>
                <button type="button" className="modal-btn-save" onClick={handleSaveEdit} disabled={isEditSaving}>
                  {isEditSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="modal-card">
              <div className="modal-header">
                <h4 className="modal-title">Confirm Deletion</h4>
                <button type="button" className="modal-close" onClick={() => setDeleteConfirm(null)}>&times;</button>
              </div>
              <div className="modal-body-warn">
                <span style={{ fontSize: "1.3rem", marginTop: "1px" }}>⚠️</span>
                <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button type="button" className="modal-btn-delete" onClick={handleConfirmDelete}>Delete Entry</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Crop Modal ── */}
        {isCropModalOpen && (
          <div className="modal-overlay" role="dialog" aria-modal="true">
            <div className="crop-modal-card">
              <div className="modal-header">
                <h4 className="modal-title">Adjust Profile Picture</h4>
                <button type="button" className="modal-close" onClick={() => setIsCropModalOpen(false)} disabled={isUploadingPicture}>&times;</button>
              </div>

              {cropError && (
                <div className="save-error-banner" style={{ marginBottom: '1rem', marginTop: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                  <span>{cropError}</span>
                </div>
              )}

              <div className="crop-container">
                <Cropper
                  image={cropImageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="crop-controls">
                <span style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Zoom</span>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(e.target.value)}
                />
              </div>

              <div className="crop-modal-actions">
                <button type="button" className="crop-btn-remove" onClick={handleRemovePicture} disabled={isUploadingPicture}>
                  Remove
                </button>
                <button type="button" className="crop-btn-new" onClick={() => fileInputRef.current?.click()} disabled={isUploadingPicture}>
                  Upload New
                </button>
                <button type="button" className="crop-btn-save" onClick={handleCropSave} disabled={isUploadingPicture}>
                  {isUploadingPicture ? <><span className="finalize-spinner" style={{ width: '1rem', height: '1rem', borderColor: 'rgba(255,255,255,0.2)', borderLeftColor: '#fff', marginRight: '0.4rem' }} /> Saving</> : 'Save & Upload'}
                </button>
              </div>
            </div>
          </div>
        )}

      </animated.div>
    </>
  );
};

export default App;
