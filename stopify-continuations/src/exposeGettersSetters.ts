import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { FlatnessMark } from "./common/helpers";
import { runtimePath } from './common/helpers';

const gettersRuntime = t.identifier('$gs');

// Stops $gs.get_prop and $gs.set_prop from causing an infinite loop.
const get_prop = t.memberExpression(gettersRuntime, t.identifier('get_prop'));
(<any>get_prop).exposed = true

const set_prop = t.memberExpression(gettersRuntime, t.identifier('set_prop'));
(<any>set_prop).exposed = true

function $get(...args: t.Expression[]): t.Expression {
  return t.callExpression(get_prop, args);
}

function $set(...args: t.Expression[]): t.Expression {
  return t.callExpression(set_prop, args);
}

const gettersRuntimePath = `${runtimePath}/gettersSetters.exclude.js`

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    path.node.body.unshift(
      t.variableDeclaration('var',
        [t.variableDeclarator(gettersRuntime,
          t.callExpression(t.identifier('require'),
            [t.stringLiteral(gettersRuntimePath)]))]));

  },
  MemberExpression(path: NodePath<FlatnessMark<t.MemberExpression>>) {
    const p = path.parent
    const { object, property } = path.node;

    // Only useful for console.log and various function on Math.
    if(path.node.mark === 'Flat') {
      return
    }

    // Setters
    if(t.isAssignmentExpression(p) && p.left === path.node && p.operator === '=') {
      if(path.node.computed) {
        path.parentPath.replaceWith(
          $set(object, property, p.right))
      }
      else if(t.isIdentifier(property)) {
        path.parentPath.replaceWith(
          $set(object, t.stringLiteral(property.name), p.right))
      }
      else {
        throw new Error("Unexpected property type in setter " + property.type)
      }
    }

    else if(t.isUpdateExpression(p) || t.isAssignmentExpression(p) ||
       (<any>path.node).exposed) {
      return
    }

    // Getters
    else {
      if (path.node.computed) {
        path.replaceWith($get(object, property))
      }
      else if(t.isIdentifier(property)) {
        path.replaceWith($get(object, t.stringLiteral(property.name)))
      }
      else {
        throw new Error("Unexpected property type in getter " + property.type)
      }
    }
  }

};

export function plugin() {
  return { visitor };
};
