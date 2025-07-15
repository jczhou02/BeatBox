import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaQuestionCircle, FaGamepad, FaChartBar, FaCompactDisc, FaChevronLeft } from 'react-icons/fa';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // This is the new, "smart" click handler for the sidebar's background.
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // We check if the element that was clicked (`e.target`) is the same as
    // the element that has the event listener (`e.currentTarget`).
    // This is true ONLY when you click the empty background space of the sidebar,
    // not when you click a link, icon, or button inside it.
    if (e.target === e.currentTarget) {
      toggleSidebar();
    }
  };

  // This handler for the logo remains. When the sidebar is closed, clicking the logo
  // should open it instead of navigating away.
  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!isOpen) {
      e.preventDefault(); // Prevent navigation
      toggleSidebar();
    }
  };

  return (
    // We re-add an onClick, but to our new "smart" handler.
    // We use flex-col and h-screen to create a flexible column layout.
    // CUSTOMIZE HERE: `pb-6` adds padding at the bottom, pushing the button up.
    // Change `pb-6` to `pb-4`, `pb-8`, etc., to adjust the button's position.
    <div
      onClick={handleBackgroundClick}
      className={`bg-[#181c1d] h-screen p-4 flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out cursor-pointer ${
        isOpen ? 'w-48' : 'w-20'
      }`}
    >
      {/* Top section with logo and nav links */}
      <div>
        <ul className="space-y-5 mt-3">
          {/* Logo */}
          <li className="mb-9 flex justify-center">
            {/* We make the logo link not have a pointer cursor to avoid confusion with the main background click */}
            <Link href="/home" onClick={handleLogoClick} className="cursor-default">
              <Image
                src="/beatboxlogofinal_nav.svg"
                alt="BeatBox"
                width={isOpen ? 70 : 60}
                height={isOpen ? 70 : 60}
                className={`transition-all duration-300 ease-in-out ${
                  !isOpen ? 'hover:scale-110' : 'hover:scale-110'
                }`}
              />
            </Link>
          </li>

          {/* Nav Items */}
          <NavItem href="/howto" icon={<FaQuestionCircle size={20} />} text="How to Play" isOpen={isOpen} />
          <NavItem href="/battle" icon={<FaGamepad size={20} />} text="Battle" isOpen={isOpen} />
          <NavItem href="/statistics" icon={<FaChartBar size={20} />} text="Statistics" isOpen={isOpen} />
          <NavItem href="/dabi" icon={<FaCompactDisc size={20} />} text="Dabi" isOpen={isOpen} />
        </ul>
      </div>

      {/* Toggle Button Wrapper */}
      {/* THIS IS THE KEY: `mt-auto` pushes this div to the bottom of the flex container, respecting the parent's padding. */}
      <div className="mt-10 text-2xl transition transform duration-300 hover:scale-110 hover:-translate-x-2  hover:text-green-400 ml-auto">
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent the background click from firing
            toggleSidebar();
          }}
          className="mt-10 text-gray-400 hover:text-green-400 p-2 rounded-full hover:bg-gray-900 transition-all duration-300 ease-in-out"
          aria-label="Toggle sidebar"
        >
          <FaChevronLeft
            className={`transform transition-transform duration-300 ease-in-out ${
              !isOpen && '-rotate-180'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

// Helper component for navigation items.
// We add `e.stopPropagation()` to the Link's onClick to prevent the background click handler from firing.
type NavItemProps = {
  href: string;
  icon: React.ReactNode;
  text: string;
  isOpen: boolean;
};

function NavItem({ href, icon, text, isOpen }: NavItemProps) {
  return (
    <li>
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()} // Stop the click from bubbling up to the main div
        className="flex items-center mt-2 p-2 text-gray-300 rounded-md hover:bg-gray-800 hover:text-green-400 transition-colors duration-200 cursor-pointer"
      >
        {icon}
        <span
          className={`text-lg overflow-hidden transition-all duration-200 ease-in-out whitespace-nowrap ${
            isOpen ? 'w-full ml-3' : 'w-0'
          }`}
        >
          {text}
        </span>
      </Link>
    </li>
  );
}