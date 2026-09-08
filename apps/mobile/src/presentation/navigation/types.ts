import type { NavigatorScreenParams } from '@react-navigation/native';
import type { CoiCalculationResponse } from '@/features/breedings/interfaces/breedings.types';

export type MainTabParamList = {
  Inventory: undefined;
  Health: undefined;
  Production: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  HerdDashboard: NavigatorScreenParams<MainTabParamList> | undefined;
  RegisterAnimal: undefined;
  SpeciesCatalog: undefined;
  HealthRecordForm: undefined;
  ProductionRecordForm: undefined;
  BreedingMatch: undefined;
  MatchRiskReport: {
    male: {
      id: string;
      crotal: string;
    };
    female: {
      id: string;
      crotal: string;
    };
    match: CoiCalculationResponse;
  };
  InputShowcase: undefined;
};

