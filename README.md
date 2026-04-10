# Wireframe Studio

A massive drop-in "X-Ray" inspection and DOM-hack utility designed for extremely rapid prototyping in modern React applications. 

This UI utility places a toggle hook directly on top of your live application. It provides:
1. **Live DOM Rearrangement**: Clicking elements lets you rearrange them in the DOM to prototype layout swaps in real-time.
2. **X-Ray Overlay**: Hit the Key icon to dynamically render exact dimension outlines, labels, and bounding boxes over your components—independent of your application's `overflow` boundaries or z-index stacking!

## Requirements
- `react` 18+
- **Tailwind CSS**. This library relies entirely on standard Tailwind CSS classes to render its beautiful glowing overlays. Ensure the host project has tailwind configured!

## Usage

Just import it and wrap it around your top-level `<App>` router or component map in your development environment!

```jsx
import { WireframeStudio } from "wireframe-studio";

export default function App() {
  return (
    <WireframeStudio>
      <YourMainAppApplicationHere />
    </WireframeStudio>
  );
}
```

### Hotkeys
- **`CMD+SHIFT+D`**: Toggles structural layout editing mode on/off globally. 
- You can also use the absolute-positioned UI bubbles injected in the bottom right corner of the screen.
