#lang racket/base

(require racket/list)
(require csv-reading)

(provide handle-time-output csvfile->list/proc get-name)

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

;; Convert a CSV file into form usable by plot and apply proc on each field.
;; String (representing path of CSV)
;; (ListOf String -> ListOf String) -> ListOf #(String Number)
(define (csvfile->list/proc filename proc)
  (csv-map (compose list->vector proc) (open-input-file filename)))

;; This relies on the name of the file being in the format specified by the
;; Makefile runner.
(define (get-name f)
  (let ([res (regexp-match #px"[^-]*-(.*)-times\\.csv" f)])
    (if (not res)
      (raise (format "~a is not in the required format" f))
      (cadr res))))
