// src/components/LandingPage.jsx
import React from 'react';
import {
  FiTarget, FiCheckSquare, FiLink, FiArchive, FiShield,
  FiHeart, FiUsers, FiTrendingUp,
  FiDollarSign, FiBarChart2, FiGlobe,
  FiExternalLink, FiPlayCircle, FiSearch,
  FiFacebook, FiTwitter, FiLinkedin, FiHelpCircle // Added for footer & brand
} from 'react-icons/fi';

// --- NEW DARK BLUE & WHITE THEME STYLES ---
const styles = {
  // --- Hero Section (Dark Blue Background) ---
  heroSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '100px 5% 80px 5%', // More top padding
    backgroundColor: '#0D253F', // Primary Dark Blue
    color: '#FFFFFF', // White text
    minHeight: 'calc(90vh - 70px)', // Adjust as needed, allow some scroll
    boxSizing: 'border-box',
    flexWrap: 'wrap',
  },
  heroContentWrapper: {
    flex: '1 1 550px',
    maxWidth: '650px',
    textAlign: 'left',
    paddingRight: '40px',
    marginBottom: '40px',
  },
  heroHeadlineBase: { // Base for all headline parts
    fontFamily: "'Montserrat', sans-serif",
    fontWeight: 700,
    lineHeight: 1.1,
    display: 'block', // Each part on a new line
    marginBottom: '10px',
  },
  heroHeadlineMain: { // For "nGoDONATE"
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    color: '#FFFFFF',
  },
  heroHeadlineSecondary: { // For "Amplify Your Impact."
    fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
    color: '#E0E0E0', // Slightly dimmer white
  },
  heroHeadlineAccent: { // For "Transparently."
    fontSize: 'clamp(2.2rem, 4.5vw, 3.2rem)',
    color: '#01B4E4', // Accent Blue
  },
  heroSubheadline: { // Justifying hero subheadline as well
    fontFamily: "'Open Sans', sans-serif",
    fontSize: 'clamp(1rem, 2.5vw, 1.25rem)',
    color: '#C0C0C0', 
    maxWidth: '550px',
    lineHeight: 1.7,
    marginTop: '25px',
    marginBottom: '40px',
    textAlign: 'justify', // Added justification
    textJustify: 'inter-word', // Improves spacing for justify
  },
  heroButtonsContainer: {
    display: 'flex',
    gap: '20px',
    flexWrap: 'wrap',
  },
  ctaButtonBase: {
    fontFamily: "'Montserrat', sans-serif",
    padding: '15px 30px',
    fontSize: '1.05em',
    fontWeight: 600,
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease',
    border: '2px solid transparent',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
  },
  ctaButtonPrimary: { // Accent Blue button
    backgroundColor: '#01B4E4', // Accent Blue
    color: '#FFFFFF', // White text
    borderColor: '#01B4E4',
  },
  ctaButtonPrimaryHover: {
    backgroundColor: '#009BC1', // Darker Accent Blue
    borderColor: '#009BC1',
    boxShadow: '0 4px 15px rgba(1, 180, 228, 0.3)',
    transform: 'translateY(-2px)',
  },
  ctaButtonSecondary: { // White outline button (on dark bg)
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  ctaButtonSecondaryHover: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Slight white overlay
    boxShadow: '0 4px 15px rgba(255, 255, 255, 0.1)',
    transform: 'translateY(-2px)',
  },
  heroImageContainer: {
    flex: '1 1 400px',
    maxWidth: '500px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: '120%',
    height: 'auto',
    maxHeight: '450px',
    objectFit: 'contain',
    borderRadius: '8px',
    // Example: Add a subtle glow or border to image if on dark background
    // boxShadow: '0 0 25px rgba(1, 180, 228, 0.2)',
  },

  // --- Stats Section (Light Blue-Gray Background) ---
  statsSection: {
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'stretch',
    flexWrap: 'wrap',
    padding: '70px 5%',
    backgroundColor: '#F0F4F8', // Very Light Blue-Gray
    borderBottom: '1px solid #D1D9E0', // Slightly darker border
  },
  statWidget: {
    textAlign: 'center',
    padding: '30px',
    minWidth: '200px',
    flex: '1 1 200px',
    margin: '10px',
    borderRadius: '8px',
    backgroundColor: '#FFFFFF', // White widgets
    boxShadow: '0 4px 12px rgba(13, 37, 63, 0.06)', // Softer shadow
  },
  statIcon: { fontSize: '2.8em', color: '#01B4E4', marginBottom: '15px' }, // Accent Blue
  statValue: { fontFamily: "'Montserrat', sans-serif", fontSize: '2.1em', fontWeight: 'bold', color: '#0D253F', margin: '5px 0' }, // Dark Blue
  statLabel: { fontSize: '1em', color: '#34495E' }, // Dark Slate Gray

  // --- Content Sections (Alternating White and Light Blue-Gray) ---
  contentSection: {
    padding: '80px 5%',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  sectionHeading: {
    fontFamily: "'Montserrat', sans-serif",
    fontSize: 'clamp(2rem, 4.5vw, 2.6rem)',
    fontWeight: 600,
    color: '#0D253F', // Dark Blue
    textAlign: 'center',
    marginBottom: '60px',
    position: 'relative',
  },
  sectionHeadingAfter: {
    content: "''", display: 'block', width: '80px', height: '4px',
    backgroundColor: '#01B4E4', margin: '15px auto 0', borderRadius: '2px', // Accent Blue
  },
  paragraph: {
    fontSize: 'clamp(1rem, 2.5vw, 1.15rem)', color: '#34495E',
    marginBottom: '20px', 
    lineHeight: 1.7,
    maxWidth: '800px', margin: '0 auto 20px auto',
    textAlign: 'justify', // Added justification
    textJustify: 'inter-word', // Improves spacing for justify
  },

  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '35px', // Slightly more gap
    marginTop: '30px',
  },
  card: {
    backgroundColor: '#FFFFFF', padding: '35px', borderRadius: '10px', // Slightly larger padding/radius
    boxShadow: '0 6px 25px rgba(13, 37, 63, 0.08)', // Softer, slightly larger shadow
    transition: 'transform 0.3s ease, box-shadow 0.3s ease',
    display: 'flex', flexDirection: 'column',
  },
  cardHover: { transform: 'translateY(-6px)', boxShadow: '0 10px 30px rgba(13, 37, 63, 0.12)' },
  cardIconContainer: {
    fontSize: '2.2em', color: '#01B4E4', marginBottom: '20px', // Accent Blue
    width: '60px', height: '60px', borderRadius: '50%',
    backgroundColor: 'rgba(1, 180, 228, 0.1)', // Lighter Accent Blue background
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontFamily: "'Montserrat', sans-serif", fontSize: '1.5em', fontWeight: 600, color: '#0D253F', marginBottom: '15px' }, // Dark Blue
cardText: { 
    fontSize: '1em', color: '#34495E', flexGrow: 1, lineHeight: 1.65,
    textAlign: 'justify', // Added justification
    textJustify: 'inter-word', // Improves spacing for justify
  },
  xrplLink: { color: '#01B4E4', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center' },
  xrplLinkIcon: { marginLeft: '5px' },

  // --- Updated Footer ---
  footer: {
    padding: '40px 5% 30px 5%', // Adjusted padding
    backgroundColor: '#0D253F',
    color: '#E0E0E0',
  },
  footerTopRow: { // New container for the first row (brand & social)
    display: 'flex',
    flexDirection: 'row', // Default, but explicit
    justifyContent: 'space-between', // Pushes brand to left, social to right
    alignItems: 'center',
    maxWidth: '1100px', // Max width for content within footer
    margin: '0 auto 25px auto', // Center it and add bottom margin before copyright
    flexWrap: 'wrap', // Allow wrapping on small screens
    gap: '20px', // Gap for when they wrap
  },
  footerBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px', // Slightly increased gap
    fontFamily: "'Montserrat', sans-serif",
    fontSize: '1.7em', // Slightly smaller for balance
    fontWeight: 'bold',
    color: '#FFFFFF',
    // Removed marginBottom, handled by footerTopRow
  },
  footerBrandIcon: {
    fontSize: '1.4em',
    color: '#01B4E4',
  },
  // footerTagline removed as it wasn't fitting well with the new row structure
  // Can be re-added below brand if desired
  footerSocialLinks: {
    display: 'flex',
    alignItems: 'center', // Align icons vertically with brand if they are on same visual line
    gap: '20px', // Reduced gap for a tighter cluster
    // Removed marginBottom
  },
  socialLink: {
    color: '#FFFFFF',
    fontSize: '1.4em', // Slightly smaller social icons
    transition: 'color 0.2s ease, transform 0.2s ease',
  },
  socialLinkHover: {
    color: '#01B4E4',
    transform: 'scale(1.15)', // Slightly more pop
  },
  footerCopyright: {
    textAlign: 'center', // Ensure copyright is centered
    fontSize: '0.9em',
    color: '#A0A0A0',
    paddingTop: '20px', // Add some space above copyright if footerTopRow is dense
    borderTop: '1px solid rgba(255, 255, 255, 0.1)', // Subtle separator line
    maxWidth: '1100px',
    margin: '0 auto', // Center copyright text block
  },
};

const LandingPage = () => {
  const [hoverStates, setHoverStates] = React.useState({});
  const handleMouseEnter = (key) => setHoverStates(prev => ({ ...prev, [key]: true }));
  const handleMouseLeave = (key) => setHoverStates(prev => ({ ...prev, [key]: false }));

  const statsData = [
    { icon: <FiDollarSign />, value: "1.2M+", label: "Funds Transparently Tracked" },
    { icon: <FiBarChart2 />, value: "500+", label: "Verified Project Milestones" },
    { icon: <FiGlobe />, value: "75+", label: "Supported Initiatives" },
    { icon: <FiHeart />, value: "10K+", label: "Impacted Beneficiaries" },
  ];

  const keyFeatures = [
    { icon: <FiTarget />, title: "Milestone-Based Escrow", description: "Donations are held in smart contracts on the XRPL and released only upon the successful completion of predefined project milestones." },
    { icon: <FiCheckSquare />, title: "Witness Chaining Verification", description: (<>Each milestone completion is verified through a decentralized network of witness servers... Learn more at{' '} <a href="https://xrpl.org" target="_blank" rel="noopener noreferrer" style={styles.xrplLink}>xrpl.org <FiExternalLink style={styles.xrplLinkIcon} /></a>.</>) },
    { icon: <FiLink />, title: "On-Chain Transparency", description: "All transactions, including fund releases and milestone verifications, are recorded on the XRPL..." },
    { icon: <FiArchive />, title: "Decentralized Storage", description: "Supporting documents... are stored on decentralized platforms like IPFS..." },
    { icon: <FiShield />, title: "Regulatory Compliance", description: "The system is designed to align with regulatory frameworks..." },
  ];

  const benefits = [
    { icon: <FiHeart />, title: "Enhanced Donor Trust", description: "By providing transparent, verifiable records of fund usage, donors can be confident..." },
    { icon: <FiUsers />, title: "Improved Accountability", description: "NGOs are incentivized to meet project milestones efficiently..." },
    { icon: <FiTrendingUp />, title: "Scalable Solution", description: "The integration of XRPL and witness chaining offers a scalable model..." },
  ];

  statsData.map((_, index) => { // Initialize hover states for stats
    if (!hoverStates[`stat-${index}`]) hoverStates[`stat-${index}`] = false;
  });
  keyFeatures.map((_, index) => { // Initialize hover states for features
    if (!hoverStates[`feature-${index}`]) hoverStates[`feature-${index}`] = false;
  });
  benefits.map((_, index) => { // Initialize hover states for benefits
    if (!hoverStates[`benefit-${index}`]) hoverStates[`benefit-${index}`] = false;
  });


  return (
    <div>
      <section style={styles.heroSection}>
        <div style={styles.heroContentWrapper}>
          {/* Headline broken into parts */}
          <h1 style={{ marginBottom: styles.heroHeadlineMain.marginBottom }}> {/* Outer h1 for semantics */}
            <span style={{...styles.heroHeadlineBase, ...styles.heroHeadlineMain}}>nGoDONATE:</span>
            <span style={{...styles.heroHeadlineBase, ...styles.heroHeadlineSecondary}}>Amplify Your Impact.</span>
            <span style={{...styles.heroHeadlineBase, ...styles.heroHeadlineAccent}}>Transparently.</span>
          </h1>
          <p style={styles.heroSubheadline}>
            Experience the future of charitable giving. nGoDONATE connects you directly to causes,
            powered by the XRP Ledger for unparalleled transparency and accountability.
          </p>
          <div style={styles.heroButtonsContainer}>
            <a href="/login" style={{...styles.ctaButtonBase, ...styles.ctaButtonPrimary, ...(hoverStates.demo ? styles.ctaButtonPrimaryHover : {})}}
               onMouseEnter={() => handleMouseEnter('demo')} onMouseLeave={() => handleMouseLeave('demo')}>
              <FiPlayCircle /> Try it out!
            </a>
          </div>
        </div>
        <div style={styles.heroImageContainer}>
          <img src="/poor_people.jpg"
               alt="nGoDONATE Platform Interface" style={styles.heroImage} />
        </div>
      </section>

      <section style={styles.statsSection}>
        {statsData.map((stat, index) => (
          <div key={index} style={styles.statWidget}
               onMouseEnter={() => handleMouseEnter(`stat-${index}`)}
               onMouseLeave={() => handleMouseLeave(`stat-${index}`)}>
            <div style={styles.statIcon}>{stat.icon}</div>
            <div style={styles.statValue}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </section>

      <section id="learn-more" style={{ ...styles.contentSection, backgroundColor: '#FFFFFF'}}>
        <h2 style={styles.sectionHeading}>Project Overview<div style={styles.sectionHeadingAfter}></div></h2>
        <p style={styles.paragraph}>
          nGoDONATE is designed to revolutionize NGO funding by integrating the XRP Ledger (XRPL)
          with a milestone-based escrow system, utilizing witness chaining for verification. We aim to create a
          trustworthy ecosystem where donors can confidently contribute, knowing their funds are managed and
          disbursed with utmost accountability and real-time visibility.
        </p>
      </section>

      <section style={{ ...styles.contentSection, backgroundColor: '#F0F4F8' }}> {/* Light Blue-Gray */}
        <h2 style={styles.sectionHeading}>Key Features<div style={styles.sectionHeadingAfter}></div></h2>
        <div style={styles.gridContainer}>
          {keyFeatures.map((feature, index) => (
            <div key={index} style={{ ...styles.card, ...(hoverStates[`feature-${index}`] ? styles.cardHover : {}) }}
                 onMouseEnter={() => handleMouseEnter(`feature-${index}`)}
                 onMouseLeave={() => handleMouseLeave(`feature-${index}`)}>
              <div style={styles.cardIconContainer}>{feature.icon}</div>
              <h3 style={styles.cardTitle}>{feature.title}</h3>
              <p style={styles.cardText}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...styles.contentSection, backgroundColor: '#FFFFFF' }}>
        <h2 style={styles.sectionHeading}>Benefits<div style={styles.sectionHeadingAfter}></div></h2>
        <div style={styles.gridContainer}>
          {benefits.map((benefit, index) => (
            <div key={index} style={{ ...styles.card, ...(hoverStates[`benefit-${index}`] ? styles.cardHover : {}) }}
                 onMouseEnter={() => handleMouseEnter(`benefit-${index}`)}
                 onMouseLeave={() => handleMouseLeave(`benefit-${index}`)}>
              <div style={styles.cardIconContainer}>{benefit.icon}</div>
              <h3 style={styles.cardTitle}>{benefit.title}</h3>
              <p style={styles.cardText}>{benefit.description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={styles.footer}>
        <div style={styles.footerTopRow}> {/* Container for brand and social links */}
            <div style={styles.footerBrand}>
                <FiHelpCircle style={styles.footerBrandIcon} /> 
                nGoDONATE
            </div>
            <div style={styles.footerSocialLinks}>
                <a href="#" style={styles.socialLink} 
                   onMouseEnter={(e) => { e.currentTarget.style.color = styles.socialLinkHover.color; e.currentTarget.style.transform = styles.socialLinkHover.transform;}} 
                   onMouseLeave={(e) => { e.currentTarget.style.color = styles.socialLink.color; e.currentTarget.style.transform = 'scale(1)';}}>
                   <FiFacebook />
                </a>
                <a href="#" style={styles.socialLink}
                   onMouseEnter={(e) => { e.currentTarget.style.color = styles.socialLinkHover.color; e.currentTarget.style.transform = styles.socialLinkHover.transform;}} 
                   onMouseLeave={(e) => { e.currentTarget.style.color = styles.socialLink.color; e.currentTarget.style.transform = 'scale(1)';}}>
                   <FiTwitter />
                </a>
                <a href="#" style={styles.socialLink}
                   onMouseEnter={(e) => { e.currentTarget.style.color = styles.socialLinkHover.color; e.currentTarget.style.transform = styles.socialLinkHover.transform;}} 
                   onMouseLeave={(e) => { e.currentTarget.style.color = styles.socialLink.color; e.currentTarget.style.transform = 'scale(1)';}}>
                   <FiLinkedin />
                </a>
            </div>
        </div>
        <p style={styles.footerCopyright}>© {new Date().getFullYear()} nGoDONATE. All Rights Reserved. </p>
      </footer>
    </div>
  );
};

export default LandingPage;