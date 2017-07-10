import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

import * as R from './runtime';

const callcc: Visitor = {

};

module.exports = function () {
  return { visitor: callcc };
}
