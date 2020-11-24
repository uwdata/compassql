import {assert} from 'chai';
import {AggregateOp} from 'vega';
import * as CHANNEL from 'vega-lite/build/src/channel';
import {CHANNELS} from 'vega-lite/build/src/channel';
import {ScaleType} from 'vega-lite/build/src/scale';
import {TimeUnit} from 'vega-lite/build/src/timeunit';
import * as VEGA_TIME from 'vega-time'; // leilani: added
import * as TYPE from 'vega-lite/build/src/type';
import {DEFAULT_QUERY_CONFIG} from '../../src/config';
import {EncodingConstraintModel} from '../../src/constraint/base';
import {FIELD_CONSTRAINTS, FIELD_CONSTRAINT_INDEX} from '../../src/constraint/field';
import {Property} from '../../src/property';
import {PropIndex} from '../../src/propindex';
import {EncodingQuery, FieldQuery, ScaleQuery} from '../../src/query/encoding';
import {duplicate, extend, without} from '../../src/util';
import {SHORT_WILDCARD, Wildcard} from '../../src/wildcard';
import {schema} from '../fixture';
import {DEFAULT_ENUM_INDEX} from '../../src/wildcard';

describe('constraints/field', () => {
  const defaultOpt = DEFAULT_QUERY_CONFIG;

  const CONSTRAINT_MANUALLY_SPECIFIED_CONFIG = extend({}, DEFAULT_QUERY_CONFIG, {
    constraintManuallySpecifiedValue: true
  });

  // Make sure all non-strict constraints have their configs.
  FIELD_CONSTRAINTS.forEach(constraint => {
    if (!constraint.strict()) {
      it(constraint.name() + ' should have default config for all non-strict constraints', () => {
        assert.isDefined(DEFAULT_QUERY_CONFIG[constraint.name()]);
      });
    }
  });

  describe('hasAllRequiredPropertiesSpecific', () => {
    let encModel = new EncodingConstraintModel({
      name: 'TestEncoding for hasAllRequiredProperties class method',
      description: 'TestEncoding for hasAllRequirdProperties class method',
      properties: [Property.AGGREGATE, Property.TYPE, Property.SCALE, {parent: 'scale', child: 'type'}],
      allowWildcardForProperties: false,
      strict: true,
      satisfy: undefined
    });

    it('should return true if all properties is defined', () => {
      let encQ: EncodingQuery = {
        channel: CHANNEL.X,
        aggregate: 'mean',
        field: 'A',
        scale: {type: ScaleType.LOG},
        type: TYPE.QUANTITATIVE
      };
      assert.isTrue(encModel.hasAllRequiredPropertiesSpecific(encQ));
    });

    it('should return true if a required property is undefined', () => {
      let encQ: EncodingQuery = {
        channel: CHANNEL.X,
        field: 'A',
        scale: {type: ScaleType.LOG},
        type: TYPE.QUANTITATIVE
      };
      assert.isTrue(encModel.hasAllRequiredPropertiesSpecific(encQ));
    });

    it('should return false if a required property is a wildcard', () => {
      let encQ: EncodingQuery = {
        channel: CHANNEL.X,
        aggregate: SHORT_WILDCARD,
        scale: {type: ScaleType.LOG},
        type: TYPE.QUANTITATIVE
      };
      assert.isFalse(encModel.hasAllRequiredPropertiesSpecific(encQ));
    });

    it('should return false if a nested required property is a wildcard', () => {
      let encQ: EncodingQuery = {
        channel: CHANNEL.X,
        aggregate: 'mean',
        field: 'A',
        scale: {type: SHORT_WILDCARD},
        type: TYPE.QUANTITATIVE
      };
      assert.isFalse(encModel.hasAllRequiredPropertiesSpecific(encQ));
    });
  });

  describe('aggregateOpSupportedByType', () => {
    let encQ: FieldQuery = {
      channel: CHANNEL.X,
      aggregate: 'mean',
      field: 'A',
      type: undefined
    };

    it('should return false if aggregate is applied to non-quantitative type', () => {
      [TYPE.NOMINAL, TYPE.ORDINAL].forEach(type => {
        encQ.type = type;
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['aggregateOpSupportedByType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    it('should return true if aggregate is applied to quantitative field', () => {
      // TODO: verify if this really works with temporal
      [TYPE.QUANTITATIVE, TYPE.TEMPORAL].forEach(type => {
        encQ.type = type;
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['aggregateOpSupportedByType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });
  });

  describe('asteriskFieldWithCountOnly', () => {
    it('should return true for field=* and aggregate=COUNT', () => {
      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['asteriskFieldWithCountOnly'].satisfy(
          {channel: CHANNEL.X, aggregate: 'count', field: '*', type: TYPE.QUANTITATIVE},
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return false for field=* without aggregate=COUNT', () => {
      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['asteriskFieldWithCountOnly'].satisfy(
          {channel: CHANNEL.X, field: '*', type: TYPE.QUANTITATIVE},
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return false for aggregate=COUNT without field=*', () => {
      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['asteriskFieldWithCountOnly'].satisfy(
          {channel: CHANNEL.X, aggregate: 'count', field: 'haha', type: TYPE.QUANTITATIVE},
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });
  });

  describe('minCardinalityForBin', () => {
    it('should return false for binned quantitative field that has low cardinality', () => {
      ['Q5', 'Q10'].forEach(field => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.X,
          bin: true,
          field: field,
          type: TYPE.QUANTITATIVE
        };
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['minCardinalityForBin'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    it('should return true for binned quantitative field that has high enough cardinality', () => {
      ['Q15', 'Q20', 'Q'].forEach(field => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.X,
          bin: true,
          field: field,
          type: TYPE.QUANTITATIVE
        };
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['minCardinalityForBin'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });
  });

  describe('binAppliedForQuantitative', () => {
    let encQ: FieldQuery = {
      channel: CHANNEL.X,
      bin: true,
      field: 'A',
      type: undefined
    };

    it('should return false if bin is applied to non-quantitative type', () => {
      [TYPE.NOMINAL, TYPE.ORDINAL, TYPE.TEMPORAL].forEach(type => {
        encQ.type = type;
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['binAppliedForQuantitative'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    it('should return true if bin is applied to quantitative type', () => {
      encQ.type = TYPE.QUANTITATIVE;
      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['binAppliedForQuantitative'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true for any non-binned field', () => {
      encQ.bin = undefined;
      [TYPE.NOMINAL, TYPE.ORDINAL, TYPE.TEMPORAL, TYPE.QUANTITATIVE].forEach(type => {
        encQ.type = type;
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['binAppliedForQuantitative'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });
  });

  describe('channelFieldCompatible', () => {
    [CHANNEL.X, CHANNEL.Y, CHANNEL.COLOR, CHANNEL.TEXT, CHANNEL.DETAIL].forEach(channel => {
      it(channel + ' supports raw measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports aggregate measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE, aggregate: 'mean'};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports aggregate measure.', () => {
        const encQ: EncodingQuery = {channel: channel, type: TYPE.QUANTITATIVE, autoCount: true};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports raw temporal measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'T', type: TYPE.TEMPORAL};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports timeUnit temporal dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'T', type: TYPE.QUANTITATIVE, timeUnit: VEGA_TIME.MONTH};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports binned quantitative dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE, bin: true};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports ordinal dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'O', type: TYPE.ORDINAL};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports nominal dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'N', type: TYPE.NOMINAL};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    [CHANNEL.ROW, CHANNEL.COLUMN].forEach(channel => {
      it(channel + ' does not support raw measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE};
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' does not support aggregate measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE, aggregate: 'mean'};
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' does not support raw temporal measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'T', type: TYPE.TEMPORAL};
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports timeUnit temporal dimension.', () => {
        for (const type of [TYPE.ORDINAL, TYPE.TEMPORAL]) {
          const encQ: EncodingQuery = {channel: channel, field: 'T', type, timeUnit: VEGA_TIME.MONTH};
          assert.isTrue(
            FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
              encQ,
              schema,
              new PropIndex<Wildcard<any>>(),
              CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
            )
          );
        }
      });

      it(channel + ' supports binned quantitative dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE, bin: true};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports ordinal dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'O', type: TYPE.ORDINAL};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports nominal dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'N', type: TYPE.NOMINAL};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    [CHANNEL.SIZE].forEach(channel => {
      it(channel + ' supports raw measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports aggregate measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE, aggregate: 'mean'};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports raw temporal measure.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'T', type: TYPE.TEMPORAL};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports timeUnit dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'T', type: TYPE.ORDINAL, timeUnit: VEGA_TIME.MONTH};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports binned quantitative dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'Q', type: TYPE.QUANTITATIVE, bin: true};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' supports ordinal dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'O', type: TYPE.ORDINAL};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });

      it(channel + ' does not support nominal dimension.', () => {
        const encQ: EncodingQuery = {channel: channel, field: 'N', type: TYPE.NOMINAL};
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['channelFieldCompatible'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });
  });

  describe('hasFn', () => {
    it('should return true if encQ has no hasFn', () => {
      const encQ: EncodingQuery = {
        channel: CHANNEL.COLOR,
        field: 'Q',
        type: TYPE.QUANTITATIVE
      };
      assert.isTrue(FIELD_CONSTRAINT_INDEX['hasFn'].satisfy(encQ, schema, new PropIndex<Wildcard<any>>(), defaultOpt));
    });

    it('should return false if encQ has hasFn = true and has no function', () => {
      const encQ: EncodingQuery = {
        hasFn: true,
        channel: CHANNEL.COLOR,
        field: 'Q',
        type: TYPE.QUANTITATIVE
      };
      assert.isFalse(FIELD_CONSTRAINT_INDEX['hasFn'].satisfy(encQ, schema, new PropIndex<Wildcard<any>>(), defaultOpt));
    });

    it('should return true if encQ has hasFn = true and has aggregate', () => {
      const encQ: EncodingQuery = {
        hasFn: true,
        channel: CHANNEL.COLOR,
        aggregate: 'mean',
        field: 'Q',
        type: TYPE.QUANTITATIVE
      };
      assert.isTrue(FIELD_CONSTRAINT_INDEX['hasFn'].satisfy(encQ, schema, new PropIndex<Wildcard<any>>(), defaultOpt));
    });

    it('should return true if encQ has hasFn = true and has bin', () => {
      const encQ: EncodingQuery = {
        hasFn: true,
        channel: CHANNEL.COLOR,
        bin: true,
        field: 'Q',
        type: TYPE.QUANTITATIVE
      };
      assert.isTrue(FIELD_CONSTRAINT_INDEX['hasFn'].satisfy(encQ, schema, new PropIndex<Wildcard<any>>(), defaultOpt));
    });

    it('should return true if encQ has hasFn = true and has timeUnit', () => {
      const encQ: EncodingQuery = {
        hasFn: true,
        channel: CHANNEL.COLOR,
        timeUnit: VEGA_TIME.HOURS,
        field: 'T',
        type: TYPE.TEMPORAL
      };
      assert.isTrue(FIELD_CONSTRAINT_INDEX['hasFn'].satisfy(encQ, schema, new PropIndex<Wildcard<any>>(), defaultOpt));
    });
  });

  describe('maxCardinalityForCategoricalColor', () => {
    it('should return true for nominal color that has low cardinality', () => {
      ['O', 'O_10', 'O_20'].forEach(field => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.COLOR,
          field: field,
          type: TYPE.NOMINAL
        };
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['maxCardinalityForCategoricalColor'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    it('should return false for nominal color that has high cardinality', () => {
      ['O_100'].forEach(field => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.COLOR,
          field: field,
          type: TYPE.NOMINAL
        };
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['maxCardinalityForCategoricalColor'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    // TODO: timeUnit with categorical color scale

    // TODO: bin with categorical color scale
  });

  describe('maxCardinalityForFacet', () => {
    it('should return true for nominal field that has low cardinality', () => {
      [CHANNEL.ROW, CHANNEL.COLUMN].forEach(channel => {
        ['O', 'O_10'].forEach(field => {
          const encQ: EncodingQuery = {
            channel: channel,
            field: field,
            type: TYPE.NOMINAL
          };
          assert.isTrue(
            FIELD_CONSTRAINT_INDEX['maxCardinalityForFacet'].satisfy(
              encQ,
              schema,
              new PropIndex<Wildcard<any>>(),
              defaultOpt
            )
          );
        });
      });
    });

    it('should return false for nominal field that has high cardinality', () => {
      [CHANNEL.ROW, CHANNEL.COLUMN].forEach(channel => {
        ['O_100'].forEach(field => {
          const encQ: EncodingQuery = {
            channel: channel,
            field: field,
            type: TYPE.NOMINAL
          };
          assert.isFalse(
            FIELD_CONSTRAINT_INDEX['maxCardinalityForFacet'].satisfy(
              encQ,
              schema,
              new PropIndex<Wildcard<any>>(),
              defaultOpt
            )
          );
        });
      });
    });

    // TODO: timeUnit

    // TODO: bin
  });

  describe('maxCardinalityForShape', () => {
    it('should return true for nominal shape that has low cardinality', () => {
      ['O'].forEach(field => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.SHAPE,
          field: field,
          type: TYPE.NOMINAL
        };
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['maxCardinalityForShape'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    it('should return false for nominal shape that has high cardinality', () => {
      ['O_10', 'O_20', 'O_100'].forEach(field => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.SHAPE,
          field: field,
          type: TYPE.NOMINAL
        };
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['maxCardinalityForShape'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    // TODO: timeUnit

    // TODO: bin
  });

  describe('omitBinWithLogScale', () => {
    it('bin should not support log scale', () => {
      const encQ: EncodingQuery = {
        channel: CHANNEL.X,
        field: 'Q',
        bin: true,
        scale: {type: ScaleType.LOG},
        type: TYPE.QUANTITATIVE
      };
      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['dataTypeAndFunctionMatchScaleType'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });
  });

  describe('omitScaleZeroWithBinnedField', () => {
    let encQ: FieldQuery = {
      channel: CHANNEL.X,
      bin: true,
      field: 'A',
      scale: {zero: undefined},
      type: TYPE.QUANTITATIVE
    };

    it('should return false if scale zero is used with binned field', () => {
      (encQ.scale as ScaleQuery).zero = true;
      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['omitScaleZeroWithBinnedField'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true if scale zero is not used with binned field', () => {
      (encQ.scale as ScaleQuery).zero = false;
      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['omitScaleZeroWithBinnedField'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });
  });

  describe('dataTypeAndFunctionMatchScaleType', () => {
    [ScaleType.ORDINAL, ScaleType.POINT, ScaleType.BAND].forEach(scaleType => {
      it('scaleType of ' + scaleType + ' matches data type ordinal with timeUnit', () => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.X,
          field: 'O',
          scale: {type: scaleType},
          type: TYPE.ORDINAL,
          timeUnit: VEGA_TIME.MINUTES
        };
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['dataTypeAndFunctionMatchScaleType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    [ScaleType.ORDINAL, ScaleType.POINT, ScaleType.BAND].forEach(scaleType => {
      it('scaleType of ' + scaleType + ' matches data type nominal', () => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.X,
          field: 'N',
          scale: {type: scaleType},
          type: TYPE.NOMINAL,
          timeUnit: VEGA_TIME.MINUTES
        };
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['dataTypeAndFunctionMatchScaleType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    [ScaleType.TIME, ScaleType.UTC, ScaleType.ORDINAL, ScaleType.POINT, ScaleType.BAND].forEach(scaleType => {
      it('scaleType of ' + scaleType + ' matches data type temporal', () => {
        const encQ: EncodingQuery = {
          channel: CHANNEL.X,
          field: 'T',
          scale: {type: scaleType},
          type: TYPE.TEMPORAL,
          timeUnit: VEGA_TIME.MINUTES
        };
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['dataTypeAndFunctionMatchScaleType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    [
      ScaleType.LOG,
      ScaleType.POW,
      ScaleType.SQRT, // ScaleType.QUANTILE, ScaleType.QUANTIZE,
      ScaleType.LINEAR
    ].forEach(scaleType => {
      it('scaleType of ' + scaleType + ' matches data type quantitative', () => {
        const encQ: EncodingQuery = {channel: CHANNEL.X, field: 'Q', scale: {type: scaleType}, type: TYPE.QUANTITATIVE};
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['dataTypeAndFunctionMatchScaleType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });
  });

  describe('onlyOneTypeOfFunction', () => {
    const encQ: EncodingQuery = {
      channel: CHANNEL.X,
      field: 'A',
      type: TYPE.QUANTITATIVE
    };

    it('should return true if there is no function', () => {
      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['onlyOneTypeOfFunction'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true if there is only one function', () => {
      [['aggregate', 'mean'], ['timeUnit', VEGA_TIME.MONTH], ['bin', true], , ['autoCount', true]].forEach(
        (tuple: any) => {
          let modifiedEncQ = duplicate(encQ);
          modifiedEncQ[tuple[0]] = tuple[1];
          assert.isTrue(
            FIELD_CONSTRAINT_INDEX['onlyOneTypeOfFunction'].satisfy(
              encQ,
              schema,
              new PropIndex<Wildcard<any>>(),
              defaultOpt
            )
          );
        }
      );
    });

    it('should return false if there are multiple functions', () => {
      [
        ['mean', VEGA_TIME.MONTH, true],
        ['mean', undefined, true],
        ['mean', VEGA_TIME.MONTH, undefined],
        [undefined, VEGA_TIME.MONTH, true]
      ].forEach(tuple => {
        encQ.aggregate = tuple[0] as AggregateOp;
        encQ.timeUnit = tuple[1] as TimeUnit;
        encQ.bin = tuple[2] as boolean;

        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['onlyOneTypeOfFunction'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });
  });

  describe('timeUnitAppliedForTemporal', () => {
    let encQ: FieldQuery = {
      channel: CHANNEL.X,
      timeUnit: VEGA_TIME.MONTH,
      field: 'A',
      type: undefined
    };

    it('should return false if timeUnit is applied to non-temporal type', () => {
      [TYPE.NOMINAL, TYPE.ORDINAL, TYPE.QUANTITATIVE].forEach(type => {
        encQ.type = type;
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['timeUnitAppliedForTemporal'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            defaultOpt
          )
        );
      });
    });

    it('should return true if aggregate is applied to quantitative field', () => {
      // TODO: verify if this really works with temporal
      encQ.type = TYPE.TEMPORAL;
      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['timeUnitAppliedForTemporal'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });
  });

  describe('scalePropertiesSupportedByScaleType', () => {
    it('should return true if scaleType is not specified.', () => {
      let encQ: EncodingQuery = {
        channel: '?',
        field: 'A',
        type: '?'
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByScaleType'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true if scaleType is still ambiguous.', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: '?',
        field: 'A',
        type: '?',
        scale: {}
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByScaleType'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return false if scale property is not supported by the scale type', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'quantitative',
        scale: {
          type: 'linear'
        }
      };

      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByScaleType'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return false if scale property is not supported by the scale type', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'nominal',
        scale: {
          // type: point
          clamp: true // clamp should not work with discreteDomain scale
        }
      };

      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByScaleType'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true if scale property is supported', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'quantitative',
        scale: {
          type: 'linear',
          round: true
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByScaleType'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true if scale type is point and a property is supported by band', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'nominal',
        scale: {
          // type: point
          // paddingInner is actually a band scale property, but our scaleType doesn't distinguish point and band.
          paddingInner: 20
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByScaleType'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });
  });

  describe('scalePropertiesSupportedByChannel', () => {
    it('should return true when channel is a wildcard', () => {
      let encQ: EncodingQuery = {
        channel: '?',
        field: 'A',
        type: '?',
        scale: {
          paddingInner: 20
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true when scale property range with channel x', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'quantitative',
        scale: {
          range: [0, 10]
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true when scale property range with channel y', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'y',
        field: 'A',
        type: 'quantitative',
        scale: {
          range: [0, 10]
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return false when scale property range with channel row', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'row',
        field: 'A',
        type: 'quantitative',
        scale: {
          range: [0, 10]
        }
      };

      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return false when scale property range with channel column', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'column',
        field: 'A',
        type: 'quantitative',
        scale: {
          range: [0, 10]
        }
      };

      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true when scale property range with channel x2', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x2',
        field: 'A',
        type: 'quantitative',
        scale: {
          range: [0, 10]
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true when scale property type with channel x with name, enum scale props', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'quantitative',
        scale: {
          type: 'linear',
          name: '?',
          enum: DEFAULT_ENUM_INDEX.scale
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true when scale property padding with channel x', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'quantitative',
        scale: {
          padding: 1.0
        }
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });

    it('should return true when encoding query is missing scale prop', () => {
      let encQ: EncodingQuery = {
        // Scale type depends on channel, so this will make scale type ambiguous.
        channel: 'x',
        field: 'A',
        type: 'quantitative'
      };

      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['scalePropertiesSupportedByChannel'].satisfy(
          encQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          defaultOpt
        )
      );
    });
  });

  describe('typeMatchesSchemaType', () => {
    let encQ: FieldQuery = {
      channel: CHANNEL.X,
      field: 'O',
      type: undefined
    };

    it("should return false if type does not match schema's type", () => {
      [TYPE.TEMPORAL, TYPE.QUANTITATIVE, TYPE.NOMINAL].forEach(type => {
        encQ.type = type;
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['typeMatchesSchemaType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    it("should return true if string matches schema's type ", () => {
      [TYPE.ORDINAL].forEach(type => {
        encQ.type = type;
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['typeMatchesSchemaType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    it('should return false if field does not exist', () => {
      const invalidFieldEncQ = {channel: CHANNEL.X, field: 'random', type: TYPE.NOMINAL};
      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['typeMatchesSchemaType'].satisfy(
          invalidFieldEncQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
        )
      );
    });

    it('should return false if field="*" has non-quantitative type', () => {
      [TYPE.TEMPORAL, TYPE.ORDINAL, TYPE.NOMINAL].forEach(type => {
        const countEncQ: EncodingQuery = {
          channel: CHANNEL.X,
          aggregate: 'count',
          field: '*',
          type: type
        };
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['typeMatchesSchemaType'].satisfy(
            countEncQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    it('should return true if field="*" has quantitative type', () => {
      const countEncQ: EncodingQuery = {
        channel: CHANNEL.X,
        aggregate: 'count',
        field: '*',
        type: TYPE.QUANTITATIVE
      };
      assert.isTrue(
        FIELD_CONSTRAINT_INDEX['typeMatchesSchemaType'].satisfy(
          countEncQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
        )
      );
    });
  });

  describe('typeMatchesPrimitiveType', () => {
    let encQ: FieldQuery = {
      channel: CHANNEL.X,
      field: 'O',
      type: undefined
    };

    it('should return false if string is used as quantitative or temporal', () => {
      [TYPE.TEMPORAL, TYPE.QUANTITATIVE].forEach(type => {
        encQ.type = type;
        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['typeMatchesPrimitiveType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    it('should return true if string is used as ordinal or nominal ', () => {
      [TYPE.NOMINAL, TYPE.ORDINAL].forEach(type => {
        encQ.type = type;
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['typeMatchesPrimitiveType'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    it('should return false if field does not exist', () => {
      const invalidFieldEncQ = {channel: CHANNEL.X, field: 'random', type: TYPE.NOMINAL};
      assert.isFalse(
        FIELD_CONSTRAINT_INDEX['typeMatchesPrimitiveType'].satisfy(
          invalidFieldEncQ,
          schema,
          new PropIndex<Wildcard<any>>(),
          CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
        )
      );
    });

    it('should return true if field="*" has non-quantitative type', () => {
      [TYPE.TEMPORAL, TYPE.ORDINAL, TYPE.NOMINAL, TYPE.QUANTITATIVE].forEach(type => {
        const countEncQ: EncodingQuery = {
          channel: CHANNEL.X,
          aggregate: 'count',
          field: '*',
          type: type
        };
        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['typeMatchesPrimitiveType'].satisfy(
            countEncQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });
  });

  describe('stackIsOnlyUsedWithXY', () => {
    it('should return true for stack specified in X or Y channel', () => {
      [CHANNEL.X, CHANNEL.Y].forEach(_channel => {
        const encQ: FieldQuery = {
          channel: _channel,
          stack: 'zero'
        };

        assert.isTrue(
          FIELD_CONSTRAINT_INDEX['stackIsOnlyUsedWithXY'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });

    it('should return false for stack specified in non X or Y channel', () => {
      const NON_XY_CHANNELS = without(CHANNELS, [CHANNEL.X, CHANNEL.Y]);
      NON_XY_CHANNELS.forEach(_channel => {
        const encQ: FieldQuery = {
          channel: _channel,
          stack: 'zero'
        };

        assert.isFalse(
          FIELD_CONSTRAINT_INDEX['stackIsOnlyUsedWithXY'].satisfy(
            encQ,
            schema,
            new PropIndex<Wildcard<any>>(),
            CONSTRAINT_MANUALLY_SPECIFIED_CONFIG
          )
        );
      });
    });
  });
});
