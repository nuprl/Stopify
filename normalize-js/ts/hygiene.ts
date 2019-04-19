/*
 * This plugin can help another plugin be hygienic (in the Scheme macro sense)
 * when introducing new names. It requires as an option an array of identifiers
 * that the program should not use and renames all binding and bound occurences
 * of those identifiers.
 *
 * The end of this file has code to run the plugin standalone and shows how
 * to invoke the plugin.
 */
import { Visitor } from '@babel/traverse';
import * as fastFreshId from './fastFreshId';

interface State {
  reserved: string[]
}

export const visitor: Visitor<State> = {
  Scopable({ scope }, { reserved }) {
    const shadows = Object.keys(scope.bindings)
      .filter(x => reserved.includes(x));
    for (const x of shadows) {
      const new_name = fastFreshId.fresh(x);
      scope.rename(x, new_name.name);
    }
  }
};
