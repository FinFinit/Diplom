import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider'; // Предполагается, что Slider уже есть
import { Label } from '@/components/ui/label'; // Предполагается, что Label уже есть
import { Effect } from '../contexts/AudioEngineContext';
import { Switch } from '@/components/ui/switch'; // Импортируем Switch
import { cn } from '@/lib/utils';

type EQEffectProps = {
  effect: Effect;
  onParamsChange: (params: any) => void;
  onRemove: () => void; // Добавляем пропс для удаления
};

const EQEffect: React.FC<EQEffectProps> = ({ effect, onParamsChange, onRemove }) => {
  const { low, mid, high } = effect.params;
  const [activeSlider, setActiveSlider] = useState<{
    param: 'low' | 'mid' | 'high' | null;
    value: number | null;
  }>({
    param: null,
    value: null,
  });

  const handleSliderChange = (param: 'low' | 'mid' | 'high', value: number[]) => {
    onParamsChange({ ...effect.params, [param]: value[0] });
    setActiveSlider({ param, value: value[0] }); // Update active slider value while dragging
  };

  const handleSliderHover = (param: 'low' | 'mid' | 'high' | null, value: number | null = null) => {
    setActiveSlider({ param, value });
  };

  const formatValue = (value: number) => {
    return `${value.toFixed(1)} dB`;
  };

  const handleToggleEnabled = (checked: boolean) => {
    onParamsChange({ ...effect.params, enabled: checked });
  };

  return (
    <div className={cn(
      "bg-gray-100 p-2 rounded-md border border-daw-control w-[180px] flex-shrink-0 h-[165px]",
      !effect.enabled && "bg-gray-400"
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1 w-8">
          <Switch
            id={`eq-enabled-${effect.id}`}
            checked={effect.enabled}
            onCheckedChange={handleToggleEnabled}
            className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-500 transition-colors duration-200 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] scale-90"
          />
        </div>
        <div className={cn(
          "text-sm font-bold text-daw-control flex-1 text-center",
          !effect.enabled && "text-gray-300"
        )}>EQ</div>
        <div className="w-8 flex justify-end">
          <button className={cn(
            "text-daw-control/70 hover:text-white focus:outline-none text-lg",
            !effect.enabled && "text-gray-300"
          )} onClick={onRemove}>
            &times;
          </button>
        </div>
      </div>
      <div className="flex justify-between gap-2">
        <div className="flex flex-col items-center">
          {/* Условное отображение: значение при наведении/перетаскивании, иначе Label */}
          {activeSlider.param === 'low' ? (
            <Label className={cn(
              "text-xs text-daw-control w-12 text-center",
              !effect.enabled && "text-gray-300"
            )}>{formatValue(activeSlider.value!)}</Label>
          ) : (
            <Label className={cn(
              "text-xs text-daw-control w-12 text-center",
              !effect.enabled && "text-gray-300"
            )}>Low</Label>
          )}
          <Slider
            orientation="vertical"
            min={-12} // Примерные значения для эквалайзера (дБ)
            max={12}
            step={0.1}
            value={[low]}
            onValueChange={(value) => handleSliderChange('low', value)}
            className="h-[6rem]"
            onMouseEnter={() => handleSliderHover('low', low)}
            onMouseLeave={() => handleSliderHover(null)}
            style={{ 
              '--slider-color': effect.enabled ? '#a78bfa' : '#6b7280'
            } as React.CSSProperties}
          />
        </div>
        <div className="flex flex-col items-center">
           {/* Условное отображение: значение при наведении/перетаскивании, иначе Label */}
           {activeSlider.param === 'mid' ? (
            <Label className={cn(
              "text-xs text-daw-control w-12 text-center",
              !effect.enabled && "text-gray-300"
            )}>{formatValue(activeSlider.value!)}</Label>
          ) : (
            <Label className={cn(
              "text-xs text-daw-control w-12 text-center",
              !effect.enabled && "text-gray-300"
            )}>Mid</Label>
          )}
          <Slider
            orientation="vertical"
            min={-12}
            max={12}
            step={0.1}
            value={[mid]}
            onValueChange={(value) => handleSliderChange('mid', value)}
            className="h-[6rem]"
            onMouseEnter={() => handleSliderHover('mid', mid)}
            onMouseLeave={() => handleSliderHover(null)}
            style={{ 
              '--slider-color': effect.enabled ? '#a78bfa' : '#6b7280'
            } as React.CSSProperties}
          />
        </div>
        <div className="flex flex-col items-center">
           {/* Условное отображение: значение при наведении/перетаскивании, иначе Label */}
           {activeSlider.param === 'high' ? (
            <Label className={cn(
              "text-xs text-daw-control w-12 text-center",
              !effect.enabled && "text-gray-300"
            )}>{formatValue(activeSlider.value!)}</Label>
          ) : (
            <Label className={cn(
              "text-xs text-daw-control w-12 text-center",
              !effect.enabled && "text-gray-300"
            )}>High</Label>
          )}
          <Slider
            orientation="vertical"
            min={-12}
            max={12}
            step={0.1}
            value={[high]}
            onValueChange={(value) => handleSliderChange('high', value)}
            className="h-[6rem]"
            onMouseEnter={() => handleSliderHover('high', high)}
            onMouseLeave={() => handleSliderHover(null)}
            style={{ 
              '--slider-color': effect.enabled ? '#a78bfa' : '#6b7280'
            } as React.CSSProperties}
          />
        </div>
      </div>
    </div>
  );
};

export default EQEffect; 