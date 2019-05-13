import { NodePath, Visitor } from 'babel-traverse';
import * as t from 'babel-types';
import * as fastFreshId from './fastFreshId';
import { State } from './types';

const visitor: Visitor = {
  Scope({ scope }: NodePath<t.Scopable>,
        { opts: { reserved } }: State) {
    const shadows = Object.keys(scope.bindings)
      .filter(x => reserved.includes(x));
    for (const x of shadows) {
      const new_name = fastFreshId.fresh(x);
      scope.rename(x, new_name.name);
    }
  }
};

export default function() {
  return { visitor: visitor };
}
