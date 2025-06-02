import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Effect } from '../contexts/AudioEngineContext';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import Knob from './ui/knob';

type DelayEffectProps = {
  effect: Effect;
  onParamsChange: (params: any) => void;
  onRemove: () => void;
};

const DelayEffect: React.FC<DelayEffectProps> = ({ effect, onParamsChange, onRemove }) => {
  const { time, feedback } = effect.params;
  const [activeParam, setActiveParam] = useState<{
    param: 'time' | 'feedback' | null;
    value: number | null;
  }>({
    param: null,
    value: null,
  });

  const handleKnobChange = (param: 'time' | 'feedback', value: number) => {
    onParamsChange({ ...effect.params, [param]: value });
    setActiveParam({ param, value });
  };

  const handleKnobHover = (param: 'time' | 'feedback' | null, value: number | null = null) => {
    setActiveParam({ param, value });
  };

  const formatTime = (value: number) => {
    return `${value.toFixed(1)}s`;
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
            id={`delay-enabled-${effect.id}`}
            checked={effect.enabled}
            onCheckedChange={handleToggleEnabled}
            className="data-[state=checked]:bg-white data-[state=unchecked]:bg-gray-500 transition-colors duration-200 shadow-[inset_0_2px_4px_0_rgba(0,0,0,0.2)] scale-90"
          />
        </div>
        <div className={cn(
          "text-sm font-bold text-daw-control flex-1 text-center",
          !effect.enabled && "text-gray-300"
        )}>Delay</div>
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
          <Label htmlFor="delay-time" className={cn(
            "text-xs text-daw-control w-12 text-center",
            !effect.enabled && "text-gray-300"
          )}>
            {activeParam.param === 'time' ? formatTime(activeParam.value!) : 'Time'}
          </Label>
          <Knob
            value={time}
            onChange={(value) => handleKnobChange('time', value)}
            disabled={!effect.enabled}
            size={45}
            onMouseEnter={() => handleKnobHover('time', time)}
            onMouseLeave={() => handleKnobHover(null)}
          />
        </div>
        <div className="flex flex-col items-center">
          <Label htmlFor="delay-feedback" className={cn(
            "text-xs text-daw-control w-12 text-center",
            !effect.enabled && "text-gray-300"
          )}>
            {activeParam.param === 'feedback' ? formatPercentage(activeParam.value!) : 'Feedback'}
          </Label>
          <Knob
            value={feedback}
            onChange={(value) => handleKnobChange('feedback', value)}
            disabled={!effect.enabled}
            size={45}
            onMouseEnter={() => handleKnobHover('feedback', feedback)}
            onMouseLeave={() => handleKnobHover(null)}
          />
        </div>
      </div>
    </div>
  );
};

export default DelayEffect; 