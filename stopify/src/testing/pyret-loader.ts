import { parseRuntimeOpts } from "../parse-runtime-opts";

const opts = parseRuntimeOpts(
  JSON.parse(decodeURIComponent(window.location.hash.slice(1))));

const url = opts.filename;
const script = document.createElement('script');
script.setAttribute('src', url);
document.body.appendChild(script);
