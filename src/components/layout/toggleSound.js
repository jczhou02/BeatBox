import {React } from 'react';
import Switch from 'react-switch';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSound } from '../../app/redux/slice/soundSlice';

function ToggleSound() {
  const dispatch = useDispatch();
  const soundOn = useSelector((state) => state.sound.soundOn); 

 const handleChange = (newChecked) => {
    dispatch(toggleSound()); // Toggle dark mode in Redux
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Switch
        checked={soundOn}
        onChange={handleChange}
        checkedIcon={<div >🔇</div>}
        uncheckedIcon={<div style={{paddingLeft: '4px' }}>🔊</div>}
        onColor="#1001"  // black for dark
        offColor="#0ab701"  
        handleDiameter={30} // Adjust the diameter of the handle
        onHandleColor="#F3471" // Color of the handle when it's in the "on" state (white)
        offHandleColor="#F3471" // Color of the handle when it's in the "off" state (white)
      />
      </div>
    </div>
  );
}

export default ToggleSound;
