import {React } from 'react';
import Switch from 'react-switch';
import { useSelector, useDispatch } from 'react-redux';
import { toggleDarkMode } from '../../app/redux/slice/darkModeSlice';

function ToggleDarkMode() {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.darkmode.isDark); 

 const handleChange = (newChecked) => {
    dispatch(toggleDarkMode()); // Toggle dark mode in Redux
    document.body.classList.toggle('dark', newChecked); // Add or remove dark mode class on body
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
        checked={isDarkMode}
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
