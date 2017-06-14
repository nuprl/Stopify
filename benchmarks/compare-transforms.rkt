#lang racket/base

(require plot)
(require "plot-helpers.rkt")

(define (v2-to-number c)
  (list (car c) (handle-time-output (cadr c))))

;; Given a list of CSV names, plot a side-by-side graph.
;: ASSUMPTIONS:IN EACH FILE Column 1 is the name of files, Column 2 is the time.
;; Outputs a CSV with X-axis as names of files and Y-axis as time in seconds.
;; This is meant to compare the transforms.
;; Listof (String * String) * String -> void
(define (transform-compare-benchmark files title)
  (define l (length files))
  (define x-min-val -1)
  (define (make-hist file)
    (set! x-min-val (+ x-min-val 1))
    (discrete-histogram
      (sort
        (csvfile->list/proc (cadr file) v2-to-number)
        (lambda (x y) (string<? (vector-ref x 0) (vector-ref y 0))))
      #:skip (+ l 1) #:x-min x-min-val
      #:label (car file)
      #:color (+ x-min-val 1) #:line-color (+ x-min-val 1)))
  (plot-jpeg-quality 100)
  (parameterize ([plot-x-tick-label-anchor 'top-right]
                 [plot-x-tick-label-angle 30])
    (plot-file (map make-hist files)
               (string-append title ".pdf")
               'pdf
               #:y-label "Runtime (in seconds)" #:x-label #f
               #:width 600 #:height 600
               #:legend-anchor 'top-right
               #:title title)))


(let ([ args (vector->list (current-command-line-arguments)) ])
  (if (< (length args) 2)
    (raise
      (format "script requires at least 2 arguments, given: ~a" (length args)))
    (let* ([ title (car args) ]
           [ files (cdr args) ]
           [ prepared-list (map (lambda (f) (list (get-name f) f)) files)])
      (transform-compare-benchmark prepared-list title))))
