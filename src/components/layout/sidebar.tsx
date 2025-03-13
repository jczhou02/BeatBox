import { useState } from 'react';
import Link from 'next/link'; 
import Image from 'next/image';
import { FaQuestionCircle, FaGamepad, FaChartBar, FaCompactDisc, FaChevronLeft } from 'react-icons/fa'; 
 
export default function Sidebar() { 
  const [isOpen, setIsOpen] = useState(true);
  
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isOpen) {
      e.preventDefault(); // Prevent navigation when sidebar is closed
      toggleSidebar();
    }
    // When sidebar is open, default link behavior occurs (navigation)
  };

  return ( 
    <div className={`bg-[#2a2f31] p-4 flex-shrink-0 transition-all duration-300 ${isOpen ? 'w-40' : 'w-18'}`}> 
      <div className="flex flex-col">
        <ul className="space-y-6 flex-grow"> 
          {/* Logo */} 
          <li className="flex justify-center"> 
            <Link href="/home" onClick={handleLogoClick}> 
              <Image
                src="/beatboxlogofinal_nav.svg"
                alt="BeatBox"
                width={isOpen ? 70 : 40}
                height={isOpen ? 70 : 40}
                className={`transition-transform duration-300 ${!isOpen ? 'hover:rotate-[-10deg] cursor-pointer' : ''}`}
              />
            </Link> 
          </li> 
   
          {/* Nav Items */} 
          <li className="flex items-center"> 
            <Link href="/howto" className="flex items-center text-white hover:text-green-400"> 
              <FaQuestionCircle className={`${isOpen ? 'mr-2' : 'mx-auto'}`} /> 
              {isOpen && <span>How to Play</span>}
            </Link> 
          </li> 
          <li className="flex items-center"> 
            <Link href="/battle" className="flex items-center text-white hover:text-green-400"> 
              <FaGamepad className={`${isOpen ? 'mr-2' : 'mx-auto'}`} /> 
              {isOpen && <span>Battle</span>}
            </Link> 
          </li> 
          <li className="flex items-center"> 
            <Link href="/statistics" className="flex items-center text-white hover:text-green-400"> 
              <FaChartBar className={`${isOpen ? 'mr-2' : 'mx-auto'}`} /> 
              {isOpen && <span>Statistics</span>}
            </Link> 
          </li> 
          <li className="flex items-center"> 
            <Link href="/dabi" className="flex items-center text-white hover:text-green-400"> 
              <FaCompactDisc className={`${isOpen ? 'mr-2' : 'mx-auto'}`} /> 
              {isOpen && <span>Dabi</span>}
            </Link> 
          </li> 
        </ul>
        {isOpen && (
          <button 
            className="text-white self-end mt-6 text-2xl cursor-pointer transition transform duration-300 hover:scale-110 hover:-translate-x-2  hover:text-green-400"
            onClick={toggleSidebar}
          >
            <FaChevronLeft />
          </button>
        )}
      </div>
    </div> 
  ); 
}
