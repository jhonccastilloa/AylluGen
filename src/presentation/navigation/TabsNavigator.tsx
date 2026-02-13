import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useUnistyles } from 'react-native-unistyles';
import HerdDashboardScreen from '@/features/animals/pages/HerdDashboardScreen';
import HealthRecordsScreen from '@/features/health/pages/HealthRecordsScreen';
import ProductionRecordsScreen from '@/features/production/pages/ProductionRecordsScreen';
import SettingsScreen from '@/presentation/screens/settings/SettingsScreen';
import AppIcon from '@/presentation/components/appIcon/AppIcon';
import type { MainTabParamList } from '@/presentation/navigation/types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const inventoryTabIcon = ({ color }: { color: string }) => (
  <AppIcon name="home" size="sm" mColor={color} />
);
const healthTabIcon = ({ color }: { color: string }) => (
  <AppIcon name="calendarBlank" size="sm" mColor={color} />
);
const productionTabIcon = ({ color }: { color: string }) => (
  <AppIcon name="currencyDolar" size="sm" mColor={color} />
);
const settingsTabIcon = ({ color }: { color: string }) => (
  <AppIcon name="slidersHorizontal" size="sm" mColor={color} />
);

const TabsNavigator = () => {
  const { t } = useTranslation();
  const { theme } = useUnistyles();

  return (
    <Tab.Navigator
      initialRouteName="Inventory"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          minHeight: 60,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarAllowFontScaling: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarHideOnKeyboard: true,
        tabBarIcon:
          route.name === 'Inventory'
            ? inventoryTabIcon
            : route.name === 'Health'
              ? healthTabIcon
              : route.name === 'Production'
                ? productionTabIcon
                : settingsTabIcon,
      })}
    >
      <Tab.Screen
        name="Inventory"
        component={HerdDashboardScreen}
        options={{ tabBarLabel: t('home') }}
      />
      <Tab.Screen
        name="Health"
        component={HealthRecordsScreen}
        options={{ tabBarLabel: t('health.tab') }}
      />
      <Tab.Screen
        name="Production"
        component={ProductionRecordsScreen}
        options={{ tabBarLabel: t('production.tab') }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: t('settings') }}
      />
    </Tab.Navigator>
  );
};

export default TabsNavigator;
