#lang racket/base

(require racket/list)
(require csv-reading)
(require file/convertible)
(require slideshow/pict)

(provide
  handle-time-output csvfile->list/proc get-name draw-plot join-plots
  v2-to-number pr)

(define (pr v)
    (printf "~a\n" v)
      v)
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
  (if (string->number t) (string->number t) (time->number t)))

;; Convert a CSV file into form usable by plot while processing each row using
;; `proc`. The resulting list is sorted according to column 1
;; (ListOf String -> ListOf String) -> ListOf #(String Number)
(define (csvfile->list/proc filename proc)
  (sort (csv-map (compose list->vector proc) (open-input-file filename))
        (lambda (x y) (string<? (vector-ref x 0) (vector-ref y 0)))))

;; This relies on the name of the file being in the format specified by the
;; Makefile runner.
(define (get-name f)
  (let ([res (regexp-match #px"[^-]*-(.*)-times\\.csv" f)])
    (if (not res)
      (raise (format "~a is not in the required format" f))
      (cadr res))))

;; Draw picture to the specified PDF file.
(define (draw-plot filename pict)
  (define to-write (convert pict 'pdf-bytes))
  (define out-file (open-output-file filename
                                     #:mode 'binary
                                     #:exists 'replace))
  (write-bytes to-write out-file)
  (close-output-port out-file))

;; Join plots together
(define (join-plots plots)
  (foldl (lambda (x y) (vc-append 30 x y)) (car plots) (cdr plots)))

(define (v2-to-number c)
    (list (car c) (handle-time-output (cadr c))))
