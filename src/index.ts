export {default as eager} from './callcc/eagerRuntime';
export {default as lazy} from './callcc/lazyRuntime';
export {default as retval} from './callcc/retvalRuntime';
export * from './callcc/runtime';

import CallCC from './callcc/callcc';

export default CallCC;
