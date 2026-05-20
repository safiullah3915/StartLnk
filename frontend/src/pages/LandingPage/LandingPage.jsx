import React from "react";
import SEOHead from "../../components/SEOHead/SEOHead";
import { Navbar } from "../../components/Navbar/Navbar";
import { Footer } from "../../components/Footer/Footer";
import { Link } from "react-router-dom";
import styles from "./LandingPage.module.css"; // Assuming you're using CSS Modules
import { LeftImageRightText } from "../../components/LeftImageRightText/LeftImageRightText";
import { RightTextLeftImage } from "../../components/RightTextLeftImage/RightTextLeftImage";
import { AnimatedStats } from "../../components/AnimatedStats copy/AnimatedStats";
import { Submit } from "../../components/Submit/Submit";

function LandingPage() {
  return (
    <>
      <SEOHead
        title="StartLnk — Startup Collaboration & Opportunities"
        description="Join StartLnk, Pakistan's #1 startup ecosystem. Find co-founders, join startup teams, discover internships, remote jobs, and startup opportunities. Connect with founders and investors."
        canonical="https://startlnk.xyz"
        og={{
          title: "StartLnk — Connect, Collaborate, Build Startups",
          description: "Pakistan's leading startup collaboration platform. Find startup jobs, internships, co-founders, and investors.",
          image: "https://startlnk.xyz/og-default.png",
          type: "website",
          url: "https://startlnk.xyz",
        }}
        twitter={{
          card: "summary_large_image",
          title: "StartLnk — Startup Collaboration & Opportunities",
          description: "Find co-founders, startup internships, and remote jobs.",
        }}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "StartLnk",
            "url": "https://startlnk.xyz",
            "logo": "https://startlnk.xyz/logo.png",
            "description": "Pakistan's leading startup collaboration ecosystem.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": { "@type": "EntryPoint", "urlTemplate": "https://startlnk.xyz/search?q={search_term_string}" },
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Home", "item": "https://startlnk.xyz"}]
          }
        ]}
      />
      <Navbar />

      <div className={styles.home_container}>
        <div className={styles.hero_section}>
          {/* Overlay */}
          <div className={styles.overlay}></div>

          {/* Content */}
          <div className={styles.hero_section_content}>
            <p className={styles.p1}>
              Empowering Startups Through Connection
            </p>
            <p className={styles.p2}>
              Join a vibrant network of entrepreneurs, students, and investors. Build teams, pitch ideas, and collaborate to turn innovation into real ventures.
            </p>

            <div className={styles.button_container}>
              <Link to="/collaboration">
                <button>Join a Startup</button>
              </Link>
              <Link to="/createstartup">
                <button>Upload Startup</button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.secondsec}>
        <img src="./stats.png" alt="" />
      </div>

      <LeftImageRightText />
      <AnimatedStats />
      <RightTextLeftImage />

      <div className={styles.bottombanner}>
        <h1>Join 500k+ founders and buyers already doing business on StartLnk</h1>
        <Link to="/signup" className={styles.joinNowLink}>
          <Submit btn1text={"Join Now"} extraClass={styles.joinNowBtn} />
        </Link>
      </div>

      <Footer />
    </>
  );
}

export { LandingPage };
