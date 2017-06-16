import {Channel, X, Y, STACK_GROUP_CHANNELS} from 'vega-lite/build/src/channel';
import {Config} from 'vega-lite/build/src/config';
import {Data} from 'vega-lite/build/src/data';
import {Mark} from 'vega-lite/build/src/mark';
import {StackProperties} from 'vega-lite/build/src/stack';

import {isWildcard, WildcardProperty, Wildcard} from '../wildcard';
import {isEncodingTopLevelProperty, Property, toKey, FlatProp, EncodingNestedProp} from '../property';
import {contains, extend, keys, some} from '../util';

import {TransformQuery} from './transform';
import {EncodingQuery, isFieldQuery, isValueQuery, isAutoCountQuery, isEnabledAutoCountQuery} from './encoding';
import {TopLevel, FacetedCompositeUnitSpec} from 'vega-lite/build/src/spec';
import {toMap} from 'datalib/src/util';

/**
 * This interface follows the same structure as [Vega-Lite](https://github.com/vega/vega-lite)'s `UnitSpec`.
 * The interface name has `Query` suffixes to hint that its instance (which can contain wildcards) is a query that describe a collection of specifications.
 * Most interfaces under `SpecQuery` similarly describe a "query" version of directives in Vega-Lite.
 */
export interface SpecQuery {
  data?: Data;
  mark: WildcardProperty<Mark>;
  transform?: TransformQuery[];
  encodings: EncodingQuery[];

  // TODO: make config query (not important at all, only for the sake of completeness.)
  config?: Config;
}

/**
 * Convert a Vega-Lite's ExtendedUnitSpec into a CompassQL's SpecQuery
 * @param {ExtendedUnitSpec} spec
 * @returns
 */
export function fromSpec(spec: TopLevel<FacetedCompositeUnitSpec>): SpecQuery {
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
    return (isFieldQuery(encQ) && !isWildcard(encQ.aggregate) && !!encQ.aggregate) || isEnabledAutoCountQuery(encQ);
  });
}

/**
 * @return the stack offset type for the specQuery
 */
export function stack(specQ: SpecQuery): StackProperties & {fieldEncQ: EncodingQuery, groupByEncQ: EncodingQuery} {
  const config = specQ.config;
  const stacked = config ? config.stack : undefined;

  // Should not have stack explicitly disabled
  if (contains(['none', null, false], stacked)) {
    return null;
  }

  // Should have stackable mark
  if (!contains(['bar', 'area'], specQ.mark)) {
    return null;
  }

  // Should be aggregate plot
  if (!isAggregate(specQ)) {
    return null;
  }

  const stackBy = specQ.encodings.reduce((sc, encQ: EncodingQuery) => {
    if (contains(STACK_GROUP_CHANNELS, encQ.channel) && (isValueQuery(encQ) || (isFieldQuery(encQ) &&!encQ.aggregate))) {
      sc.push({
        channel: encQ.channel,
        fieldDef: encQ
      });
    }
    return sc;
  }, []);

  if (stackBy.length === 0) {
    return null;
  }

  // Has only one aggregate axis
  const xEncQ = specQ.encodings.reduce((f, encQ: EncodingQuery) => {
    return f || (encQ.channel === Channel.X ? encQ : null);
  }, null);
  const yEncQ = specQ.encodings.reduce((f, encQ: EncodingQuery) => {
    return f || (encQ.channel === Channel.Y ? encQ : null);
  }, null);

  // TODO(akshatsh): Check if autoCount undef is ok
  const xIsAggregate = (isFieldQuery(xEncQ) && !!xEncQ.aggregate) || (isAutoCountQuery(xEncQ) &&!!xEncQ.autoCount);
  const yIsAggregate = (isFieldQuery(yEncQ) && !!yEncQ.aggregate) || (isAutoCountQuery(yEncQ) &&!!yEncQ.autoCount);

  if (xIsAggregate !== yIsAggregate) {
    return {
      groupbyChannel: xIsAggregate ? (!!yEncQ ? Y : null) : (!!xEncQ ? X : null),
      groupByEncQ: xIsAggregate ? yEncQ : xEncQ,
      fieldChannel: xIsAggregate ? X : Y,
      fieldEncQ: xIsAggregate ? xEncQ : yEncQ,
      stackBy: stackBy,
      offset: stacked || 'zero'
    };
  }
  return null;
}

export function hasWildcard(specQ: SpecQuery, opt: {exclude?: Property[]} = {}) {
  const exclude = opt.exclude ? toMap(opt.exclude.map(toKey)) : {};
  if (isWildcard(specQ.mark) && !exclude['mark']) {
    return true;
  }

  for (const encQ of specQ.encodings) {
    // TODO: implement more efficiently, just check only properties of encQ
    for (const key in encQ) {
      const parentProp = key as FlatProp;
      if (encQ.hasOwnProperty(parentProp) && isEncodingTopLevelProperty(parentProp)) {

        if(isWildcard(encQ[parentProp]) && !exclude[parentProp]) {
          return true;
        }

        const propObj = encQ[parentProp];
        for (const childProp in propObj) {
          if (propObj.hasOwnProperty(childProp) && !contains(['enum', 'name'] as (keyof Wildcard<any>)[], childProp)) {
            const prop: EncodingNestedProp = {
              parent: parentProp,
              child: childProp
            } as EncodingNestedProp;

            if (isWildcard(propObj[childProp]) && !exclude[toKey(prop)]) {
              return true;
            }
          }
        }
      }
    }
  }
  return false;
}
