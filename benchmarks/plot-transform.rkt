#lang racket/base

(require plot/no-gui)
(require slideshow/pict)

(require "plot-helpers.rkt")

(define (make-normalization-function basefile)
  (let ([ bs (csvfile->list/proc basefile v2-to-number)])
    (lambda (fs filename)
      (let* ([ entry (findf (lambda (d) (regexp-match?
                                          (regexp (vector-ref d 0))
                                          filename)) bs) ]
             [ factor (vector-ref entry 1) ])
        (for/list ( [data fs] [ base bs ] )
          (list (vector-ref data 0)
                (/ (vector-ref data 1) factor)))))))

;; Given name of file in the stopify benchmark format, get the yield interval
;; from it. If there are no numbers in the file name, it is assumed to be
;; baseline number and 0 is returned
(define (strip-name s)
  (let ([ res (regexp-match #px"\\d+" s)])
    (if res (car res) "0")))

(define (handle-row r)
  (list (strip-name (car r)) (handle-time-output (cadr r))))

;; Generate a plot picture from the data in the file.
(define (compare-latency-tranform file title)
  (parameterize ([plot-x-tick-label-anchor 'top-right]
                 [plot-x-tick-label-angle 30])
    (inset (plot-pict
             (discrete-histogram
               (csvfile->list/proc file handle-row))
             #:y-label "Runtime (in seconds)"
             #:x-label "Yield interval (in function applications)"
             #:width 600 #:height 600
             #:legend-anchor 'top-right
             #:title title) 15)))

(define (make-plots files normalize)
  (let ([ plots
          (map (lambda (f)
                 (compare-latency-tranform f (get-name f) normalize)) files)])
    (join-plots plots)))

(define (remove-base fs)
  (filter (lambda (f) (not (regexp-match? #rx"base" f))) fs))

(let ([ args (vector->list (current-command-line-arguments)) ])
  (if (< (length args) 2)
    (raise (format "Not enough arguments, expected: > 2, received: ~a"
                   (length args)))
    (let* ([ files (cdr args) ]
           [ plot-files (remove-base files) ]
           [ base-file (findf (lambda (f) (regexp-match? #rx"base" f)) files) ]
           [ normalize (make-normalization-function base-file) ])
      (draw-plot (car args) (make-plots plot-files normalize)))))
