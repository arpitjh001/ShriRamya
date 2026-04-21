import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEOMeta = ({ title, description, image, url, type = 'article' }) => {
    const siteName = 'Shri Ramya Heritage';
    const fullTitle = title ? `${title} | ${siteName}` : siteName;
    const defaultDescription = 'Explore the rich heritage, craft, and stories behind Shri Ramya - the ultimate destination for authentic Indian handlooms.';
    const metaDescription = description || defaultDescription;
    const metaImage = image || '/default-seo-image.jpg'; // Placeholder or actual default
    const siteUrl = window.location.origin;
    const fullUrl = url ? `${siteUrl}${url}` : window.location.href;

    return (
        <Helmet>
            {/* Standard metadata */}
            <title>{fullTitle}</title>
            <meta name="description" content={metaDescription} />

            {/* Open Graph / Facebook */}
            <meta property="og:type" content={type} />
            <meta property="og:url" content={fullUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={metaDescription} />
            <meta property="og:image" content={metaImage} />

            {/* Twitter */}
            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content={fullUrl} />
            <meta property="twitter:title" content={fullTitle} />
            <meta property="twitter:description" content={metaDescription} />
            <meta property="twitter:image" content={metaImage} />
        </Helmet>
    );
};

export default SEOMeta;
