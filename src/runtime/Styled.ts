import type React from "react";
import type { ComponentType } from "react";
import type {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  Pressable,
  TouchableOpacity,
  FlatList,
  SectionList,
  KeyboardAvoidingView,
  ImageBackground,
  TouchableWithoutFeedback,
  ViewStyle,
  TextStyle,
  ImageStyle,
} from "react-native";

// Base vazia — augmentada pelo stampd-types.d.ts gerado no projeto do usuário
declare global {
  namespace StyledSystem {
    interface Theme {}
  }
}

type Theme = StyledSystem.Theme;

type StyleInput<S> = S | ((args: { theme: Theme }) => S);

type VariantProps<V> = V extends Record<string, Record<string, any>>
  ? { [K in keyof V]?: keyof V[K] }
  : {};

type StyledConfig<C extends React.ElementType, S> = {
  style?: StyleInput<S>;
  variants?: Record<string, Record<string, StyleInput<S>>>;
  attrs?: Partial<React.ComponentPropsWithRef<C>> | ((args: { theme: Theme }) => Partial<React.ComponentPropsWithRef<C>>);
};

type StyledFactory<C extends React.ElementType, S> = <V extends Record<string, Record<string, StyleInput<S>>> = {}>(
  config: StyledConfig<C, S> & { variants?: V },
) => ComponentType<React.ComponentPropsWithRef<C> & VariantProps<V>>;

type StyledMap = {
  View: StyledFactory<typeof View, ViewStyle>;
  Text: StyledFactory<typeof Text, TextStyle>;
  Image: StyledFactory<typeof Image, ImageStyle>;
  ImageBackground: StyledFactory<typeof ImageBackground, ViewStyle>;
  ScrollView: StyledFactory<typeof ScrollView, ViewStyle>;
  TextInput: StyledFactory<typeof TextInput, TextStyle>;
  Pressable: StyledFactory<typeof Pressable, ViewStyle>;
  TouchableOpacity: StyledFactory<typeof TouchableOpacity, ViewStyle>;
  TouchableWithoutFeedback: StyledFactory<typeof TouchableWithoutFeedback, ViewStyle>;
  FlatList: StyledFactory<typeof FlatList, ViewStyle>;
  SectionList: StyledFactory<typeof SectionList, ViewStyle>;
  KeyboardAvoidingView: StyledFactory<typeof KeyboardAvoidingView, ViewStyle>;
};

/**
 * Placeholder para compile time.
 * Nunca executado em runtime — o plugin Babel substitui todas as chamadas
 * Styled.X(...) por componentes React Native reais durante o build.
 */
export const Styled = new Proxy({} as StyledMap, {
  get: (_, componentName: string) => {
    return () => {
      throw new Error(
        `[stampd] Styled.${componentName}() não foi transformado. ` +
          `Verifique se o plugin está configurado no babel.config.js.`,
      );
    };
  },
});
