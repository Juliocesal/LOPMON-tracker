import { useState, useEffect } from 'react';

import Loading from '../components/Loading';

const Reports = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time for reports data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loading message="Generando reportes..." />;
  }

  return (
    <div className="section">
      <h1>Reports</h1>
      <p>This is the Reports page.</p>
    </div>
  );
};

export default Reports;