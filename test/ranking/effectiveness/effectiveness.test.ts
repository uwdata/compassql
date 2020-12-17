import * as CHANNEL from 'vega-lite/build/src/channel';
import {ExtendedChannel, COLOR, COLUMN, OPACITY, ROW, SHAPE, SIZE, X, Y} from 'vega-lite/build/src/channel';
import {AREA, BAR, CIRCLE, LINE, Mark, POINT, RULE, SQUARE, TICK} from 'vega-lite/build/src/mark';
import * as vegaTime from 'vega-time';
import * as TYPE from 'vega-lite/build/src/type';
import {Type} from 'vega-lite/build/src/type';
import {DEFAULT_QUERY_CONFIG} from '../../../src/config';
import {SpecQueryModel} from '../../../src/model';
import {EncodingQuery} from '../../../src/query/encoding';
import {SpecQuery} from '../../../src/query/spec';
import {effectiveness} from '../../../src/ranking/effectiveness';
import {extend, nestedMap} from '../../../src/util';
import {schema} from '../../fixture';
import {Rule, RuleSet, testRuleSet} from '../rule';

function build(specQ: SpecQuery) {
  return SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG);
}

const POINTS = [POINT, SQUARE, CIRCLE] as Mark[];

export const SET_1D: RuleSet<SpecQueryModel> = {
  name: 'mark for plots with 1 field',
  rules: (function() {
    const rules: Rule<SpecQueryModel>[] = [];

    function plot1d(mark: Mark, channel: ExtendedChannel, type: Type) {
      return SpecQueryModel.build(
        {
          mark: mark,
          encodings: [
            {
              channel: channel,
              field: 'f',
              type: type
            }
          ]
        },
        schema,
        DEFAULT_QUERY_CONFIG
      );
    }

    rules.push({
      name: 'N with varying mark',
      items: nestedMap([[POINT /*, RECT */], TICK, [LINE, BAR, AREA], RULE], mark => {
        return plot1d(mark, X, TYPE.NOMINAL);
      })
    });

    function countplot(mark: Mark, field: string, type: Type) {
      return SpecQueryModel.build(
        {
          mark: mark,
          encodings: [
            {
              channel: Y,
              field: field,
              type: type
            },
            {
              channel: X,
              aggregate: 'count',
              field: '*',
              type: TYPE.QUANTITATIVE
            }
          ]
        },
        schema,
        DEFAULT_QUERY_CONFIG
      );
    }

    rules.push({
      name: 'N plot with varying marks',
      items: nestedMap([BAR, POINT, TICK, [LINE, AREA], RULE], mark => {
        return countplot(mark, 'N', TYPE.NOMINAL);
      })
    });

    rules.push({
      name: 'O plot with varying marks',
      items: nestedMap([BAR, POINT, TICK, [LINE, AREA], RULE], mark => {
        return countplot(mark, 'O', TYPE.ORDINAL);
      })
    });

    rules.push({
      name: 'Q dot plot with varying mark',
      items: nestedMap([TICK, POINT, [LINE, BAR, AREA], RULE], mark => {
        return plot1d(mark, X, TYPE.QUANTITATIVE);
      })
    });

    function histogram(mark: Mark, xEncQ: EncodingQuery) {
      return SpecQueryModel.build(
        {
          mark: mark,
          encodings: [
            xEncQ,
            {
              channel: Y,
              aggregate: 'count',
              field: '*',
              type: TYPE.QUANTITATIVE
            }
          ]
        },
        schema,
        DEFAULT_QUERY_CONFIG
      );
    }

    rules.push({
      name: 'Q histogram with varying marks',
      items: nestedMap([BAR, POINT, TICK, [LINE, AREA], RULE], mark => {
        return histogram(mark, {
          channel: X,
          bin: true,
          field: 'Q',
          type: TYPE.QUANTITATIVE
        });
      })
    });

    rules.push({
      name: 'T dot plot with varying mark',
      items: nestedMap([TICK, POINT, [LINE, BAR, AREA], RULE], mark => {
        return plot1d(mark, X, TYPE.TEMPORAL);
      })
    });

    rules.push({
      name: 'TimeUnit T count with varying marks',
      items: nestedMap([LINE, AREA, BAR, POINT, TICK, RULE], mark => {
        return histogram(mark, {
          channel: X,
          timeUnit: vegaTime.MONTH,
          field: 'T',
          type: TYPE.TEMPORAL
        });
      })
    });
    return rules;
  })()
};

export const SET_2D: RuleSet<SpecQueryModel> = {
  name: 'mark for plots with 2 fields',
  rules: (function() {
    const rules: Rule<SpecQueryModel>[] = [];

    rules.push({
      name: 'NxN',
      items: nestedMap(
        [
          {
            mark: POINT,
            encodings: [
              {channel: X, field: 'N', type: TYPE.NOMINAL},
              {channel: Y, field: 'N', type: TYPE.NOMINAL},
              {channel: SIZE, aggregate: 'count', field: '*', type: TYPE.QUANTITATIVE}
            ]
          },
          {
            mark: BAR,
            encodings: [
              {channel: X, field: 'N', type: TYPE.NOMINAL},
              {channel: COLOR, field: 'N1', type: TYPE.NOMINAL},
              {channel: Y, aggregate: 'count', field: '*', type: TYPE.QUANTITATIVE}
            ]
          }
        ],
        specQ => SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG)
      )
    });

    function stripplot(mark: Mark, qMixIns = {}) {
      return build({
        mark: mark,
        encodings: [
          extend({channel: X, field: 'Q', type: TYPE.QUANTITATIVE}, qMixIns),
          {channel: Y, field: 'N', type: TYPE.NOMINAL}
        ]
      });
    }

    rules.push({
      name: 'NxQ Strip Plot',
      items: nestedMap([TICK, POINTS], stripplot)
    });

    rules.push({
      name: 'NxA(Q) Strip Plot',
      items: nestedMap([BAR, POINTS, TICK, [LINE, AREA], RULE], mark => stripplot(mark, {aggregate: 'mean'}))
    });

    // TODO: O

    // TODO: O x BIN(Q) x #
    return rules;
  })()
};

export const SET_3D: RuleSet<SpecQueryModel> = {
  name: 'encoding for plots with 3 fields',
  rules: (function() {
    const rules: Rule<SpecQueryModel>[] = [];

    rules.push({
      name: 'Nx?(Q)x?(Q)',
      items: nestedMap(
        [
          {
            mark: POINT,
            encodings: [
              {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
              {channel: Y, field: 'Q1', type: TYPE.QUANTITATIVE},
              {channel: COLOR, field: 'N', type: TYPE.NOMINAL}
            ]
          },
          [ROW, COLUMN].map(facet => {
            return {
              mark: POINT,
              encodings: [
                {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
                {channel: Y, field: 'Q1', type: TYPE.QUANTITATIVE},
                {channel: facet, field: 'N', type: TYPE.NOMINAL}
              ]
            };
          }),
          {
            mark: TICK,
            encodings: [
              {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
              {channel: COLOR, field: 'Q1', type: TYPE.QUANTITATIVE},
              {channel: Y, field: 'N', type: TYPE.NOMINAL}
            ]
          },
          [COLOR, SIZE].map(_ => {
            return {
              mark: POINT,
              encodings: [
                {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
                {channel: COLOR, field: 'Q1', type: TYPE.QUANTITATIVE},
                {channel: Y, field: 'N', type: TYPE.NOMINAL}
              ]
            };
          })
        ],
        specQ => SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG)
      )
    });

    rules.push({
      name: 'Ox?(Q)x?(Q)',
      items: nestedMap(
        [
          {
            mark: POINT,
            encodings: [
              {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
              {channel: Y, field: 'Q1', type: TYPE.QUANTITATIVE},
              {channel: COLOR, field: 'O', type: TYPE.ORDINAL}
            ]
          },
          [ROW, COLUMN].map(facet => {
            return {
              mark: POINT,
              encodings: [
                {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
                {channel: Y, field: 'Q1', type: TYPE.QUANTITATIVE},
                {channel: facet, field: 'O', type: TYPE.ORDINAL}
              ]
            };
          }),
          {
            // TODO: consider x: Q, y:O, color:Q1 like above
            mark: POINT,
            encodings: [
              {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
              {channel: SIZE, field: 'Q1', type: TYPE.QUANTITATIVE},
              {channel: Y, field: 'O', type: TYPE.ORDINAL}
            ]
          }
        ],
        specQ => SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG)
      )
    });

    return rules;
  })()
};

export const SET_AXIS_PREFERRENCE: RuleSet<SpecQueryModel> = {
  name: 'Axis Preference',
  rules: (function() {
    const rules: Rule<SpecQueryModel>[] = [];

    function countplot(dimType: Type, dimChannel: ExtendedChannel, countChannel: ExtendedChannel, dimMixins?: any) {
      return build({
        mark: 'point',
        encodings: [
          {channel: countChannel, aggregate: 'count', field: '*', type: TYPE.QUANTITATIVE},
          extend({channel: dimChannel, field: 'N', type: dimType}, dimMixins)
        ]
      });
    }

    [BAR, POINTS, TICK, LINE, AREA].forEach(mark => {
      rules.push({
        name: `Nx# Count Plot (${mark})`,
        items: [countplot(TYPE.NOMINAL, Y, X), countplot(TYPE.NOMINAL, X, Y)]
      });

      rules.push({
        name: `Ox# Count Plot (${mark})`,
        items: [countplot(TYPE.ORDINAL, Y, X), countplot(TYPE.ORDINAL, X, Y)]
      });

      rules.push({
        name: `Tx# Count Plot (${mark})`,
        items: [countplot(TYPE.TEMPORAL, X, Y), countplot(TYPE.TEMPORAL, Y, X)]
      });

      rules.push({
        name: `BIN(Q)x# Count Plot (${mark})`,
        items: [countplot(TYPE.QUANTITATIVE, X, Y, {bin: true}), countplot(TYPE.QUANTITATIVE, Y, X, {bin: true})]
      });
    });

    return rules;
  })()
};

export const SET_FACET_PREFERENCE: RuleSet<SpecQueryModel> = {
  name: 'Facet Preference',
  rules: (function() {
    const rules: Rule<SpecQueryModel>[] = [];
    function facetedPlot(_: Mark, facet: ExtendedChannel) {
      return build({
        mark: 'point',
        encodings: [
          {channel: X, field: 'Q', type: TYPE.QUANTITATIVE},
          {channel: Y, field: 'Q1', type: TYPE.QUANTITATIVE},
          {channel: facet, field: 'N', type: TYPE.NOMINAL}
        ]
      });
    }

    POINTS.concat([BAR, TICK, LINE, AREA]).forEach((mark: Mark) => {
      rules.push({
        name: 'Row over column',
        items: [facetedPlot(mark, CHANNEL.ROW), facetedPlot(mark, CHANNEL.COLUMN)]
      });
    });

    return rules;
  })()
};

export const DIMENSION_PREFERENCE: RuleSet<SpecQueryModel> = {
  name: 'Dimension Preference',
  rules: (function() {
    const rules: Rule<SpecQueryModel>[] = [];
    function facetedPlot(mark: Mark, dim: ExtendedChannel) {
      return build({
        mark: mark,
        encodings: [
          {channel: X, field: 'Q', type: TYPE.QUANTITATIVE, aggregate: 'mean'},
          {channel: Y, field: 'Q1', type: TYPE.QUANTITATIVE, aggregate: 'mean'},
          {channel: dim, field: 'N', type: TYPE.NOMINAL}
        ]
      });
    }

    POINTS.concat([BAR, TICK, LINE, AREA]).forEach(mark => {
      rules.push({
        name: 'Row over column',
        items: nestedMap([[COLOR, SIZE, OPACITY, SHAPE], [ROW, COLUMN]], (dim: ExtendedChannel) => {
          return facetedPlot(mark, dim);
        })
      });
    });

    return rules;
  })()
};

function getScore(specM: SpecQueryModel) {
  const featureScores = effectiveness(specM, schema, DEFAULT_QUERY_CONFIG);
  return featureScores.features.reduce((s, featureScore) => {
    return s + featureScore.score;
  }, 0);
}

describe('effectiveness', () => {
  describe(SET_1D.name, () => {
    testRuleSet(SET_1D, getScore, (specM: SpecQueryModel) => specM.toShorthand());
  });

  describe(SET_2D.name, () => {
    testRuleSet(SET_2D, getScore, (specM: SpecQueryModel) => specM.toShorthand());
  });

  describe(SET_3D.name, () => {
    testRuleSet(SET_3D, getScore, (specM: SpecQueryModel) => specM.toShorthand());
  });

  describe(SET_AXIS_PREFERRENCE.name, () => {
    testRuleSet(SET_AXIS_PREFERRENCE, getScore, (specM: SpecQueryModel) => specM.toShorthand());
  });

  describe(SET_FACET_PREFERENCE.name, () => {
    testRuleSet(SET_FACET_PREFERENCE, getScore, (specM: SpecQueryModel) => specM.toShorthand());
  });
});
