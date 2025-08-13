# Theme Update Guidelines

## Core Principles
1. **Glassmorphism**: All cards should use `bg-card/80 backdrop-blur-xl`
2. **Consistent borders**: Use `border-border/50` for glassmorphic effect
3. **Text colors**: 
   - Headers: `text-gray-900 dark:text-white` or `gradient-text`
   - Body: `text-gray-600 dark:text-gray-400`
   - Muted: `text-muted-foreground`
4. **Backgrounds**: 
   - Main: `bg-gradient-to-br from-background via-background/95 to-background`
   - Cards: `<Card className="p-6 bg-card/80 backdrop-blur-xl">`
5. **Buttons**: Use shadcn Button component
6. **Icons**: Use `text-primary` for colored icons

## Replace Pattern

### Old Pattern:
```jsx
<div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
```

### New Pattern:
```jsx
<Card className="p-6 bg-card/80 backdrop-blur-xl">
```

### Color Replacements:
- `text-gray-800` → `text-gray-900 dark:text-white`
- `text-gray-600` → `text-gray-600 dark:text-gray-400`
- `bg-emerald-600` → `bg-primary`
- `text-emerald-600` → `text-primary`
- `hover:bg-emerald-700` → `hover:bg-primary/90`
- `#10B981` → `hsl(var(--chart-1))`
- `#3B82F6` → `hsl(var(--chart-2))`
- `#8B5CF6` → `hsl(var(--chart-3))`
- `#F59E0B` → `hsl(var(--chart-4))`