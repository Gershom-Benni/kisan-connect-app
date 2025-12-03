// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight, SymbolViewProps } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

type IconMapping = Record<SymbolViewProps['name'], ComponentProps<typeof MaterialIcons>['name']>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Existing mappings
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  
  // Mappings for Dashboard, Equipment, and Rental screens
  'mic.fill': 'mic',
  'waveform.circle.fill': 'keyboard_voice',
  'arrow.up.circle.fill': 'send',
  'magnifyingglass': 'search',
  'xmark.circle.fill': 'cancel',
  'calendar.badge.plus': 'event_available',
  'bolt.circle.fill': 'flash_on',
  'mappin.and.ellipse': 'place',
  'barcode': 'qr_code',
  'location.fill': 'location_on',
  'tag.fill': 'label',
  'cube.box': 'inventory',
  'checkmark.circle.fill': 'check_circle',
  'shippingbox.fill': 'local_shipping',
  'clock.badge.checkmark': 'assignment_turned_in',
  'clock.fill': 'schedule',
  'info.circle.fill': 'info',
  'lock.shield.fill': 'vpn_key',
} as unknown as IconMapping; // FIX: Using 'as unknown as IconMapping' resolves the partial mapping error.

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}