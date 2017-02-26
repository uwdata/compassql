import {Channel} from 'vega-lite/src/channel';

import {QueryConfig, DEFAULT_QUERY_CONFIG} from '../../config';
import {SpecQueryModel} from '../../model';
import {fieldDef as fieldDefShorthand} from '../../query/shorthand';
import {EncodingQuery} from '../../query/encoding';
import {Dict, extend, forEach, keys} from '../../util';

import {Schema} from '../../schema';
import {FeatureScore} from '../ranking';
import {getFeatureScore} from './effectiveness';
import {BIN_Q, TIMEUNIT_T, TIMEUNIT_O, Q, N, O, T, ExtendedType, getExtendedType} from './type';
export const TERRIBLE = -10;

/**
 * Field Type (with Bin and TimeUnit) and Channel Score (Cleveland / Mackinlay based)
 */
export namespace TypeChannelScore {
  export const TYPE_CHANNEL = 'typeChannel';

  export function init() {
    let SCORE = {} as Dict<number>;


    // Continuous Quantitative / Temporal Fields

    const CONTINUOUS_TYPE_CHANNEL_SCORE = {
      x: 0,
      y: 0,
      size: -0.575,
      color: -0.725,  // Middle between -0.7 and -0.75
      text: -2,
      opacity: -3,

      shape: TERRIBLE,
      row: TERRIBLE,
      column: TERRIBLE,
      detail: 2 * TERRIBLE
    };

    [Q, T, TIMEUNIT_T].forEach((type) => {
      keys(CONTINUOUS_TYPE_CHANNEL_SCORE).forEach((channel: Channel) => {
        SCORE[featurize(type, channel)] = CONTINUOUS_TYPE_CHANNEL_SCORE[channel];
      });
    });

    // Discretized Quantitative / Temporal Fields / Ordinal

    const ORDERED_TYPE_CHANNEL_SCORE = extend({}, CONTINUOUS_TYPE_CHANNEL_SCORE, {
      row: -0.75,
      column: -0.75,

      shape: -3.1,
      text: -3.2,
      detail: -4
    });

    [BIN_Q, TIMEUNIT_O, O].forEach((type) => {
      keys(ORDERED_TYPE_CHANNEL_SCORE).forEach((channel: Channel) => {
        SCORE[featurize(type, channel)] = ORDERED_TYPE_CHANNEL_SCORE[channel];
      });
    });

    const NOMINAL_TYPE_CHANNEL_SCORE = {
      x: 0,
      y: 0,
      color: -0.6, // TODO: make it adjustable based on preference (shape is better for black and white)
      shape: -0.65,
      strokeDash: -0.65,
      row: -0.7,
      column: -0.7,
      text: -0.8,

      detail: -2,
      size: -3,
      opacity: -3.1,
    };

    keys(NOMINAL_TYPE_CHANNEL_SCORE).forEach((channel: Channel) => {
      SCORE[featurize(N, channel)] = NOMINAL_TYPE_CHANNEL_SCORE[channel];
    });

    return SCORE;
  }

  export function featurize(type: ExtendedType, channel: Channel) {
    return type + '_' + channel;
  }

  export function getScore(specM: SpecQueryModel, _: Schema, __: QueryConfig) {
    const encodingQueryByField = specM.getEncodings().reduce((m, encQ) => {
      const fieldKey = fieldDefShorthand(encQ);
      (m[fieldKey] = m[fieldKey] || []).push(encQ);
      return m;
    }, {});

    const features: FeatureScore[] = [];

    forEach(encodingQueryByField, (encQs: EncodingQuery[]) => {
      const bestFieldFeature = encQs.reduce((best: FeatureScore, encQ) => {
        const type = getExtendedType(encQ);
        const feature = featurize(type, encQ.channel as Channel);
        const featureScore = getFeatureScore(TYPE_CHANNEL, feature);
        if (best === null || featureScore.score > best.score) {
          return featureScore;
        }
        return best;
      }, null);

      features.push(bestFieldFeature);

      // TODO: add plus for over-encoding of one field
    });
    return features;
  }
}

export namespace PreferredAxisScore {
  export const PREFERRED_AXIS = 'preferredAxis';

  // FIXME support doing this at runtime
  export function init(opt: QueryConfig = {}) {
    opt = extend({}, DEFAULT_QUERY_CONFIG, opt);
    let score: Dict<number> = {};

    const preferredAxes = [{
      feature: BIN_Q,
      opt: 'preferredBinAxis'
    },{
      feature: T,
      opt: 'preferredTemporalAxis'
    },{
      feature: TIMEUNIT_T,
      opt: 'preferredTemporalAxis'
    },{
      feature: TIMEUNIT_O,
      opt: 'preferredTemporalAxis'
    },{
      feature: O,
      opt: 'preferredOrdinalAxis'
    },{
      feature: N,
      opt: 'preferredNominalAxis'
    }];

    preferredAxes.forEach((preferredAxis) => {
      if (opt[preferredAxis.opt] === Channel.X) {
        // penalize the other axis
        score[preferredAxis.feature + '_' + Channel.Y] = -0.01;
      } else if (opt[preferredAxis.opt] === Channel.Y) {
        // penalize the other axis
        score[preferredAxis.feature + '_' + Channel.X] = -0.01;
      }
    });

    return score;
  }

  export function featurize(type: ExtendedType, channel: Channel) {
    return type + '_' + channel;
  }

  export function getScore(specM: SpecQueryModel, _: Schema, __: QueryConfig): FeatureScore[] {
    return specM.getEncodings().reduce((features, encQ: EncodingQuery) => {
      const type = getExtendedType(encQ);
      const feature = featurize(type, encQ.channel as Channel);
      const featureScore = getFeatureScore(PREFERRED_AXIS, feature);
      if (featureScore) {
        features.push(featureScore);
      }
      return features;
    }, []);
  }
}

export namespace PreferredFacetScore {
  export const PREFERRED_FACET = 'preferredFacet';

  // FIXME support doing this at runtime
  export function init(opt?: QueryConfig) {
    opt = extend({}, DEFAULT_QUERY_CONFIG, opt);
    let score: Dict<number> = {};

    if (opt.preferredFacet === Channel.ROW) {
      // penalize the other axis
      score[Channel.COLUMN] = -0.01;
    } else if (opt.preferredFacet === Channel.COLUMN) {
      // penalize the other axis
      score[Channel.ROW] = -0.01;
    }

    return score;
  }

  export function getScore(specM: SpecQueryModel, _: Schema, __: QueryConfig): FeatureScore[] {
    return specM.getEncodings().reduce((features, encQ: EncodingQuery) => {
      const featureScore = getFeatureScore(PREFERRED_FACET, encQ.channel as string);
      if (featureScore) {
        features.push(featureScore);
      }
      return features;
    }, []);
  }
}

export namespace MarkChannelScore {
  // Penalty for certain channel for certain mark types
  export const MARK_CHANNEL = 'markChannel';

  export function init() {
    return {
      bar_size: -TERRIBLE,
      tick_size: -TERRIBLE
    } as Dict<number>;
  }

  export function getScore(specM: SpecQueryModel, _: Schema, __: QueryConfig): FeatureScore[] {
    const mark = specM.getMark();
    return specM.getEncodings().reduce((featureScores, encQ) => {
      const feature = mark + '_' + encQ.channel;
      const featureScore = getFeatureScore(MARK_CHANNEL, feature);
      if (featureScore) {
        featureScores.push(featureScore);
      }
      return featureScores;
    }, []);
  }
}

/**
 * Penalize if facet channels are the only dimensions
 */
export namespace DimensionScore {
  export const DIMENSION = 'dimension';

  export function init() {
    return {
      row: -2,
      column: -2,
      color: 0,
      opacity: 0,
      size: 0,
      shape: 0
    } as Dict<number>;
  }

  export function getScore(specM: SpecQueryModel, _: Schema, __: QueryConfig): FeatureScore[] {
    if (specM.isAggregate()) {
      specM.getEncodings().reduce((maxFScore, encQ: EncodingQuery) => {
        if (!encQ.aggregate && !encQ.autoCount) { // isDimension
          const featureScore = getFeatureScore(DIMENSION, encQ.channel + '');
          if (featureScore.score > maxFScore.score) {
            return featureScore;
          }
        }
        return maxFScore;
      }, {type: DIMENSION, feature: 'No Dimension', score: -5});
    }
    return [];
  }
}
