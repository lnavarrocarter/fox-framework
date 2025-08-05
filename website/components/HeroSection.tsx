import React from 'react';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  title,
  subtitle,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
}) => {
  return (
    <div className="bg-fox-dark text-white py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
          {title}
        </h1>
        <p className="text-xl md:text-2xl mb-10 text-gray-200 max-w-3xl mx-auto">
          {subtitle}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={ctaLink}
            className="bg-fox-orange text-white px-8 py-3 rounded-md font-medium text-lg hover:bg-opacity-90 transition-colors duration-200"
          >
            {ctaText}
          </a>
          {secondaryCtaText && secondaryCtaLink && (
            <a
              href={secondaryCtaLink}
              className="bg-transparent border-2 border-white text-white px-8 py-3 rounded-md font-medium text-lg hover:bg-white hover:bg-opacity-10 transition-colors duration-200"
            >
              {secondaryCtaText}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
