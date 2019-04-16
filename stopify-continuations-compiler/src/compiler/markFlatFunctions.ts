/**
 * Mark functions are not provably flat as 'Untransformed' and others as
 * 'Transformed'. This only marks the approproiate AST nodes. It is the job of
 * the transformation to use the information.
 */

import * as t from 'babel-types';
import { NodePath, Visitor } from 'babel-traverse';
import {  FlatnessMark } from '../helpers';

let debug = false;

const prog = {
  // Mark the untransformed functions after running call expression markers.
  exit(path: NodePath<t.Program>) {
    path.traverse(markUntransformed);
  }
};

const funcMarkUntransformed = {
  enter(path: NodePath<FlatnessMark<t.FunctionDeclaration|t.FunctionExpression>>) {
    if(!path.node.mark) {
      path.node.mark = 'Flat';
    }

    if(debug && t.isFunctionDeclaration(path.node)) {
      const { loc, mark } = path.node;
      const info =
        `${mark}: ${path.node.id.name}${ loc ? ` on line ${loc.start.line}` : ''}`;
      console.error(info);
    }

    if(debug && t.isFunctionExpression(path.node)) {
      const { loc, mark, id } = path.node;
       const info =
        `${mark}: ${ id ? id.name : '<Anonymous>'}` +
        `${ loc ? ` on line ${loc.start.line}` : ''}`;
      console.error(info);
    }
  }
};

const markUntransformed: Visitor = {
  FunctionDeclaration: (<any>funcMarkUntransformed),
  FunctionExpression: (<any>funcMarkUntransformed),
};

const callExpr = {
  enter(path: NodePath<FlatnessMark<t.CallExpression|t.NewExpression|t.Loop>>) {
    if (path.node.mark === 'Flat') {
      return;
    }
    const fParent: FlatnessMark<any> =
      path.findParent(p => t.isFunctionDeclaration(p) || t.isFunctionExpression(p));

    if (fParent !== null && !fParent.node.mark) {
      fParent.node.mark = 'NotFlat';
    }
  }
};

const visitor = {
  Program: prog,
  CallExpression: callExpr,
  NewExpression: callExpr,
  Loop: callExpr,
  ThrowStatement: callExpr
};

export function markFlatFunctions() {
  return { visitor };
}
