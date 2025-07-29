// src/components/Loading.tsx
import React from 'react';
import './Loading.css';

interface LoadingProps {
  message?: string;
  height?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  message = 'Cargando...', 
  height = '100vh' 
}) => {
  return (
    <div className="loading-container" style={{ height }}>
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p>{message}</p>
      </div>
    </div>
  );
};

export default Loading;
