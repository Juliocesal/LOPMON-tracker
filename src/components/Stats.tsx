// src/components/Stats.tsx
import React from 'react';

interface StatsProps {
  pending: number;
  open: number;
  closed: number;
}

const Stats: React.FC<StatsProps> = ({ pending, open, closed }) => {
  return (
    <div className="stats">
      <div className="stat">
        <p>Pendiente</p>
        <span className="count pending">{pending}</span>
      </div>
      <div className="stat">
        <p>Abierto</p>
        <span className="count open">{open}</span>
      </div>
      <div className="stat">
        <p>Cerrado</p>
        <span className="count closed">{closed}</span>
      </div>
    </div>
  );
};

export default Stats;