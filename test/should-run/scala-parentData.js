var $propertyName = function(obj) {
  for (var prop in obj)
    return prop;
};

function $is_O(obj) {
  return (obj !== null);
}

var $TypeData = function() {
  // Runtime support
  this.parentData = void 0;
};

$TypeData.prototype.initClass = function(
  internalNameObj, parentData, isInstance) {
  var internalName = $propertyName(internalNameObj);

  isInstance = isInstance || function(obj) {
    return obj;
  };

  // Runtime support
  this.parentData = parentData;

  return this;
};

var $d_O = new $TypeData().initClass("java.lang.Object", { O: 1 }, (void 0), $is_O);
