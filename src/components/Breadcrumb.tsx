// src/components/Breadcrumb.tsx
import React from 'react';

interface BreadcrumbProps {
  path: string;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ path }) => {
  return (
    <nav className="breadcrumb">
      <span>{path}</span>
    </nav>
  );
};

export default Breadcrumb;