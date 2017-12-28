const data = <HTMLTextAreaElement>document.getElementById('data')!;

console.log = function (str: any) {
  data.value = data.value + str + '\n';
  const evt = new Event('change');
  data.dispatchEvent(evt);
}

window.onerror = (message: any) => {
  data.value = data.value + '\nAn error occurred:\n' + message + '\n';
  window.document.title = "done"
  const evt = new Event('change');
  data.dispatchEvent(evt);
}