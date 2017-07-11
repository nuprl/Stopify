import {NodePath, VisitNode, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

const label: Visitor = {

};

module.exports = function () {
  return { visitor: label };
};
