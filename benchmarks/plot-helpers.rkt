#lang typed/racket/base

(require typed/racket/unsafe)
(require racket/list)
(require plot/no-gui)
(require/typed csv-reading
               [csv-map (All (a) (->
                                   (-> (Listof String) a)
                                   (U String Input-Port)
                                   (Listof a)))])
(require/typed slideshow/pict
               [#:struct pict ([draw : Any]
                               [width : Real]
                               [height : Real]
                               [ascent : Real]
                               [descent : Real]
                               [children : (Listof Any)]
                               [panbox : (U Boolean Any)]
                               [last : Any])]
               [vc-append (-> Integer pict pict pict)])
(unsafe-require/typed slideshow/pict
               [inset (-> Any Real pict)])
(require/typed file/convertible
               [convert (-> pict Symbol Bytes)])

(provide
  handle-time-output csvfile->list/proc get-name draw-plot join-plots
  v2-to-number pr safe-string->number extract-val to-plot-type
  ; Export definitons from slideshow
  pict inset)

(: pr (All (A) (-> A A)))
(define (pr v)
  (printf "~a\n" v)
  v)

; Typed version of string->number
(: safe-string->number (-> String Real))
(define (safe-string->number str)
  (real-part (extract-val (string->number str)
               #:err (format "~a str is not a number" str))))

(: extract-val (All (A) (-> (U A False) (#:err String) A)))
(define (extract-val val #:err [err-string "failed to extract-val"])
  (if (boolean? val) (raise err-string) val))

;; Interpret the output from unix time with --format %E.  MM:SS
;; Result in seconds
(: time->number (-> String Real))
(define (time->number t)
  (let* ([matches
           (extract-val
             (regexp-match #px"(\\d+):([0-9.]+)" t)
             #:err (format "~a is not in the correct time format" t))]
         [mins (safe-string->number (extract-val (second matches)))]
         [secs (safe-string->number (extract-val (third matches)))])
    (+ (* 60 mins) secs)))

;; In addition to the format specified in time->number, the output can be
;; -1 for programs that failed to run.
(: handle-time-output (-> String Real))
(define (handle-time-output t)
  (if (string->number t) (safe-string->number t) (time->number t)))

(: csvfile->list/proc
   (All (A) (-> String
                (-> (Vector String String) (Vector String A))
                (Listof (Vector String A)))))
(define (csvfile->list/proc filename proc)
  (: map-proc (All (A)
                   (-> (-> (Vector String String) (Vector String A))
                       (-> (Listof String) (Vector String A)))))
  (define (map-proc proc)
    (lambda ([fs : (Listof String)])
      (if (not (= (length fs) 2))
        (raise (format "~a: ~s is an invalid field" filename fs))
        (proc (vector (first fs) (second fs))))))
  (sort (csv-map (map-proc proc) (open-input-file filename))
        (lambda ([x : (Vectorof String)]
                 [y : (Vectorof String)])
          (string<? (vector-ref x 0) (vector-ref y 0)))))

;; This relies on the name of the file being in the format specified by the
;; Makefile runner.
(: get-name (-> String String))
(define (get-name f)
  (let ([res (extract-val
               (regexp-match #px"[^-]*-(.*)-times\\.csv" f)
               #:err (format "~a is not in the required format" f))])
    (extract-val (second res))))

;; Draw picture to the specified PDF file.
(: draw-plot (-> String pict Void))
(define (draw-plot filename pict)
  (define to-write (convert pict 'pdf-bytes))
  (define out-file (open-output-file filename
                                     #:mode 'binary
                                     #:exists 'replace))
  (write-bytes to-write out-file)
  (close-output-port out-file))

;; Join plots together
(: join-plots (-> (Listof pict) pict))
(define (join-plots plots)
  (foldl (lambda ([x : pict]
                  [y : pict]) (vc-append 30 x y)) (car plots) (cdr plots)))

(: v2-to-number (-> (Vector String String) (Vector String Real)))
(define (v2-to-number entry)
  (vector (vector-ref entry 0)
          (handle-time-output (vector-ref entry 1))))

; Annotate the types to be accepted by plot functions.
(: to-plot-type (-> (Listof (Vector String Real))
                    (Sequenceof (Vector Any (U False Real ivl)))))
(define (to-plot-type ls)
  (map (lambda ([v : (Vector String Real)])
         (vector (ann (vector-ref v 0) Any)
                 (ann (real-part (vector-ref v 1)) (U False Real ivl)))) ls))
