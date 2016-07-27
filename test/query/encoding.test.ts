  import {ScaleType} from 'vega-lite/src/scale';
  import {Type} from 'vega-lite/src/type';
  import {TimeUnit} from 'vega-lite/src/timeunit';
  import {assert} from 'chai';

  import {scaleType} from '../../src/query/encoding';
  import {SHORT_ENUM_SPEC} from '../../src/enumspec';

  describe('scaleType', () => {
    it('should return specified as scale type', () => {
      const sType = scaleType(ScaleType.LINEAR, undefined, undefined);
      assert.equal(sType, ScaleType.LINEAR);
    });

    it('should return undefined if scale type is not specified and type is an EnumSpec', () => {
      const sType = scaleType(undefined, undefined, SHORT_ENUM_SPEC);
      assert.equal(sType, undefined);
    });

    it('should return ScaleType.LINEAR if type is quantitative and scale type is not specified', () => {
      const sType = scaleType(undefined, undefined, Type.QUANTITATIVE);
      assert.equal(sType, ScaleType.LINEAR);
    });

    [Type.ORDINAL, Type.NOMINAL].forEach((type) => {
      it('should return ScaleType.ORDINAL if type is ' + type + ' and scale type is not specified', () => {
        const sType = scaleType(undefined, undefined, type);
        assert.equal(sType, ScaleType.ORDINAL);
      });
    });

    it('should return undefined if scale type is not specified, type is temporal, and TimeUnit is an EnumSpec', () => {
      const sType = scaleType(undefined, SHORT_ENUM_SPEC, Type.TEMPORAL);
      assert.equal(sType, undefined);
    });

    it('should return ScaleType.TIME if type is temporal and scale type and TimeUnit are not specified', () => {
      const sType = scaleType(undefined, undefined, Type.TEMPORAL);
      assert.equal(sType, ScaleType.TIME);
    });

    [TimeUnit.HOURS, TimeUnit.DAY, TimeUnit.MONTH, TimeUnit.QUARTER].forEach((timeU) => {
      it('should return ScaleType.ORDINAL if type is temporal and TimeUnit is ' + timeU + ' and scale type is not specified', () => {
        const sType = scaleType(undefined, timeU, Type.TEMPORAL);
        assert.equal(sType, ScaleType.ORDINAL);
      });
    });

    [TimeUnit.YEAR, TimeUnit.DATE, TimeUnit.MINUTES, TimeUnit.SECONDS, TimeUnit.MILLISECONDS, TimeUnit.YEARMONTH,
     TimeUnit.YEARMONTHDATE, TimeUnit.YEARMONTHDATEHOURS, TimeUnit.YEARMONTHDATEHOURSMINUTES, TimeUnit.YEARMONTHDATEHOURSMINUTESSECONDS,
     TimeUnit.HOURSMINUTES, TimeUnit.HOURSMINUTESSECONDS, TimeUnit.MINUTESSECONDS, TimeUnit.SECONDSMILLISECONDS,
     TimeUnit.YEARQUARTER, TimeUnit.QUARTERMONTH, TimeUnit.YEARQUARTERMONTH].forEach((timeU) => {
       it('should return ScaleType.TIME if type is temporal and TimeUnit is ' + timeU + ' and scale type is not specified', () => {
         const sType = scaleType(undefined, timeU, Type.TEMPORAL);
         assert.equal(sType, ScaleType.TIME);
       });
     });

     it('should return ScaleType.TIME if type is temporal, TimeUnit is undefined, and scale type is not defined', () => {
       const sType = scaleType(undefined, undefined, Type.TEMPORAL);
       assert.equal(sType, ScaleType.TIME);
     });
  });
