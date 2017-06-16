
import {Axis} from 'vega-lite/build/src/axis';
import {Bin} from 'vega-lite/build/src/bin';
import {Channel} from 'vega-lite/build/src/channel';
import * as vlFieldDef from 'vega-lite/build/src/fielddef';
import {Mark} from 'vega-lite/build/src/mark';

import {Scale} from 'vega-lite/build/src/scale';
import {Legend} from 'vega-lite/build/src/legend';
import {SortOrder, SortField} from 'vega-lite/build/src/sort';
import {TimeUnit} from 'vega-lite/build/src/timeunit';
import {Type as VLType} from 'vega-lite/build/src/type';
import {ExpandedType} from './ExpandedType';

import compileScaleType from 'vega-lite/build/src/compile/scale/type';

import {Wildcard, isWildcard, SHORT_WILDCARD, WildcardProperty} from '../wildcard';
import {AggregateOp} from 'vega-lite/build/src/aggregate';
import {FieldDef} from 'vega-lite/build/src/fielddef';

export type EncodingQuery = FieldQuery | ValueQuery | AutoCountQuery;

export interface EncodingQueryBase {
  channel: WildcardProperty<Channel>;
}

export interface ValueQuery extends EncodingQueryBase {
  value: WildcardProperty<boolean | number | string>;
}

export function isValueQuery(encQ: EncodingQuery): encQ is ValueQuery {
  return encQ !== null && encQ !== undefined && encQ['value'];
}

export function isFieldQuery(encQ: EncodingQuery): encQ is FieldQuery {
  return encQ !== null && encQ !== undefined && encQ['field'];
}

export function isAutoCountQuery(encQ: EncodingQuery): encQ is AutoCountQuery {
  return encQ !== null && encQ !== undefined && 'autoCount' in encQ;
}

export function isDisabledAutoCountQuery(encQ: EncodingQuery) {
  return isAutoCountQuery(encQ) && encQ.autoCount === false;
}

export function isEnabledAutoCountQuery(encQ: EncodingQuery) {
  return isAutoCountQuery(encQ) && encQ.autoCount === true;
}

export interface AutoCountQuery extends EncodingQueryBase {
  autoCount: WildcardProperty<boolean>;
  type: 'quantitative';
}

export interface FieldQuery extends EncodingQueryBase {
  channel: WildcardProperty<Channel>;

  // FieldDef
  aggregate?: WildcardProperty<AggregateOp>;
  timeUnit?: WildcardProperty<TimeUnit>;

  /**
   * Special flag for enforcing that the field should have either timeUnit, bin, or aggregate
   */
  hasFn?: boolean;

  bin?: boolean | BinQuery | SHORT_WILDCARD;
  scale?: boolean | ScaleQuery | SHORT_WILDCARD;

  sort?: SortOrder | SortField;

  field?: WildcardProperty<string>;
  type?: WildcardProperty<ExpandedType>;
  // TODO: value

  axis?: boolean | AxisQuery | SHORT_WILDCARD;
  legend?: boolean | LegendQuery | SHORT_WILDCARD;
}

// Using Mapped Type from TS2.1 to declare query for an object without nested property
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-1.html#mapped-types
export type FlatQuery<T> = {
  [P in keyof T]: WildcardProperty<T[P]>
};

export type FlatQueryWithEnableFlag<T> = (Wildcard<boolean> | {}) & FlatQuery<T>;

export type BinQuery = FlatQueryWithEnableFlag<Bin>;
export type ScaleQuery =  FlatQueryWithEnableFlag<Scale>;
export type AxisQuery =  FlatQueryWithEnableFlag<Axis>;
export type LegendQuery = FlatQueryWithEnableFlag<Legend>;


export function toFieldDef(encQ: FieldQuery | AutoCountQuery,
    props: (keyof (FieldQuery))[] = ['aggregate', 'bin', 'timeUnit', 'field', 'type']) {
  if (isFieldQuery(encQ)) {
    return props.reduce((fieldDef: FieldDef<string>, prop: keyof FieldQuery) => {
      if (isWildcard(encQ[prop])) {
        throw new Error(`Cannot convert ${JSON.stringify(encQ)} to fielddef: ${prop} is wildcard`);
      } else if (encQ[prop] !== undefined) {
        fieldDef[prop] = encQ[prop];
      }
      return fieldDef;
    }, {});

  } else {
    if (encQ.autoCount === false) {
      throw new Error(`Cannot convert {autoCount: false} into a field def`);
    } else {
      return props.reduce((fieldDef: FieldDef<string>, prop: keyof FieldQuery) => {
        if (isWildcard(encQ[prop])) {
          throw new Error(`Cannot convert ${JSON.stringify(encQ)} to fielddef: ${prop} is wildcard`);
        }
        switch (prop) {
          case 'type':
            fieldDef.type = 'quantitative';
            break;
          case 'aggregate':
            fieldDef.aggregate = 'count';
            break;
        }
        return fieldDef;
      }, {});
    }
  }
}

/**
 * Is a field query continuous field?
 * This method is applicable only for fieldQuery without wildcard
 */
export function isContinuous(encQ: EncodingQuery) {
  return isFieldQuery(encQ) && vlFieldDef.isContinuous(toFieldDef(encQ, ['bin', 'timeUnit', 'field', 'type']));
}

/**
 * Is a field query discrete field?
 * This method is applicable only for fieldQuery without wildcard
 */
export function isDiscrete(encQ: EncodingQuery) {
  return isFieldQuery(encQ) && vlFieldDef.isDiscrete(toFieldDef(encQ, ['bin', 'timeUnit', 'field', 'type']));
}

/**
 *  Returns the true scale type of an encoding.
 *  @returns {ScaleType} If the scale type was not specified, it is inferred from the encoding's Type.
 *  @returns {undefined} If the scale type was not specified and Type (or TimeUnit if applicable) is a Wildcard, there is no clear scale type
 */

export function scaleType(fieldQ: FieldQuery) {
  const scale: ScaleQuery = fieldQ.scale === true || fieldQ.scale === SHORT_WILDCARD ? {} : fieldQ.scale || {};

  const {type, channel, timeUnit, bin} = fieldQ;

  // HACK: All of markType, hasTopLevelSize, and scaleConfig only affect
  // sub-type of ordinal to quantitative scales (point or band)
  // Currently, most of scaleType usage in CompassQL doesn't care about this subtle difference.
  // Thus, instead of making this method requiring the global mark and topLevelSize,
  // we will just call it with mark = undefined and hasTopLevelSize = false.
  // Thus, currently, we will always get a point scale unless a CompassQuery specifies band.
  const markType: Mark = undefined;
  const hasTopLevelSize = false;
  const scaleConfig = {};

  if (isWildcard(scale.type) || isWildcard(type) || isWildcard(channel) || isWildcard(bin)) {
    return undefined;
  }

  // If scale type is specified, then use scale.type
  if (scale.type) {
    return scale.type;
  }

  let rangeStep: number = undefined;
  // Note: Range step currently does not matter as we don't pass mark into compileScaleType anyway.
  // However, if we pass mark, we could use a rule like the following.
  // I also have few test cases listed in encoding.test.ts
  // if (channel === 'x' || channel === 'y') {
  //   if (isWildcard(scale.rangeStep)) {
  //     if (isShortWildcard(scale.rangeStep)) {
  //       return undefined;
  //     } else if (scale.rangeStep.enum) {
  //       const e = scale.rangeStep.enum;
  //       // if enumerated value contains enum then we can't be sure
  //       if (contains(e, undefined) || contains(e, null)) {
  //         return undefined;
  //       }
  //       rangeStep = e[0];
  //     }
  //   }
  // }

  // if type is fixed and it's not temporal, we can ignore time unit.
  if (type === 'temporal' && isWildcard(timeUnit)) {
    return undefined;
  }

  // if type is fixed and it's not quantitative, we can ignore bin
  if (type === 'quantitative' && isWildcard(bin)) {
    return undefined;
  }

  let vegaLiteType = type;
  if (vegaLiteType === ExpandedType.KEY) {
    vegaLiteType = VLType.NOMINAL;
  }

  return compileScaleType(
    scale.type, channel,
    {type: vegaLiteType, timeUnit: timeUnit as TimeUnit, bin: bin as Bin},
    markType, hasTopLevelSize, rangeStep, scaleConfig
  );
}
