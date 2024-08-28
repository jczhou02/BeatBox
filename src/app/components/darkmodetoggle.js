'use client';
import React, { useState } from 'react';
import Switch from 'react-switch';

function ToggleDarkMode() {
  const [checked, setChecked] = useState(false);

  const handleChange = (newChecked) => {
    setChecked(newChecked);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
        checked={checked}
        onChange={handleChange}
        checkedIcon={<div style={{ color: 'white' }}>🌙</div>}
        uncheckedIcon={<div style={{ color: 'black' }}>🌞</div>}
        onColor="#000"  // black for dark
        offColor="#FFB7CC"  
        handleDiameter={24} // Adjust the diameter of the handle
        onHandleColor="#FF3471" // Color of the handle when it's in the "on" state (white)
        offHandleColor="#FF3471" // Color of the handle when it's in the "off" state (white)
      />
      </div>
    </div>
  );
}

export default ToggleDarkMode;
