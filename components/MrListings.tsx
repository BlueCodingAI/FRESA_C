"use client";

import { useEffect, useState } from "react";

interface MrListingsProps {
  size?: "small" | "medium" | "large";
  isLecturing?: boolean;
  animation?: "idle" | "thumbs-up" | "thumbs-down" | "congratulations" | "waving" | "pointing";
}

export default function MrListings({ 
  size = "large", 
  isLecturing = false,
  animation = "idle" 
}: MrListingsProps) {
  const [currentAnimation, setCurrentAnimation] = useState(animation);
  const [wingFlap, setWingFlap] = useState(0);
  const [bobOffset, setBobOffset] = useState(0);
  const [eyeBlink, setEyeBlink] = useState(false);

  useEffect(() => {
    setCurrentAnimation(animation);
  }, [animation]);

  // Wing flapping animation for idle and happy states
  useEffect(() => {
    const isEnthusiastic = currentAnimation === "congratulations";
    if (currentAnimation === "idle" || currentAnimation === "thumbs-up" || currentAnimation === "congratulations") {
      const interval = setInterval(() => {
        setWingFlap(prev => (prev + 1) % 2);
      }, isEnthusiastic ? 400 : 600);
      return () => clearInterval(interval);
    }
  }, [currentAnimation]);

  // Eye blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setEyeBlink(true);
      setTimeout(() => setEyeBlink(false), 150);
    }, 3000);
    return () => clearInterval(blinkInterval);
  }, []);

  // Gentle bobbing animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBobOffset(prev => (prev + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  // Consistent sizing - all sizes use same proportions, just scaled
  const baseSize = size === "large" ? 100 : size === "medium" ? 70 : 50;

  // Always use original character appearance (no happy/sad/enthusiastic face or body)
  const isHappy = false;
  const isSad = false;
  const isEnthusiastic = false;

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{
        width: `${baseSize}px`,
        height: `${baseSize * 1.1}px`,
      }}
    >
      {/* Glow effect */}
      <div 
        className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl animate-pulse"
        style={{
          width: `${baseSize * 1.3}px`,
          height: `${baseSize * 1.3}px`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Main Bird Container */}
      <div 
        className="relative"
        style={{
          transform: `translateY(${Math.sin(bobOffset * 0.5) * (isEnthusiastic ? 5 : isHappy ? 3 : 2)}px) scale(${isEnthusiastic ? 1.15 : isHappy ? 1.05 : 1}) rotate(${isEnthusiastic ? Math.sin(bobOffset) * 3 : 0}deg)`,
          transition: 'transform 0.3s ease-out',
        }}
      >
        {/* Body - Main oval */}
        <div 
          className="absolute bg-gradient-to-b from-blue-400 via-blue-500 to-blue-600 rounded-full shadow-xl z-10 transition-all duration-300"
          style={{
            width: `${baseSize * 0.65}px`,
            height: `${baseSize * 0.8}px`,
            left: '50%',
            top: `${baseSize * 0.2}px`,
            transform: `translateX(-50%) ${isSad ? 'scaleY(0.95)' : isEnthusiastic ? 'scaleY(1.08)' : ''}`,
          }}
        />

        {/* Diamond on chest - light blue fill, darker blue border (more interesting look) */}
        <div
          className="absolute z-20"
          style={{
            left: '50%',
            top: `${baseSize * 0.5}px`,
            transform: 'translateX(-50%) rotate(45deg)',
            width: `${baseSize * 0.16}px`,
            height: `${baseSize * 0.16}px`,
            backgroundColor: 'rgba(147, 197, 253, 0.95)',
            border: `2.5px solid rgb(59, 130, 246)`,
            borderRadius: '3px',
            boxShadow: '0 0 0 1px rgba(59, 130, 246, 0.3)',
          }}
        />

        {/* Head - Smaller circle on top */}
        <div 
          className="absolute bg-gradient-to-b from-blue-300 via-blue-400 to-blue-500 rounded-full shadow-lg z-20 transition-all duration-300"
          style={{
            width: `${baseSize * 0.55}px`,
            height: `${baseSize * 0.55}px`,
            left: '50%',
            top: '0',
            transform: `translateX(-50%) ${isSad ? 'rotate(-5deg)' : isEnthusiastic ? 'rotate(8deg)' : isHappy ? 'rotate(3deg)' : ''}`,
          }}
        >
          {/* Eyes */}
          <div 
            className="absolute flex gap-2"
            style={{
              left: '50%',
              top: isHappy ? '28%' : isSad ? '35%' : '32%',
              transform: 'translateX(-50%)',
            }}
          >
            {/* Left Eye */}
            <div 
              className="bg-white rounded-full flex items-center justify-center shadow-md transition-all duration-300"
              style={{
                width: `${baseSize * 0.11}px`,
                height: `${baseSize * 0.11}px`,
              }}
            >
              {eyeBlink ? (
                // Blinking
                <div 
                  className="bg-blue-400 rounded-full transition-all duration-150"
                  style={{
                    width: `${baseSize * 0.11}px`,
                    height: `${baseSize * 0.02}px`,
                  }}
                />
              ) : isHappy ? (
                // Happy eyes - regular round pupils (friendly, not cross-eyed)
                <div 
                  className="bg-black rounded-full transition-all duration-300"
                  style={{
                    width: `${baseSize * 0.06}px`,
                    height: `${baseSize * 0.06}px`,
                  }}
                />
              ) : isSad ? (
                // Sad eyes - downward curved
                <svg 
                  width={baseSize * 0.09} 
                  height={baseSize * 0.09} 
                  viewBox="0 0 24 24" 
                  fill="none"
                  className="transition-all duration-300"
                >
                  <path 
                    d="M8 14C8 14 10 18 12 18C14 18 16 14 16 14" 
                    stroke="black" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              ) : (
                // Normal eyes - circular
                <div 
                  className="bg-black rounded-full transition-all duration-300"
                  style={{
                    width: `${baseSize * 0.06}px`,
                    height: `${baseSize * 0.06}px`,
                  }}
                />
              )}
            </div>
            
            {/* Right Eye */}
            <div 
              className="bg-white rounded-full flex items-center justify-center shadow-md transition-all duration-300"
              style={{
                width: `${baseSize * 0.11}px`,
                height: `${baseSize * 0.11}px`,
              }}
            >
              {eyeBlink ? (
                <div 
                  className="bg-blue-400 rounded-full transition-all duration-150"
                  style={{
                    width: `${baseSize * 0.11}px`,
                    height: `${baseSize * 0.02}px`,
                  }}
                />
              ) : isHappy ? (
                <div 
                  className="bg-black rounded-full transition-all duration-300"
                  style={{
                    width: `${baseSize * 0.06}px`,
                    height: `${baseSize * 0.06}px`,
                  }}
                />
              ) : isSad ? (
                <svg 
                  width={baseSize * 0.09} 
                  height={baseSize * 0.09} 
                  viewBox="0 0 24 24" 
                  fill="none"
                  className="transition-all duration-300"
                >
                  <path 
                    d="M8 14C8 14 10 18 12 18C14 18 16 14 16 14" 
                    stroke="black" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              ) : (
                <div 
                  className="bg-black rounded-full transition-all duration-300"
                  style={{
                    width: `${baseSize * 0.06}px`,
                    height: `${baseSize * 0.06}px`,
                  }}
                />
              )}
            </div>
          </div>

          {/* Beak - Changes shape based on emotion (birds don't have mouths, only beaks) */}
          {isHappy ? (
            // Happy beak - curved downward (upside down, like a smile) - clean, no saliva
            <div 
              className="absolute transition-all duration-300"
              style={{
                left: '50%',
                top: '50%',
                transform: 'translateX(-50%)',
              }}
            >
              <svg 
                width={baseSize * 0.2} 
                height={baseSize * 0.12} 
                viewBox="0 0 20 12" 
                fill="none"
              >
                {/* Smiling curved beak - simple curved line, no fill */}
                <path 
                  d="M2 4 Q10 10 18 4" 
                  stroke="#fb923c" 
                  strokeWidth="4" 
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>
          ) : isSad ? (
            // Sad beak - drooping down
            <div 
              className="absolute transition-all duration-300"
              style={{
                width: '0',
                height: '0',
                borderLeft: `${baseSize * 0.07}px solid transparent`,
                borderRight: `${baseSize * 0.07}px solid transparent`,
                borderTop: `${baseSize * 0.08}px solid #fb923c`,
                left: '50%',
                top: '58%',
                transform: 'translateX(-50%) rotate(5deg)',
              }}
            />
          ) : (
            // Normal beak - straight triangle
            <div 
              className="absolute transition-all duration-300"
              style={{
                width: '0',
                height: '0',
                borderLeft: `${baseSize * 0.08}px solid transparent`,
                borderRight: `${baseSize * 0.08}px solid transparent`,
                borderTop: `${baseSize * 0.1}px solid #fb923c`,
                left: '50%',
                top: '55%',
                transform: 'translateX(-50%)',
              }}
            />
          )}

          {/* Eyebrows for sad expression */}
          {isSad && (
            <div 
              className="absolute flex gap-3"
              style={{
                left: '50%',
                top: '22%',
                transform: 'translateX(-50%)',
              }}
            >
              <div 
                className="bg-blue-700 rounded-full"
                style={{
                  width: `${baseSize * 0.07}px`,
                  height: `${baseSize * 0.02}px`,
                  transform: 'rotate(20deg)',
                }}
              />
              <div 
                className="bg-blue-700 rounded-full"
                style={{
                  width: `${baseSize * 0.07}px`,
                  height: `${baseSize * 0.02}px`,
                  transform: 'rotate(-20deg)',
                }}
              />
            </div>
          )}

          {/* Cheeks for happy expression */}
          {isHappy && (
            <>
              <div 
                className="absolute bg-pink-300 rounded-full opacity-70 animate-pulse"
                style={{
                  width: `${baseSize * 0.09}px`,
                  height: `${baseSize * 0.09}px`,
                  left: '15%',
                  top: '48%',
                }}
              />
              <div 
                className="absolute bg-pink-300 rounded-full opacity-70 animate-pulse"
                style={{
                  width: `${baseSize * 0.09}px`,
                  height: `${baseSize * 0.09}px`,
                  right: '15%',
                  top: '48%',
                }}
              />
            </>
          )}
        </div>

        {/* Left Wing - More realistic bird wing shape */}
        <div 
          className="absolute bg-gradient-to-r from-blue-300 via-blue-400 to-blue-500 rounded-full shadow-lg z-5 transition-transform duration-300"
          style={{
            width: `${baseSize * 0.45}px`,
            height: `${baseSize * 0.28}px`,
            left: `${baseSize * 0.05}px`,
            top: `${baseSize * 0.35}px`,
            transform: `rotate(${wingFlap === 0 ? -30 : isEnthusiastic ? -8 : isHappy ? -12 : -15}deg) ${isEnthusiastic ? 'scale(1.15)' : isHappy ? 'scale(1.05)' : ''}`,
            transformOrigin: 'right center',
            clipPath: isEnthusiastic ? 'ellipse(100% 85% at 50% 50%)' : 'ellipse(100% 60% at 50% 50%)',
          }}
        />

        {/* Right Wing */}
        <div 
          className="absolute bg-gradient-to-l from-blue-300 via-blue-400 to-blue-500 rounded-full shadow-lg z-5 transition-transform duration-300"
          style={{
            width: `${baseSize * 0.45}px`,
            height: `${baseSize * 0.28}px`,
            right: `${baseSize * 0.05}px`,
            top: `${baseSize * 0.35}px`,
            transform: `rotate(${wingFlap === 0 ? 30 : isEnthusiastic ? 8 : isHappy ? 12 : 15}deg) ${isEnthusiastic ? 'scale(1.15)' : isHappy ? 'scale(1.05)' : ''}`,
            transformOrigin: 'left center',
            clipPath: isEnthusiastic ? 'ellipse(100% 85% at 50% 50%)' : 'ellipse(100% 60% at 50% 50%)',
          }}
        />

        {/* Tail - Small triangle at bottom */}
        <div 
          className="absolute bg-gradient-to-b from-blue-500 to-blue-700 transition-all duration-300"
          style={{
            width: '0',
            height: '0',
            borderLeft: `${baseSize * 0.08}px solid transparent`,
            borderRight: `${baseSize * 0.08}px solid transparent`,
            borderTop: `${baseSize * (isEnthusiastic ? 0.14 : 0.12)}px solid #1e40af`,
            left: '50%',
            bottom: `${-baseSize * 0.03}px`,
            transform: `translateX(-50%) ${isEnthusiastic ? 'scale(1.25)' : ''}`,
            zIndex: 5,
          }}
        />

        {/* Feet - Two small ovals */}
        <div 
          className="absolute flex gap-1 transition-all duration-300"
          style={{
            left: '50%',
            bottom: `${-baseSize * 0.18}px`,
            transform: `translateX(-50%) ${isEnthusiastic ? 'scale(1.15)' : ''}`,
            zIndex: 15,
          }}
        >
          <div 
            className="bg-yellow-400 rounded-full shadow-md"
            style={{
              width: `${baseSize * 0.1}px`,
              height: `${baseSize * 0.07}px`,
            }}
          />
          <div 
            className="bg-yellow-400 rounded-full shadow-md"
            style={{
              width: `${baseSize * 0.1}px`,
              height: `${baseSize * 0.07}px`,
            }}
          />
        </div>

        {/* Lecturing Tie */}
        {isLecturing && (
          <div 
            className="absolute"
            style={{
              left: '50%',
              bottom: `${-baseSize * 0.32}px`,
              transform: 'translateX(-50%)',
              zIndex: 20,
            }}
          >
            {/* <div 
              className="bg-red-500 rounded-sm shadow-lg mx-auto"
              style={{
                width: `${baseSize * 0.07}px`,
                height: `${baseSize * 0.11}px`,
              }}
            />
            <div 
              className="bg-blue-600 rounded-full shadow-md mx-auto -mt-1"
              style={{
                width: `${baseSize * 0.09}px`,
                height: `${baseSize * 0.09}px`,
              }}
            /> */}
          </div>
        )}

        {/* Enthusiastic celebration - multiple sparkles */}
        {isEnthusiastic && (
          <>
            {/* Sparkles around bird */}
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className="absolute animate-bounce-gentle"
                style={{
                  left: `${Math.cos((i * Math.PI * 2) / 6) * baseSize * 0.25}px`,
                  top: `${Math.sin((i * Math.PI * 2) / 6) * baseSize * 0.25}px`,
                  width: `${baseSize * 0.08}px`,
                  height: `${baseSize * 0.08}px`,
                  background: 'radial-gradient(circle, #ffd700 0%, #ffed4e 50%, transparent 100%)',
                  borderRadius: '50%',
                  animationDelay: `${i * 0.1}s`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
