import {extend, isArray} from './util';


/** Enum for a short form of the enumeration spec. */
export enum ShortEnumSpec {
  ENUMSPEC = '?' as any
}

export const SHORT_ENUM_SPEC = ShortEnumSpec.ENUMSPEC;

export interface EnumSpec<T> {
  name?: string;
  values?: T[];
}

export interface ExtendedEnumSpec<T> extends EnumSpec<T> {
  [prop: string]: any;
}

export function isEnumSpec(prop: any) {
  return prop === SHORT_ENUM_SPEC || (prop !== undefined && (!!prop.values || !!prop.name) && !isArray(prop));
}

export function initEnumSpec(prop: any, defaultName: string, defaultEnumValues: any[]): ExtendedEnumSpec<any> {
  return extend({}, {
      name: defaultName,
      values: defaultEnumValues
    }, prop);
}
