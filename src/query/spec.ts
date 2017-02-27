import {Channel, X, Y, STACK_GROUP_CHANNELS} from 'vega-lite/src/channel';
import {Config} from 'vega-lite/src/config';
import {Data} from 'vega-lite/src/data';
import {Encoding} from 'vega-lite/src/encoding';
import {ExtendedUnitSpec} from 'vega-lite/src/spec';
import {Mark} from 'vega-lite/src/mark';
import {Scale} from 'vega-lite/src/scale';
import {StackOffset, StackProperties, stack as getStack} from 'vega-lite/src/stack';

import {isWildcard, WildcardProperty} from '../wildcard';
import {isEncodingTopLevelProperty, Property} from '../property';
import {contains, extend, keys, some, isBoolean} from '../util';

import {TransformQuery} from './transform';
import {EncodingQuery} from './encoding';



export interface SpecQuery {
  data?: Data;
  mark: WildcardProperty<Mark>;
  transform?: TransformQuery;
  encodings: EncodingQuery[];

  // TODO: make config query (not important at all, only for the sake of completeness.)
  config?: Config;
}

/**
 * Convert a Vega-Lite's ExtendedUnitSpec into a CompassQL's SpecQuery
 * @param {ExtendedUnitSpec} spec
 * @returns
 */
export function fromSpec(spec: ExtendedUnitSpec): SpecQuery {
  return extend(
    spec.data ? { data: spec.data} : {},
    spec.transform ? { transform: spec.transform } : {},
    {
      mark: spec.mark,
      encodings: keys(spec.encoding).map((channel) => {
          let encQ: EncodingQuery = { channel: channel };
          let channelDef = spec.encoding[channel];

          for (const prop in channelDef) {
            if (isEncodingTopLevelProperty(prop as Property) && channelDef[prop] !== undefined) {
              // Currently bin, scale, axis, legend only support boolean, but not null.
              // Therefore convert null to false.
              if (contains(['bin', 'scale', 'axis', 'legend'], prop) && channelDef[prop] === null) {
                encQ[prop] = false;
              } else {
                encQ[prop] = channelDef[prop];
              }
            }
          }

          return encQ;
        }
      )
    },
    spec.config ? { config: spec.config } : {}
  );
}

export function isAggregate(specQ: SpecQuery) {
  return some(specQ.encodings, (encQ: EncodingQuery) => {
    return (!isWildcard(encQ.aggregate) && !!encQ.aggregate) || encQ.autoCount === true;
  });
}

/**
 * @return the stack offset type for the specQuery or null if unsure / if the plot is not stacked
 */
export function stack(specQ: SpecQuery) {

   // Should be aggregate plot
  if (!isAggregate(specQ)) {
    return null;
  }
  if (isWildcard(specQ.mark)) {
    return null;
  }
  const config = specQ.config;
  const stacked = (config && config.mark) ? config.mark.stacked : undefined;

  // assemble encoding
  let encoding: Encoding = {};
  let encQIndex = {};

  for (let encQ of specQ.encodings) {
    // Skip if required properties are still wildcards
    if (isWildcard(encQ.aggregate)) {
      return null;
    }
    if (isWildcard(encQ.autoCount)) {
      return null;
    }
    if (isWildcard(encQ.channel)) {
      return null;
    }
    let scale: Scale = {};
    if (encQ.channel === 'x' || encQ.channel === 'y') {
      if (encQ.scale) {
        if (isWildcard(encQ.scale)) {
          return null;
        }
        if (!isBoolean(encQ.scale) && encQ.scale.type) {
          if (isWildcard(encQ.scale.type)) {
            return null;
          }
          scale.type = encQ.scale.type;
        }
      }
    }

    encoding[encQ.channel] = {
      aggregate: encQ.aggregate || (encQ.autoCount ? 'aggregate' : undefined),
      // These two actually doesn't matter
      field: encQ.field as string,
      type: encQ.type as any,
      scale: scale
    };
    encQIndex[encQ.channel] = encQ;
  }

  const s = getStack(specQ.mark, encoding, stacked);
  if (s) {
    return {
      ...s,
      fieldEncQ: encQIndex[s.groupbyChannel],
      groupByEncQ: encQIndex[s.groupbyChannel]
    };
  }
  return null;
}
