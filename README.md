# stampd

React Native styling, stamped at compile time.

Design tokens resolved to literal values in your bundle — zero runtime overhead, full TypeScript, light / dark / high-contrast built in.

```tsx
const Card = Styled.View({
  style: ({ theme }) => ({
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,       // → 16
    borderRadius: theme.radius.md,   // → 8
  }),
});
// ↓ Babel output
const Card = (props) => (
  <View style={{ backgroundColor: theme.colors.surface, padding: 16, borderRadius: 8 }} {...props} />
);
```

---

## Table of Contents

- [Quick Start](#quick-start)
- [How it works](#how-it-works)
- [Installation](#installation)
- [Setup](#setup)
  - [1. babel.config.js](#1-babelconfigjs)
  - [2. stampd.config.ts](#2-stampdconfigts)
  - [3. tsconfig.json](#3-tsconfigjson)
  - [4. StampdUIProvider](#4-wrap-your-app-with-stampdprovider)
- [Usage](#usage)
  - [Simple component](#simple-component)
  - [Static component](#static-component-no-runtime-cost)
  - [Text with default font](#text-with-default-font-auto-injected)
  - [Variants](#variants)
  - [Dynamic props](#dynamic-props)
  - [attrs — default props](#attrs--default-props)
  - [theme.fonts](#using-themefont)
- [StampdUIProvider & useStampdUI](#stampdprovider--usestampd)
  - [Switching themes](#switching-themes)
  - [High contrast](#high-contrast)
  - [Font scale](#font-scale)
  - [Accessing the theme](#accessing-the-theme-directly)
- [createTheme API](#createtheme-api)
- [Style priority](#style-priority)
- [Generated types](#generated-types--stampd-typesd-ts)
- [CLI — inspect output](#cli--inspect-generated-output)
- [Supported components](#supported-components)
- [License](#license)

---

## Quick Start

```bash
npm install stampd
```

**1.** Add the plugin to `babel.config.js`:
```js
module.exports = {
  presets: ['babel-preset-expo'],
  plugins: ['module:stampd'],
};
```

**2.** Create `stampd.config.ts` at your project root:
```ts
import { createTheme } from 'stampd/theme';

const light = { primary: '#2563EB', background: '#F8FAFC', text: '#0F172A' };
const dark  = { primary: '#3B82F6', background: '#0F172A', text: '#F8FAFC' };

export const config = createTheme({
  tokens: {
    spacing:  { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius:   { sm: 4, md: 8, lg: 16, full: 9999 },
  },
  theme: {
    light: { colors: light },
    dark:  { colors: dark  },
  },
  fonts: {
    default: { size: 14, family: 'Inter' },
  },
});
```

**3.** Add `stampd-types.d.ts` to `tsconfig.json`:
```json
{ "include": ["**/*.ts", "**/*.tsx", "stampd-types.d.ts"] }
```

**4.** Wrap your app:
```tsx
import { StampdUIProvider } from 'stampd/context';
import { config } from './stampd.config';

export default function App() {
  return <StampdUIProvider config={config}><RootNavigator /></StampdUIProvider>;
}
```

**5.** Start building:
```tsx
import { Styled } from 'stampd/styled';

const Button = Styled.TouchableOpacity({
  style: ({ theme }) => ({
    backgroundColor: theme.colors.primary,  // runtime — light/dark aware
    padding: theme.spacing.md,              // compile time → 16
    borderRadius: theme.radius.sm,          // compile time → 4
  }),
});
```

---

## How it works

stampd runs as a **Babel plugin** during your build:

1. Reads `stampd.config.ts` from your project root at compile time.
2. Resolves every `theme.spacing.md`, `theme.radius.sm`, `theme.fonts.sizes.lg`, etc. to its **literal value** and hardcodes it in the bundle.
3. Colors and other values that differ between light / dark are kept as runtime references — `useStampdUI()` is injected **only when actually needed**.
4. Variants are hoisted to module-level constants, allocated once.
5. Generates `stampd-types.d.ts` with inline literal types for full IDE autocomplete.

---

## Installation

```bash
npm install stampd
```

---

## Setup

### 1. babel.config.js

```js
module.exports = function (api) {
  // Re-run Babel when stampd.config.ts changes
  const configPath = require('path').join(__dirname, 'stampd.config.ts');
  try {
    api.cache.using(() => require('fs').statSync(configPath).mtimeMs);
  } catch {
    api.cache(true);
  }

  return {
    presets: ['babel-preset-expo'],
    plugins: ['module:stampd'],
  };
};
```

Enable debug output to inspect generated code:

```js
plugins: [['module:stampd', { debug: true }]],
```

---

### 2. stampd.config.ts

Create `stampd.config.ts` at the **root of your project** (next to `package.json`):

```ts
import { createTheme } from 'stampd/theme';

const lightColors = {
  primary:    '#2563EB',
  background: '#F8FAFC',
  surface:    '#FFFFFF',
  text:       '#0F172A',
  error:      '#DC2626',
};

const darkColors = {
  primary:    '#3B82F6',
  background: '#0F172A',
  surface:    '#1E293B',
  text:       '#F8FAFC',
  error:      '#EF4444',
};

export const config = createTheme({
  // Resolved at compile time — hardcoded in the bundle
  tokens: {
    spacing:  { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius:   { sm: 4, md: 8, lg: 16, full: 9999 },
    fontSize: { sm: 12, md: 14, lg: 16, xl: 20, xxl: 24 },
  },

  // Resolved at runtime — switch between light / dark / high-contrast
  theme: {
    light:        { colors: lightColors },
    dark:         { colors: darkColors },
    highContrast: { colors: { background: '#000000', text: '#FFFFFF' } }, // partial overrides
  },

  // Static font config — auto-injected into Text / TextInput
  fonts: {
    default: { size: 14, family: 'Inter' },
    sizes:   { sm: 12, md: 14, lg: 16, xl: 20 },
    family:  { inter: 'Inter', mono: 'JetBrainsMono' },
  },
});
```

`createTheme` validates at startup that `dark` has the same keys as `light`, warning if they diverge.

---

### 3. tsconfig.json

Include the auto-generated type file:

```json
{
  "include": ["**/*.ts", "**/*.tsx", "stampd-types.d.ts"]
}
```

---

### 4. Wrap your app with StampdUIProvider

```tsx
// App.tsx
import { StampdUIProvider } from 'stampd/context';
import { config } from './stampd.config';

export default function App() {
  return (
    <StampdUIProvider config={config}>
      <RootNavigator />
    </StampdUIProvider>
  );
}
```

---

## Usage

### Simple component

```tsx
import { Styled } from 'stampd';

const Card = Styled.View({
  style: ({ theme }) => ({
    backgroundColor: theme.colors.surface,  // runtime — stays as ref
    padding: theme.spacing.md,              // compile time → 16
    borderRadius: theme.radius.md,          // compile time → 8
  }),
});
```

**Compile-time output:**

```tsx
import { View } from 'react-native';

const Card = (props) => (
  <View
    style={[{ backgroundColor: theme.colors.surface }, { padding: 16, borderRadius: 8 }]}
    {...props}
  />
);
```

---

### Static component (no runtime cost)

When there are no dynamic values, the output is a plain component — no context, no hook:

```tsx
const Divider = Styled.View({
  style: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
});
```

---

### Text with default font auto-injected

`Styled.Text` and `Styled.TextInput` automatically receive `fontFamily` and `fontSize` from `fonts.default` as the base layer. Your component styles take precedence:

```tsx
const Label = Styled.Text({
  style: ({ theme }) => ({
    color: theme.colors.text,
    fontWeight: '600',
  }),
});
```

**Output:**

```tsx
<Text
  style={[
    { fontFamily: 'Inter', fontSize: 14 },   // ← auto from fonts.default
    { color: theme.colors.text, fontWeight: '600' },
  ]}
  {...props}
/>
```

Override per-component by setting `fontFamily` / `fontSize` in your style — the last item wins.

---

### Variants

```tsx
const Button = Styled.TouchableOpacity({
  style: ({ theme }) => ({
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  }),
  variants: {
    variant: {
      outline: ({ theme }) => ({
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: theme.colors.primary,
      }),
      ghost: () => ({
        backgroundColor: 'transparent',
      }),
      danger: ({ theme }) => ({
        backgroundColor: theme.colors.error,
      }),
    },
    size: {
      sm: ({ theme }) => ({
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
      }),
      full: () => ({ width: '100%' as const }),
    },
  },
});

// Usage — types are fully inferred:
<Button variant="outline" size="sm" onPress={handlePress} />
```

Passing an invalid variant value (`variant="invalid"`) is a TypeScript error.

---

### Dynamic props

Any prop that is not a variant key is automatically forwarded and available in the style function:

```tsx
const Tag = Styled.View({
  style: ({ theme, selected }) => ({
    backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
    borderWidth: selected ? 0 : 1,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.full,
  }),
});

<Tag selected={isActive} />
```

---

### attrs — default props

```tsx
const Input = Styled.TextInput({
  style: ({ theme }) => ({
    color: theme.colors.text,
    padding: theme.spacing.sm,
  }),
  attrs: {
    placeholderTextColor: '#94A3B8',
    autoCapitalize: 'none',
  },
});
```

---

### Using theme.fonts

```tsx
const Heading = Styled.Text({
  style: ({ theme }) => ({
    fontFamily: theme.fonts.family.inter,  // compile time → "Inter"
    fontSize: theme.fonts.sizes.xl,        // compile time → 20
    fontWeight: '700',
    color: theme.colors.text,
  }),
});
```

`theme.fonts.*` is resolved at compile time — literal values are hardcoded in the output.

---

## StampdUIProvider & useStampdUI

### Switching themes

```tsx
import { useStampdUI, ThemeMode } from 'stampd/context';

function ThemeToggle() {
  const { themeMode, setThemeMode } = useStampdUI();

  return (
    <Pressable onPress={() =>
      setThemeMode(themeMode === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK)
    }>
      <Text>Toggle theme</Text>
    </Pressable>
  );
}
```

| `ThemeMode`            | Behavior                           |
|------------------------|------------------------------------|
| `ThemeMode.SYSTEM`     | Follows device setting *(default)* |
| `ThemeMode.LIGHT`      | Always light                       |
| `ThemeMode.DARK`       | Always dark                        |

---

### High contrast

```tsx
const { highContrast, setHighContrast } = useStampdUI();

<Switch value={highContrast} onValueChange={setHighContrast} />
```

When enabled, the `highContrast` colors from `stampd.config.ts` are **deep-merged** on top of the active light / dark theme. Only the keys you define are overridden — everything else stays unchanged.

---

### Font scale

```tsx
import { useStampdUI, FontScaleMode } from 'stampd/context';

const { fontScale, fontScaleMode, setFontScaleMode } = useStampdUI();
```

| `FontScaleMode`           | Behavior                                      |
|---------------------------|-----------------------------------------------|
| `FontScaleMode.SYSTEM`    | Follows device accessibility setting *(default)* |
| `FontScaleMode.FIXED_1`   | Always 1×                                     |
| `FontScaleMode.FIXED_1_5` | Always 1.5×                                   |
| `FontScaleMode.FIXED_2`   | Always 2×                                     |

---

### Accessing the theme directly

```tsx
const { theme } = useStampdUI();

// theme.colors.primary, theme.spacing.md, theme.fonts.family.inter, ...
```

---

## createTheme API

```ts
import { createTheme, InferTheme } from 'stampd/theme';

export const config = createTheme({
  // ── Compile-time tokens ──────────────────────────────────────────────────
  tokens: {
    spacing:  { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
    radius:   { sm: 4, md: 8, lg: 16, full: 9999 },
    fontSize: { sm: 12, md: 14, lg: 16, xl: 20, xxl: 24 },
  },

  // ── Runtime theme ────────────────────────────────────────────────────────
  theme: {
    light:        { colors: lightColors },
    dark:         { colors: darkColors },
    highContrast: { colors: { background: '#000' } }, // DeepPartial — only overrides what's set
  },

  // ── Fonts ────────────────────────────────────────────────────────────────
  fonts: {
    default: { size: 14, family: 'Inter' },  // auto-injected in Text / TextInput
    sizes:   { sm: 12, md: 14, lg: 16, xl: 20 },
    family:  { inter: 'Inter', mono: 'JetBrainsMono' },
  },
});

// Infer the resolved theme type:
export type AppTheme = InferTheme<typeof config>;
```

---

## Style priority

When multiple layers are applied, the **last item wins** (React Native style array behavior):

```
fonts.default  <  base style  <  variants  <  style prop passed by user
```

The user's `style` prop always wins over everything defined at component level.

---

## Generated types — stampd-types.d.ts

On every build, stampd generates `stampd-types.d.ts` at your project root with **inline literal types** for full IDE autocomplete — no imports needed in your components:

```ts
// ⚡ Auto-generated by stampd — do not edit manually.
declare global {
  namespace StyledSystem {
    interface Theme {
      spacing:  { xs: 4; sm: 8; md: 16; lg: 24; xl: 32 };
      radius:   { sm: 4; md: 8; lg: 16; full: 9999 };
      fontSize: { sm: 12; md: 14; lg: 16; xl: 20; xxl: 24 };
      colors:   { primary: "#2563EB"; background: "#F8FAFC"; ... };
      fonts: {
        default: { size: 14; family: "Inter" };
        sizes:   { sm: 12; md: 14; lg: 16; xl: 20 };
        family:  { inter: "Inter"; mono: "JetBrainsMono" };
      };
    }
  }
}
```

The file is regenerated automatically when `stampd.config.ts` changes.

---

## CLI — inspect generated output

Inspect exactly what the plugin emits for any file without running the full bundler:

```bash
node node_modules/stampd/dist/cli/runTransform.js <input> <output> [config]

# Example:
node node_modules/stampd/dist/cli/runTransform.js \
  src/screens/Login.tsx \
  /tmp/Login.out.js \
  stampd.config.ts
```

Add as a script in `package.json`:

```json
{
  "scripts": {
    "transform": "node node_modules/stampd/dist/cli/runTransform.js"
  }
}
```

---

## Supported components

`Styled` ships with typed factories for all standard React Native components:

| Component                       | Style type    |
|---------------------------------|---------------|
| `Styled.View`                   | `ViewStyle`   |
| `Styled.Text`                   | `TextStyle`   |
| `Styled.TextInput`              | `TextStyle`   |
| `Styled.Image`                  | `ImageStyle`  |
| `Styled.ImageBackground`        | `ViewStyle`   |
| `Styled.ScrollView`             | `ViewStyle`   |
| `Styled.Pressable`              | `ViewStyle`   |
| `Styled.TouchableOpacity`       | `ViewStyle`   |
| `Styled.KeyboardAvoidingView`   | `ViewStyle`   |
| `Styled.FlatList`               | `ViewStyle`   |
| `Styled.SectionList`            | `ViewStyle`   |

---

## License

MIT
