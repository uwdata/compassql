import {assert} from 'chai';
import {SpecQueryModel, SpecQueryModelGroup} from '../src/model';
import {getTopResultTreeItem, isResultTree} from '../src/result';
import {SpecQuery} from '../src/query/spec';
import {DEFAULT_QUERY_CONFIG} from '../src/config';
import {schema} from './fixture';
import {Mark} from 'vega-lite/build/src/mark';
import {Channel} from 'vega-lite/build/src/channel';

describe('ResultGroup', () => {

  function buildSpecQueryModel(specQ: SpecQuery) {
    return SpecQueryModel.build(specQ, schema, DEFAULT_QUERY_CONFIG);
  }

  function buildSpecQueryModelGroup(specQs: SpecQuery[]) {
    const items = specQs.map((specQ) => buildSpecQueryModel(specQ));
    return {
      name: 'a name',
      path: 'path',
      items: items
    };
  }

  describe('getTopSpecQueryModel', () => {
    it('should get top model', () => {
      const group = buildSpecQueryModelGroup([
        {
          mark: Mark.BAR,
          encodings: [
            {channel: Channel.X, autoCount: true}
          ]
        },
        {
          mark: Mark.POINT,
          encodings: [
            {channel: Channel.X, autoCount: true}
          ]
        }
      ]);
      const top = getTopResultTreeItem(group);
      assert.equal(top.getMark(), Mark.BAR);
    });
    it('should get handle nested groups', () => {
      const group = buildSpecQueryModelGroup([
        {
          mark: Mark.BAR,
          encodings: [
            {channel: Channel.X, autoCount: true}
          ]
        }
      ]);

      const root: SpecQueryModelGroup = {
        name: 'root',
        path: '',
        items: [group],
      };

      const top = getTopResultTreeItem(root);
      assert.equal(top.getMark(), Mark.BAR);
    });
  });

  describe('isResultGroup', () => {
    it('should return true for a SpecQueryModelGroup (ResultGroup<SpecQueryModel>)', () => {
      const group: SpecQueryModelGroup = {
        name: '',
        path: '',
        items: [],
      };
      assert.isTrue(isResultTree<SpecQueryModel>(group));
    });
  });
});
