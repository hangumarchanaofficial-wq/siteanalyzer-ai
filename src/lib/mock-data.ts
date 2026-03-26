import { AuditResult } from "@/types/audit";

export const mockAuditResult: AuditResult = {
    url: "https://siteinsight.ai/landing",
    timestamp: new Date().toISOString(),
    overallScore: 74,
    status: "live",
    metrics: {
        wordCount: 1432,
        headings: {
            h1: 1,
            h2: 8,
            h3: 14,
        },
        ctaCount: 6,
        links: {
            internal: 23,
            external: 7,
        },
        images: {
            total: 24,
            missingAlt: 6,
            missingAltPercent: 25,
        },
        meta: {
            title: "SiteInsight AI — Web Audits for the Modern Digital Age",
            titleLength: 54,
            description:
                "Deep SEO, content clarity, and UX analysis in seconds. Designed for teams who obsess over the finer details of the user journey.",
            descriptionLength: 126,
            hasOgTags: true,
            hasTwitterCards: false,
        },
        performance: {
            activeClusters: 4,
            engagementScore: 82,
        },
        mediaAssets: 24,
    },
    insights: [
        {
            id: "seo-structure",
            category: "seo",
            title: "SEO Structure",
            score: 78,
            icon: "search",
            summary:
                "The page has a solid foundation with proper heading hierarchy and meta tags, but there are opportunities to improve keyword placement and internal linking depth.",
            details: [
                "Single H1 tag found — good practice maintained",
                "Meta description is 126 characters — within optimal range (120–160)",
                "Missing Twitter Card meta tags — reduces social sharing preview quality",
                "Internal link ratio is healthy at 23:7 (internal:external)",
                "Consider adding structured data (JSON-LD) for rich search results",
            ],
        },
        {
            id: "messaging-clarity",
            category: "messaging",
            title: "Messaging Clarity",
            score: 65,
            icon: "message-circle",
            summary:
                "The core value proposition is distinct but lacks a specific vertical focus. Recommend narrowing the audience segment in the header.",
            details: [
                "Hero headline clearly communicates the product category",
                "Subheadline could be more specific about target audience",
                "Feature descriptions use technical jargon that may alienate non-technical users",
                "CTA copy is generic — 'Get Started' could be more action-specific",
                "Consider A/B testing headline variants for conversion optimization",
            ],
        },
        {
            id: "cta-effectiveness",
            category: "cta",
            title: "CTA Effectiveness",
            score: 71,
            icon: "mouse-pointer-click",
            summary:
                "6 CTAs detected across the page. Primary CTA has good visual prominence but secondary CTAs lack differentiation and strategic placement.",
            details: [
                "Primary CTA uses high-contrast gradient — strong visual weight",
                "Secondary CTAs blend into surrounding content",
                "No urgency or scarcity elements present in CTA copy",
                "CTA placement follows standard F-pattern reading flow",
                "Consider adding a floating/sticky CTA for long-scroll pages",
            ],
        },
        {
            id: "content-depth",
            category: "content",
            title: "Content Depth",
            score: 82,
            icon: "file-text",
            summary:
                "Technical specifications are robust, but transition logic to conversion is missing. Add an 'outcome-first' testimonial block.",
            details: [
                "Word count (1,432) is above average for a landing page",
                "Content covers features, benefits, and social proof sections",
                "Missing customer testimonials or case study references",
                "Technical content is well-structured with clear section breaks",
                "Consider adding comparison tables or ROI calculators",
            ],
        },
        {
            id: "ux-intent",
            category: "ux",
            title: "UX Intent",
            score: 68,
            icon: "layout",
            summary:
                "Navigation hierarchy is slightly congested on small viewports. The primary menu trigger needs 14px more vertical clearance.",
            details: [
                "Mobile hamburger menu has tight tap targets (36px vs recommended 44px)",
                "Page load initiates 24 resource requests — consider lazy loading",
                "Scroll depth analytics suggest drop-off after section 3",
                "Visual hierarchy breaks down below 768px viewport width",
                "Consider implementing progressive disclosure for feature sections",
            ],
        },
        {
            id: "accessibility",
            category: "accessibility",
            title: "Accessibility",
            score: 58,
            icon: "eye",
            summary:
                "6 images are missing alt descriptions. Subheading text fails WCAG 2.1 AA contrast requirements against the dynamic background.",
            details: [
                "25% of images lack descriptive alt attributes",
                "Subheading contrast ratio is 3.8:1 — needs 4.5:1 for AA compliance",
                "Form inputs lack associated label elements",
                "Skip navigation link is not implemented",
                "ARIA landmarks are properly defined on main sections",
            ],
        },
    ],
    recommendations: [
        {
            id: "rec-1",
            title: "Resolve Meta Description Gap",
            priority: "critical",
            category: "SEO",
            explanation:
                "4 out of 12 pages are completely missing meta descriptions. This represents a significant lost opportunity for organic SERP click-through performance.",
            action:
                "Audit all pages using the page inventory export and add unique, keyword-rich meta descriptions between 120–160 characters for each.",
            impact:
                "Estimated 15–25% improvement in organic CTR for affected pages",
        },
        {
            id: "rec-2",
            title: "Hero Typography Contrast Audit",
            priority: "high",
            category: "Accessibility",
            explanation:
                "Subheading text fails WCAG 2.1 AA contrast requirements against the dynamic background. Adjust the overlay opacity by +15% for compliance.",
            action:
                "Update the hero section overlay from rgba(0,0,0,0.3) to rgba(0,0,0,0.55) and re-test with the visual debugger tool.",
            impact:
                "Ensures WCAG 2.1 AA compliance and improves readability for all users",
        },
        {
            id: "rec-3",
            title: "Implement Lazy Loading for Media",
            priority: "high",
            category: "Performance",
            explanation:
                "24 media resources are loaded on initial page render, causing a 2.3s delay in Largest Contentful Paint. Deferring off-screen images will significantly improve load time.",
            action:
                "Add loading='lazy' attribute to all images below the fold and implement Intersection Observer for video assets.",
            impact: "Projected 40% reduction in initial load time (LCP improvement)",
        },
        {
            id: "rec-4",
            title: "Add Structured Data Markup",
            priority: "medium",
            category: "SEO",
            explanation:
                "The page lacks JSON-LD structured data. Adding Organization and WebPage schemas can enable rich snippets in search results.",
            action:
                "Implement JSON-LD schema for Organization, WebPage, and FAQ sections. Validate using Google's Rich Results Test tool.",
            impact:
                "Enables rich search result features and can improve SERP visibility by up to 30%",
        },
        {
            id: "rec-5",
            title: "Optimize Mobile Tap Targets",
            priority: "medium",
            category: "UX",
            explanation:
                "Multiple interactive elements have tap targets smaller than 44x44px on mobile viewports, leading to frustrating mis-taps and reduced conversion rates.",
            action:
                "Increase minimum tap target size to 44x44px for all buttons, links, and form elements. Add 8px minimum spacing between adjacent targets.",
            impact:
                "Reduces mobile interaction errors by approximately 30% and improves mobile conversion path",
        },
    ],
};

export const generateLoadingDelay = (): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, 2800));
};
