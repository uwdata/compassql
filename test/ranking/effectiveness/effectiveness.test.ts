import {AggregateOp} from 'vega-lite/src/aggregate';
import {Channel, X, Y, SIZE, COLOR, OPACITY, ROW, COLUMN, SHAPE} from 'vega-lite/src/channel';
import {AREA, BAR, POINT, SQUARE, CIRCLE, TICK, LINE, RULE, Mark} from 'vega-lite/src/mark';
import {TimeUnit} from 'vega-lite/src/timeunit';
import {Type} from 'vega-lite/src/type';

import {DEFAULT_QUERY_CONFIG} from '../../../src/config';
import {SpecQueryModel} from '../../../src/model';
import {EncodingQuery} from '../../../src/query/encoding';
import {SpecQuery} from '../../../src/query/spec';
import {extend, nestedMap} from '../../../src/util';
import effectiveness from '../../../src/ranking/effectiveness/effectiveness';
import {ExtendedType} from '../../../src/ranking/effectiveness/type';
import {schema} from '../../fixture';
import {RuleSet, Rule, testRuleSet} from '../rule';

function build(specQ: SpecQuery) {
  return SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG);
}

const POINTS = [POINT, SQUARE, CIRCLE] as Mark[];


export const SET_1D: RuleSet<SpecQueryModel> = {
  name: 'mark for plots with 1 field',
  rules: function() {
    const rules: Rule<SpecQueryModel>[] = [];

    function plot1d(mark: Mark, channel: Channel, type: ExtendedType) {
      return SpecQueryModel.build({
        mark: mark,
        encodings: [
          {
            channel: channel,
            field: 'f',
            type: type
          }
        ]
      }, schema, DEFAULT_QUERY_CONFIG);
    }

    rules.push({
      name: 'N with varying mark',
      items: nestedMap([[POINT /*, RECT */], TICK, [LINE, BAR, AREA], RULE], (mark) => {
        return plot1d(mark, X, ExtendedType.N);
      })
    });

    function countplot(mark: Mark, field: string, type: Type) {
      return SpecQueryModel.build({
        mark: mark,
        encodings: [
          {
            channel: Y,
            field: field,
            type: type
          },{
            channel: X,
            aggregate: AggregateOp.COUNT,
            field: '*',
            type: Type.QUANTITATIVE
          }
        ]
      }, schema, DEFAULT_QUERY_CONFIG);
    }

    rules.push({
      name: 'N plot with varying marks',
      items: nestedMap([BAR, POINT, TICK, [LINE, AREA], RULE], (mark) => {
        return countplot(mark, 'N', Type.NOMINAL);
      })
    });

    rules.push({
      name: 'O plot with varying marks',
      items: nestedMap([BAR, POINT, TICK, [LINE, AREA], RULE], (mark) => {
        return countplot(mark, 'O', Type.ORDINAL);
      })
    });

    rules.push({
      name: 'Q dot plot with varying mark',
      items: nestedMap([TICK, POINT, [LINE, BAR, AREA], RULE], (mark) => {
        return plot1d(mark, X, ExtendedType.Q);
      })
    });

    function histogram(mark: Mark, xEncQ: EncodingQuery) {
      return SpecQueryModel.build({
        mark: mark,
        encodings: [
          xEncQ,{
            channel: Y,
            aggregate: AggregateOp.COUNT,
            field: '*',
            type: Type.QUANTITATIVE
          }
        ]
      }, schema, DEFAULT_QUERY_CONFIG);
    }

    rules.push({
      name: 'Q histogram with varying marks',
      items: nestedMap([BAR, POINT, TICK, [LINE, AREA], RULE], (mark) => {
        return histogram(mark, {
          channel: X,
          bin: true,
          field: 'Q',
          type: Type.QUANTITATIVE
        });
      })
    });

    rules.push({
      name: 'T dot plot with varying mark',
      items: nestedMap([TICK, POINT, [LINE, BAR, AREA], RULE], (mark) => {
        return plot1d(mark, X, ExtendedType.T);
      })
    });

    rules.push({
      name: 'TimeUnit T count with varying marks',
      items: nestedMap([LINE, AREA, BAR, POINT, TICK, RULE], (mark) => {
        return histogram(mark, {
          channel: X,
          timeUnit: TimeUnit.MONTH,
          field: 'T',
          type: Type.TEMPORAL
        });
      })
    });
    return rules;
  }()
};


export const SET_2D: RuleSet<SpecQueryModel> = {
  name: 'mark for plots with 2 fields',
  rules: function() {
    const rules: Rule<SpecQueryModel>[] = [];

    rules.push({
      name: 'NxN',
      items: nestedMap([{
        mark: POINT,
        encodings: [
          {channel: X, field: 'N', type: Type.NOMINAL},
          {channel: Y, field: 'N', type: Type.NOMINAL},
          {channel: SIZE, aggregate: AggregateOp.COUNT, field: '*', type: Type.QUANTITATIVE}
        ]
      },{
        mark: BAR,
        encodings: [
          {channel: X, field: 'N', type: Type.NOMINAL},
          {channel: COLOR, field: 'N1', type: Type.NOMINAL},
          {channel: Y, aggregate: AggregateOp.COUNT, field: '*', type: Type.QUANTITATIVE}
        ]
      }], (specQ) => SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG))
    });

    function stripplot(mark: Mark, qMixIns = {}) {
      return build({
        mark: mark,
        encodings: [
          extend({channel: X, field: 'Q', type: Type.QUANTITATIVE}, qMixIns),
          {channel: Y, field: 'N', type: Type.NOMINAL}
        ]
      });
    }

    rules.push({
      name: 'NxQ Strip Plot',
      items: nestedMap([TICK, POINTS], stripplot)
    });

    rules.push({
      name: 'NxA(Q) Strip Plot',
      items: nestedMap([BAR, POINTS, TICK, [LINE, AREA], RULE], (mark) => stripplot(mark, {aggregate: AggregateOp.MEAN}))
    });

    // TODO: O

    // TODO: O x BIN(Q) x #
    return rules;
  }()
};


export const SET_3D: RuleSet<SpecQueryModel> = {
  name: 'encoding for plots with 3 fields',
  rules: function() {
    const rules: Rule<SpecQueryModel>[] = [];

    rules.push({
      name: 'Nx?(Q)x?(Q)',
      items: nestedMap([{
        mark: POINT,
        encodings: [
          {channel: X, field: 'Q', type: Type.QUANTITATIVE},
          {channel: Y, field: 'Q1', type: Type.QUANTITATIVE},
          {channel: COLOR, field: 'N', type: Type.NOMINAL}
        ]
      },[ROW, COLUMN].map((facet) => {
        return {
          mark: POINT,
          encodings: [
            {channel: X, field: 'Q', type: Type.QUANTITATIVE},
            {channel: Y, field: 'Q1', type: Type.QUANTITATIVE},
            {channel: facet, field: 'N', type: Type.NOMINAL}
          ]
        };
      }),{
        mark: TICK,
        encodings: [
          {channel: X, field: 'Q', type: Type.QUANTITATIVE},
          {channel: COLOR, field: 'Q1', type: Type.QUANTITATIVE},
          {channel: Y, field: 'N', type: Type.NOMINAL}
        ]
      },
      [COLOR, SIZE].map((channel) => {
        return {
          mark: POINT,
          encodings: [
            {channel: X, field: 'Q', type: Type.QUANTITATIVE},
            {channel: channel, field: 'Q1', type: Type.QUANTITATIVE},
            {channel: Y, field: 'N', type: Type.NOMINAL}
          ]
        };
      })], (specQ) => SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG))
    });

    rules.push({
      name: 'Ox?(Q)x?(Q)',
      items: nestedMap([{
        mark: POINT,
        encodings: [
          {channel: X, field: 'Q', type: Type.QUANTITATIVE},
          {channel: Y, field: 'Q1', type: Type.QUANTITATIVE},
          {channel: COLOR, field: 'O', type: Type.ORDINAL}
        ]
      },[ROW, COLUMN].map((facet) => {
        return {
          mark: POINT,
          encodings: [
            {channel: X, field: 'Q', type: Type.QUANTITATIVE},
            {channel: Y, field: 'Q1', type: Type.QUANTITATIVE},
            {channel: facet, field: 'O', type: Type.ORDINAL}
          ]
        };
      }),{
        // TODO: consider x: Q, y:O, color:Q1 like above
        mark: POINT,
        encodings: [
          {channel: X, field: 'Q', type: Type.QUANTITATIVE},
          {channel: SIZE, field: 'Q1', type: Type.QUANTITATIVE},
          {channel: Y, field: 'O', type: Type.ORDINAL}
        ]
      }], (specQ) => SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG))
    });

    return rules;
  }()
};


export const SET_AXIS_PREFERRENCE: RuleSet<SpecQueryModel> = {
  name: 'Axis Preference',
  rules: function() {
    const rules: Rule<SpecQueryModel>[] = [];

    function countplot(dimType: Type, dimChannel: Channel, countChannel: Channel, dimMixins?: any) {
      return build({
        mark: 'point',
        encodings: [
          {channel: countChannel, aggregate: AggregateOp.COUNT, field: '*', type: Type.QUANTITATIVE},
          extend({channel: dimChannel, field: 'N', type: dimType}, dimMixins)
        ]
      });
    }

    [BAR, POINTS, TICK, LINE, AREA].forEach((mark) => {
      rules.push({
        name: 'Nx# Count Plot (' + mark + ')',
        items: [countplot(Type.NOMINAL, Y, X), countplot(Type.NOMINAL, X,Y)]
      });

      rules.push({
        name: 'Ox# Count Plot (' + mark + ')',
        items: [countplot(Type.ORDINAL, Y, X), countplot(Type.ORDINAL, X,Y)]
      });

      rules.push({
        name: 'Tx# Count Plot (' + mark + ')',
        items: [countplot(Type.TEMPORAL, X, Y), countplot(Type.TEMPORAL, Y, X)]
      });

      rules.push({
        name: 'BIN(Q)x# Count Plot (' + mark + ')',
        items: [countplot(Type.QUANTITATIVE, X, Y, {bin: true}), countplot(Type.QUANTITATIVE, Y, X, {bin: true})]
      });
    });

    return rules;
  }()
};


export const SET_FACET_PREFERENCE: RuleSet<SpecQueryModel> = {
  name: 'Facet Preference',
  rules: function() {
    const rules: Rule<SpecQueryModel>[] = [];
    function facetedPlot(_: Mark, facet: Channel) {
      return build({
        mark: 'point',
        encodings: [
          {channel: X, field: 'Q', type: Type.QUANTITATIVE},
          {channel: Y, field: 'Q1', type: Type.QUANTITATIVE},
          {channel: facet, field: 'N', type: Type.NOMINAL}
        ]
      });
    }

    POINTS.concat([BAR, TICK, LINE, AREA]).forEach((mark: Mark) => {
      rules.push({
        name: 'Row over column',
        items: [facetedPlot(mark, Channel.ROW), facetedPlot(mark, Channel.COLUMN)]
      });
    });

    return rules;
  }()
};


export const DIMENSION_PREFERENCE: RuleSet<SpecQueryModel> = {
  name: 'Dimension Preference',
  rules: function() {
    const rules: Rule<SpecQueryModel>[] = [];
    function facetedPlot(mark: Mark, dim: Channel) {
      return build({
        mark: mark,
        encodings: [
          {channel: X, field: 'Q', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: Y, field: 'Q1', type: Type.QUANTITATIVE, aggregate: AggregateOp.MEAN},
          {channel: dim, field: 'N', type: Type.NOMINAL}
        ]
      });
    }

    POINTS.concat([BAR, TICK, LINE, AREA]).forEach((mark) => {
      rules.push({
        name: 'Row over column',
        items: nestedMap([[COLOR, SIZE, OPACITY, SHAPE], [ROW, COLUMN]], (dim: Channel) => {
          return facetedPlot(mark, dim);
        })
      });
    });

    return rules;
  }()
};

function getScore(specM: SpecQueryModel) {
  const featureScores = effectiveness(specM, schema, DEFAULT_QUERY_CONFIG);
  return featureScores.features.reduce((s, featureScore) => {
    return s + featureScore.score;
  }, 0);
}

describe('effectiveness', () => {
  describe(SET_1D.name, () => {
    testRuleSet(SET_1D, getScore, (specM: SpecQueryModel) =>  specM.toShorthand()) ;
  });

  describe(SET_2D.name, () => {
    testRuleSet(SET_2D, getScore, (specM: SpecQueryModel) =>  specM.toShorthand()) ;
  });

  describe(SET_3D.name, () => {
    testRuleSet(SET_3D, getScore, (specM: SpecQueryModel) =>  specM.toShorthand()) ;
  });

  describe(SET_AXIS_PREFERRENCE.name, () => {
    testRuleSet(SET_AXIS_PREFERRENCE, getScore, (specM: SpecQueryModel) =>  specM.toShorthand()) ;
  });

  describe(SET_FACET_PREFERENCE.name, () => {
    testRuleSet(SET_FACET_PREFERENCE, getScore, (specM: SpecQueryModel) =>  specM.toShorthand()) ;
  });
});
