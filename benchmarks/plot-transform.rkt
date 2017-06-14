#lang racket/base

(require "plot-helpers.rkt")
(require plot/no-gui)

;; Given name of file in the stopify benchmark format, get the yield interval
;; from it. If there are no numbers in the file name, it is assumed to be
;; baseline number and 0 is returned
(define (strip-name s)
  (let ([ res (regexp-match #px"\\d+" s)])
    (if res
      (string->number (car res ))
      0)))

(define (handle-row r)
  (printf "~s\n" r)
  (list (strip-name (car r)) (handle-time-output (cadr r))))

(define (compare-latency-tranform file title)
  (parameterize ([plot-x-tick-label-anchor 'top-right]
                 [plot-x-tick-label-angle 30])
    (plot-file
      (discrete-histogram
        (csvfile->list/proc file handle-row))
      (string-append title ".pdf")
      'pdf
      #:y-label "Runtime (in seconds)" #:x-label #f
      #:width 600 #:height 600
      #:legend-anchor 'top-right
      #:title title)))

(let ([ args (vector->list (current-command-line-arguments)) ])
  (if (< (length args) 1)
    (raise "Not enough arguments, expected: > 1, received: 0")
    (compare-latency-tranform (car args) (get-name (car args)))))
