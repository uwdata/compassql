import {assert} from 'chai';

import {AggregateOp} from 'vega-lite/src/aggregate';
import {Channel} from 'vega-lite/src/channel';
import {Mark} from 'vega-lite/src/mark';
import {ScaleType} from 'vega-lite/src/scale';
import {TimeUnit} from 'vega-lite/src/timeunit';
import {Type} from 'vega-lite/src/type';

import {DEFAULT_QUERY_CONFIG} from '../src/config';
import {ENUMERATOR_INDEX} from '../src/enumerator';
import {SpecQueryModel} from '../src/model';
import {BinQuery, ScaleQuery} from '../src/query/encoding';
import {SpecQuery} from '../src/query/spec';
import {Property} from '../src/property';
import {extend} from '../src/util';

import {schema} from './fixture';

function buildSpecQueryModel(specQ: SpecQuery) {
  return SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG);
}

describe('enumerator', () => {
  describe('mark', () => {
    it('should correctly enumerate marks', () => {
      const specM = buildSpecQueryModel({
        mark: {enum: [Mark.POINT, Mark.TICK]},
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE},
          {channel: Channel.Y, field: 'O', type: Type.ORDINAL}
        ]
      });
      const enumerator = ENUMERATOR_INDEX[Property.MARK](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

      const answerSet = enumerator([], specM);
      assert.equal(answerSet.length, 2);
      assert.equal(answerSet[0].getMark(), Mark.POINT);
      assert.equal(answerSet[1].getMark(), Mark.TICK);
    });

    it('should not enumerate invalid mark', () => {
      const specM = buildSpecQueryModel({
        mark: {enum: [Mark.POINT, Mark.BAR, Mark.LINE, Mark.AREA]},
        encodings: [
          {channel: Channel.X, field: 'Q', type: Type.QUANTITATIVE},
          {channel: Channel.SHAPE, field: 'O', type: Type.ORDINAL}
        ]
      });
      const enumerator = ENUMERATOR_INDEX[Property.MARK](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

      const answerSet = enumerator([], specM);
      assert.equal(answerSet.length, 1);
      assert.equal(answerSet[0].getMark(), Mark.POINT);
    });
  });

  describe('encoding', () => {
    describe('channel', () => {
      it('should correctly enumerate channels', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: {enum: [Channel.X, Channel.Y]},
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const opt = extend({}, DEFAULT_QUERY_CONFIG, {omitVerticalDotPlot: false});
        const enumerator = ENUMERATOR_INDEX[Property.CHANNEL](specM.enumSpecIndex, schema, opt);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 2);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).channel, Channel.X);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).channel, Channel.Y);
      });

      it('should not enumerate invalid channels', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.BAR,
          encodings: [
            {
              channel: {enum: [Channel.X, Channel.SHAPE]},
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.CHANNEL](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).channel, Channel.X);
        // Shape should be excluded since it does not work with bar.
      });
    });

    describe('aggregate', () => {
      it('should correctly enumerate aggregate', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              aggregate: {enum: [AggregateOp.MEAN, AggregateOp.MEDIAN, undefined]},
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.AGGREGATE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).aggregate, AggregateOp.MEAN);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).aggregate, AggregateOp.MEDIAN);
        assert.equal(answerSet[2].getEncodingQueryByIndex(0).aggregate, undefined);
      });

      it('should not enumerate aggregate when type is nominal', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              aggregate: {enum: [AggregateOp.MEAN, AggregateOp.MEDIAN, undefined]},
              field: 'N',
              type: Type.NOMINAL
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.AGGREGATE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).aggregate, undefined);
      });
    });

    describe('bin', () => {
      it('should correctly enumerate bin with nested property', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              bin: {
                enum: [true, false],
                maxbins: 10
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.BIN](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 2);
        assert.equal((answerSet[0].getEncodingQueryByIndex(0).bin as BinQuery).maxbins, 10);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).bin, false);
      });

      it('should correctly enumerate bin without nested property', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              bin: {
                enum: [true, false]
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.BIN](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 2);
        assert.deepEqual(answerSet[0].getEncodingQueryByIndex(0).bin, {});
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).bin, false);
      });
    });

    describe('maxbin', () => {
      it('should correctly enumerate maxbins', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.BAR,
          encodings: [
            {
              channel: Channel.X,
              bin: {
                maxbins: {enum: [5, 10, 20]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.BIN_MAXBINS](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.equal((answerSet[0].getEncodingQueryByIndex(0).bin as BinQuery).maxbins, 5);
        assert.equal((answerSet[1].getEncodingQueryByIndex(0).bin as BinQuery).maxbins, 10);
        assert.equal((answerSet[2].getEncodingQueryByIndex(0).bin as BinQuery).maxbins, 20);
      });
    });

    describe('scale', () => {
      it('should correctly enumerate scale with nested property', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                enum: [true, false],
                type: ScaleType.LOG
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 2);
        assert.equal((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).type, ScaleType.LOG);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).scale, false);
      });

      it('should correctly enumerate scale without nested property', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                enum: [true, false]
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 2);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).type, undefined);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).scale, false);
      });
    });

    describe('scaleClamp', () => {
      it('should correctly enumerate scaleClamp', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                clamp: {enum: [true, false, undefined]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_CLAMP](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).clamp, true);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).clamp, false);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).clamp, undefined);
      });
    });

    describe('scaleDomain', () => {
      it('should correctly enumerate scaleDomain with string[] values', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                domain: {enum: [undefined, ['cats', 'dogs'], ['chickens', 'pigs']]}
              },
              field: 'N',
              type: Type.NOMINAL
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_DOMAIN](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).domain, undefined);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).domain, ['cats', 'dogs']);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).domain, ['chickens', 'pigs']);
      });

      it('should correctly enumerate scaleDomain with number[] values', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                domain: {enum: [undefined, [1,3], [5,7]]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_DOMAIN](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).domain, undefined);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).domain, [1,3]);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).domain, [5,7]);
      });
    });

    describe('scaleExponent', () => {
      it('should correctly enumerate scaleExponent', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                exponent: {enum: [0.5, 1, 2, undefined]},
                type: ScaleType.LOG
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_EXPONENT](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 4);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).exponent, 0.5);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).exponent, 1);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).exponent, 2);
        assert.deepEqual((answerSet[3].getEncodingQueryByIndex(0).scale as ScaleQuery).exponent, undefined);

      });
    });

    describe('scaleNice', () => {
      it('should correctly enumerate scaleNice', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                nice: {enum: [undefined, true, false]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_NICE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
      });
    });

    describe('scaleRange', () => {
      it('should correctly enumerate scaleRange with string[] values', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                range: {enum: [undefined, ['cats', 'dogs'], ['chickens', 'pigs']]}
              },
              field: 'N',
              type: Type.NOMINAL
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_RANGE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).range, undefined);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).range, ['cats', 'dogs']);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).range, ['chickens', 'pigs']);
      });

      it('should correctly enumerate scaleRange with number[] values', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                range: {enum: [undefined, [1,3], [5,7]]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_RANGE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).range, undefined);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).range, [1,3]);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).range, [5,7]);
      });
    });

    describe('scaleRound', () => {
      it('should correctly enumerate scaleRound', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                round: {enum: [true, false, undefined]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_ROUND](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).round, true);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).round, false);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).round, undefined);
      });
    });

    describe('scaleType', () => {
      it('should correctly enumerate scaleType', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                type: {enum: [undefined, ScaleType.LOG, ScaleType.POW, ScaleType.ORDINAL]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_TYPE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).type, undefined);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).type, ScaleType.LOG);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).type, ScaleType.POW);
      });
    });

    describe('scaleUseRawDomain', () => {
      it('should correctly enumerate scaleUseRawDomain', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              scale: {
                useRawDomain: {enum: [true, false, undefined]}
              },
              field: 'Q',
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.SCALE_USERAWDOMAIN](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.deepEqual((answerSet[0].getEncodingQueryByIndex(0).scale as ScaleQuery).useRawDomain, true);
        assert.deepEqual((answerSet[1].getEncodingQueryByIndex(0).scale as ScaleQuery).useRawDomain, false);
        assert.deepEqual((answerSet[2].getEncodingQueryByIndex(0).scale as ScaleQuery).useRawDomain, undefined);
      });
    });

    describe('timeUnit', () => {
      it('should correctly enumerate timeUnits', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              field: 'T',
              timeUnit: {enum: [TimeUnit.MONTH, TimeUnit.DAY, TimeUnit.YEAR, undefined]},
              type: Type.TEMPORAL
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.TIMEUNIT](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 4);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).timeUnit, TimeUnit.MONTH);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).timeUnit, TimeUnit.DAY);
        assert.equal(answerSet[2].getEncodingQueryByIndex(0).timeUnit, TimeUnit.YEAR);
        assert.equal(answerSet[3].getEncodingQueryByIndex(0).timeUnit, undefined);
      });

      it('should not enumerate timeUnit with non-temporal field', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              field: 'Q',
              timeUnit: {enum: [TimeUnit.MONTH, TimeUnit.DAY, TimeUnit.YEAR, undefined]},
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.TIMEUNIT](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).timeUnit, undefined);
      });
    });

    describe('field', () => {
      it('should correctly enumerate fields with quantitative type', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              field: {enum: ['Q', 'Q1', 'Q2', 'O', 'N', 'T']},
              type: Type.QUANTITATIVE
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.FIELD](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).field, 'Q');
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).field, 'Q1');
        assert.equal(answerSet[2].getEncodingQueryByIndex(0).field, 'Q2');
      });

      it('should correctly enumerate fields with temporal type', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              field: {enum: ['T', 'Q', 'O', 'N']},
              type: Type.TEMPORAL
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.FIELD](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).field, 'T');
      });

      it('should correctly enumerate fields with ordinal type', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              field: {enum: ['O', 'O_10', 'O_20', 'O_100', 'Q', 'T', 'N']},
              type: Type.ORDINAL
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.FIELD](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 4);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).field, 'O');
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).field, 'O_10');
        assert.equal(answerSet[2].getEncodingQueryByIndex(0).field, 'O_20');
        assert.equal(answerSet[3].getEncodingQueryByIndex(0).field, 'O_100');
      });

      it('should correctly enumerate fields with nominal type', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {
              channel: Channel.X,
              field: {enum: ['N', 'N20', 'Q', 'O', 'T']},
              type: Type.NOMINAL
            }
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.FIELD](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 2);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).field, 'N');
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).field, 'N20');
      });
    });

    describe('type', () => {
      it('should correctly enumerate numeric field with typeMatchesSchemaType config turned off', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'Q', type:  {enum: [Type.QUANTITATIVE, Type.NOMINAL, Type.ORDINAL, Type.TEMPORAL]}},
          ]
        });
        const noTypeMatchesSchema = extend({}, DEFAULT_QUERY_CONFIG, {typeMatchesSchemaType: false});
        const enumerator = ENUMERATOR_INDEX[Property.TYPE](specM.enumSpecIndex, schema, noTypeMatchesSchema);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 3);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).type, Type.QUANTITATIVE);
        assert.equal(answerSet[1].getEncodingQueryByIndex(0).type, Type.NOMINAL);
        assert.equal(answerSet[2].getEncodingQueryByIndex(0).type, Type.ORDINAL);
      });

      it('should correctly enumerate numeric field with typeMatchesSchemaType turned on', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'Q', type:  {enum: [Type.QUANTITATIVE, Type.NOMINAL, Type.ORDINAL, Type.TEMPORAL]}},
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.TYPE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).type, Type.QUANTITATIVE);
      });

      it('should correctly enumerate ordinal types', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'O', type: {enum: [Type.ORDINAL, Type.TEMPORAL, Type.QUANTITATIVE, Type.NOMINAL]}}
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.TYPE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).type, Type.ORDINAL);
      });

      it('should correctly enumerate temporal types', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'T', type: {enum:[Type.TEMPORAL, Type.ORDINAL, Type.QUANTITATIVE, Type.NOMINAL]}}
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.TYPE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).type, Type.TEMPORAL);
      });

      it('should correctly enumerate nominal types', () => {
        const specM = buildSpecQueryModel({
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, field: 'N', type: {enum: [Type.NOMINAL, Type.TEMPORAL, Type.QUANTITATIVE, Type.ORDINAL]}}
          ]
        });
        const enumerator = ENUMERATOR_INDEX[Property.TYPE](specM.enumSpecIndex, schema, DEFAULT_QUERY_CONFIG);

        const answerSet = enumerator([], specM);
        assert.equal(answerSet.length, 1);
        assert.equal(answerSet[0].getEncodingQueryByIndex(0).type, Type.NOMINAL);
      });
    });
  });
});

