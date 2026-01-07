import { useState, useCallback } from 'react'

interface LogoProps {
  size?: number
}

export default function Logo({ size = 48 }: LogoProps) {
  const [isFlashing, setIsFlashing] = useState(false)

  const handleClick = useCallback(() => {
    if (isFlashing) return // Prevent multiple flashes
    setIsFlashing(true)
    setTimeout(() => setIsFlashing(false), 3000)
  }, [isFlashing])

  return (
    <div
      className={`logo-container ${isFlashing ? 'lightning-flash' : ''}`}
      style={{ width: size, height: size, display: 'inline-block', cursor: 'pointer' }}
      onClick={handleClick}
      title="Click me!"
    >
      <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="siteGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: '#2a9d8f' }} />
            <stop offset="50%" style={{ stopColor: '#e9c46a' }} />
            <stop offset="100%" style={{ stopColor: '#e76f51' }} />
          </linearGradient>

          <clipPath id="mountainClip">
            <path d="M 0,100 L 0,70 L 8,65 L 18,75 L 28,50 L 38,60 L 50,30 L 62,55 L 72,45 L 82,60 L 92,55 L 100,65 L 100,100 Z" />
          </clipPath>
        </defs>

        {/* Background - lightens during lightning */}
        <rect
          x="0" y="0" width="100" height="100"
          fill={isFlashing ? '#faf8f5' : '#1a1a2e'}
          style={{ transition: 'fill 0.05s' }}
        />

        {/* Mountain range border */}
        <path
          d="M 0,70 L 8,65 L 18,75 L 28,50 L 38,60 L 50,30 L 62,55 L 72,45 L 82,60 L 92,55 L 100,65"
          stroke="url(#siteGradient)"
          strokeWidth="3"
          fill="none"
          strokeLinejoin="round"
        />

        {/* Transmission content clipped to mountain area */}
        <g clipPath="url(#mountainClip)">

          {/* Transmission tower pylons - static */}
          <g className="towers" stroke="#1a1a2e" strokeWidth="1.5" fill="none">
            {/* Tower 1 */}
            <path d="M 25,100 L 25,58 M 21,58 L 25,52 L 29,58 M 21,58 L 29,58" />
            <line x1="20" y1="64" x2="30" y2="64" />
            <line x1="21" y1="72" x2="29" y2="72" />

            {/* Tower 2 */}
            <path d="M 50,100 L 50,38 M 46,38 L 50,32 L 54,38 M 46,38 L 54,38" />
            <line x1="44" y1="44" x2="56" y2="44" />
            <line x1="45" y1="52" x2="55" y2="52" />

            {/* Tower 3 */}
            <path d="M 75,100 L 75,52 M 71,52 L 75,46 L 79,52 M 71,52 L 79,52" />
            <line x1="70" y1="58" x2="80" y2="58" />
            <line x1="71" y1="66" x2="79" y2="66" />
          </g>

          {/* Transmission wires - with slight sag */}
          <g className="wires">
            <path
              className="wire"
              d="M 0,56 Q 25,62 50,46 Q 75,52 100,54"
            />
            <path
              className="wire"
              d="M 0,64 Q 25,70 50,54 Q 75,60 100,62"
            />
          </g>

          {/* Electricity pulses flowing on wires */}
          <g className="electricity">
            <path
              className="pulse pulse-1"
              d="M 0,56 Q 25,62 50,46 Q 75,52 100,54"
            />
            <path
              className="pulse pulse-2"
              d="M 0,64 Q 25,70 50,54 Q 75,60 100,62"
            />
          </g>

        </g>

        {/* Outer border */}
        <rect
          x="1" y="1" width="98" height="98"
          stroke="#1a1a2e"
          strokeWidth="2"
          fill="none"
        />

        {/* Lightning flash overlay */}
        {isFlashing && (
          <rect
            className="flash-overlay"
            x="0" y="0" width="100" height="100"
            fill="#fff"
          />
        )}

        <style>{`
          /* Static transmission wires */
          .wire {
            fill: none;
            stroke: #4a4a5a;
            stroke-width: 1.5;
          }

          /* Electricity pulses */
          .pulse {
            fill: none;
            stroke: #e9c46a;
            stroke-width: 2.5;
            stroke-linecap: round;
            stroke-dasharray: 8, 40;
            animation: electricFlow 1.2s linear infinite;
          }

          .pulse-2 {
            animation-delay: -0.4s;
          }

          @keyframes electricFlow {
            from {
              stroke-dashoffset: 48;
            }
            to {
              stroke-dashoffset: 0;
            }
          }

          /* Lightning flash overlay */
          .flash-overlay {
            animation: flashFade 0.5s ease-out forwards;
          }

          @keyframes flashFade {
            0% { opacity: 1; }
            10% { opacity: 0.2; }
            20% { opacity: 0.9; }
            30% { opacity: 0.1; }
            40% { opacity: 0.7; }
            60% { opacity: 0; }
            100% { opacity: 0; }
          }

        `}</style>
      </svg>
    </div>
  )
}
