import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import { FlatnessMark } from "./common/helpers";
import { runtimePath } from './common/helpers';

const gettersRuntime = t.identifier('$gs');

const get_prop = t.memberExpression(gettersRuntime, t.identifier('get_prop'));
const set_prop = t.memberExpression(gettersRuntime, t.identifier('set_prop'));
const delete_prop = t.memberExpression(gettersRuntime, t.identifier('delete_prop'));

// Stops $gs.get_prop and $gs.set_prop from causing an infinite loop.
(<any>set_prop).exposed = true;
(<any>get_prop).exposed = true;
(<any>delete_prop).exposed = true;

function $func(func: t.Expression, ...args: t.Expression[]): t.Expression {
  return t.callExpression(func, args);
}

const gettersRuntimePath = `${runtimePath}/gettersSetters.exclude.js`

let enableGetters = false;

const gettersUsedVisitor = {
  ObjectMethod(path: NodePath<t.ObjectMethod>) {
    if (path.node.kind !== 'method') {
      enableGetters = true;
      path.stop()
    }
  },
  MemberExpression(path: NodePath<t.MemberExpression>) {
    const { object, property } = path.node
    if (t.isIdentifier(object) && object.name === 'Object' &&
        t.isIdentifier(property) && property.name === 'defineProperty') {
      enableGetters = true;
      path.stop()
    }
  }
}

const visitor: Visitor = {
  Program(path: NodePath<t.Program>) {
    path.traverse(gettersUsedVisitor)

    if (!enableGetters) {
      console.log('No uses of getters found, disabling --getters')
      path.stop()
    }

    path.node.body.unshift(
      t.variableDeclaration('var',
        [t.variableDeclarator(gettersRuntime,
          t.callExpression(t.identifier('require'),
            [t.stringLiteral(gettersRuntimePath)]))]));

  },
  UnaryExpression: {
    enter(path: NodePath<t.UnaryExpression>) {
      const { operator, argument } = path.node;

      // Support property deletion.
      if (operator === 'delete' && t.isMemberExpression(argument)) {
        const { object, property, computed } = argument;

        const prop = computed ?
          property :
          t.stringLiteral((<any>property).name)

        path.replaceWith($func(delete_prop, object, prop))

      }
    }
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
      const prop = path.node.computed ?
        property :
        t.stringLiteral((<any>property).name)

      path.parentPath.replaceWith($func(set_prop, object, prop, p.right))
    }

    else if(t.isUpdateExpression(p) || t.isAssignmentExpression(p) ||
       (<any>path.node).exposed) {
      return
    }

    // Getters
    else {
      const prop = path.node.computed ?
        property :
        t.stringLiteral((<any>property).name)

      path.replaceWith($func(get_prop, object, prop))
    }
  }

};

export function plugin() {
  return { visitor };
};
