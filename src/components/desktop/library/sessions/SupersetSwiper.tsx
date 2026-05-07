import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';

interface SupersetSwiperProps {
  children: React.ReactNode[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

const DRAG_BUFFER = 50;
const SPRING_OPTIONS = { type: 'spring', mass: 1, stiffness: 400, damping: 50 };

export function SupersetSwiper({ children, currentIndex, onIndexChange }: SupersetSwiperProps) {
  const [width, setWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      setWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const dragX = useMotionValue(0);

  const onDragEnd = () => {
    const x = dragX.get();
    // Swiper à gauche => prochain index
    if (x <= -DRAG_BUFFER && currentIndex < children.length - 1) {
      onIndexChange(currentIndex + 1);
    } 
    // Swiper à droite => index précédent
    else if (x >= DRAG_BUFFER && currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  return (
    <div ref={containerRef} className="relative overflow-hidden w-full h-full flex flex-col">
      <motion.div
        drag="x"
        dragConstraints={{
          left: 0,
          right: 0,
        }}
        style={{
          x: dragX,
        }}
        animate={{
          translateX: `-${currentIndex * 100}%`,
        }}
        transition={SPRING_OPTIONS}
        onDragEnd={onDragEnd}
        className="flex h-full w-full"
      >
        {children.map((child, idx) => (
          <div key={idx} className="w-full h-full flex-shrink-0" style={{ width: '100%' }}>
            {child}
          </div>
        ))}
      </motion.div>
      
      {/* Indicateur de position (Dots) - Visible uniquement si Superset/Triset */}
      {children.length > 1 && (
        <div className="absolute top-2 left-0 right-0 flex justify-center gap-2 pointer-events-none">
          {children.map((_, idx) => (
            <div 
              key={idx} 
              className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-blue-500' : 'w-2 bg-slate-600'}`} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
