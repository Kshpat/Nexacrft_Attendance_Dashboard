import React, { useEffect, useState } from 'react';

const NotificationToast = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, 5000); // 5 seconds display

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'missing' ? 'var(--danger-color)' : 'var(--accent-color)';

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: bgColor,
        color: 'white',
        padding: '16px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-20px)',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minWidth: '300px'
      }}
    >
      <span>{message}</span>
      <button 
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', marginLeft: '16px', fontSize: '18px' }}
      >
        &times;
      </button>
    </div>
  );
};

export default NotificationToast;
