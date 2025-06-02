import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface KnobProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: number;
  className?: string;
  disabled?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const Knob: React.FC<KnobProps> = ({
  value,
  min = 0,
  max = 100,
  onChange,
  size = 60,
  className,
  disabled = false,
  onMouseEnter,
  onMouseLeave
}) => {
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startAngle = useRef(0);
  const startValue = useRef(0);

  const getAngleFromValue = (val: number) => {
    const percentage = (val - min) / (max - min);
    return -150 + (percentage * 300); // -150 to 150 degrees
  };

  const getValueFromAngle = (angle: number) => {
    const percentage = (angle + 150) / 300;
    return min + (percentage * (max - min));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    isDragging.current = true;
    const knob = knobRef.current;
    if (!knob) return;

    const rect = knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    startAngle.current = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    startValue.current = value;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !knobRef.current) return;

    const knob = knobRef.current;
    const rect = knob.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI);
    const angleDiff = currentAngle - startAngle.current;

    let newValue = startValue.current + (angleDiff * (max - min) / 300);
    newValue = Math.max(min, Math.min(max, newValue));
    onChange(newValue);
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const rotation = getAngleFromValue(value);

  return (
    <div
      ref={knobRef}
      className={cn(
        "relative cursor-pointer select-none",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      style={{ width: size, height: size }}
      onMouseDown={handleMouseDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div
        className="absolute inset-0 rounded-full bg-gray-800 border-2 border-gray-700"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: isDragging.current ? 'none' : 'transform 0.1s ease-out'
        }}
      >
        <div className="absolute top-0 left-1/2 w-1 h-1/2 bg-white rounded-full origin-bottom" />
      </div>
    </div>
  );
};

export default Knob; 