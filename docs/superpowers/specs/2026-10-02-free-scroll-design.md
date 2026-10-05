# Free scrolling with light desktop smoothing

The user requested an interim replacement for PR 103: disable assisted project navigation and allow free scrolling with resistance and a short glide.

Disable homepage CSS snapping at all viewport sizes. On desktop with a fine pointer, use the already reviewed Lenis 1.3.26 distribution for ordinary wheel interpolation only, initially lerp 0.1 and wheel multiplier 0.85. Never select a project destination, classify gestures, or apply an input quiet timer. Continuing wheel packets update the freely chosen target immediately.

Information/Work navigation uses the same desktop animator. Mobile, touch and reduced motion use native free scrolling. Keyboard and pointer interaction cancel pending wheel animation. Keep all project geometry and media unchanged. Work in an isolated checkout. The user reviewed both local previews and authorized commit and push on 2 October 2026.

Verify freely chosen offsets, repeated input during gliding, crossing several rows, reversal, navigation and disabling smoothing; then inspect a local browser preview. Physical trackpad tuning remains a user review step.
