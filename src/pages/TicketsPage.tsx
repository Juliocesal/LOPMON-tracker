// src/pages/TicketsPage.tsx
import React from 'react';
import TicketManagement from '../components/tickets';

const TicketsPage: React.FC = () => {
  return (
    <div className="page-container">
      <TicketManagement />
    </div>
  );
};

export default TicketsPage;
