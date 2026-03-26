# babel-plugin-styled-native

Babel plugin for React Native / Expo that transforms `Styled.X()` declarations into components at **compile time**, with theme token resolution hardcoded into the output — zero runtime overhead.

---

## Features

- **Compile-time token resolution** — `theme.spacing.p4` → `16` in the output
- **Variants system** — `variant`, `size`, and any other prop-driven style groups
- **Platform.select** — shadow tokens using `Platform.select` preserved correctly
- **Auto type generation** — generates `styled-types.d.ts` with inline literal types (Prisma-style)
- **Dark/light theme validation** — warns at build time if `dark` and `light` keys diverge
- **Selective `useTheme` injection** — only added when runtime theme access is actually needed

---

## Installation

```bash
npm install babel-plugin-styled-native
```

---

## Setup

### 1. babel.config.js

```js
module.exports = function (api) {
  // Cache busting when styled.config.ts changes
  const styledConfigPath = require('path').join(__dirname, 'styled.config.ts');
  try {
    api.cache.using(() => require('fs').statSync(styledConfigPath).mtimeMs);
  } catch {
    api.cache(true);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-styled-native',
    ],
  };
};
```

### 2. styled.config.ts

```ts
import { createTheme } from 'babel-plugin-styled-native/createTheme';

const spacing = { p1: 4, p2: 8, p4: 16, p6: 24 };
const lightColors = { primary: '#2563EB', background: '#F8FAFC', /* ... */ };
const darkColors  = { primary: '#3B82F6', background: '#0F172A', /* ... */ };

export const config = createTheme({
  tokens: {
    colors: lightColors,
    spacing,
    // radius, typography, shadows, size, ...
  },
  theme: {
    light: { colors: lightColors },
    dark:  { colors: darkColors  },
  },
});
```

### 3. tsconfig.json

Add `styled-types.d.ts` (auto-generated) to your TypeScript includes:

```json
{
  "include": ["**/*.ts", "**/*.tsx", "styled-types.d.ts"]
}
```

---

## Usage

### Simple component

```tsx
import { Styled } from '@/theme/useStyled';

const Box = Styled.View({
  style: ({ theme }) => ({
    backgroundColor: theme.colors.background,
    padding: theme.spacing.p4,
    borderRadius: 8,
  }),
});
```

**Output:**

```tsx
import { View } from 'react-native';

const Box = (props) => (
  <View
    style={{ backgroundColor: '#F8FAFC', padding: 16, borderRadius: 8 }}
    {...props}
  />
);
```

### Component with variants

```tsx
const Button = Styled.TouchableOpacity({
  style: ({ theme }) => ({
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.roundedMd,
    paddingVertical: theme.spacing.p3,
    paddingHorizontal: theme.spacing.p4,
  }),
  variants: {
    variant: {
      outline: ({ theme }) => ({
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
      }),
      danger: ({ theme }) => ({ backgroundColor: theme.colors.error }),
    },
    size: {
      sm: ({ theme }) => ({ paddingVertical: theme.spacing.p2 }),
      full: () => ({ width: '100%' }),
    },
  },
});

// Usage:
<Button variant="outline" size="sm">...</Button>
```

### Dynamic props

```tsx
const Chip = Styled.View({
  style: ({ theme, selected }) => ({
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
    padding: theme.spacing.p2,
  }),
});

// Usage:
<Chip selected={isActive} />
```

---

## createTheme API

```ts
import { createTheme, InferTheme } from 'babel-plugin-styled-native/createTheme';

export const config = createTheme({
  tokens: { /* all design tokens — resolved at compile time */ },
  theme: {
    light: { /* runtime light overrides */ },
    dark:  { /* runtime dark overrides  */ },
  },
});

// Infer the runtime theme type for useTheme / ThemeContext:
export type AppTheme = InferTheme<typeof config>;
```

`createTheme` validates at build time that `dark` and `light` have identical keys, printing a warning if they diverge.

---

## Generated types

Each build generates `styled-types.d.ts` at your project root with inline literal types:

```ts
declare global {
  namespace StyledSystem {
    interface Theme {
      colors: {
        primary: "#2563EB";
        background: "#F8FAFC";
        // ...
      };
      spacing: {
        p4: 16;
        // ...
      };
    }
  }
}
```

These types power IDE autocomplete for `theme.colors.*`, `theme.spacing.*`, etc.

---

## How it works

1. **`loadStyledConfig`** reads `styled.config.ts` from `process.cwd()` using `require.extensions` + `@babel/plugin-transform-modules-commonjs`, with a `react-native` mock to avoid runtime errors in design-token files.
2. **`resolveThemePath`** navigates the loaded token object to resolve `theme.spacing.p4` → `16`.
3. **`transformStyled`** / **`transformStyledWithVariants`** replace `Styled.X({...})` with a plain component, hoisting base styles and variant maps as module-level constants.
4. **`generateThemeTypes`** emits `styled-types.d.ts` with inline literal types whenever the config changes (mtime-based cache).

---

## License

MIT
