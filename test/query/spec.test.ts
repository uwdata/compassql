import {AggregateOp} from 'vega-lite/src/aggregate';
import {AxisOrient} from 'vega-lite/src/axis';
import {Channel} from 'vega-lite/src/channel';
import {Mark, BAR, AREA, PRIMITIVE_MARKS} from 'vega-lite/src/mark';
import {StackOffset} from 'vega-lite/src/stack';
import {SortOrder} from 'vega-lite/src/sort';
import {Type} from 'vega-lite/src/type';

import {assert} from 'chai';

import {fromSpec, stack} from '../../src/query/spec';
import {without} from '../../src/util';

describe('query/spec', () => {
  describe('stack', () => {
    const STACKABLE_MARKS = [BAR, AREA];
    const NON_STACKABLE_MARKS = without(PRIMITIVE_MARKS, STACKABLE_MARKS);

    it('should always return null for nonstackable marks with at least of of the stack channel', () => {
      [undefined, StackOffset.CENTER, StackOffset.NONE, StackOffset.ZERO, StackOffset.NORMALIZE].forEach((_stack) => {
        NON_STACKABLE_MARKS.forEach((nonStackableMark) => {
          const specQ = {
            mark: nonStackableMark,
            encodings: [
              {channel: Channel.X, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
              {channel: Channel.Y, field: 'N', type: Type.NOMINAL},
              {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
            ],
            config: {mark: {stacked: _stack}}
          };
          assert.equal(stack(specQ), null);
        });
      });
    });

    it('should always return null for raw plot', () => {
      [undefined, StackOffset.CENTER, StackOffset.NONE, StackOffset.ZERO, StackOffset.NORMALIZE].forEach((_stack) => {
        PRIMITIVE_MARKS.forEach((mark) => {
          const specQ = {
            mark: mark,
            encodings: [
              {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE},
              {channel: Channel.Y, field: 'N', type: Type.NOMINAL},
              {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
            ],
            config: {mark: {stack: _stack}}
          };
          assert.equal(stack(specQ), null);
        });
      });
    });

    it('should always return null if there is no grouping channel', () => {
      [undefined, StackOffset.CENTER, StackOffset.NONE, StackOffset.ZERO, StackOffset.NORMALIZE].forEach((_stack) => {
        PRIMITIVE_MARKS.forEach((mark) => {
          const specQ = {
            mark: mark,
            encodings: [
              {channel: Channel.X, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
              {channel: Channel.Y, field: 'N', type: Type.NOMINAL}
            ],
            config: {mark: {stack: _stack}}
          };
          assert.equal(stack(specQ), null);
        });
      });
    });
    it('should always be disabled if both x and y are aggregate', () => {
      [undefined, StackOffset.CENTER, StackOffset.NONE, StackOffset.ZERO, StackOffset.NORMALIZE].forEach((stacked) => {
        PRIMITIVE_MARKS.forEach((mark) => {
          const specQ = {
              mark: mark,
              encodings: [
                {channel: Channel.X, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
                {channel: Channel.Y, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ]
            };
          assert.isNull(stack(specQ));
        });
      });
    });

    it('should always be disabled if neither x nor y is aggregate', () => {
      [undefined, StackOffset.CENTER, StackOffset.NONE, StackOffset.ZERO, StackOffset.NORMALIZE].forEach((stacked) => {
        PRIMITIVE_MARKS.forEach((mark) => {
          const specQ = {
              mark: mark,
              encodings: [
                {channel: Channel.X, field: 'N', type: Type.NOMINAL},
                {channel: Channel.Y, field: 'N', type: Type.NOMINAL},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ]
            };
          assert.isNull(stack(specQ));
        });
      });
    });

    describe('stack().groupbyChannel, .fieldChannel', () => {
      it('should be correct for horizontal', () => {
        [BAR, AREA].forEach((stackableMark) => {
          const specQ = {
              mark: stackableMark,
              encodings: [
                {channel: Channel.X, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
                {channel: Channel.Y, field: 'N', type: Type.NOMINAL},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ]
            };
          const _stack = stack(specQ);
          assert.equal(_stack.fieldChannel, Channel.X);
          assert.equal(_stack.groupbyChannel, Channel.Y);
        });
      });

      it('should be correct for horizontal (single)', () => {
        [BAR, AREA].forEach((stackableMark) => {
          const specQ = {
              mark: stackableMark,
              encodings: [
                {channel: Channel.X, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ]
            };
          const _stack = stack(specQ);
          assert.equal(_stack.fieldChannel, Channel.X);
          assert.equal(_stack.groupbyChannel, null);
        });
      });

      it('should be correct for vertical', () => {
        [BAR, AREA].forEach((stackableMark) => {
          const specQ = {
              mark: stackableMark,
              encodings: [
                {channel: Channel.Y, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
                {channel: Channel.X, field: 'N', type: Type.NOMINAL},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ]
            };
          const _stack = stack(specQ);
          assert.equal(_stack.fieldChannel, Channel.Y);
          assert.equal(_stack.groupbyChannel, Channel.X);
        });
      });

      it('should be correct for vertical (single)', () => {
        [BAR, AREA].forEach((stackableMark) => {
          const specQ = {
              mark: stackableMark,
              encodings: [
                {channel: Channel.Y, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ]
            };
          const _stack = stack(specQ);
          assert.equal(_stack.fieldChannel, Channel.Y);
          assert.equal(_stack.groupbyChannel, null);
        });
      });


      it('should be correct for auto count', () => {
        [BAR, AREA].forEach((stackableMark) => {
          const specQ = {
              mark: stackableMark,
              encodings: [
                {channel: Channel.Y, autoCount: true, type: Type.QUANTITATIVE},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ]
            };
          const _stack = stack(specQ);
          assert.isNotNull(_stack);
        });
      });
    });

    describe('stack().offset', () => {
      it('should return zero for stackable marks with at least of of the stack channel if stacked is unspecified', () => {
        [BAR, AREA].forEach((stackableMark) => {
          const specQ = {
            mark: stackableMark,
            encodings: [
              {channel: Channel.X, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
              {channel: Channel.Y, field: 'N', type: Type.NOMINAL},
              {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
            ]
          };
          assert.equal(stack(specQ).offset, StackOffset.ZERO);
        });
      });

      it('should return the specified stack for stackable marks with at least one of the stack channel', () => {
        [StackOffset.CENTER, StackOffset.ZERO, StackOffset.NORMALIZE].forEach((_stack) => {
          [BAR, AREA].forEach((stackableMark) => {
            const specQ = {
              mark: stackableMark,
              encodings: [
                {channel: Channel.X, aggregate: AggregateOp.SUM, field: 'Q', type: Type.QUANTITATIVE},
                {channel: Channel.Y, field: 'N', type: Type.NOMINAL},
                {channel: Channel.COLOR, field: 'N1', type: Type.NOMINAL},
              ],
              config: {mark: {stacked: _stack}}
            };
            assert.equal(stack(specQ).offset, _stack);
          });
        });
      });
    });
  });

  describe('fromSpec', () => {
    it('should produce correct SpecQuery', () => {
      const specQ = fromSpec({
        data: {values: [{x: 1}, {x: 2}]},
        transform: {filter: 'datum.x ===2'},
        mark: Mark.POINT,
        encoding: {
          x: {
            field: 'x',
            type: Type.QUANTITATIVE,
            axis: {orient: AxisOrient.TOP, shortTimeLabels: true, ticks: 5, title: 'test x channel'}
          },
          y: {field: 'x', type: Type.QUANTITATIVE, scale: null}
        },
        config: {}
      });
      assert.deepEqual(specQ, {
        data: {values: [{x: 1}, {x: 2}]},
        transform: {filter: 'datum.x ===2'},
        mark: Mark.POINT,
        encodings: [
          {channel: 'x', field: 'x', type: Type.QUANTITATIVE, axis: {orient: AxisOrient.TOP, shortTimeLabels: true, ticks: 5, title: 'test x channel'}},
          {channel: 'y', field: 'x', type: Type.QUANTITATIVE, scale: false}
        ],
        config: {}
      });
    });

    it('should produce correct SpecQuery with Sort', () => {
      const specQ = fromSpec({
        data: {values: [{x: 1}, {x: 2}]},
        transform: {filter: 'datum.x ===2'},
        mark: Mark.POINT,
        encoding: {
          x: {field: 'x', sort: SortOrder.ASCENDING, type: Type.QUANTITATIVE},
          y: {field: 'x', sort: {field: 'x', op: AggregateOp.MEAN, order: SortOrder.ASCENDING}, type: Type.QUANTITATIVE, scale: null}
        },
        config: {}
      });
      assert.deepEqual(specQ, {
        data: {values: [{x: 1}, {x: 2}]},
        transform: {filter: 'datum.x ===2'},
        mark: Mark.POINT,
        encodings: [
          {channel: 'x', field: 'x', sort: SortOrder.ASCENDING, type: Type.QUANTITATIVE},
          {channel: 'y', field: 'x',  sort: {field: 'x', op: AggregateOp.MEAN, order: SortOrder.ASCENDING}, type: Type.QUANTITATIVE, scale: false}
        ],
        config: {}
      });
    });

    it('should produce correct SpecQuery without data, transform, config', () => {
      const specQ = fromSpec({
        mark: Mark.POINT,
        encoding: {
          x: {field: 'x', type: Type.QUANTITATIVE},
          y: {field: 'x', type: Type.QUANTITATIVE, scale: null}
        },
      });
      assert.deepEqual(specQ, {
        mark: Mark.POINT,
        encodings: [
          {channel: 'x', field: 'x', type: Type.QUANTITATIVE},
          {channel: 'y', field: 'x', type: Type.QUANTITATIVE, scale: false}
        ]
      });
    });
  });
});
