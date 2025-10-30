// src/pages/ProjectDisplayPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import styles from '../styles/ProjectsPage.module.css';
import { useAuth } from '../contexts/AuthContext';


const ProjectsGallery = () => {
  const [projects, setProjects] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [selectedOrg, setSelectedOrg] = useState("All"); // ✅ Track selected organisation
  const { currentUserProfile } = useAuth(); // Added loadingAuth

  useEffect(() => {
    const loadProjects = async () => {
      setLoadingProjects(true);
      try {
        const projectsRef = collection(db, "charity_projects");
        const q = query(projectsRef);
        const querySnapshot = await getDocs(q);
        const projectsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProjects(projectsData);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  useEffect(() => {
    if (currentUserProfile?.userType === "nonprofit") {
      setSelectedOrg(currentUserProfile.organizationName || "All");
    }
  }, [currentUserProfile]);


  // ✅ Extract unique organisations from projects
  const organisations = ["All", ...new Set(projects.map((p) => p.ngoName || "Unknown"))];

  // ✅ Filter projects by selected organisation
  const filteredProjects =
    selectedOrg === "All"
      ? projects
      : projects.filter((p) => (p.ngoName || "Unknown") === selectedOrg);

  return (
  <div className={styles.projectsSection}>
      {/* Header / Hero */}
      <div className={styles.heroHeader}>
        <h1 className={styles.heroTitle}>Discover Impact Projects</h1>
        <p className={styles.heroSubtitle}>Browse initiatives and support milestones that matter.</p>
      </div>

      <div className={styles.titleContainer}>
        <h3 className={styles.projectsTitle}>All Projects</h3>
      </div>

      {/* Filter Buttons */}
      {/* only the donor can filter based on organisation */}
      {/* non profits can only see projects of their own organisation */}
      {
        (!currentUserProfile || currentUserProfile.userType === "donor")  && (
          <div className={styles.filterContainer}>
            {organisations.map((org) => (
              <button
                key={org}
                className={`${styles.filterButton} ${selectedOrg === org ? styles.activeFilter : ""}`}
                onClick={() => setSelectedOrg(org)}
              >
                {org}
              </button>
            ))}
          </div>
        )
      }

      {loadingProjects ? (
        <div className={styles.loadingCard}>Loading projects...</div>
      ) : filteredProjects.length > 0 ? (
        <ul className={styles.projectsList}>
          {filteredProjects.map((project) => (
            <li key={project.id} className={styles.projectItem}>
              <Link to={`/projects/${project.id}`} className={styles.projectCard}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.projectName}>{project.name || "Unnamed Project"}</h3>
                    <span className={styles.orgName}>{project.ngoName || "Unknown Organisation"}</span>
                </div>
                <p className={styles.projectDescription}>
                    {project.description || "No description available."}
                </p>
                <div className={styles.cardFooter}>
                  <span className={styles.milestoneBadge}>
                    {Array.isArray(project.milestones) ? project.milestones.length : (project.milestone_count || 0)} Milestones
                  </span>
                  {project.total_amount_eth !== undefined && (
                    <span className={styles.amountBadge}>{project.total_amount_eth} ETH</span>
                  )}
                </div>
                </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🛈</div>
          <h4>No projects found</h4>
          <p>Try changing the organisation filter or check back later.</p>
        </div>
      )}
    </div>
  );
};

export default ProjectsGallery;
