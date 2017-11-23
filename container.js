(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.
window.addEventListener('message', evt => {
    if (evt.source !== window.parent) {
        return;
    }
    const message = evt.data;
    const { type } = message;
    switch (type) {
        case 'start':
            stopify.loadScript(() => stopify.setBreakpoints(message.breakpoints), 'https://storage.googleapis.com/stopify-compiler-output');
            break;
        case 'pause':
            stopify.stopScript();
            break;
        case 'continue':
            stopify.setBreakpoints(message.breakpoints);
            stopify.resumeScript();
            break;
        case 'step':
            stopify.stepScript();
    }
});
document.body.style.fontFamily = 'Monaco';
window.parent.postMessage({ type: 'ready' }, '*');
const postLineNum = () => {
    const rts = stopify.getRTS();
    window.parent.postMessage({
        linenum: rts.linenum
    }, '*');
};
stopify.setOnStop(postLineNum);
const textarea = document.getElementById('data');
textarea.onchange = function () {
    textarea.scrollTop = textarea.scrollHeight;
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2NvbnRhaW5lci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG4vLyBUaGlzIGNvZGUgcnVucyBvbiB0aGUgcmlnaHQtaGFuZCBzaWRlIElGUkFNRSB0aGF0IGRpc3BsYXlzIHRoZSBvdXRwdXRcbi8vIGZyb20gdGhlIHJ1bm5pbmcgcHJvZ3JhbS4gVGhlIGNvZGUgcmVjZWl2ZXMgdHdvIGtpbmRzIG9mIG1lc3NhZ2VzXG4vLyBmcm9tIHRoZSBjb250YWluZXIgKDEpIGEgbWVzc2FnZSBjb250YWluaW5nIHRoZSBKYXZhU2NyaXB0IHRvIHJ1bixcbi8vIGJlZm9yZSBpdCBoYXMgYmVlbiBzdG9waWZpZWQgYW5kICgyKSBhIG1lc3NhZ2UgZGlyZWN0aW5nIGV4ZWN1dGlvbiB0byBzdG9wLlxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ21lc3NhZ2UnLCBldnQgPT4ge1xuICAgIGlmIChldnQuc291cmNlICE9PSB3aW5kb3cucGFyZW50KSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbWVzc2FnZSA9IGV2dC5kYXRhO1xuICAgIGNvbnN0IHsgdHlwZSB9ID0gbWVzc2FnZTtcbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgICAgY2FzZSAnc3RhcnQnOlxuICAgICAgICAgICAgc3RvcGlmeS5sb2FkU2NyaXB0KCgpID0+IHN0b3BpZnkuc2V0QnJlYWtwb2ludHMobWVzc2FnZS5icmVha3BvaW50cyksICdodHRwczovL3N0b3JhZ2UuZ29vZ2xlYXBpcy5jb20vc3RvcGlmeS1jb21waWxlci1vdXRwdXQnKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdwYXVzZSc6XG4gICAgICAgICAgICBzdG9waWZ5LnN0b3BTY3JpcHQoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdjb250aW51ZSc6XG4gICAgICAgICAgICBzdG9waWZ5LnNldEJyZWFrcG9pbnRzKG1lc3NhZ2UuYnJlYWtwb2ludHMpO1xuICAgICAgICAgICAgc3RvcGlmeS5yZXN1bWVTY3JpcHQoKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdzdGVwJzpcbiAgICAgICAgICAgIHN0b3BpZnkuc3RlcFNjcmlwdCgpO1xuICAgIH1cbn0pO1xuZG9jdW1lbnQuYm9keS5zdHlsZS5mb250RmFtaWx5ID0gJ01vbmFjbyc7XG53aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHsgdHlwZTogJ3JlYWR5JyB9LCAnKicpO1xuY29uc3QgcG9zdExpbmVOdW0gPSAoKSA9PiB7XG4gICAgY29uc3QgcnRzID0gc3RvcGlmeS5nZXRSVFMoKTtcbiAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgbGluZW51bTogcnRzLmxpbmVudW1cbiAgICB9LCAnKicpO1xufTtcbnN0b3BpZnkuc2V0T25TdG9wKHBvc3RMaW5lTnVtKTtcbmNvbnN0IHRleHRhcmVhID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2RhdGEnKTtcbnRleHRhcmVhLm9uY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgIHRleHRhcmVhLnNjcm9sbFRvcCA9IHRleHRhcmVhLnNjcm9sbEhlaWdodDtcbn07XG4vLyMgc291cmNlTWFwcGluZ1VSTD1jb250YWluZXIuanMubWFwIl19
