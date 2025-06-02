import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, orientation = "horizontal", ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation={orientation}
    className={cn(
      "relative flex touch-none select-none items-center",
      orientation === "horizontal" ? "w-full" : "h-full flex-col",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track 
      className={cn(
        "relative overflow-hidden rounded-full bg-white",
        orientation === "horizontal" 
          ? "h-2 w-full grow [box-shadow:inset_0_2px_4px_rgba(0,0,0,0.2)]" 
          : "w-2 h-full grow [box-shadow:inset_2px_0_4px_rgba(0,0,0,0.2)]"
      )}
    >
      <SliderPrimitive.Range 
        className={cn(
          "absolute",
          orientation === "horizontal" ? "h-full" : "w-full"
        )}
        style={{ 
          backgroundColor: 'var(--slider-color, #a78bfa)',
        }}
      />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb 
      className="block h-5 w-5 rounded-full border-2 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      style={{ borderColor: 'var(--slider-color, #a78bfa)'}}
    />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
