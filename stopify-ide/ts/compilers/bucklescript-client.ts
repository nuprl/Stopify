import {OCamlClient} from './compiler';

export let BuckleScript : OCamlClient = {
  aceMode: 'ace/mode/ocaml',
  defaultCode:
    `
let rec tail_sum n acc =
  print_endline ("acc: " ^ (string_of_int acc));
if n = 0 then acc else tail_sum (n - 1) (acc + n)

let _ = tail_sum 1000000 1
    `,
  compileUrl: '/compile/ocaml'
}
