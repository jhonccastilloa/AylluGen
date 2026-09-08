import type { Theme as NavigationTheme } from '@react-navigation/native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/useAuthStore';
import SignInScreen from '@/presentation/screens/auth/SignInScreen';
import SignUpScreen from '@/presentation/screens/auth/SignUpScreen';
import InputShowcaseScreen from '@/presentation/screens/showcase/InputShowcaseScreen';
import RegisterAnimalScreen from '@/features/animals/pages/RegisterAnimalScreen';
import BreedingMatchScreen from '@/features/breedings/pages/BreedingMatchScreen';
import MatchRiskReportScreen from '@/features/breedings/pages/MatchRiskReportScreen';
import HealthRecordFormScreen from '@/features/health/pages/HealthRecordFormScreen';
import ProductionRecordFormScreen from '@/features/production/pages/ProductionRecordFormScreen';
import SpeciesCatalogScreen from '@/features/species/pages/SpeciesCatalogScreen';
import TabsNavigator from '@/presentation/navigation/TabsNavigator';
import type { RootStackParamList } from '@/presentation/navigation/types';
import { useTranslation } from 'react-i18next';

const Stack = createNativeStackNavigator<RootStackParamList>();

interface StackNavigatorProps {
  theme: NavigationTheme;
}

const StackNavigator = ({ theme }: StackNavigatorProps) => {
  const { t } = useTranslation();
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen
              name="HerdDashboard"
              component={TabsNavigator}
            />
            <Stack.Screen
              name="RegisterAnimal"
              component={RegisterAnimalScreen}
            />
            <Stack.Screen
              name="SpeciesCatalog"
              component={SpeciesCatalogScreen}
            />
            <Stack.Screen
              name="BreedingMatch"
              component={BreedingMatchScreen}
            />
            <Stack.Screen
              name="MatchRiskReport"
              component={MatchRiskReportScreen}
            />
            <Stack.Screen
              name="HealthRecordForm"
              component={HealthRecordFormScreen}
              options={{
                headerShown: true,
                title: t('health.newRecord'),
              }}
            />
            <Stack.Screen
              name="ProductionRecordForm"
              component={ProductionRecordFormScreen}
              options={{
                headerShown: true,
                title: t('production.newRecord'),
              }}
            />
            <Stack.Screen
              name="InputShowcase"
              component={InputShowcaseScreen}
              options={{
                headerShown: true,
                title: t('showcase.title'),
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default StackNavigator;
export type { RootStackParamList };
