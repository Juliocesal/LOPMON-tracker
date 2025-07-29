import { FC } from 'react';
const Header: FC = () => {
  return (
    <header className="top-header">
      <div className="search-bar">
        <input type="text" placeholder="Buscar tickets..." className="search-input" />
        <button className="search-btn"><i className="icon-search"></i></button>
        
      </div>
      <div className="notifications">
        <button className="notification-btn">
          <i className="icon-bell"></i>
          <span className="badge">3</span>
        </button>
      </div>
    </header>
  );
};

export default Header;