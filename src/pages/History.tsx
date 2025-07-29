import { useState, useEffect } from 'react';
import Header from '../components/Header';
import Loading from '../components/Loading';

const History = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading historical data
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <Loading message="Cargando historial..." />;
  }

  return (
    <div className="section">
      <Header />
      <h1>History</h1>
      <p>This is the history page.</p>
    </div>
  );
};

export default History;