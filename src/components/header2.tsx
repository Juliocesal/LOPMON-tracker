// src/components/Header.tsx
import React from 'react';

interface HeaderProps {
  title: string;
}

 
const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <h1 className="header">{title}</h1>
  );
};

export default Header;