import { ColorTheme, IconSizeTheme } from '@/core/constants/theme';
import iconRegistry, { IconName } from './iconRegistry';
import { TouchableOpacity } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

interface AppIconProps {
  name: IconName;
  size?: IconSizeTheme;
  color?: ColorTheme;
  mColor?: string;
  onPress?: () => void;
}

const AppIcon = ({
  name,
  size = 'md',
  color = 'primary',
  mColor,
  onPress,
}: AppIconProps) => {
  const { theme } = useUnistyles();
  const IconComponent = iconRegistry[name];
  if (!IconComponent) {
    return null;
  }
  if (onPress)
    return (
      <TouchableOpacity onPress={onPress}>
        {IconComponent({
          size: typeof size === 'number' ? size : theme.icon.size[size],
          color: mColor || theme.colors[color],
        })}
      </TouchableOpacity>
    );
  return IconComponent({
    size: typeof size === 'number' ? size : theme.icon.size[size],
    color: mColor || theme.colors[color],
  });
};

export default AppIcon;
