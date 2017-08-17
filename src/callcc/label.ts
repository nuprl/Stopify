import {NodePath, Visitor} from 'babel-traverse';
import * as t from 'babel-types';

type Labeled<T> = T & {
  labels?: number[];
}

function getLabels(node: Labeled<t.Node>): number[] {
  if (node === null) {
    return [];
  }
  return node.labels === undefined ?  [] : [...node.labels];
}

function unionLabels(labelsResult: number[], node: Labeled<t.Node>): void {
  getLabels(node).filter(x => !labelsResult.includes(x)).forEach(x =>
    labelsResult.push(x));
}

let counter: number = 0;

const label: Visitor = {
  CallExpression: function (path: NodePath<Labeled<t.CallExpression>>): void {
    path.node.labels = [counter++];
  },

  AssignmentExpression: {
    exit(path: NodePath<Labeled<t.AssignmentExpression>>): void {
      path.node.labels = getLabels(path.node.right);
    }
  },

  ExpressionStatement: {
    exit(path: NodePath<Labeled<t.ExpressionStatement>>): void {
      path.node.labels = getLabels(path.node.expression);
    }
  },

  ReturnStatement: {
    exit(path: NodePath<Labeled<t.ReturnStatement>>): void {
      path.node.labels = getLabels(path.node.argument);
    }
  },

  ThrowStatement: {
    exit(path: NodePath<Labeled<t.ThrowStatement>>): void {
      path.node.labels = getLabels(path.node.argument);
    }
  },

  IfStatement: {
    exit(path: NodePath<Labeled<t.IfStatement>>): void {
      const { test, consequent, alternate } = path.node;
      path.node.labels = getLabels(consequent);
      unionLabels(path.node.labels, alternate);
    }
  },

  WhileStatement: {
    exit(path: NodePath<Labeled<t.WhileStatement>>): void {
      const { body } = path.node;
      path.node.labels = getLabels(body);
    }
  },

  LabeledStatement: {
    exit(path: NodePath<Labeled<t.LabeledStatement>>): void {
      path.node.labels = getLabels(path.node.body);
    }
  },

  BlockStatement: {
    exit(path: NodePath<Labeled<t.BlockStatement>>): void {
      const { body } = path.node;
      path.node.labels = [];
      body.forEach(stmt => unionLabels(path.node.labels!, stmt));
    }
  },
};

module.exports = function () {
  return { visitor: label };
};
