import Link from 'next/link';
import { FaQuestionCircle, FaGamepad, FaChartBar, FaCompactDisc } from 'react-icons/fa';

export default function Sidebar() {
  return (
    <div className="w-40 bg-[#2a2f31] p-4 flex-shrink-0">
      <ul className="space-y-6">
        {/* Logo */}
        <li className="flex justify-center">
          <Link href="/home">
            <img src="/beatboxlogofinal_nav.svg" alt="BeatBox" width={60} />
          </Link>
        </li>

        {/* Nav Items */}
        <li className="flex items-center">
          <Link href="/howto" className="flex items-center text-white hover:text-green-400">
            <FaQuestionCircle className="mr-2" />
            <span>How to Play</span>
          </Link>
        </li>
        <li className="flex items-center">
          <Link href="/battle" className="flex items-center text-white hover:text-green-400">
            <FaGamepad className="mr-2" />
            <span>Battle</span>
          </Link>
        </li>
        <li className="flex items-center">
          <Link href="/statistics" className="flex items-center text-white hover:text-green-400">
            <FaChartBar className="mr-2" />
            <span>Statistics</span>
          </Link>
        </li>
        <li className="flex items-center">
          <Link href="/dabi" className="flex items-center text-white hover:text-green-400">
            <FaCompactDisc className="mr-2" />
            <span>Dabi</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
