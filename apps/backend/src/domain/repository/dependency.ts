import { DependencyType } from './enums';

export interface Dependency {
  name: string;
  version: string;
  type: DependencyType;
}
