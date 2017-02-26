import {Channel} from 'vega-lite/src/channel';
import {Mark} from 'vega-lite/src/mark';

import {QueryConfig} from '../../config';
import {SpecQueryModel} from '../../model';
import {Dict, forEach} from '../../util';
import {Schema} from '../../schema';

import {FeatureScore} from '../ranking';
import {getFeatureScore} from './effectiveness';
import {BIN_Q, TIMEUNIT_T, TIMEUNIT_O, Q, N, O, T, NONE, ExtendedType, getExtendedType} from './type';

export namespace MarkScore {
  export const MARK_SCORE = 'markScore';
  export const TERRIBLE = -10;

  export function featurize(xType: ExtendedType, yType: ExtendedType, hasOcclusion: boolean, mark: Mark) {
    return xType + '_' + yType + '_' + hasOcclusion + '_' + mark;
  }

  export function init() {
    const MEASURES = [Q, T];
    const DISCRETE = [BIN_Q, TIMEUNIT_O, O, N];
    const DISCRETE_OR_NONE = DISCRETE.concat([NONE]);

    let SCORE = {} as Dict<number>;
    // QxQ
    MEASURES.forEach((xType) => {
      MEASURES.forEach((yType) => {
        // has occlusion
        const occludedQQMark = {
          point: 0,
          text: -0.2,
          tick: -0.5,
          bar: -2,
          line: -2,
          area: -2,
          rule: -2.5,
          rect: -2*TERRIBLE,
        };
        forEach(occludedQQMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, true, mark);
          SCORE[feature] = score;
        });

        // no occlusion
        // TODO: possible to use connected scatter plot
        const noOccludedQQMark = {
          point: 0,
          text: -0.2,
          tick: -0.5,
          bar: -2,
          line: -2,
          area: -2,
          rule: -2.5,
          rect: -2*TERRIBLE
        };
        forEach(noOccludedQQMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, false, mark);
          SCORE[feature] = score;
        });
      });
    });

    // DxQ, QxD
    MEASURES.forEach((xType) => {

      // HAS OCCLUSION
      DISCRETE_OR_NONE.forEach((yType) => {
        const occludedDimensionMeasureMark = {
          tick: 0,
          point: -0.2,
          text: -0.5,
          bar: -2,
          line: -2,
          area: -2,
          rule: -2.5
        };
        forEach(occludedDimensionMeasureMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, true, mark);
          SCORE[feature] = score;
          // also do the inverse
          const feature2 = featurize(yType, xType, true, mark);
          SCORE[feature2] = score;
        });
      });

      [TIMEUNIT_T].forEach((yType) => {
        const occludedDimensionMeasureMark = {
          // For Time Dimension with time scale, tick is not good
          point: 0,
          text: -0.5,
          tick: -1,
          bar: -2,
          line: -2,
          area: -2,
          rule: -2.5
        };
        forEach(occludedDimensionMeasureMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, true, mark);
          SCORE[feature] = score;
          // also do the inverse
          const feature2 = featurize(yType, xType, true, mark);
          SCORE[feature2] = score;
        });
      });

      // NO OCCLUSION
      [NONE, N, O].forEach((yType) => {
        const noOccludedQxN = {
          bar: 0,
          point: -0.2,
          tick: -0.25,
          text: -0.3,
          // Line / Area can mislead trend for N
          line: -2, // FIXME line vs area?
          area: -2,
          // Non-sense to use rule here
          rule: -2.5
        };
        forEach(noOccludedQxN, (score, mark: Mark) => {
          const feature = featurize(xType, yType, false, mark);
          SCORE[feature] = score;

          // also do the inverse
          const feature2 = featurize(yType, xType, false, mark);
          SCORE[feature2] = score;
        });
      });

      [BIN_Q].forEach((yType) => {
        const noOccludedQxBinQ = {
          bar: 0,
          point: -0.2,
          tick: -0.25,
          text: -0.3,
          // Line / Area isn't the best fit for bin
          line: -0.5,// FIXME line vs area?
          area: -0.5,
          // Non-sense to use rule here
          rule: -2.5
        };
        forEach(noOccludedQxBinQ, (score, mark: Mark) => {
          const feature = featurize(xType, yType, false, mark);
          SCORE[feature] = score;

          // also do the inverse
          const feature2 = featurize(yType, xType, false, mark);
          SCORE[feature2] = score;
        });
      });

      [TIMEUNIT_T, TIMEUNIT_O].forEach((yType) => {
        // For aggregate / surely no occlusion plot, Temporal with time or ordinal
        // are not that different.
        const noOccludedQxBinQ = {
          line: 0,
          area: -0.1,
          bar: -0.2,
          point: -0.3,
          tick: -0.35,
          text: -0.4,
          // Non-sense to use rule here
          rule: -2.5
        };
        forEach(noOccludedQxBinQ, (score, mark: Mark) => {
          const feature = featurize(xType, yType, false, mark);
          SCORE[feature] = score;

          // also do the inverse
          const feature2 = featurize(yType, xType, false, mark);
          SCORE[feature2] = score;
        });
      });
    });

    [TIMEUNIT_T].forEach((xType) => {
      [TIMEUNIT_T].forEach((yType) => {
        // has occlusion
        const ttMark = {
          point: 0,
          rect: -0.1, // assuming rect will be small
          text: -0.5,
          tick: -1,
          bar: -2,
          line: -2,
          area: -2,
          rule: -2.5
        };
        // No difference between has occlusion and no occlusion
        // as most of the time, it will be the occluded case.
        forEach(ttMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, true, mark);
          SCORE[feature] = score;
        });
        forEach(ttMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, false, mark);
          SCORE[feature] = score;
        });
      });

      DISCRETE_OR_NONE.forEach((yType) => {
        // has occlusion
        const tdMark = {
          tick: 0,
          point: -0.2,
          text: -0.5,
          rect: -1,
          bar: -2,
          line: -2,
          area: -2,
          rule: -2.5
        };
        // No difference between has occlusion and no occlusion
        // as most of the time, it will be the occluded case.
        forEach(tdMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, true, mark);
          SCORE[feature] = score;
        });
        forEach(tdMark, (score, mark: Mark) => {
          const feature = featurize(yType, xType, true, mark);
          SCORE[feature] = score;
        });
        forEach(tdMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, false, mark);
          SCORE[feature] = score;
        });
        forEach(tdMark, (score, mark: Mark) => {
          const feature = featurize(yType, xType, false, mark);
          SCORE[feature] = score;
        });
      });
    });

    // DxD
    DISCRETE_OR_NONE.forEach((xType) => {
      DISCRETE_OR_NONE.forEach((yType) => {
        // has occlusion
        const ddMark = {
          point: 0,
          rect: 0,
          text: -0.1,
          tick: -1,
          bar: -2,
          line: -2,
          area: -2,
          rule: -2.5
        };
        // No difference between has occlusion and no occlusion
        forEach(ddMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, true, mark);
          SCORE[feature] = score;
        });
        forEach(ddMark, (score, mark: Mark) => {
          const feature = featurize(xType, yType, false, mark);
          SCORE[feature] = score;
        });
      });
    });
    return SCORE;
  }

  export function getScore(specM: SpecQueryModel, _: Schema, __: QueryConfig): FeatureScore[] {
    let mark = specM.getMark() as Mark;
    if (mark === Mark.CIRCLE || mark === Mark.SQUARE) {
      mark = Mark.POINT;
    }
    const xEncQ = specM.getEncodingQueryByChannel(Channel.X);
    const xType = xEncQ ? getExtendedType(xEncQ) : NONE;

    const yEncQ = specM.getEncodingQueryByChannel(Channel.Y);
    const yType = yEncQ ? getExtendedType(yEncQ) : NONE;

    const isOccluded = !specM.isAggregate(); // FIXME

    const feature = xType + '_' + yType + '_' + isOccluded + '_' + mark;
    const featureScore = getFeatureScore(MARK_SCORE, feature);
    return [featureScore];
  }
}
