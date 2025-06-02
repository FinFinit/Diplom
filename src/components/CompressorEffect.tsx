import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Effect } from '../contexts/AudioEngineContext';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type CompressorEffectProps = {
  effect: Effect;
  onParamsChange: (params: any) => void;
  onRemove: () => void;
};

const CompressorEffect: React.FC<CompressorEffectProps> = ({ effect, onParamsChange, onRemove }) => {
  const { peakReduction, gain } = effect.params;
  const [activeSlider, setActiveSlider] = useState<{
    param: 'peakReduction' | 'gain' | null;
    value: number | null;
  }>({
    param: null,
    value: null,
  });

  const handleSliderChange = (param: 'peakReduction' | 'gain', value: number[]) => {
    onParamsChange({ ...effect.params, [param]: value[0] });
    setActiveSlider({ param, value: value[0] });
  };

  const handleSliderHover = (param: 'peakReduction' | 'gain' | null, value: number | null = null) => {
    setActiveSlider({ param, value });
  };

  const formatPeakReduction = (value: number) => {
    return `${value.toFixed(0)}`;
  };

  const formatGain = (value: number) => {
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
            id={`compressor-enabled-${effect.id}`}
            checked={effect.enabled}
            onCheckedChange={handleToggleEnabled}
            className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-500 transition-colors duration-200 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] scale-90"
          />
        </div>
        <div className={cn(
          "text-sm font-bold text-daw-control flex-1 text-center",
          !effect.enabled && "text-gray-300"
        )}>LA-2A</div>
        <div className="w-8 flex justify-end">
          <button className={cn(
            "text-daw-control/70 hover:text-white focus:outline-none text-lg",
            !effect.enabled && "text-gray-300"
          )} onClick={onRemove}>
            &times;
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col items-start">
          {activeSlider.param === 'peakReduction' ? (
            <Label htmlFor="comp-peak-reduction" className={cn(
              "text-xs text-daw-control mb-1",
              !effect.enabled && "text-gray-300"
            )}>{formatPeakReduction(activeSlider.value!)}</Label>
          ) : (
            <Label htmlFor="comp-peak-reduction" className={cn(
              "text-xs text-daw-control mb-1",
              !effect.enabled && "text-gray-300"
            )}>Peak Reduction</Label>
          )}
          <Slider
            id="comp-peak-reduction"
            orientation="horizontal"
            min={0}
            max={100}
            step={1}
            value={[peakReduction]}
            onValueChange={(value) => handleSliderChange('peakReduction', value)}
            className="w-full"
            onMouseEnter={() => handleSliderHover('peakReduction', peakReduction)}
            onMouseLeave={() => handleSliderHover(null)}
            style={{ 
              '--slider-color': effect.enabled ? '#a78bfa' : '#6b7280'
            } as React.CSSProperties}
          />
        </div>
        <div className="flex flex-col items-start">
          {activeSlider.param === 'gain' ? (
            <Label htmlFor="comp-gain" className={cn(
              "text-xs text-daw-control mb-1",
              !effect.enabled && "text-gray-300"
            )}>{formatGain(activeSlider.value!)}</Label>
          ) : (
            <Label htmlFor="comp-gain" className={cn(
              "text-xs text-daw-control mb-1",
              !effect.enabled && "text-gray-300"
            )}>Gain</Label>
          )}
          <Slider
            id="comp-gain"
            orientation="horizontal"
            min={-20}
            max={20}
            step={0.1}
            value={[gain]}
            onValueChange={(value) => handleSliderChange('gain', value)}
            className="w-full"
            onMouseEnter={() => handleSliderHover('gain', gain)}
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

export default CompressorEffect; 