import {Type} from 'vega-lite/src/type';

import {EncodingQuery} from './encoding';
import {SpecQuery, stack} from './spec';
import {isEnumSpec, SHORT_ENUM_SPEC} from '../enumspec';

import {getNestedEncodingPropertyChildren, Property, DEFAULT_PROPERTY_PRECEDENCE} from '../property';
import {Dict, keys} from '../util';

export type Replacer = (s: string) => string;

export function getReplacer(replace: Dict<string>): Replacer {
  return (s: string) => {
    if (replace[s] !== undefined) {
      return replace[s];
    }
    return s;
  };
}

export function value(v: any, replace: Replacer): any {
  if (isEnumSpec(v)) {
    return SHORT_ENUM_SPEC;
  }
  if (replace) {
    return replace(v);
  }
  return v;
}

export const INCLUDE_ALL: Dict<boolean> = DEFAULT_PROPERTY_PRECEDENCE.reduce((m, prop) => {
  m[prop] = true;
  return m;
}, {} as Dict<boolean>);

/**
 * Returns a shorthand for a spec query
 * @param specQ a spec query
 * @param include Dict Set listing property types (key) to be included in the shorthand
 * @param replace Dictionary of replace function for values of a particular property type (key)
 */
export function spec(specQ: SpecQuery,
    include: Dict<boolean> = INCLUDE_ALL,
    replace: Dict<Replacer> = {}
    ): string {
  const parts = [];

  if (include[Property.MARK]) {
    parts.push(value(specQ.mark, replace[Property.MARK]));
  }

  // TODO: transform

  // TODO: stack Property
  const _stack = stack(specQ);
  if (_stack) {
    // TODO: use shorthandValue once we have proper stack property
    parts.push('stack=' + _stack.offset);
  }

  parts.push(specQ.encodings.map((encQ) => encoding(encQ, include, replace))
                  .filter((encQStr) => !!encQStr)
                  .sort() // sort at the end to ignore order
                  .join('|')
            );

  return parts.join('|');
}

/**
 * Returns a shorthand for an encoding query
 * @param encQ an encoding query
 * @param include Dict Set listing property types (key) to be included in the shorthand
 * @param replace Dictionary of replace function for values of a particular property type (key)
 */
export function encoding(encQ: EncodingQuery,
    include: Dict<boolean> = INCLUDE_ALL,
    replace: Dict<Replacer> = {}
    ): string {

  const parts = [];
  if (include[Property.CHANNEL]) {
    parts.push(value(encQ.channel, replace[Property.CHANNEL]));
  }
  const fieldDefStr = fieldDef(encQ, include, replace);
  if (fieldDefStr) {
    parts.push(fieldDefStr);
  }
  return parts.join(':');
}

/**
 * Returns a field definiton shorthand for an encoding query
 * @param encQ an encoding query
 * @param include Dict Set listing property types (key) to be included in the shorthand
 * @param replace Dictionary of replace function for values of a particular property type (key)
 */
export function fieldDef(encQ: EncodingQuery,
    include: Dict<boolean> = INCLUDE_ALL,
    replace: Dict<Replacer> = {}): string {

  let fn = null;

  /** Encoding properties e.g., Scale, Axis, Legend */
  const props: {key: string, value: boolean | Object}[] = [];

  if (include[Property.AGGREGATE] && encQ.autoCount === false) {
    return '-';
  } else if (include[Property.AGGREGATE] && encQ.aggregate && !isEnumSpec(encQ.aggregate)) {
    fn = value(encQ.aggregate, replace[Property.AGGREGATE]);
  } else if (include[Property.AGGREGATE] && encQ.autoCount && !isEnumSpec(encQ.autoCount)) {
    fn = value('count', replace[Property.AGGREGATE]);;
  } else if (include[Property.TIMEUNIT] && encQ.timeUnit && !isEnumSpec(encQ.timeUnit)) {
    fn = value(encQ.timeUnit, replace[Property.TIMEUNIT]);
  } else if (include[Property.BIN] && encQ.bin && !isEnumSpec(encQ.bin)) {
    fn = 'bin';

    if (include[Property.BIN_MAXBINS] && encQ.bin['maxbins']) {
      props.push({
        key: 'maxbins',
        value: value(encQ.bin['maxbins'], replace[Property.BIN_MAXBINS])
      });
    }
  } else {
    for (const prop of [Property.AGGREGATE, Property.AUTOCOUNT, Property.TIMEUNIT, Property.BIN]) {
      if (include[prop] && encQ[prop] && isEnumSpec(encQ[prop])) {
        fn = SHORT_ENUM_SPEC + '';
        break;
      }
    }
  }

  // Scale
  // TODO: axis, legend
  for (const nestedPropParent of [Property.SCALE]) {
    if (include[nestedPropParent]) {
      if (encQ[nestedPropParent] && !isEnumSpec(encQ[nestedPropParent])) {
        const nestedProps = getNestedEncodingPropertyChildren(nestedPropParent);
        const nestedPropChildren = nestedProps.reduce((p, nestedProp) => {
          if (include[nestedProp.property] && encQ[nestedPropParent][nestedProp.child] !== undefined) {
            p[nestedProp.child] = value(encQ[nestedPropParent][nestedProp.child], replace[nestedProp.property]);
          }
          return p;
        }, {});

        if(keys(nestedPropChildren).length > 0) {
          props.push({
            key: nestedPropParent + '',
            value: JSON.stringify(nestedPropChildren)
          });
        }
      } else if (encQ[nestedPropParent] === false || encQ[nestedPropParent] === null) {
        props.push({
          key: nestedPropParent + '',
          value: false
        });
      }
    }
  }

  // field
  let fieldAndParams = include[Property.FIELD] ? value(encQ.field || '*', replace[Property.FIELD]) : '...';
  // type
  if (include[Property.TYPE]) {
    const typeShort = ((encQ.type || Type.QUANTITATIVE)+'').substr(0,1);
    fieldAndParams += ',' + value(typeShort, replace[Property.TYPE]);
  }
  // encoding properties
  fieldAndParams += props.map((p) => ',' + p.key + '=' + p.value).join('');
  return (fn ? fn + '(' + fieldAndParams + ')' : fieldAndParams);
}
