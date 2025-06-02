import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Effect } from '../contexts/AudioEngineContext';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import Knob from './ui/knob';

type ReverbEffectProps = {
  effect: Effect;
  onParamsChange: (params: any) => void;
  onRemove: () => void;
};

const ReverbEffect: React.FC<ReverbEffectProps> = ({ effect, onParamsChange, onRemove }) => {
  const { mix, size } = effect.params;
  const [activeParam, setActiveParam] = useState<{
    param: 'mix' | 'size' | null;
    value: number | null;
  }>({
    param: null,
    value: null,
  });

  const handleKnobChange = (param: 'mix' | 'size', value: number) => {
    onParamsChange({ ...effect.params, [param]: value });
    setActiveParam({ param, value });
  };

  const handleKnobHover = (param: 'mix' | 'size' | null, value: number | null = null) => {
    setActiveParam({ param, value });
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(0)}%`;
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
            id={`reverb-enabled-${effect.id}`}
            checked={effect.enabled}
            onCheckedChange={handleToggleEnabled}
            className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-500 transition-colors duration-200 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] scale-90"
          />
        </div>
        <div className={cn(
          "text-sm font-bold text-daw-control flex-1 text-center",
          !effect.enabled && "text-gray-300"
        )}>Reverb</div>
        <div className="w-8 flex justify-end">
          <button className={cn(
            "text-daw-control/70 hover:text-white focus:outline-none text-lg",
            !effect.enabled && "text-gray-300"
          )} onClick={onRemove}>
            &times;
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center gap-2 mt-2">
        <div className="flex flex-col items-center">
          <Label htmlFor="reverb-mix" className={cn(
            "text-xs text-daw-control w-12 text-center",
            !effect.enabled && "text-gray-300"
          )}>
            {activeParam.param === 'mix' ? formatPercentage(activeParam.value!) : 'Mix'}
          </Label>
          <Knob
            value={mix}
            onChange={(value) => handleKnobChange('mix', value)}
            disabled={!effect.enabled}
            size={45}
            onMouseEnter={() => handleKnobHover('mix', mix)}
            onMouseLeave={() => handleKnobHover(null)}
          />
        </div>
        <div className="flex flex-col items-center">
          <Label htmlFor="reverb-size" className={cn(
            "text-xs text-daw-control w-12 text-center",
            !effect.enabled && "text-gray-300"
          )}>
            {activeParam.param === 'size' ? formatPercentage(activeParam.value!) : 'Size'}
          </Label>
          <Knob
            value={size}
            onChange={(value) => handleKnobChange('size', value)}
            disabled={!effect.enabled}
            size={45}
            onMouseEnter={() => handleKnobHover('size', size)}
            onMouseLeave={() => handleKnobHover(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default ReverbEffect; 