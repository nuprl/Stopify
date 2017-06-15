#lang racket/base

(require plot/no-gui)
(require slideshow/pict)

(require "plot-helpers.rkt")

;; Given name of file in the stopify benchmark format, get the yield interval
;; from it. If there are no numbers in the file name, it is assumed to be
;; baseline number and 0 is returned
(define (strip-name s)
  (let ([ res (regexp-match #px"\\d+" s)])
    (if res
      (string->number (car res ))
      0)))

(define (handle-row r)
  (list (strip-name (car r)) (handle-time-output (cadr r))))

;; Generate a plot picture from the data in the file.
(define (compare-latency-tranform file title)
  (inset (plot-pict
           (discrete-histogram
             (csvfile->list/proc file handle-row))
           #:y-label "Runtime (in seconds)"
           #:x-label "Yield interval (in function applications)"
           #:width 600 #:height 600
           #:legend-anchor 'top-right
           #:title title) 15))

(define (make-plots files)
  (let ([ plots (map (lambda (f)
                       (compare-latency-tranform f (get-name f)))
                     files)])
    (join-plots plots)))

(let ([ args (vector->list (current-command-line-arguments)) ])
  (if (< (length args) 2)
    (raise (format "Not enough arguments, expected: > 2, received: ~a"
                   (length args)))
    (draw-plot (car args) (make-plots (cdr args)))))
