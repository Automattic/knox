"use strict";

var knox = require('..')
  , utils = knox.utils
  , assert = require('assert');

describe('knox.utils', function () {
  specify('.base64.encode()', function () {
    assert.equal('aGV5', utils.base64.encode('hey'));
  });

  specify('.base64.decode()', function () {
    assert.equal('hey', utils.base64.decode('aGV5'));
  });
});
