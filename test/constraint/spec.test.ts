import {assert} from 'chai';

import {Mark} from 'vega-lite/src/mark';
import {AggregateOp, SUM_OPS} from 'vega-lite/src/aggregate';
import {Channel} from 'vega-lite/src/channel';
// import * as log from 'vega-lite/src/log';
import {ScaleType} from 'vega-lite/src/scale';
import {TimeUnit} from 'vega-lite/src/timeunit';
import {Type} from 'vega-lite/src/type';

import {DEFAULT_QUERY_CONFIG} from '../../src/config';
import {SPEC_CONSTRAINTS, SPEC_CONSTRAINT_INDEX, SpecConstraintModel} from '../../src/constraint/spec';
import {SHORT_WILDCARD} from '../../src/wildcard';
import {SpecQueryModel} from '../../src/model';
import {Schema} from '../../src/schema';
import {SpecQuery} from '../../src/query/spec';
import {Property} from '../../src/property';
import {duplicate, extend} from '../../src/util';

describe('constraints/spec', () => {
  const schema = new Schema([]);

  function buildSpecQueryModel(specQ: SpecQuery) {
    return SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG);
  }

  const CONSTRAINT_MANUALLY_SPECIFIED_CONFIG = extend({}, DEFAULT_QUERY_CONFIG, {constraintManuallySpecifiedValue: true});

  // Make sure all non-strict constraints have their configs.
  SPEC_CONSTRAINTS.forEach((constraint) => {
    if (!constraint.strict()) {
      it(constraint.name() + ' should have default config for all non-strict constraints', () => {
        assert.isDefined(DEFAULT_QUERY_CONFIG[constraint.name()]);
      });
    }
  });

  describe('alwaysIncludeZeroInScaleWithBarMark', () => {
    it('should return false if scale does not start at zero when bar mark is used', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.BAR,
        encodings: [
          {channel: Channel.X, field: 'A', scale: {zero: false}, type: Type.QUANTITATIVE}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['alwaysIncludeZeroInScaleWithBarMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if scale starts at zero when bar mark is used', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.BAR,
        encodings: [
          {channel: Channel.X, field: 'A', scale: {zero: true}, type: Type.QUANTITATIVE}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['alwaysIncludeZeroInScaleWithBarMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('hasAllRequiredPropertiesSpecific', () => {
    const specCModel = new SpecConstraintModel(
      {
        name: 'Test SpecModel for hasAllRequiredPropertiesSpecific class method',
        description: 'Test SpecModel for hasAllRequiredPropertiesSpecific class method',
        properties: [Property.AGGREGATE, Property.TYPE, Property.SCALE, {parent:'scale', child: 'type'}, Property.MARK],
        allowWildcardForProperties: false,
        strict: true,
        satisfy: undefined
      }
    );

    it('should return true if all properties is defined', () => {
      const specQM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {aggregate: AggregateOp.MEAN, channel: Channel.X, field: 'A', scale: {type: ScaleType.LOG}, type: Type.QUANTITATIVE}
        ]
      });
      assert.isTrue(specCModel.hasAllRequiredPropertiesSpecific(specQM));
    });

    it('should return true if a required property is undefined', () => {
      const specQM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {aggregate: AggregateOp.MEAN, channel: Channel.X, field: 'A',  type: Type.QUANTITATIVE}
        ]
      });
      assert.isTrue(specCModel.hasAllRequiredPropertiesSpecific(specQM));
    });

    it('should return false if a required property is a wildcard', () => {
      const specQM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {aggregate: AggregateOp.MEAN, channel: Channel.X, field: 'A', scale: SHORT_WILDCARD, type: Type.QUANTITATIVE}
        ]
      });
      assert.isFalse(specCModel.hasAllRequiredPropertiesSpecific(specQM));
    });

    it('should return false if a nested required property is a wildcard', () => {
      const specQM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {aggregate: AggregateOp.MEAN, channel: Channel.X, field: 'A', scale: {type: SHORT_WILDCARD}, type: Type.QUANTITATIVE}
        ]
      });
      assert.isFalse(specCModel.hasAllRequiredPropertiesSpecific(specQM));
    });
  });

  describe('autoAddCount', () => {
    function autoCountShouldBe(expectedAutoCount: boolean, when: string, baseSpecQ: SpecQuery) {
      [true, false].forEach((satisfy) => {
        const autoCount = satisfy ? expectedAutoCount : !expectedAutoCount;

        it(`should return ${satisfy} when autoCount is ${autoCount} and ${when}.`, () => {
          const specQ = duplicate(baseSpecQ);
          const model = SpecQueryModel.build(specQ, schema, {
            ...DEFAULT_QUERY_CONFIG,
            autoAddCount: true
          });
          const autoCountIndex = model.getEncodings().length - 1;
          model.setEncodingProperty(
            autoCountIndex, 'autoCount',
            autoCount,
            model.getEncodingQueryByIndex(autoCountIndex).autoCount
          );

          assert.equal(SPEC_CONSTRAINT_INDEX['autoAddCount'].satisfy(model, schema, DEFAULT_QUERY_CONFIG), satisfy);
        });
      });
    }

    [Type.NOMINAL, Type.ORDINAL].forEach((type) => {
      autoCountShouldBe(true, 'there is only a/an ' + type + ' field', {
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: type}
        ]
      });
    });

    [Type.QUANTITATIVE, Type.TEMPORAL].forEach((type) => {
      autoCountShouldBe(false, 'there is only a temporal without timeUnit or an unbinned quantitative field', {
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: type}
        ]
      });
    });

    autoCountShouldBe(true, 'there is only a temporal field with timeUnit or an unbinned quantitative field', {
      mark: Mark.POINT,
      encodings: [
        {channel: Channel.X, field: 'A', type: Type.TEMPORAL, timeUnit: TimeUnit.HOURS},
        {channel: Channel.COLOR, field: 'A', type: Type.QUANTITATIVE, bin: true}
      ]
    });

    autoCountShouldBe(false, 'there is an unbinned quantitative field', {
      mark: Mark.POINT,
      encodings: [
        {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE}
      ]
    });

    autoCountShouldBe(false, 'there is a temporal field without time unit', {
      mark: Mark.POINT,
      encodings: [
        {channel: Channel.X, field: 'A', type: Type.TEMPORAL}
      ]
    });

    it('should return true for a raw plot that has only an unbinned quantitative field and a temporal field without time unit', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.Y, field: 'A', type: Type.QUANTITATIVE},
          {channel: Channel.X, field: 'B', type: Type.TEMPORAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['autoAddCount'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if the raw spec has one unbinned quantitative field.', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['autoAddCount'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if the raw spec has one temporal without time unit field.', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.TEMPORAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['autoAddCount'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if the raw spec have only nominal, ordinal, binned quantitative or temporal with time unit fields.', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.SHAPE, field: 'A', type: Type.NOMINAL},
          {channel: Channel.COLOR, field: 'B', type: Type.ORDINAL},
          {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE, bin: true},
          {channel: Channel.Y, field: 'B', type: Type.TEMPORAL, timeUnit: TimeUnit.HOURS}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['autoAddCount'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

  });

  describe('channelPermittedByMarkType', () => {
    it('should return true for supported channel', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.SHAPE, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['channelPermittedByMarkType'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false for unsupported channel', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.BAR,
        encodings: [
          {channel: Channel.SHAPE, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['channelPermittedByMarkType'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('hasAllRequiredChannelsForMark', () => {
    it('should return true if area/line have both x and y', () => {
      [Mark.AREA, Mark.LINE].forEach((mark) => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'N', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE}
          ]
        });
        assert.isTrue(SPEC_CONSTRAINT_INDEX['hasAllRequiredChannelsForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    it('should return false if area/line have do not have x or y', () => {
      [Channel.X, Channel.Y, Channel.COLOR].forEach((channel) => {
        [Mark.AREA, Mark.LINE].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: channel, field: 'N', type: Type.NOMINAL}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAllRequiredChannelsForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });

    it('should return true for bar/circle/point/square/tick/rule with x or y', () => {
      [Channel.X, Channel.Y].forEach((channel) => {
        [Mark.BAR, Mark.CIRCLE, Mark.POINT, Mark.SQUARE, Mark.TICK, Mark.RULE].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: channel, field: 'N', type: Type.NOMINAL}
            ]
          });
          assert.isTrue(SPEC_CONSTRAINT_INDEX['hasAllRequiredChannelsForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });

    it('should return false for bar/circle/point/square/tick/rule with neither x nor y', () => {
      [Channel.COLOR, Channel.SHAPE].forEach((channel) => {
        [Mark.BAR, Mark.CIRCLE, Mark.SQUARE, Mark.TEXT, Mark.RULE].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: channel, field: 'N', type: Type.NOMINAL}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAllRequiredChannelsForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });

    it('should return true for point with neither x nor y', () => {
      [Channel.COLOR, Channel.SHAPE].forEach((channel) => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: channel, field: 'N', type: Type.NOMINAL}
          ]
        });
        assert.isTrue(SPEC_CONSTRAINT_INDEX['hasAllRequiredChannelsForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    it('should return false for text without text channel', () => {
      // TODO
    });

    it('should return true for text with text channel', () => {
      // TODO
    });
  });

  describe('hasAppropriateGraphicTypeForMark', () => {
    describe('bar, tick', () => {
      it('should return true for plots with one dimension and one measure on x/y', () => {
        [Mark.BAR, Mark.TICK].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'N', type: Type.NOMINAL},
              {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE}
            ]
          });
          assert.isTrue(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });

      it('should return true for plots with one binned dimension and one measure on x/y', () => {
        [Mark.BAR, Mark.TICK].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'Q1', type: Type.QUANTITATIVE, bin: true},
              {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE}
            ]
          });
          assert.isTrue(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });

      it('should return true for plots with one binned dimension and one measure on x/y', () => {
        [Mark.BAR, Mark.TICK].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'T', type: Type.TEMPORAL, timeUnit: TimeUnit.MONTH},
              {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE}
            ]
          });
          assert.isTrue(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });

      it('should return false for plots with two dimensions on x/y', () => {
        [Mark.BAR, Mark.TICK].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'N', type: Type.NOMINAL},
              {channel: Channel.Y, field: 'N20', type: Type.NOMINAL}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });

      it('should return false for graphics with two measures on x/y', () => {
        [Mark.BAR, Mark.TICK].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'Q1', type: Type.QUANTITATIVE},
              {channel: Channel.Y, field: 'Q2', type: Type.QUANTITATIVE}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });

      it('should return false for graphics with one temporal field and one quantitative field on x/y', () => {
        [Mark.BAR, Mark.TICK].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'T', type: Type.TEMPORAL},
              {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });

    describe('line, area', () => {
      it('should return true for aggregate line/area with at least one non-nominal dimension', () => {
        [Mark.LINE, Mark.AREA].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'N', type: Type.ORDINAL},
              {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
            ]
          });
          assert.isTrue(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });


      it('should return false for aggregate line/area with at least one non-nominal dimension', () => {
        [Mark.LINE, Mark.AREA].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'N', type: Type.NOMINAL},
              {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });

      it('should return false for aggregate line/area with no dimension', () => {
        [Mark.LINE, Mark.AREA].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'Q1', type: Type.QUANTITATIVE},
              {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });

      it('should return false for graphics with two dimensions on x/y', () => {
        [Mark.LINE, Mark.AREA].forEach((mark) => {
          const specM = buildSpecQueryModel({
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'N', type: Type.NOMINAL},
              {channel: Channel.Y, field: 'N20', type: Type.NOMINAL},
              {channel: Channel.SIZE, field:'*', aggregate: AggregateOp.COUNT, type: Type.QUANTITATIVE}
            ]
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['hasAppropriateGraphicTypeForMark'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });
  });

  describe('noRepeatedChannel', () => {
    it('should return true when there is no repeated channels', function() {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.SHAPE, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['noRepeatedChannel'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false when there are repeated channels', function() {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.SHAPE, field: 'A', type: Type.NOMINAL},
          {channel: Channel.SHAPE, field: 'B', type: Type.NOMINAL}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['noRepeatedChannel'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitAggregate', () => {
    it('should return true if there is only raw data', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitAggregate'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if there is aggregate data', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {aggregate: AggregateOp.MEAN, channel: Channel.X, field: 'A', type: Type.QUANTITATIVE}
        ]
      });
      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitAggregate'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitAggregatePlotWithDimensionOnlyOnFacet', () => {
    it('should return false if the only dimension is facet and it is enumerated', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.Y, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: {enum: [Channel.ROW]}, field: 'N', type: Type.NOMINAL}
        ]
      });
      specM.setEncodingProperty(2, Property.CHANNEL, Channel.ROW, {enum: [Channel.ROW]});
      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithDimensionOnlyOnFacet'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if the only dimension is facet and it is specified', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.Y, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.ROW, field: 'N', type: Type.NOMINAL}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithDimensionOnlyOnFacet'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if the only dimension is facet and it is specified when we constraintManuallySpecifiedValue', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.Y, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.ROW, field: 'N', type: Type.NOMINAL}
        ]
      });
      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithDimensionOnlyOnFacet'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });

    it('should return true if the only dimension is not facet', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.Y, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.SHAPE, field: 'N', type: Type.NOMINAL}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithDimensionOnlyOnFacet'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if there are both facet and non-facet dimension', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.Y, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Channel.ROW, field: 'N', type: Type.NOMINAL},
          {channel: Channel.SHAPE, field: 'N', type: Type.NOMINAL}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithDimensionOnlyOnFacet'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitAggregatePlotWithoutDimension', () => {
    it('should return false if plot is aggregate and has no dimension', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
        ]
      });
      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithoutDimension'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if plot is aggregate and has dimension', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.NOMINAL, aggregate: AggregateOp.MEAN},
          {channel: Channel.Y, field: 'N', type: Type.NOMINAL}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithoutDimension'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if plot is not aggregate', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'N', type: Type.NOMINAL}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitAggregatePlotWithoutDimension'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitBarLineAreaWithOcclusion', () => {
    [Mark.BAR, Mark.LINE, Mark.AREA].forEach((mark) => {
      it('should return false for raw ' + mark, () => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE},
            {channel: Channel.Y, field: 'N', type: Type.NOMINAL}
          ]
        });

        assert.isFalse(SPEC_CONSTRAINT_INDEX['omitBarLineAreaWithOcclusion'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });

      it('should return true for aggregate ' + mark, () => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'Q', type: Type.QUANTITATIVE},
            {channel: Channel.Y, field: 'N', type: Type.NOMINAL}
          ]
        });

        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitBarLineAreaWithOcclusion'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    [Mark.POINT, Mark.TICK, Mark.SQUARE].forEach((mark) => {
      it('should return true for raw ' + mark, () => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE},
            {channel: Channel.Y, field: 'N', type: Type.NOMINAL}
          ]
        });

        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitBarLineAreaWithOcclusion'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });

      it('should return true for aggregate ' + mark, () => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'Q', type: Type.QUANTITATIVE},
            {channel: Channel.Y, field: 'N', type: Type.NOMINAL}
          ]
        });

        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitBarLineAreaWithOcclusion'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });
  });

  describe('omitBarTickWithSize', () => {
    it('should return false if bar/tick enumerates size', () => {
      [Mark.BAR, Mark.TICK].forEach((mark) => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'N', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
            {channel: {enum: [Channel.SIZE]}, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
          ]
        });

        specM.setEncodingProperty(2, Property.CHANNEL, Channel.SIZE, {enum: [Channel.SIZE]});

        assert.isFalse(SPEC_CONSTRAINT_INDEX['omitBarTickWithSize'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    it('should return true if bar/tick contains manually specified size', () => {
      [Mark.BAR, Mark.TICK].forEach((mark) => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'N', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
            {channel: Channel.SIZE, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
          ]
        });

        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitBarTickWithSize'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    it('should return false if bar/tick contains manually specified size and we constraintManuallySpecifiedValue', () => {
      [Mark.BAR, Mark.TICK].forEach((mark) => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'N', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
            {channel: Channel.SIZE, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
          ]
        });

        assert.isFalse(SPEC_CONSTRAINT_INDEX['omitBarTickWithSize'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
      });
    });

    it('should return true if bar/tick do not use size', () => {
      [Mark.BAR, Mark.TICK].forEach((mark) => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'N', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN}
          ]
        });

        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitBarTickWithSize'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });
  });

  describe('omitBarAreaForLogScale', () => {
    it('should return false if either x or y channel of bar or area mark is log scale', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.AREA,
        encodings: [
          {channel: Channel.X, field: 'A', scale: {type: ScaleType.LOG}, type: Type.QUANTITATIVE},
          {channel: Channel.Y, field: 'B', type: Type.QUANTITATIVE}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitBarAreaForLogScale'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if either x or y channel of bar or area mark is not log scale', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.AREA,
        encodings: [
          {channel: Channel.COLOR, field: 'A', scale: {type: ScaleType.LOG}, type: Type.QUANTITATIVE},
          {channel: Channel.SHAPE, field: 'B', type: Type.QUANTITATIVE}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitBarAreaForLogScale'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitMultipleNonPositionalChannels', () => {
    it('should return true if there are zero non-positional channels', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitMultipleNonPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if there are one non-positional channels', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: Channel.SHAPE, field: 'C', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitMultipleNonPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if there are multiple non-positional channels and at least one of them is enumerated', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: {enum: [Channel.SHAPE, Channel.SIZE]}, field: 'C', type: Type.NOMINAL},
          {channel: Channel.COLOR, field: 'D', type: Type.NOMINAL}
        ]
      });

      specM.setEncodingProperty(2, Property.CHANNEL, Channel.SHAPE, {enum: [Channel.SHAPE, Channel.SIZE]});

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitMultipleNonPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if there are multiple non-positional channels but none of them is enumerated', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: Channel.SHAPE, field: 'C', type: Type.NOMINAL},
          {channel: Channel.COLOR, field: 'D', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitMultipleNonPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if there are multiple non-positional channels and we constraintManuallySpecifiedValue', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: Channel.SHAPE, field: 'C', type: Type.NOMINAL},
          {channel: Channel.COLOR, field: 'D', type: Type.NOMINAL}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitMultipleNonPositionalChannels'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });

    it('should return true if there are multiple non-positional channels but one of them has autoCount === false', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: {enum: [Channel.SHAPE, Channel.SIZE]}, field: 'C', type: Type.NOMINAL},
          {channel: Channel.COLOR, autoCount: false, type: Type.QUANTITATIVE}
        ]
      });

      specM.setEncodingProperty(2, Property.CHANNEL, Channel.SHAPE, {enum: [Channel.SHAPE, Channel.SIZE]});

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitMultipleNonPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitNonLinearScaleTypeWithStack', () => {
    it('should return false for stack with non linear scale type', () => {
      [
        ScaleType.LOG, ScaleType.POINT, ScaleType.BAND, ScaleType.POINT, ScaleType.POW,
        ScaleType.SQRT, ScaleType.TIME, ScaleType.UTC
      ].forEach((scaleType) => {
        const specM = buildSpecQueryModel({
          mark: Mark.BAR,
          encodings: [
            {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE, scale: {type: scaleType}, aggregate: AggregateOp.SUM},
            {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
            {channel: Channel.COLOR, field: 'C', type: Type.NOMINAL}
          ],
          config: {
            mark: {
              stacked: 'zero'
            }
          }
        });
        assert.isFalse(
          SPEC_CONSTRAINT_INDEX['omitNonLinearScaleTypeWithStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG),
          'for '+ scaleType
        );
      });
    });

    it('should return true for stack with linear scale type', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.BAR,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE, scale: {type: ScaleType.LINEAR}, aggregate: AggregateOp.SUM},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: Channel.COLOR, field: 'C', type: Type.NOMINAL}
        ],
        config: {
          mark: {
            stacked: 'zero'
          }
        }
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonLinearScaleTypeWithStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if color uses a non-linear scale when it is mapped to a non-X or non-Y channel that is aggregate', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.BAR,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE, aggregate: AggregateOp.SUM},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: Channel.COLOR, field: 'C', type: Type.QUANTITATIVE, scale: {type: ScaleType.POW}},
          {channel: Channel.DETAIL, field: 'A', type: Type.NOMINAL}
        ],
        config: {
          mark: {
            stacked: 'zero'
          }
        }
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonLinearScaleTypeWithStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true for non-stack', () => {
      [Channel.OPACITY, Channel.DETAIL, Channel.COLOR].forEach((stackByChannel) => {
        const specM = buildSpecQueryModel({
          mark: Mark.BAR,
          encodings: [
            {channel: Channel.X, field: 'A', scale: {type: ScaleType.LOG}, type: Type.QUANTITATIVE},
            {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
            {channel: stackByChannel, field: 'C', type: Type.NOMINAL}
          ]
        });
        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonLinearScaleTypeWithStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });
  });

  describe('omitNonSumStack', () => {
    it('should return true if summative-based aggregate is used.', () => {
      SUM_OPS.forEach((aggregate) => {
        [Channel.OPACITY, Channel.DETAIL, Channel.COLOR].forEach((stackByChannel) => {
          const specM = buildSpecQueryModel({
            mark: Mark.BAR,
            encodings: [
              {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE, aggregate: aggregate},
              {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
              {channel: stackByChannel, field: 'C', type: Type.NOMINAL}
            ],
            config: {
              mark: {
                stacked: 'zero'
              }
            }
          });
          assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonSumStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });

    it('should return true for stack with autoCount.', () => {
      SUM_OPS.forEach((_) => {
        [Channel.OPACITY, Channel.DETAIL, Channel.COLOR].forEach((stackByChannel) => {
          const specM = buildSpecQueryModel({
            mark: Mark.BAR,
            encodings: [
              {channel: Channel.X, autoCount: true, type: Type.QUANTITATIVE},
              {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
              {channel: stackByChannel, field: 'C', type: Type.NOMINAL}
            ],
            config: {
              mark: {
                stacked: 'zero'
              }
            }
          });
          assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonSumStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });

    it('should return false if non-summative aggregate (e.g., mean, median) is used.', () => {
      [AggregateOp.MAX, AggregateOp.MEAN, AggregateOp.MEDIAN].forEach((aggregate) => {
        [Channel.OPACITY, Channel.DETAIL, Channel.COLOR].forEach((stackByChannel) => {
          const specM = buildSpecQueryModel({
            mark: Mark.BAR,
            encodings: [
              {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE, aggregate: aggregate},
              {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
              {channel: stackByChannel, field: 'C', type: Type.NOMINAL}
            ],
            config: {
              mark: {
                stacked: 'zero'
              }
            }
          });
          assert.isFalse(SPEC_CONSTRAINT_INDEX['omitNonSumStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
        });
      });
    });

    it('should return false for non-stack.', () => {
      [Channel.OPACITY, Channel.DETAIL, Channel.COLOR].forEach((stackByChannel) => {
        const specM = buildSpecQueryModel({
          mark: Mark.BAR,
          encodings: [
            {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE},
            {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
            {channel: stackByChannel, field: 'C', type: Type.NOMINAL}
          ],
          config: {
            mark: {
              stacked: 'zero'
            }
          }
        });
        assert.isFalse(SPEC_CONSTRAINT_INDEX['omitNonSumStack'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });
  });

  describe('omitNonPositionalOrFacetOverPositionalChannels', () => {
    it('should return true if only x and y are used', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if color/shape/size is used when both x and y are used', () => {
      [Channel.SHAPE, Channel.SIZE, Channel.COLOR].forEach((channel) => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
            {channel: channel, field: 'C', type: Type.NOMINAL}
          ]
        });
        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    it('should return false if color/shape/size is enumerated when either x or y is not used', () => {
      [Channel.SHAPE, Channel.SIZE, Channel.COLOR].forEach((channel) => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'A', type: Type.NOMINAL},
            {channel: {enum: [Channel.SHAPE, Channel.SIZE, Channel.COLOR]}, field: 'C', type: Type.NOMINAL}
          ]
        });
        specM.setEncodingProperty(1, Property.CHANNEL, channel, {enum: [Channel.SHAPE, Channel.SIZE, Channel.COLOR]});
        assert.isFalse(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    it('should return false if color/shape/size is manually specified if either x or y is not used and we constraintManuallySpecifiedValue', () => {
      [Channel.SHAPE, Channel.SIZE, Channel.COLOR].forEach((channel) => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'A', type: Type.NOMINAL},
            {channel: channel, field: 'C', type: Type.NOMINAL}
          ]
        });
        assert.isFalse(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
      });
    });

    it('should return true if color/shape/size is manually specified even when either x or y is not used', () => {
      [Channel.SHAPE, Channel.SIZE, Channel.COLOR].forEach((channel) => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'A', type: Type.NOMINAL},
            {channel: channel, field: 'C', type: Type.NOMINAL}
          ]
        });
        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });

    it('should return true if facet is used when both x and y are used', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'B', type: Type.NOMINAL},
          {channel: Channel.ROW, field: 'C', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if facet is specified when x or y is not used', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.ROW, field: 'C', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if facet is specified when x or y is not used and we constraintManuallySpecifiedValue', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.ROW, field: 'C', type: Type.NOMINAL}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });

    it('should return false if facet is enumerated when x or y is not used', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: {enum: [Channel.ROW]}, field: 'C', type: Type.NOMINAL}
        ]
      });

      specM.setEncodingProperty(1, Property.CHANNEL, Channel.ROW, {enum: [Channel.ROW]});
      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitNonPositionalOrFacetOverPositionalChannels'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitRaw', () => {
    it('should return false if there is raw data', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.QUANTITATIVE}
        ]
      });
      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRaw'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('It should return true if there is a wildcard aggregate', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {aggregate: SHORT_WILDCARD, channel: Channel.X, field: 'A', type: Type.QUANTITATIVE}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRaw'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('It should return true if there is a wildcard autoCount', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {autoCount: SHORT_WILDCARD, channel: Channel.X, field: 'A', type: Type.QUANTITATIVE}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRaw'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if data is aggregate', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {aggregate: AggregateOp.MEAN, channel: Channel.X, field: 'A', type: Type.QUANTITATIVE}
        ]
      });
      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRaw'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitRawContinuousFieldForAggregatePlot', () => {
    it('should return false if the aggregate plot groups by a raw temporal field with timeUnit enumerated as undefined', () => {
      const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'C', type: Type.TEMPORAL, timeUnit: {enum: [undefined]}}
          ]
        });

      specM.setEncodingProperty(1, Property.TIMEUNIT, undefined, {enum: [undefined]});

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if the aggregate plot groups by a raw temporal field with specified timeUnit = undefined', () => {
      const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'C', type: Type.TEMPORAL}
          ]
        });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if the aggregate plot groups by a raw temporal field with specified timeUnit = undefined and we constraintManuallySpecifiedValue', () => {
      const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'C', type: Type.TEMPORAL}
          ]
        });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });

    it('should return true if the aggregate plot groups by a temporal field with timeUnit', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, timeUnit: TimeUnit.MONTH, field: 'C', type: Type.TEMPORAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if the aggregate plot groups by a temporal field with timeUnit as Wildcard', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, timeUnit: {enum: [TimeUnit.MONTH, undefined]}, field: 'C', type: Type.TEMPORAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if the aggregate plot groups by a quantitative field that is specified as raw', () => {
      const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'C', type: Type.QUANTITATIVE}
          ]
        });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false if the aggregate plot groups by a quantitative field that is specified as raw and we constraintManuallySpecifiedValue', () => {
      const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'C', type: Type.QUANTITATIVE}
          ]
        });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });

    it('should return false if the aggregate plot groups by a raw quantitative field that is enumerated', () => {
      const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, aggregate: {enum: [undefined]}, field: 'C', type: Type.QUANTITATIVE}
          ]
        });

      specM.setEncodingProperty(1, Property.AGGREGATE, undefined, {enum: [undefined]});

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if the aggregate plot groups by a binned quantitative field', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, bin: true, field: 'C', type: Type.QUANTITATIVE}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true if the aggregate plot groups by a quantitative field with bin as Wildcard', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, bin: {enum: [true, false]}, field: 'C', type: Type.QUANTITATIVE}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true for a plot with only aggregated quantitative field.', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.QUANTITATIVE}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true for any raw plot', () => {
      [TimeUnit.MONTH, undefined, {enum: [TimeUnit.MONTH, undefined]}].forEach((timeUnit) => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'A', type: Type.NOMINAL},
            {channel: Channel.Y, timeUnit: timeUnit, field: 'C', type: Type.TEMPORAL}
          ]
        });

        assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawContinuousFieldForAggregatePlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
      });
    });
  });

  describe('omitRawDetail', () => {
    it('should return true when raw data does not have the detail channel', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawDetail'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false when raw data has an enumerated detail channel', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: {enum: [Channel.DETAIL]}, field: 'A', type: Type.NOMINAL}
        ]
      });
      specM.setEncodingProperty(0, Property.CHANNEL, Channel.DETAIL, {enum: [Channel.DETAIL]});

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRawDetail'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true when raw data has a manually specified detail channel', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.DETAIL, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawDetail'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false when we constraintManuallySpecifiedValue raw data has a manually specified detail channel', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.DETAIL, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRawDetail'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });

    it('should return true if any of the encoding channels contain aggregate', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.DETAIL, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL},
          {channel: Channel.X, aggregate: AggregateOp.MEAN, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRawDetail'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });

  describe('omitRepeatedField', () => {
    it('should return true when there is no repeated field', function() {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: {enum: ['B']}, type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRepeatedField'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return true when repeated fields are not enumerated', function() {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitRepeatedField'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });

    it('should return false when repeated fields are not enumerated but constraintManuallySpecifiedValue=true', function() {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRepeatedField'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });

    it('should return false when one of the repeated fields is enumerated', function() {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL},
          {channel: Channel.Y, field: {enum: ['A', 'B']}, type: Type.NOMINAL}
        ]
      });

      specM.setEncodingProperty(1, Property.FIELD, 'A', {enum: ['A', 'B']});

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitRepeatedField'].satisfy(specM, schema, CONSTRAINT_MANUALLY_SPECIFIED_CONFIG));
    });
  });

  describe('omitTableWithOcclusionIfAutoAddCount', () => {
    it('return false for raw plot with both x and y as dimensions without autocount or aggregation.', () => {
      [Mark.POINT, Mark.CIRCLE, Mark.SQUARE, Mark.LINE, Mark.AREA, Mark.BAR].forEach((mark) => {
        const specM = buildSpecQueryModel({
          mark: mark,
          encodings: [
            {channel: Channel.X, field: 'N', type: Type.NOMINAL},
            {channel: Channel.Y, field: 'N20', type: Type.NOMINAL}
          ]
        });
        assert.isFalse(SPEC_CONSTRAINT_INDEX['omitTableWithOcclusionIfAutoAddCount'].satisfy(specM, schema, {autoAddCount: true}));

      });
    });
  });

  describe('omitVerticalDotPlot', () => {
    it('should return true for horizontal dot plot', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.X, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isTrue(SPEC_CONSTRAINT_INDEX['omitVerticalDotPlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });


    it('should return false for vertical dot plot', () => {
      const specM = buildSpecQueryModel({
        mark: Mark.POINT,
        encodings: [
          {channel: Channel.Y, field: 'A', type: Type.NOMINAL}
        ]
      });

      assert.isFalse(SPEC_CONSTRAINT_INDEX['omitVerticalDotPlot'].satisfy(specM, schema, DEFAULT_QUERY_CONFIG));
    });
  });
});
