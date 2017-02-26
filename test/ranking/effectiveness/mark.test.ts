import {POINT, TICK, BAR, LINE, AREA, RULE, TEXT as TEXTMARK, Mark} from 'vega-lite/src/mark';

import {BIN_Q, TIMEUNIT_O, TIMEUNIT_T, Q, N, O, T} from '../../../src/ranking/effectiveness/type';
import {MarkScore} from '../../../src/ranking/effectiveness/mark';
import {nestedMap} from '../../../src/util';
import {testRuleSet} from '../rule';

const MARK_SCORE = MarkScore.init();

function getScore(feature: string) {
  return MARK_SCORE[feature];
}

export interface Rule {
  name: string;
  items: string[];
}

export const CC_RULESET = {
  name: 'Continous-Continuous Plots',
  rules: function() {
    const _rules: Rule[] = [];
    [Q, T].forEach((xType) => {
      [Q, T].forEach((yType) => {
        const continuousRank = [POINT, TEXTMARK, TICK, [BAR, LINE, AREA, RULE], 'rect'];
        _rules.push({
          name: xType + ' x ' + yType + ' (with occlusion)',
          items: nestedMap(continuousRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, true, mark);
          })
        });

        _rules.push({
          name: xType + ' x ' + yType + ' (without occlusion)',
          items: nestedMap(continuousRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, false, mark);
          })
        });

        // TODO: BAR, LINE, AREA, RULE should be terrible
      });
    });
    return _rules;
  }()
};

export const CD_RULESET = {
  name: 'Continous-Discrete Plots',
  rules: function() {
    const _rules: Rule[] = [];
    [Q, T].forEach((measureType) => {
      // Has Occlusion
      [TIMEUNIT_O, O, BIN_Q, N].forEach((dimensionType) => {
        const dimWithOcclusionRank = [TICK, POINT, TEXTMARK, [LINE, AREA, BAR], RULE];
        _rules.push({
          name: measureType + ' x ' + dimensionType + ' (with occlusion)',
          items: nestedMap(dimWithOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(measureType, dimensionType, true, mark);
          })
        });

        _rules.push({
          name: dimensionType + ' x ' + measureType + ' (with occlusion)',
          items: nestedMap(dimWithOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(dimensionType, measureType, true, mark);
          })
        });
        // TODO: BAR, LINE, AREA, RULE should be terrible
      });

      [TIMEUNIT_T].forEach((dimensionType) => {
        const dimWithOcclusionRank = [POINT, TEXTMARK, TICK, [LINE, AREA, BAR], RULE];
        _rules.push({
          name: measureType + ' x ' + dimensionType + ' (with occlusion)',
          items: nestedMap(dimWithOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(measureType, dimensionType, true, mark);
          })
        });

        _rules.push({
          name: dimensionType + ' x ' + measureType + ' (with occlusion)',
          items: nestedMap(dimWithOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(dimensionType, measureType, true, mark);
          })
        });
        // TODO: BAR, LINE, AREA, RULE should be terrible
      });

      // No Occlusion

      [TIMEUNIT_O, TIMEUNIT_T].forEach((dimensionType) => {
        const orderedDimNoOcclusionRank = [LINE, AREA, BAR, POINT, TICK, TEXTMARK, RULE];

        _rules.push({
          name: measureType + ' x ' + dimensionType + ' (without occlusion)',
          items: nestedMap(orderedDimNoOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(measureType, dimensionType, false, mark);
          })
        });

        _rules.push({
          name: dimensionType + ' x ' + measureType + ' (without occlusion)',
          items: nestedMap(orderedDimNoOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(dimensionType, measureType, false, mark);
          })
        });
        // TODO: BAR, LINE, AREA, RULE should be terrible
      });

      [BIN_Q].forEach((dimensionType) => {
        const binDimNoOcclusionRank = [BAR, POINT, TICK, TEXTMARK, [LINE, AREA], RULE];

        _rules.push({
          name: measureType + ' x ' + dimensionType + ' (without occlusion)',
          items: nestedMap(binDimNoOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(measureType, dimensionType, false, mark);
          })
        });

        _rules.push({
          name: dimensionType + ' x ' + measureType + ' (without occlusion)',
          items: nestedMap(binDimNoOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(dimensionType, measureType, false, mark);
          })
        });
        // TODO: RULE should be terrible
      });

      [N, O].forEach((dimensionType) => {
        const binDimNoOcclusionRank = [BAR, POINT, TICK, TEXTMARK, [LINE, AREA], RULE];

        _rules.push({
          name: measureType + ' x ' + dimensionType + ' (without occlusion)',
          items: nestedMap(binDimNoOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(measureType, dimensionType, false, mark);
          })
        });

        _rules.push({
          name: dimensionType + ' x ' + measureType + ' (without occlusion)',
          items: nestedMap(binDimNoOcclusionRank, (mark: Mark) => {
            return MarkScore.featurize(dimensionType, measureType, false, mark);
          })
        });

        // TODO: LINE, AREA, RULE should be terrible
      });
    });
    return _rules;
  }()
};


export const TT_RULESET = {
  name: 'TimeUnitTime-TimeUnitTime',
  rules: function() {
    const _rules: Rule[] = [];
    [TIMEUNIT_T].forEach((xType) => {
      [TIMEUNIT_T].forEach((yType) => {
        const ddRank = [POINT, TEXTMARK, TICK, [BAR, LINE, AREA], RULE];

        _rules.push({
          name: xType + ' x ' + yType + ' (with occlusion)',
          items: nestedMap(ddRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, true, mark);
          })
        });

        _rules.push({
          name: xType + ' x ' + yType + ' (without occlusion)',
          items: nestedMap(ddRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, false, mark);
          })
        });

        // TODO: BAR, LINE, AREA, RULE should be terrible
      });
    });
    return _rules;
  }()
};

export const TD_RULESET = {
  name: 'TimeUnitTime-Discrete Plots',
  rules: function() {
    const _rules: Rule[] = [];
    [TIMEUNIT_T].forEach((xType) => {
      [TIMEUNIT_O, O, BIN_Q, N].forEach((yType) => {
        const ddRank = [TICK, POINT, TEXTMARK, [BAR, LINE, AREA], RULE];

        _rules.push({
          name: xType + ' x ' + yType + ' (with occlusion)',
          items: nestedMap(ddRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, true, mark);
          })
        });

        _rules.push({
          name: xType + ' x ' + yType + ' (without occlusion)',
          items: nestedMap(ddRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, false, mark);
          })
        });

        // TODO: BAR, LINE, AREA, RULE should be terrible
      });
    });
    return _rules;
  }()
};


export const DD_RULESET = {
  name: 'Discrete-Discrete Plots',
  rules: function() {
    const _rules: Rule[] = [];
    [TIMEUNIT_O, O, BIN_Q, N].forEach((xType) => {
      [TIMEUNIT_O, O, BIN_Q, N].forEach((yType) => {
        const ddRank = [POINT, TEXTMARK, TICK, [BAR, LINE, AREA], RULE];

        // TODO: RECT is not bad here.

        _rules.push({
          name: xType + ' x ' + yType + ' (with occlusion)',
          items: nestedMap(ddRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, true, mark);
          })
        });

        _rules.push({
          name: xType + ' x ' + yType + ' (without occlusion)',
          items: nestedMap(ddRank, (mark: Mark) => {
            return MarkScore.featurize(xType, yType, false, mark);
          })
        });

        // TODO: BAR, LINE, AREA, RULE should be terrible
      });
    });
    return _rules;
  }()
};

describe('markScore', () => {
  [CC_RULESET, CD_RULESET, TT_RULESET, TD_RULESET, DD_RULESET].forEach((ruleSet) => {
    describe(ruleSet.name, () => {
      testRuleSet(ruleSet, getScore);
    });
  });
});
