// beatbox/src/app/howto/page.tsx
export default function HowToPlay() {
    return (
      <div className="p-8 text-center">
        <h1>How to Play</h1>
        <p>Learn the rules and get ready to become a BeatBox master!</p>
  
        <div className="mt-6">
          <h2>Rules</h2>
          <ul className="text-left mx-auto max-w-md list-disc list-inside">
            <li>Each round, you must name a song with a featured artist.</li>
            <li>Your opponent will then name another song featuring that artist.</li>
            <li>Each song can be used up to three times only.</li>
            <li>Last one standing wins!</li>
          </ul>
        </div>
  
        <div className="mt-6">
          <h2>Game Demonstration</h2>
          {/* Include images, videos, or animations */}
          {/* <img src="/images/demo.png" alt="Game Demo" className="mx-auto my-4" />
          <video controls className="mx-auto my-4">
            <source src="/videos/how-to-play.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video> */}
          {/* Optional animations or further instructions */}
        </div>
      </div>
    );
  }
  