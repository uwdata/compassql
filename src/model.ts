import {AggregateOp} from 'vega-lite/src/aggregate';
import {Channel} from 'vega-lite/src/channel';
import {Data} from 'vega-lite/src/data';
import {Encoding} from 'vega-lite/src/encoding';
import {FieldDef} from 'vega-lite/src/fielddef';
import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';
import {ExtendedUnitSpec} from 'vega-lite/src/spec';

import {QueryConfig} from './config';
import {Property, ENCODING_PROPERTIES, NESTED_ENCODING_PROPERTIES, hasNestedProperty, getNestedEncodingProperty} from './property';
import {Wildcard, SHORT_WILDCARD, initWildcard, isWildcard, getDefaultName, getDefaultEnumValues} from './wildcard';
import {WildcardIndex} from './wildcardindex';
import {SpecQuery, isAggregate, stack} from './query/spec';
import {isDimension, isMeasure, EncodingQuery} from './query/encoding';
import {GroupBy, ExtendedGroupBy, parse as parseGroupBy} from './query/groupby';
import {spec as specShorthand, PROPERTY_SUPPORTED_CHANNELS} from './query/shorthand';
import {RankingScore} from './ranking/ranking';
import {Schema} from './schema';
import {Dict, duplicate, extend} from './util';

/**
 * Internal class for specQuery that provides helper for the enumeration process.
 */
export class SpecQueryModel {
  private _spec: SpecQuery;

  /** channel => EncodingQuery */
  private _channelCount: Dict<number>;
  private _wildcardIndex: WildcardIndex;
  private _wildcardAssignment: Dict<any>;
  private _schema: Schema;
  private _opt: QueryConfig;

  private _rankingScore: Dict<RankingScore> = {};


  /**
   * Build an WildcardIndex by detecting enumeration specifiers
   * in the input specQuery and replace short wildcards with
   * full ones that includes both names and enumValues.
   *
   * @return a SpecQueryModel that wraps the specQuery and the WildcardIndex.
   */
  public static build(specQ: SpecQuery, schema: Schema, opt: QueryConfig): SpecQueryModel {
    let wildcardIndex: WildcardIndex = new WildcardIndex();
    // mark
    if (isWildcard(specQ.mark)) {
      const name = getDefaultName(Property.MARK);
      specQ.mark = initWildcard(specQ.mark, name, opt.marks);
      wildcardIndex.setMark(specQ.mark);
    }

    // TODO: transform

    // encodings
    specQ.encodings.forEach((encQ, index) => {
      if (encQ.autoCount !== undefined) {
        // This is only for testing purpose
        console.warn('A field with autoCount should not be included as autoCount meant to be an internal object.');

        encQ.type = Type.QUANTITATIVE; // autoCount is always quantitative
      }

      if (encQ.type === undefined) {
        // type is optional -- we automatically augment wildcard if not specified
        encQ.type = SHORT_WILDCARD;
      }

      // For each property of the encodingQuery, enumerate
      ENCODING_PROPERTIES.forEach((prop) => {
        if(isWildcard(encQ[prop])) {
          // Assign default wildcard name and enum values.
          const defaultWildcardName = getDefaultName(prop) + index;
          const defaultEnumValues = getDefaultEnumValues(prop, schema, opt);
          const wildcard = encQ[prop] = initWildcard(encQ[prop], defaultWildcardName, defaultEnumValues);

          // Add index of the encoding mapping to the property's wildcard index.
          wildcardIndex.setEncodingProperty(index, prop, wildcard);
        }
      });

      // For each nested property of the encoding query  (e.g., encQ.bin.maxbins)
      NESTED_ENCODING_PROPERTIES.forEach((nestedProp) => {
        const propObj = encQ[nestedProp.parent]; // the property object e.g., encQ.bin
        if (propObj) {
          const prop = nestedProp.property;
          const child = nestedProp.child;
          if (isWildcard(propObj[child])) {

            // Assign default wildcard name and enum values.
            const defaultWildcardName = getDefaultName(prop) + index;
            const defaultEnumValues = getDefaultEnumValues(prop, schema, opt);
            const wildcard = propObj[child] = initWildcard(propObj[child], defaultWildcardName, defaultEnumValues);

            // Add index of the encoding mapping to the property's wildcard index.
            wildcardIndex.setEncodingProperty(index, prop, wildcard);
          }
        }
      });
    });

    // AUTO COUNT
    // Add Auto Count Field
    if (opt.autoAddCount) {
      const countEncQ: EncodingQuery = {
        channel: {
          name: getDefaultName(Property.CHANNEL) + specQ.encodings.length,
          enum: getDefaultEnumValues(Property.CHANNEL, schema, opt)
        },
        autoCount: {
          name: getDefaultName(Property.AUTOCOUNT) + specQ.encodings.length,
          enum: [false, true]
        },
        type: Type.QUANTITATIVE
      };
      specQ.encodings.push(countEncQ);

      const index = specQ.encodings.length - 1;

      // Add index of the encoding mapping to the property's wildcard index.
      wildcardIndex.setEncodingProperty(index, Property.CHANNEL, countEncQ.channel);
      wildcardIndex.setEncodingProperty(index, Property.AUTOCOUNT, countEncQ.autoCount);
    }

    return new SpecQueryModel(specQ, wildcardIndex, schema, opt, {});
  }

  constructor(spec: SpecQuery, wildcardIndex: WildcardIndex, schema: Schema, opt: QueryConfig, wildcardAssignment: Dict<any>) {
    this._spec = spec;
    this._channelCount = spec.encodings.reduce((m, encQ) => {
      if (!isWildcard(encQ.channel) && encQ.autoCount !== false) {
        m[encQ.channel + ''] = 1;
      }
      return m;
    }, {} as Dict<number>);

    this._wildcardIndex = wildcardIndex;
    this._wildcardAssignment = wildcardAssignment;
    this._opt = opt;
    this._schema = schema;
  }

  public get wildcardIndex() {
    return this._wildcardIndex;
  }

  public get schema() {
    return this._schema;
  }

  public get specQuery() {
    return this._spec;
  }

  public duplicate(): SpecQueryModel {
    return new SpecQueryModel(duplicate(this._spec), this._wildcardIndex, this._schema, this._opt, duplicate(this._wildcardAssignment));
  }

  public setMark(mark: Mark) {
    const name = (this._spec.mark as Wildcard<Mark>).name;
    this._wildcardAssignment[name] = this._spec.mark = mark;
  }

  public resetMark() {
    const wildcard = this._spec.mark = this._wildcardIndex.mark;
    delete this._wildcardAssignment[wildcard.name];
  }

  public getMark() {
    return this._spec.mark;
  }

  public getEncodingProperty(index: number, prop: Property) {
    const encQ = this._spec.encodings[index];
    const nestedProp = getNestedEncodingProperty(prop);
    if (nestedProp) { // nested encoding property
      return encQ[nestedProp.parent][nestedProp.child];
    }
    return encQ[prop]; // encoding property (non-nested)
  }

  public setEncodingProperty(index: number, prop: Property, value: any, wildcard: Wildcard<any>) {
    const encQ = this._spec.encodings[index];
    const nestedProp = getNestedEncodingProperty(prop);
    if (prop === Property.CHANNEL && encQ.channel && !isWildcard(encQ.channel)) {
      // If there is an old channel
      this._channelCount[encQ.channel as Channel]--;
    }

    if (nestedProp) { // nested encoding property
      encQ[nestedProp.parent][nestedProp.child] = value;
    } else if (hasNestedProperty(prop) && value === true) {
      encQ[prop] = extend({},
        encQ[prop], // copy all existing properties
        {enum: undefined, name: undefined} // except name and values to it no longer an wildcard
      );
    } else { // encoding property (non-nested)
      encQ[prop] = value;
    }

    this._wildcardAssignment[wildcard.name] = value;

    if (prop === Property.CHANNEL) {
      // If there is a new channel, make sure it exists and add it to the count.
      this._channelCount[value] = (this._channelCount[value] || 0) + 1;
    }
  }

  public resetEncodingProperty(index: number, prop: Property, wildcard: Wildcard<any>) {
    const encQ = this._spec.encodings[index];
    const nestedProp = getNestedEncodingProperty(prop);
    if (prop === Property.CHANNEL) {
      this._channelCount[encQ.channel as Channel]--;
    }

    // reset it to wildcard
    if (nestedProp) { // nested encoding property
      encQ[nestedProp.parent][nestedProp.child] = wildcard;
    } else { // encoding property (non-nested)
      encQ[prop] = wildcard;
    }

    // add remove value that is reset from the assignment map
    delete this._wildcardAssignment[wildcard.name];
  }

  public channelUsed(channel: Channel) {
    // do not include encoding that has autoCount = false because it is not a part of the output spec.
    return this._channelCount[channel] > 0;
  }

  public stack() {
    return stack(this._spec);
  }

  public getEncodings() {
    // do not include encoding that has autoCount = false because it is not a part of the output spec.
    return this._spec.encodings.filter((encQ) => encQ.autoCount !== false);
  }

  public getEncodingQueryByChannel(channel: Channel) {
    for (let specEncoding of this._spec.encodings) {
      if (specEncoding.channel === channel) {
        return specEncoding;
      }
    }
    return undefined;
  }

  public getEncodingQueryByIndex(i: number) {
    return this._spec.encodings[i];
  }

  public isDimension(channel: Channel) {
    const encQ = this.getEncodingQueryByChannel(channel);
    return encQ && isDimension(encQ);
  }

  public isMeasure(channel: Channel) {
    const encQ = this.getEncodingQueryByChannel(channel);
    return encQ && isMeasure(encQ);
  }

  public isAggregate() {
    return isAggregate(this._spec);
  }

  public toShorthand(groupBy?: (Property | ExtendedGroupBy)[]): string {
    if (groupBy) {
      let include: Dict<boolean> = {}, replace: Dict<Dict<string>> = {};
      const parsedGroupBy = parseGroupBy(groupBy, include, replace);
      return specShorthand(this._spec, include, parsedGroupBy.replacer);
    }
    return specShorthand(this._spec);
  }

  private _encoding(): Encoding {
    let encoding: Encoding = {};

    for (const encQ of this._spec.encodings) {
      let fieldDef: FieldDef = {};

      // For count field that is automatically added, convert to correct vega-lite fieldDef
      if (encQ.autoCount === true) {
        fieldDef.aggregate = AggregateOp.COUNT;
        fieldDef.field = '*';
        fieldDef.type = Type.QUANTITATIVE;
      } else if (encQ.autoCount === false) {
        continue; // Do not include this in the output.
      }

      // if channel is a wildcard, return null
      if (isWildcard(encQ.channel)) return null;

      // assemble other property into a field def.
      const PROPERTIES = [Property.AGGREGATE, Property.BIN, Property.TIMEUNIT, Property.FIELD, Property.TYPE, Property.SCALE, Property.SORT, Property.AXIS, Property.LEGEND];
      // TODO(#226):
      // write toSpec() and toShorthand() in a way that prevents outputting inapplicable scale, sort, axis / legend
      for (const prop of PROPERTIES) {

        // if the property is a wildcard, return null
        if (isWildcard(encQ[prop])) return null;

        // otherwise, assign the proper to the field def
        if (encQ[prop] !== undefined) {

          if (!PROPERTY_SUPPORTED_CHANNELS[prop] ||  // all channels support this prop
            PROPERTY_SUPPORTED_CHANNELS[prop][encQ.channel as Channel]) {
            fieldDef[prop] = encQ[prop];
          }
        }
      }

      if (fieldDef.bin === false) {
        // exclude bin false
        delete fieldDef.bin;
      }

      encoding[encQ.channel as Channel] = fieldDef;
    }
    return encoding;
  }
  /**
   * Convert a query to a Vega-Lite spec if it is completed.
   * @return a Vega-Lite spec if completed, null otherwise.
   */
  public toSpec(data?: Data): ExtendedUnitSpec {
    if (isWildcard(this._spec.mark)) return null;

    let spec: any = {};
    data = data || this._spec.data;
    if (data) {
      spec.data = data;
    }

    if (this._spec.transform) {
      spec.transform = this._spec.transform;
    }

    spec.mark = this._spec.mark as Mark;
    spec.encoding = this._encoding();
    if (spec.encoding === null) {
      return null;
    }
    if (this._spec.config || this._opt.defaultSpecConfig)
    spec.config = extend({}, this._opt.defaultSpecConfig, this._spec.config);

    return spec;
  }

  public getRankingScore(rankingName: string) {
    return this._rankingScore[rankingName];
  }

  public setRankingScore(rankingName: string, score: RankingScore) {
    this._rankingScore[rankingName] = score;
  }
}

export class SpecQueryModelGroup {
  private _name: string;
  private _path: string;
  private _items: (SpecQueryModel | SpecQueryModelGroup)[];
  private _groupBy: GroupBy;
  private _orderGroupBy: string | string[];

  constructor(name: string = '', path: string = '', items: (SpecQueryModel | SpecQueryModelGroup)[] = [],
              groupBy: GroupBy = undefined, orderGroupBy: string | string[] = undefined) {
    this._name = name;
    this._path = path;
    this._items = items;
    this._groupBy = groupBy;
    this._orderGroupBy = orderGroupBy;
  }

  public getTopSpecQueryModel(): SpecQueryModel {
    const topItem = this._items[0];
    if (topItem instanceof SpecQueryModelGroup) {
      return topItem.getTopSpecQueryModel();
    } else {
      return topItem;
    }
  }

  public get name() {
    return this._name;
  }

  public get items() {
    return this._items;
  }

  public get groupBy() {
    return this._groupBy;
  }

  public set groupBy(groupBy: GroupBy) {
    this._groupBy = groupBy;
  }

  public get orderGroupBy() {
    return this._orderGroupBy;
  }

  public set orderGroupBy(orderGroupBy: string | string[]) {
    this._orderGroupBy = orderGroupBy;
  }
}
