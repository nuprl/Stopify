(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
// This code runs on the right-hand side IFRAME that displays the output
// from the running program. The code receives two kinds of messages
// from the container (1) a message containing the JavaScript to run,
// before it has been stopified and (2) a message directing execution to stop.
Object.defineProperty(exports, "__esModule", { value: true });
const data = document.getElementById('data');
console.log = function (str) {
    data.value = data.value + str + '\n';
    const evt = new Event('change');
    data.dispatchEvent(evt);
};
let task; // of type AsyncRunner
window.addEventListener('message', evt => {
    if (evt.source !== window.parent) {
        return;
    }
    const message = evt.data;
    const { type } = message;
    switch (type) {
        case 'start':
            task = stopify.stopify(message.path, message.opts);
            task.setBreakpoints(message.breakpoints);
            task.run(() => { }, () => { }, updateCurrentLine);
            break;
        case 'pause':
            task.pause(updateCurrentLine);
            break;
        case 'continue':
            task.setBreakpoints(message.breakpoints);
            task.resume();
            break;
        case 'step':
            task.step(updateCurrentLine);
    }
});
function updateCurrentLine(line) {
    window.parent.postMessage({ type: 'paused', linenum: line }, '*');
}
document.body.style.fontFamily = 'Monaco';
window.parent.postMessage({ type: 'ready' }, '*');
const postLineNum = () => {
    const rts = stopify.getRTS();
    window.parent.postMessage({
        linenum: rts.linenum
    }, '*');
};
//stopify.setOnStop(postLineNum);
const textarea = document.getElementById('data');
textarea.onchange = function () {
    textarea.scrollTop = textarea.scrollHeight;
};

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkaXN0L2NvbnRhaW5lci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiXCJ1c2Ugc3RyaWN0XCI7XG4vLyBUaGlzIGNvZGUgcnVucyBvbiB0aGUgcmlnaHQtaGFuZCBzaWRlIElGUkFNRSB0aGF0IGRpc3BsYXlzIHRoZSBvdXRwdXRcbi8vIGZyb20gdGhlIHJ1bm5pbmcgcHJvZ3JhbS4gVGhlIGNvZGUgcmVjZWl2ZXMgdHdvIGtpbmRzIG9mIG1lc3NhZ2VzXG4vLyBmcm9tIHRoZSBjb250YWluZXIgKDEpIGEgbWVzc2FnZSBjb250YWluaW5nIHRoZSBKYXZhU2NyaXB0IHRvIHJ1bixcbi8vIGJlZm9yZSBpdCBoYXMgYmVlbiBzdG9waWZpZWQgYW5kICgyKSBhIG1lc3NhZ2UgZGlyZWN0aW5nIGV4ZWN1dGlvbiB0byBzdG9wLlxuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuY29uc3QgZGF0YSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdkYXRhJyk7XG5jb25zb2xlLmxvZyA9IGZ1bmN0aW9uIChzdHIpIHtcbiAgICBkYXRhLnZhbHVlID0gZGF0YS52YWx1ZSArIHN0ciArICdcXG4nO1xuICAgIGNvbnN0IGV2dCA9IG5ldyBFdmVudCgnY2hhbmdlJyk7XG4gICAgZGF0YS5kaXNwYXRjaEV2ZW50KGV2dCk7XG59O1xubGV0IHRhc2s7IC8vIG9mIHR5cGUgQXN5bmNSdW5uZXJcbndpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdtZXNzYWdlJywgZXZ0ID0+IHtcbiAgICBpZiAoZXZ0LnNvdXJjZSAhPT0gd2luZG93LnBhcmVudCkge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG1lc3NhZ2UgPSBldnQuZGF0YTtcbiAgICBjb25zdCB7IHR5cGUgfSA9IG1lc3NhZ2U7XG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ3N0YXJ0JzpcbiAgICAgICAgICAgIHRhc2sgPSBzdG9waWZ5LnN0b3BpZnkobWVzc2FnZS5wYXRoLCBtZXNzYWdlLm9wdHMpO1xuICAgICAgICAgICAgdGFzay5zZXRCcmVha3BvaW50cyhtZXNzYWdlLmJyZWFrcG9pbnRzKTtcbiAgICAgICAgICAgIHRhc2sucnVuKCgpID0+IHsgfSwgKCkgPT4geyB9LCB1cGRhdGVDdXJyZW50TGluZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAncGF1c2UnOlxuICAgICAgICAgICAgdGFzay5wYXVzZSh1cGRhdGVDdXJyZW50TGluZSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnY29udGludWUnOlxuICAgICAgICAgICAgdGFzay5zZXRCcmVha3BvaW50cyhtZXNzYWdlLmJyZWFrcG9pbnRzKTtcbiAgICAgICAgICAgIHRhc2sucmVzdW1lKCk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnc3RlcCc6XG4gICAgICAgICAgICB0YXNrLnN0ZXAodXBkYXRlQ3VycmVudExpbmUpO1xuICAgIH1cbn0pO1xuZnVuY3Rpb24gdXBkYXRlQ3VycmVudExpbmUobGluZSkge1xuICAgIHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2UoeyB0eXBlOiAncGF1c2VkJywgbGluZW51bTogbGluZSB9LCAnKicpO1xufVxuZG9jdW1lbnQuYm9keS5zdHlsZS5mb250RmFtaWx5ID0gJ01vbmFjbyc7XG53aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHsgdHlwZTogJ3JlYWR5JyB9LCAnKicpO1xuY29uc3QgcG9zdExpbmVOdW0gPSAoKSA9PiB7XG4gICAgY29uc3QgcnRzID0gc3RvcGlmeS5nZXRSVFMoKTtcbiAgICB3aW5kb3cucGFyZW50LnBvc3RNZXNzYWdlKHtcbiAgICAgICAgbGluZW51bTogcnRzLmxpbmVudW1cbiAgICB9LCAnKicpO1xufTtcbi8vc3RvcGlmeS5zZXRPblN0b3AocG9zdExpbmVOdW0pO1xuY29uc3QgdGV4dGFyZWEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZGF0YScpO1xudGV4dGFyZWEub25jaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgdGV4dGFyZWEuc2Nyb2xsVG9wID0gdGV4dGFyZWEuc2Nyb2xsSGVpZ2h0O1xufTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWNvbnRhaW5lci5qcy5tYXAiXX0=
