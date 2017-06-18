#lang typed/racket/base

;; This script assumes that programs given are from the same JS engine.
(require racket/list)
(require typed/racket/unsafe)
(require plot/no-gui)
(require "plot-helpers.rkt")

; This assumes that the data in both the lists is sorted according to
; column 1.
(: make-normalization-function (-> String
                                   (-> (Listof (Vector String Real))
                                       (Listof (Vector String Real)))))
(define (make-normalization-function basefile)
  (let ([ base-list (csvfile->list/proc basefile v2-to-number)])
    (lambda ([fs : (Listof (Vector String Real))])
      (for/list ([data fs] [ base base-list ])
        (vector
          (vector-ref data 0)
          (/ (vector-ref data 1) (vector-ref base 1)))))))

; Given a list of CSV names, plot a side-by-side graph.
; This is meant to compare the transforms.
(: make-compare-plot (->
                       (Listof String)
                       String
                       (-> (Listof (Vector String Real))
                           (Listof (Vector String Real)))
                       pict))
(define (make-compare-plot files title normalize)
  (: l Nonnegative-Real)
  (define l (length files))

  (: x-min-val Integer)
  (define x-min-val -1)

  (: make-hist (-> String renderer2d))
  (define (make-hist file)
    (set! x-min-val (+ x-min-val 1))
    (discrete-histogram
      (to-plot-type (normalize (csvfile->list/proc file v2-to-number)))
      #:skip (+ l 1) #:x-min x-min-val
      #:label (get-name file)
      #:color (+ x-min-val 1) #:line-color (+ x-min-val 1)))

  (parameterize ([plot-x-tick-label-anchor 'top-right]
                 [plot-x-tick-label-angle 30])
    (inset (plot-pict (map make-hist files)
                      #:y-label "Runtime (in seconds)" #:x-label #f
                      #:width 600 #:height 600
                      #:legend-anchor 'top-right
                      #:title title) 15)))

;; Extract Number from the benchmark name format
(: extract-num (-> String Real))
(define (extract-num f)
  (let ([res (regexp-match #px"\\d+" f) ])
    (if (not (boolean? res)) (safe-string->number (first res)) -1)))

; Group names according to the Numbers in the file name.
(: group-names (-> (Listof String) (Listof (Listof String))))
(define (group-names files)
  (group-by extract-num files))

(let ([ args : (Listof String)
             (vector->list (current-command-line-arguments)) ])

  (: remove-base (-> (Listof (Listof String)) (Listof (Listof String))))
  (define (remove-base fss)
    (filter (lambda ([fs : (Listof String)]) (> (extract-num (car fs)) 0)) fss))

  (: sort-with-interval (-> (Listof (Listof String)) (Listof (Listof String))))
  (define (sort-with-interval fss)
    (sort fss
          (lambda ([xs : (Listof String)] [ys : (Listof String)])
            (< (extract-num (car xs)) (extract-num (car ys))))))
  (if (< (length args) 2)
    (raise
      (format "script requires at least 2 arguments, given: ~a" (length args)))
    (let* ([ output-file : String (car args) ]
           [ files : (Listof String) (cdr args) ]
           [ groups (sort-with-interval (remove-base (group-names files))) ]
           [ base-file : String
                       (extract-val
                         (findf
                           (lambda ([f : String])
                             (regexp-match? #rx"-base-" f)) files)
                         #:err "No base file present in list of files") ]
           [ normalize (make-normalization-function base-file)]
           [ plots (map
                     (lambda ([fs : (Listof String)])
                       (make-compare-plot
                         (cons base-file fs)
                         (number->string (extract-num (car fs)))
                         normalize)) groups) ])
      (draw-plot output-file (join-plots plots)))))
