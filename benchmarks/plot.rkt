#lang racket/base

(require racket/list)
(require csv-reading)
(require plot)

;; Interpret the output from unix time with --format %E.  MM:SS
;; Result in seconds
(define (time->number t)
  (let* ([matches (regexp-match #px"(\\d+):([0-9.]+)" t)]
         [mins (string->number (cadr matches))]
         [secs (string->number (caddr matches))])
    (+ (* 60 mins) secs)))

;; In addition to the format specified in time->number, the output can be
;; -1 for programs that failed to run.
(define (handle-time-output t)
  (if (string->number t) (string->number t)
    (time->number t)))

;; Convert a CSV file into form usable by plot.
;; String (representing path of CSV) -> ListOf #(String Number)
(define (csvfile->list filename)
  (define (v2-to-number c)
    (list (car c) (handle-time-output (cadr c))))
  (sort (csv-map (compose list->vector v2-to-number)
                 (open-input-file filename))
        (lambda (x y) (string<? (vector-ref x 0) (vector-ref y 0)))))

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
      (csvfile->list (cadr file))
      #:skip (+ l 1) #:x-min x-min-val
      #:label (car file)
      #:color x-min-val #:line-color x-min-val))
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


;; This relies on the name of the file being in the format specified by the
;; Makefile runner.
(define (get-name f)
  (let ([res (regexp-match #px"[^-]*-(.*)-times\\.csv" f)])
    (if (not res)
      (raise (format "~a is not in the required format" f))
      (cadr res))))

(let ([ args (vector->list (current-command-line-arguments)) ])
  (if (< (length args) 2)
    (raise
      (format "script requires at least 2 arguments, given: ~a" (length args)))
    (let* ([ title (car args) ]
           [ files (cdr args) ]
           [ prepared-list (map (lambda (f) (list (get-name f) f)) files)])
      (transform-compare-benchmark prepared-list title))))
