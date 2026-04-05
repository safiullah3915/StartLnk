import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSpring, animated } from 'react-spring';
import {Navbar} from "../../components/Navbar/Navbar"
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import { userAPI, applicationAPI } from '../../utils/apiServices';

// This is the main component that renders the settings page.
const App = () => {
  const { user, isStudent, isEntrepreneur, isInvestor, logout } = useAuth();
  const [isProfilePublic, setIsProfilePublic] = useState(false);
  const [profileDescription, setProfileDescription] = useState('');
  const [references, setReferences] = useState([]);
  const [skills, setSkills] = useState([]);
  const [experiences, setExperiences] = useState([]);
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
      
      // Update profile state
      if (data.profile) {
        setIsProfilePublic(data.profile.is_public || false);
        setProfileDescription(data.profile.bio || data.profile.description || '');
        setSkills(data.profile.skills || []);
        setExperiences(data.profile.experience || []);
        setReferences(data.profile.references || []);
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

  const fade = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration: 500 },
  });

  // Handle the toggle for making the profile public.
  const handleToggle = () => {
    setIsProfilePublic(prev => !prev);
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

  const handleSave = async () => {
    try {
      const profileData = {
        is_public: isProfilePublic,
        bio: profileDescription,
        skills: skills,
        experience: experiences,
        references: references
      };

      await userAPI.updateProfileData(profileData);
      
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
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

  const handleAddItem = async (type) => {
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

    const newItem = { title: title.trim(), description: description.trim() };

    let updatedReferences = references;
    let updatedSkills = skills;
    let updatedExperiences = experiences;

    try {
    if (type === 'references') {
        updatedReferences = [...references, newItem];
        setReferences(updatedReferences);
        setReferencesPage(Math.ceil(updatedReferences.length / PAGE_SIZE));
        setNewReference({ title: '', description: '' });
    } else if (type === 'skills') {
        updatedSkills = [...skills, newItem];
        setSkills(updatedSkills);
        setSkillsPage(Math.ceil(updatedSkills.length / PAGE_SIZE));
        setNewSkill({ title: '', description: '' });
      } else {
        updatedExperiences = [...experiences, newItem];
        setExperiences(updatedExperiences);
        setExperiencesPage(Math.ceil(updatedExperiences.length / PAGE_SIZE));
        setNewExperience({ title: '', description: '' });
      }

      await persistProfileCollections(updatedReferences, updatedSkills, updatedExperiences);
      toast.success('Entry added successfully');
    } catch (error) {
      console.error('Failed to add entry:', error);
      toast.error('Failed to add entry');
      loadUserData();
    }
  };

  const persistProfileCollections = useCallback(async (updatedReferences, updatedSkills, updatedExperiences) => {
    const payload = {
      is_public: isProfilePublic,
      bio: profileDescription,
      references: updatedReferences,
      skills: updatedSkills,
      experience: updatedExperiences
    };

    await userAPI.updateProfileData(payload);
  }, [isProfilePublic]);

  const openDeleteConfirm = (type, index) => setDeleteConfirm({ type, index });

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    const { type, index } = deleteConfirm;
    setDeleteConfirm(null);
    handleRemoveItem(type, index);
  };

  const handleRemoveItem = async (type, index) => {

    let updatedReferences = references;
    let updatedSkills = skills;
    let updatedExperiences = experiences;

    try {
    if (type === 'references') {
        updatedReferences = references.filter((_, i) => i !== index);
        setReferences(updatedReferences);
        setReferencesPage(prev => Math.min(prev, Math.max(1, Math.ceil(updatedReferences.length / 3))));
    } else if (type === 'skills') {
        updatedSkills = skills.filter((_, i) => i !== index);
        setSkills(updatedSkills);
        setSkillsPage(prev => Math.min(prev, Math.max(1, Math.ceil(updatedSkills.length / 3))));
      } else {
        updatedExperiences = experiences.filter((_, i) => i !== index);
        setExperiences(updatedExperiences);
        setExperiencesPage(prev => Math.min(prev, Math.max(1, Math.ceil(updatedExperiences.length / 3))));
      }

      await persistProfileCollections(updatedReferences, updatedSkills, updatedExperiences);
      toast.success('Entry removed successfully');
    } catch (error) {
      console.error('Failed to remove entry:', error);
      toast.error('Failed to remove entry');
      // Reload the latest data to keep UI in sync with the server
      loadUserData();
    }
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

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!editingItem) return;

    const title = editForm.title.trim();
    const description = editForm.description.trim();

    if (!title || !description) {
      toast.error('Both fields are required.');
      return;
    }

    setIsEditSaving(true);

    let updatedReferences = references;
    let updatedSkills = skills;
    let updatedExperiences = experiences;

    try {
      if (editingItem.type === 'profile_description') {
        setProfileDescription(description);
        await userAPI.updateProfileData({
          is_public: isProfilePublic,
          bio: description,
          skills: skills,
          experience: experiences,
          references: references
        });
        toast.success('Description updated successfully');
        closeEditModal();
        setIsEditSaving(false);
        return;
      }

      if (editingItem.type === 'references') {
        updatedReferences = references.map((item, i) =>
          i === editingItem.index ? { ...item, title, description } : item
        );
        setReferences(updatedReferences);
      } else if (editingItem.type === 'skills') {
        updatedSkills = skills.map((item, i) =>
          i === editingItem.index ? { ...item, title, description } : item
        );
        setSkills(updatedSkills);
      } else {
        updatedExperiences = experiences.map((item, i) =>
          i === editingItem.index ? { ...item, title, description } : item
        );
        setExperiences(updatedExperiences);
      }

      await persistProfileCollections(updatedReferences, updatedSkills, updatedExperiences);
      toast.success('Entry updated successfully');
      closeEditModal();
    } catch (error) {
      console.error('Failed to update entry:', error);
      toast.error('Failed to update entry');
      loadUserData();
    } finally {
      setIsEditSaving(false);
    }
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
      <div className="table-pagination">
        <button type="button" className="pagination-button" onClick={goPrev} disabled={page === 1}>
          ‹
        </button>
        <span className="pagination-status">{page} / {totalPages}</span>
        <button type="button" className="pagination-button" onClick={goNext} disabled={page === totalPages}>
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
          font-size: 0.85rem;
          line-height: 1.5;
          color: #9CA3AF;
          font-style: italic;
          margin: 0 0 1.5rem 0;
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
          border-radius: 0.5rem !important;
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

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}
      </style>
      <Navbar />
      <animated.div style={fade} className="container">
        <div className="main-layout">
          
          {/* ── Left Panel ── */}
          <div className="left-panel">
            <div className="profile-card">
              <div className="profile-picture">
                <div className="profile-picture-inner">
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="edit-plus-badge" title="Edit Profile Picture">+</div>
              </div>
              <h2 className="profile-name">{user?.username || 'Unknown User'}</h2>
              <div className="role-badge">{user?.role || 'MEMBER'}</div>
              <p className="profile-desc">
                {profileDescription || (user ? `${user.username} is a ${user.role} on our platform.` : 'No user information available.')}
                <button type="button" className="desc-edit-btn" title="Edit description" onClick={() => handleEditItem('profile_description', 0)}>✏️</button>
              </p>
              
              <div className="profile-stats-list">
                <div className="stat-item">
                  <span className="stat-icon" style={{color: '#60A5FA', display: 'flex', alignItems: 'center'}}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span> 
                  {user?.email || 'No email provided'}
                </div>
                <div className="stat-item">
                  <span className="stat-icon" style={{color: '#F59E0B', display: 'flex', alignItems: 'center'}}>
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </span> 
                  {experiences.length} Experiences
                </div>
                <div className="stat-item">
                  <span className="stat-icon" style={{color: '#10B981', display: 'flex', alignItems: 'center'}}>
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
              
              <button className="logout-btn-bottom" onClick={logout}>
                Logout
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-16V6m6 10v-3a4 4 0 00-4 4H7a4 4 0 00-4 4v3" />
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

            {/* Top Skills Section */}
            <div className="form-section">
              <div className="section-header">
                <h3 className="section-title">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: '#A855F7'}}>
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
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: '#EC4899'}}>
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
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{color: '#F59E0B'}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Business Experience
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
               <button className="finalize-btn" onClick={handleSave}>Finalize Profile</button>
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
                <div className="form-field" style={{marginBottom: "1rem"}}>
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
              <div className="form-field" style={{marginBottom: "1.5rem"}}>
                <label>{editingItem.type === 'profile_description' ? 'BIO / DESCRIPTION' : 'DESCRIPTION'}</label>
                <textarea
                  className="collection-input"
                  style={{minHeight: "100px", resize: "vertical"}}
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
                <span style={{fontSize: "1.3rem", marginTop: "1px"}}>⚠️</span>
                <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button type="button" className="modal-btn-cancel" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                <button type="button" className="modal-btn-delete" onClick={handleConfirmDelete}>Delete Entry</button>
              </div>
            </div>
          </div>
        )}

      </animated.div>
    </>
  );
};

export default App;
