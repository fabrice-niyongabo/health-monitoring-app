import {RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';

export interface IDepartment {
  _id: string;
  name: string;
  numberOfBeds: number;
  type: string;
  createdAt: string;
}

export interface IBed {
  _id: string;
  bedNumber: string;
  departmentId: string;
  createdAt: string;
}

export interface IAction {
  type: string;
  payload: any;
}

export interface INavigationProp {
  navigation: NativeStackNavigationProp<any>;
  route?: RouteProp<any>;
}

export interface IDepartmentReducer {
  departments: IDepartment[];
  isLoading: boolean;
}

export interface ITestResultsReducer {
  patientTestResults: ITestResult[];
  nurseTestResults: ITestResult[];
  isLoading: boolean;
}

export interface IBedReducer {
  beds: IBed[];
  isLoading: boolean;
}

enum TEST_TYPES_ENUM {
  BLOOD_SUGAR = 'Blood Sugar',
  URIC_ACID = 'Uric Acid',
}

export interface ITestResult {
  nurseId: string | null;
  patientId: string;
  testType: TEST_TYPES_ENUM;
  hexCode: string;
  testValue: number;
  createdAt: string;
}
