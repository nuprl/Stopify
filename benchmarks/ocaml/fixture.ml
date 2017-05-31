(* Benchmark looper *)
let run_n_times (n : int) (f : unit -> unit) : unit =
  for i = 1 to n do
    f ()
  done
