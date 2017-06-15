#lang racket/base

;; This script assumes that programs given are from the same JS engine.
(require racket/list)
(require plot/no-gui)
(require "plot-helpers.rkt")

(define (v2-to-number c)
  (list (car c) (handle-time-output (cadr c))))

;; Given a list of CSV names, plot a side-by-side graph.
;: ASSUMPTIONS:IN EACH FILE Column 1 is the name of files, Column 2 is the time.
;; Outputs a CSV with X-axis as names of files and Y-axis as time in seconds.
;; This is meant to compare the transforms.
;; Listof String * String -> void
(define (make-compare-plot files title)
  (define l (length files))
  (define x-min-val -1)
  (define (make-hist file)
    (set! x-min-val (+ x-min-val 1))
    (discrete-histogram
      (sort
        (csvfile->list/proc file v2-to-number)
        (lambda (x y) (string<? (vector-ref x 0) (vector-ref y 0))))
      #:skip (+ l 1) #:x-min x-min-val
      #:label (get-name file)
      #:color (+ x-min-val 1) #:line-color (+ x-min-val 1)))
  (plot-jpeg-quality 100)
  (parameterize ([plot-x-tick-label-anchor 'top-right]
                 [plot-x-tick-label-angle 30])
    (plot-pict (map make-hist files)
               #:y-label "Runtime (in seconds)" #:x-label #f
               #:width 600 #:height 600
               #:legend-anchor 'top-right
               #:title title)))

;; Extract number from the benchmark name format
(define (extract-num f)
  (let ([res (regexp-match #px"\\d+" f) ])
    (if res (string->number (car res)) -1)))

;; Group names according to the numbers in the file name.
(define (group-names files)
  (group-by extract-num files))

(let ([ args (vector->list (current-command-line-arguments)) ])
  (define (remove-base fss)
    (filter (lambda (fs) (> (extract-num (car fs)) 0)) fss))
  (if (< (length args) 2)
    (raise
      (format "script requires at least 2 arguments, given: ~a" (length args)))
    (let* ([ output-file (car args) ]
           [ files (cdr args) ]
           [ groups (remove-base (group-names files)) ]
           [ base-file (findf (lambda (f) (regexp-match? #rx"base" f)) files) ]
           [ _tmp (if base-file #t (raise "No basefile found")) ]
           [ plots (map
                     (lambda (fs)
                       (make-compare-plot
                         (cons base-file fs)
                         (number->string (extract-num (car fs))))) groups) ])
      (draw-plot output-file (join-plots plots)))))
