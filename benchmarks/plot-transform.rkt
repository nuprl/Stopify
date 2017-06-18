#lang typed/racket/base

(require plot/no-gui)
(require "plot-helpers.rkt")

(: make-normalization-function (-> String
                                   (-> (Listof (Vector String Real))
                                       String
                                       (Listof (Vector String Real)))))
(define (make-normalization-function basefile)
  (let ([ bs : (Listof (Vector String Real))
             (csvfile->list/proc basefile v2-to-number)])
    (lambda ([fs : (Listof (Vector String Real))] [filename : String])
      (let* ([ entry : (Vector String Real)
                     (extract-val
                       (findf (lambda ([d : (Vector String Real)])
                                (regexp-match?
                                  (regexp (vector-ref d 0))
                                  filename)) bs)
                       #:err (format "entry ~a not in basefile" filename)) ]
             [ factor : Real (vector-ref entry 1) ])
        (map (lambda ([data : (Vector String Real)])
               (vector (vector-ref data 0)
                       (/ (vector-ref data 1) factor))) fs)))))

;; Given name of file in the stopify benchmark format, get the yield interval
;; from it. If there are no numbers in the file name, it is assumed to be
;; baseline number and 0 is returned
(: strip-name (-> String String))
(define (strip-name s)
  (let ([ res (regexp-match #px"\\d+" s)])
    (if res (car res) "0")))

(: handle-row (-> (Vector String String) (Vector String Real)))
(define (handle-row r)
  (vector (strip-name (vector-ref r 0)) (handle-time-output (vector-ref r 1))))

;; Generate a plot picture from the data in the file.
(: compare-latency-tranform (-> String
                                String
                                (-> (Listof (Vector String Real))
                                    String
                                    (Listof (Vector String Real)))
                                pict))
(define (compare-latency-tranform file title normalize)
  (parameterize ([plot-x-tick-label-anchor 'top-right]
                 [plot-x-tick-label-angle 30])
    (inset (plot-pict
             (discrete-histogram
               (to-plot-type
                 (normalize (csvfile->list/proc file handle-row) file)))
             #:y-label "Runtime (in seconds)"
             #:x-label "Yield interval (in function applications)"
             #:width 600 #:height 600
             #:legend-anchor 'top-right
             #:title title) 15)))

(: make-plots (-> (Listof String)
                  (-> (Listof (Vector String Real))
                      String
                      (Listof (Vector String Real)))
                  pict))
(define (make-plots files normalize)
  (let ([ plots
          (map (lambda ([f : String])
                 (compare-latency-tranform f (get-name f) normalize)) files)])
    (join-plots plots)))

(: remove-base (-> (Listof String) (Listof String)))
(define (remove-base fs)
  (filter (lambda ([f : String]) (not (regexp-match? #rx"-base-" f))) fs))

(let ([ args : (Listof String)
             (vector->list (current-command-line-arguments)) ])
  (if (< (length args) 2)
    (raise (format "Not enough arguments, expected: > 2, received: ~a"
                   (length args)))
    (let* ([ files : (Listof String) (cdr args) ]
           [ plot-files : (Listof String) (remove-base files) ]
           [ base-file : String
             (extract-val
               (findf (lambda ([f : String])
                        (regexp-match? #rx"-base-" f)) files)
               #:err "No basefile found in args") ]
           [ normalize (make-normalization-function base-file) ])
      (draw-plot (car args) (make-plots plot-files normalize)))))
