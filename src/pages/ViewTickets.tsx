
import React, { useState, useEffect } from 'react';
import Loading from '../components/Loading';

const ViewTickets = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for tickets data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 900);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loading message="Cargando tickets..." />;
  }

  return (
    <div className="section">
      <div className="tickets">
        {/* Existing code for displaying tickets */}
      </div>
    </div>
  );
};

export default ViewTickets;