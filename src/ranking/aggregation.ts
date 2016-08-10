import {AggregateOp} from 'vega-lite/src/aggregate';
import {Type} from 'vega-lite/src/type';
import {QueryConfig} from '../config';
import {SpecQueryModel} from '../model';
import {Schema} from '../schema';
import {some} from '../util';

import {RankingScore, FeatureScore} from './ranking';

import {EncodingQuery, isDimension, isMeasure} from '../query/encoding';

export const name = 'aggregationQuality';

export function score(specM: SpecQueryModel, schema: Schema, opt: QueryConfig): RankingScore {
  const feature = aggregationQualityFeature(specM, schema, opt);
  return {
    score: feature.score,
    features: [feature]
  };
}

function aggregationQualityFeature (specM: SpecQueryModel, schema: Schema, opt: QueryConfig): FeatureScore {
  const encodings = specM.getEncodings();
  if (specM.isAggregate()) {
    const isRawContinuous = (encQ) => {
      return (encQ.type === Type.QUANTITATIVE && !encQ.bin && !encQ.aggregate && !encQ.autoCount) ||
        (encQ.type === Type.TEMPORAL && !encQ.timeUnit);
    };

    if (some(encodings, isRawContinuous)) {
      // These are plots that pollute continuous fields as dimension.
      // They are often intermediate visualizations rather than what users actually want.
      return {
        type: name,
        score: 0.1,
        feature: 'Aggregate with raw continuous'
      };
    }

    if (some(encodings, isDimension)) {
      if (some(encodings, (encQ: EncodingQuery) => encQ.aggregate === AggregateOp.COUNT)) {
        // If there is count, we might add additional count field, making it a little less simple
        // then when we just apply aggregate to Q field
        return {
          type: name,
          score: 0.8,
          feature: 'Aggregate with count'
        };
      }
      return {
        type: name,
        score: 0.9,
        feature: 'Aggregate without count'
      };
    }
    // no dimension -- often not very useful
    return {
      type: name,
      score: 0.3,
      feature: 'Aggregate without dimension'
    };
  } else {
    if (some(encodings, isMeasure)) {
       // raw plots with measure -- simplest of all!
      return {
        type: name,
        score: 1,
        feature: 'Raw with measure'
      };
    }
    // raw plots with no measure -- often a lot of occlusion
    return {
      type: name,
      score: 0.2,
      feature: 'Raw without measure'
    };
  }
}
