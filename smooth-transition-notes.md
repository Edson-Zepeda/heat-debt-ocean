# Smooth Transition Variant

This folder is an alternative version of the original `heat-debt-ocean` entry.
The original folder was left unchanged as the fallback.

## What changed

- The canvas no longer draws only the single active biome.
- Scroll position now calculates a continuous visual blend between neighboring chapters.
- Each biome is rendered into an internal canvas buffer, then blended into the main canvas.
- A subtle transitional veil adds color wash and current lines between ecosystems.
- Metrics and depth values now interpolate from the same continuous visual blend.

## Submission note

Before submitting, choose either the stable original or this smooth version and
review the final text, colors, timing, and interaction.
