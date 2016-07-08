import {Channel, X, Y, STACK_GROUP_CHANNELS} from 'vega-lite/src/channel';
import {Config} from 'vega-lite/src/config';
import {AggregateOp} from 'vega-lite/src/aggregate';
import {Data} from 'vega-lite/src/data';
import {Mark, BAR, AREA} from 'vega-lite/src/mark';
import {ScaleType} from 'vega-lite/src/scale';
import {StackOffset, StackProperties} from 'vega-lite/src/stack';
import {TimeUnit} from 'vega-lite/src/timeunit';
import {Type} from 'vega-lite/src/type';

import {QueryConfig} from './config';
import {generate} from './generate';
import {nest} from './nest';
import {rank} from './ranking/ranking';
import {Schema} from './schema';
import {contains, extend, keys, some} from './util';

export function query(query: Query, schema: Schema, config?: Config) {
  // Merge optional config with the config provided in the query.
  // Config in the query has higher precedence.
  // Note that we're not merging this with DEFAULT_QUERY_CONFIG as
  // we will do it in generate anyway.
  config = extend({}, config, query.config);

  query = normalize(query);
  const answerSet = generate(query.spec, schema, config);
  const nestedAnswerSet = nest(answerSet, query);
  return rank(nestedAnswerSet, query, schema, 0);
}

/**
 * Normalize the non-nested version of the query to a standardize nested
 */
export function normalize(q: Query): Query {
  if (q.groupBy) {
    let nest: Nest = {
      groupBy: q.groupBy
    };

    if (q.orderBy) {
      nest.orderGroupBy = q.orderBy;
    }

    let normalizedQ: Query = {
      spec: q.spec,
      nest: [nest],
    };

    if (q.chooseBy) {
      normalizedQ.chooseBy = q.chooseBy;
    }

    if (q.config) {
      normalizedQ.config = q.config;
    }

    return normalizedQ;
  }
  return q;
}


/** Enum for a short form of the enumeration spec. */
export enum ShortEnumSpec {
  ENUMSPEC = '?' as any
}

export const SHORT_ENUM_SPEC = ShortEnumSpec.ENUMSPEC;

export interface EnumSpec<T> {
  name?: string;
  values?: T[];
}

export function isEnumSpec(prop: any) {
  return prop === SHORT_ENUM_SPEC || (prop !== undefined && !!prop.values);
}

export function initEnumSpec(prop: any, defaultName: string, defaultEnumValues: any[]): EnumSpec<any> & any {
  return extend({}, {
      name: defaultName,
      values: defaultEnumValues
    }, prop);
}

function enumSpecShort(value: any): string {
  return (isEnumSpec(value) ? SHORT_ENUM_SPEC : value) + '';
}

export interface Query {
  spec: SpecQuery;
  nest?: Nest[];
  groupBy?: string;
  orderBy?: string;
  chooseBy?: string;
  config?: QueryConfig;
}

export interface Nest {
  groupBy: string;
  orderGroupBy?: string;
}

export interface SpecQuery {
  data?: Data;
  mark: Mark | EnumSpec<Mark> | ShortEnumSpec;
  transform?: TransformQuery;
  encodings: EncodingQuery[];

  // TODO: make config query (not important at all, only for the sake of completeness.)
  config?: Config;
}

export function isAggregate(specQ: SpecQuery) {
  return some(specQ.encodings, (encQ: EncodingQuery) => {
    return (!isEnumSpec(encQ.aggregate) && !!encQ.aggregate) || encQ.autoCount === true;
  });
}

export function stringifySpecQuery (specQ: SpecQuery): string {
  const mark = enumSpecShort(specQ.mark);
  const encodings = specQ.encodings.map(stringifyEncodingQuery)
                        .sort()
                        .join('|');  // sort at the end to ignore order
  const _stack = stack(specQ);

  return mark + '|' +
      // TODO: transform
      (_stack ? 'stack=' + _stack.offset + '|' : '') +
      encodings;
}

/**
 * @return the stack offset type for the specQuery
 */
export function stack(specQ: SpecQuery): StackProperties {
  const config = specQ.config;
  const stacked = (config && config.mark) ? config.mark.stacked : undefined;

  // Should not have stack explicitly disabled
  if (contains([StackOffset.NONE, null, false], stacked)) {
    return null;
  }

  // Should have stackable mark
  if (!contains([BAR, AREA], specQ.mark)) {
    return null;
  }

  // Should be aggregate plot
  if (!isAggregate(specQ)) {
    return null;
  }

  const stackByChannels = specQ.encodings.reduce((sc, encQ: EncodingQuery) => {
    if (contains(STACK_GROUP_CHANNELS, encQ.channel) && !encQ.aggregate) {
      sc.push(encQ.channel);
    }
    return sc;
  }, []);

  if (stackByChannels.length === 0) {
    return null;
  }

  // Has only one aggregate axis
  const xEncQ = specQ.encodings.reduce((f, encQ: EncodingQuery) => {
    return f || (encQ.channel === Channel.X ? encQ : null);
  }, null);
  const yEncQ = specQ.encodings.reduce((f, encQ: EncodingQuery) => {
    return f || (encQ.channel === Channel.Y ? encQ : null);
  }, null);
  const xIsAggregate = !!xEncQ && (!!xEncQ.aggregate || !!xEncQ.autoCount);
  const yIsAggregate = !!yEncQ && (!!yEncQ.aggregate || !!yEncQ.autoCount);

  if (xIsAggregate !== yIsAggregate) {
    return {
      groupbyChannel: xIsAggregate ? (!!yEncQ ? Y : null) : (!!xEncQ ? X : null),
      fieldChannel: xIsAggregate ? X : Y,
      stackByChannels: stackByChannels,
      offset: stacked || StackOffset.ZERO
    };
  }
  return null;
}

export interface TransformQuery {
  filter: FilterQuery[];
}

export interface FilterQuery {
  field: Field | EnumSpec<Field> | ShortEnumSpec;
  operator: string;
  operand: any | EnumSpec<any> | ShortEnumSpec;
}

type Field = string;

export interface EncodingQuery {
  channel: Channel | EnumSpec<Channel> | ShortEnumSpec;

  // FieldDef
  aggregate?: AggregateOp | EnumSpec<AggregateOp> | ShortEnumSpec;
  /** Internal flag for representing automatic count that are added to plots with only ordinal or binned fields. */
  autoCount?: boolean | EnumSpec<boolean> | ShortEnumSpec;
  timeUnit?: TimeUnit | EnumSpec<TimeUnit> | ShortEnumSpec;

  bin?: boolean | BinQuery | ShortEnumSpec;
  scale?: boolean | ScaleQuery | ShortEnumSpec;

  field?: Field | EnumSpec<Field> | ShortEnumSpec;
  type?: Type | EnumSpec<Type> | ShortEnumSpec;
  // TODO: value

  // TODO: scaleQuery, axisQuery, legendQuery
}

export interface BinQuery extends EnumSpec<boolean> {
  maxbins?: number | EnumSpec<number> | ShortEnumSpec;
}

export interface ScaleQuery extends EnumSpec<boolean> {
  // TODO: add other properties from vegalite/src/scale
  type?: ScaleType | EnumSpec<ScaleType> | ShortEnumSpec;
}

export function isDimension(encQ: EncodingQuery) {
  return contains([Type.NOMINAL, Type.ORDINAL], encQ.type) ||
      (!isEnumSpec(encQ.bin) && !!encQ.bin) ||          // surely Q type
      (!isEnumSpec(encQ.timeUnit) && !!encQ.timeUnit);  // surely T type
}

export function isMeasure(encQ: EncodingQuery) {
  return (encQ.type === Type.QUANTITATIVE && !encQ.bin) ||
      (encQ.type === Type.TEMPORAL && !encQ.timeUnit);
}

export function stringifyEncodingQuery(encQ: EncodingQuery): string {
  return enumSpecShort(encQ.channel) + ':' + stringifyEncodingQueryFieldDef(encQ);
}

export function stringifyEncodingQueryFieldDef(encQ: EncodingQuery): string {
  let fn = null;
  const params: {key: string, value: any}[]=  [];

  if (encQ.autoCount === false) {
    return '-';
  }

  if (encQ.aggregate && !isEnumSpec(encQ.aggregate)) {
    fn = encQ.aggregate;
  } else if (encQ.timeUnit && !isEnumSpec(encQ.timeUnit)) {
    fn = encQ.timeUnit;
  } else if (encQ.bin && !isEnumSpec(encQ.bin)) {
    fn = 'bin';
    if (encQ.bin['maxbins']) {
      params.push({key: 'maxbins', value: encQ.bin['maxbins']});
    }
  } else if (encQ.autoCount && !isEnumSpec(encQ.autoCount)) {
    fn = 'count';
  } else if (
      (encQ.aggregate && isEnumSpec(encQ.aggregate)) ||
      (encQ.autoCount && isEnumSpec(encQ.autoCount)) ||
      (encQ.timeUnit && isEnumSpec(encQ.timeUnit)) ||
      (encQ.bin && isEnumSpec(encQ.bin))
    ) {
    fn = SHORT_ENUM_SPEC + '';
  }

  if (encQ.scale && !isEnumSpec(encQ.scale)) {

      if (encQ.scale && !isEnumSpec(encQ.scale)) {
      var scaleParams = {};

      if (encQ.scale['type']) {
        scaleParams = {type: encQ.scale['type']};
      }
      // TODO: push other scale properties to scaleParams.

      if (keys(scaleParams).length > 0) {
        params.push({
          key: 'scale',
          value: JSON.stringify(scaleParams)
        });
      }
    }
  }

  const fieldType = enumSpecShort(encQ.field || '*') + ',' +
    enumSpecShort(encQ.type || Type.QUANTITATIVE).substr(0,1) +
    params.map((p) => ',' + p.key + '=' + p.value).join('');
  return (fn ? fn + '(' + fieldType + ')' : fieldType);
}
