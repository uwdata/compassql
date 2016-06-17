import {assert} from 'chai';

import {AggregateOp} from 'vega-lite/src/aggregate';
import {Channel} from 'vega-lite/src/channel';
import {Mark} from 'vega-lite/src/mark';
import {Type} from 'vega-lite/src/type';

import {generate} from '../src/generate';
import {SHORT_ENUM_SPEC} from '../src/query';
import {some} from '../src/util';

import {schema, stats} from './fixture';

describe('generate', function () {
  describe('1D', () => {
    describe('Q with aggregate=?, bin=?', () => {
      it('should enumerate raw, bin, aggregate', () => {
        const query = {
          mark: Mark.POINT,
          encodings: [{
            channel: Channel.X,
            bin: SHORT_ENUM_SPEC,
            aggregate: SHORT_ENUM_SPEC,
            field: 'Q',
            type: Type.QUANTITATIVE
          }]
        };
        const answerSet = generate(query, schema, stats, {autoAddCount: true});
        assert.equal(answerSet.length, 3);
      });
    });
  });

  describe('2D', () => {
    describe('x:N,y:N', () => {
      const query = {
        mark: SHORT_ENUM_SPEC,
        encodings: [{
          channel: Channel.X,
          field: 'N',
          type: Type.NOMINAL
        },{
          channel: Channel.Y,
          field: 'N20',
          type: Type.NOMINAL
        }],
        config: {autoAddCount: true}
      };

      const answerSet = generate(query, schema, stats, {autoAddCount: true});

      it('should return counted heatmaps', () => {
        assert.isTrue(answerSet.length > 0);
        answerSet.forEach((specM) => {
          assert.isTrue(some(specM.getEncodings(), (encQ) => {
            return encQ.autoCount === true;
          }));
        });
      });

      it('should not use tick, bar, line or area', () => {
        answerSet.forEach((specM) => {
          assert.notEqual(specM.getMark(), Mark.AREA);
          assert.notEqual(specM.getMark(), Mark.LINE);
          assert.notEqual(specM.getMark(), Mark.BAR);
          assert.notEqual(specM.getMark(), Mark.TICK);
        });
      });
    });

    describe('QxQ', () => {
      it('should not return any of bar, tick, line, or area', () => {
        const query = {
          mark: SHORT_ENUM_SPEC,
          encodings: [{
            channel: Channel.X,
            field: 'Q',
            type: Type.QUANTITATIVE
          },{
            channel: Channel.Y,
            field: 'Q1',
            type: Type.QUANTITATIVE
          }]
        };
        const answerSet = generate(query, schema, stats, {autoAddCount: true});
        answerSet.forEach((specM) => {
          assert.notEqual(specM.getMark(), Mark.AREA);
          assert.notEqual(specM.getMark(), Mark.LINE);
          assert.notEqual(specM.getMark(), Mark.BAR);
          assert.notEqual(specM.getMark(), Mark.TICK);
        });
      });
    });

    describe('A(Q) x A(Q)', () => {
      it('should return neither line nor area', () => {
        const query = {
          mark: SHORT_ENUM_SPEC,
          encodings: [{
            channel: Channel.X,
            aggregate: AggregateOp.MEAN,
            field: 'Q',
            type: Type.QUANTITATIVE
          },{
            channel: Channel.Y,
            aggregate: AggregateOp.MEAN,
            field: 'Q1',
            type: Type.QUANTITATIVE
          }]
        };
        const answerSet = generate(query, schema, stats, {autoAddCount: true});
        answerSet.forEach((specM) => {
          assert.notEqual(specM.getMark(), Mark.AREA);
          assert.notEqual(specM.getMark(), Mark.LINE);
        });
      });
    });
  });

  describe('3D', () => {
    describe('NxNxQ', () => {
      const query = {
        mark: SHORT_ENUM_SPEC,
        encodings: [{
          channel: SHORT_ENUM_SPEC,
          field: 'N',
          type: Type.NOMINAL
        },{
          channel: SHORT_ENUM_SPEC,
          field: 'N20',
          type: Type.NOMINAL
        },{
          channel: SHORT_ENUM_SPEC,
          field: 'Q',
          type: Type.QUANTITATIVE
        }]
      };

      const answerSet = generate(query, schema, stats);

      it('should return not generate a plot with both x and y as dimensions.', () => {
        answerSet.forEach((specM) => {
          assert.isFalse(
            specM.getEncodingQueryByChannel(Channel.X).type === Type.NOMINAL &&
            specM.getEncodingQueryByChannel(Channel.Y).type === Type.NOMINAL
          );
        });
      });
    });
  });

  describe('bin_maxbins', () => {
    describe('Qx#', () => {
      it('should enumerate multiple maxbins parameter', () => {
        const specQ = {
          mark: Mark.BAR,
          encodings: [
            {
              channel: Channel.X,
              bin: {maxbins: {values: [10, 20, 30]}},
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        };

        const answerSet = generate(specQ, schema, stats);
        assert.equal(answerSet.length, 3);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).bin['maxbins'], 10);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).bin['maxbins'], 20);
        assert.equal(answerSet[2].getEncodingQueryByIndex(0).bin['maxbins'], 30);
      });

      it('should support enumerating both bin enablling and maxbins parameter', () => {
        const specQ = {
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              bin: {
                values: [true, false],
                maxbins: {values: [10, 20, 30]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        };

        const answerSet = generate(specQ, schema, stats);
        assert.equal(answerSet.length, 4);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).bin['maxbins'], 10);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).bin['maxbins'], 20);
        assert.equal(answerSet[2].getEncodingQueryByIndex(0).bin['maxbins'], 30);
        assert.equal(answerSet[3].getEncodingQueryByIndex(0).bin, false);
      });
    });
  });
});

