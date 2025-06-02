import React from 'react';

type WaveformProps = {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  backgroundColor?: string;
  scale?: number;
};

const Waveform: React.FC<WaveformProps> = ({ 
  data,
  color = 'rgba(214, 188, 250, 0.8)',
  height = 100,
  width,
  backgroundColor = 'transparent',
  scale = 1
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = width || canvas.offsetWidth;
    canvas.height = height;
    
    // Clear canvas
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw waveform
    const scale = height / 2;
    const verticalScale = 2.2;

    // Уменьшаем эффект размытия для большей чёткости
    ctx.shadowColor = color;
    ctx.shadowBlur = 1;
    ctx.shadowOffsetY = 0;

    // Увеличиваем контрастность волны
    const enhancedData = data.map(value => Math.pow(value, 1.5));

    // Вычисляем оптимальное количество точек для отображения
    // Используем больше точек при увеличении масштаба
    const basePoints = 2000; // Базовое количество точек
    const minPoints = basePoints;
    const maxPoints = 20000; // Увеличиваем максимальное количество точек
    const scaleFactor = Math.max(1, scale); // Масштабный коэффициент
    const targetPoints = Math.min(maxPoints, Math.max(minPoints, basePoints * scaleFactor));
    const numPoints = Math.min(data.length, targetPoints);
    const step = data.length / numPoints;

    // Рисуем волну линиями
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(0.3, 1.5 / scaleFactor); // Делаем зависимость толщины линии от масштаба сильнее и уменьшаем минимальную толщину

    // Рисуем верхнюю часть волны
    ctx.moveTo(0, scale);
    for (let i = 0; i < numPoints; i++) {
      const dataIndex = Math.floor(i * step);
      const value = enhancedData[dataIndex];
      const x = (i / numPoints) * canvas.width;
      const y = scale - (value * verticalScale * scale);
      ctx.lineTo(x, y);
    }

    // Рисуем нижнюю часть волны
    for (let i = numPoints - 1; i >= 0; i--) {
      const dataIndex = Math.floor(i * step);
      const value = enhancedData[dataIndex];
      const x = (i / numPoints) * canvas.width;
      const y = scale + (value * verticalScale * scale);
      ctx.lineTo(x, y);
    }

    // Заполняем волну
    ctx.fillStyle = color;
    ctx.fill();

    // Добавляем блик сверху
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = Math.max(0.3, 1.5 / scaleFactor);
    ctx.moveTo(0, scale);
    for (let i = 0; i < numPoints; i++) {
      const dataIndex = Math.floor(i * step);
      const value = enhancedData[dataIndex];
      const x = (i / numPoints) * canvas.width;
      const y = scale - (value * verticalScale * scale);
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Сбрасываем эффекты
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }, [data, color, height, width, backgroundColor, scale]);
  
  return (
    <canvas 
      ref={canvasRef}
      className="w-full h-full"
      style={{ width: width ? `${width}px` : '100%' }}
    />
  );
};

export default Waveform;
