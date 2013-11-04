/*global exports */
/*!
 * This file is used for define the Observiable library.
 * @author <a href="mailto:mingyi.lzjtu@gmail.com">Mingyi</a>
 * @version 0.0.1
 */
;(function (name, defination, global) {
  'use strict';
  // Come from eventproxy: https://github.com/JacksonTian/eventproxy/blob/master/lib/eventproxy.js#L7

   // this is considered "safe":
  var hasDefine = typeof define === 'function',
    hasExports = typeof module !== 'undefined' && module.exports;

  if (hasDefine) {
    // AMD Module or CMD Module
    define(defination);
  } else if (hasExports) {
    // Node.js Module
    module.exports = defination();
  } else {
    // Assign to common namespaces or simply the global object (window)
    global[name] = defination();
  }
})('Observiable', function () {

  var _subjects = [];
  var _observables = [];

  var ObservableArray = function (arr) {
    var _old_arr = [];
    var _handlers = {
      generic: [],
      create: [],
      update: [],
      'delete': []
    };

    function reset() {
      callGenericSubscribers();
       _old_arr = JSON.parse(JSON.stringify(arr));
    }

    function callGenericSubscribers() {
      _forEach(_handlers.generic, function (f) {
        f(arr, _old_arr)
      });
    }

    function callCreateSubscribers(new_item, new_index) {
      _forEach(_handlers.create, function (f) {
        f(new_item, new_index);
      });
    }

    function callUpdateSubscribers(new_item, old_length, item_index) {
      _forEach(_handlers.update, function (f) {
        f(new_item, old_item, item_index);
      });
    }

    function callDeleteSubscribers(deleted_item, item_index) {
      _forEach(_handlers['delete'], function (f) {
        f(deleted_item, item_index);
      });
    }

    function detectChanges() {
      var old_length = _old_arr.length;
      var new_length = arr.length;

      if (old_length !== new_length || JSON.stringify(_old_arr) !== JSON.stringify (arr)) {
        var max = Math.max(new_length, old_length);

        for (var i = max; i >= 0; i--) {
          var old_item = _old_arr[i];
          var new_item = arr[i];
          if (i > old_length - 1) {
            callCreateSubscribers(new_item, i);
          } else if (i > new_length - 1) {
            callDeleteSubscribers(old_item, i);
          } else if (new_item !== old_item) {
            callUpdateSubscribers(new_item, old_item, i);
          }
        }
      }

      reset();
    }

    /* ################################################################
       Array mutator methods
    ################################################################ */

    // We need to augment all the standard Array mutator methods to notify
    // all observers in case of a change.
    //
    // https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Array#Mutator_methods

    // pop: Removes the last element from an array and returns that element.
    arr.pop = function () {
      detectChanges();
      var deleted_item = Array.prototype.pop.call(this, arguments);
      var item_index = this.length;
      callDeleteSubscribers(deleted_item, item_index);
      reset();
      return deleted_item;
    }

    // push: Adds one or more elements to the end of an array and returns 
    // the new length of the array.
    arr.push = function () {
      detectChanges();
      var new_item = arguments[0];
      var new_length = Array.prototype.push.apply(this, arguments);
      callCreateSubscribers(new_item, new_length - 1);
      reset();
      return new_length;
    }

    // splice: Adds and/or removes elements from an array.
    arr.splice = function (i, length) {
      detectChanges();
      var insert = Array.prototype.slice.call(arguments, 2);
      var deleted = Array.prototype.splice.apply(this, arguments);
      // Always use reverse loops when deleting stuff based on index
      for (var j = deleted.length - 1; j >= 0; j--) {
        callDeleteSubscribers(deleted[j], i + j);
      }

      _forEach(insert, function (new_item, k) {
        callCreateSubscribers(new_item, i + k);
      });
      reset();
      return deleted;
    }

    return {
      bind: function (type, handler) {
        if (typeof _handlers[type] == 'undefined') {
          throw 'type is not allow';
        }
        _handlers[type].push(handler);
      },
      unbind: function (type, handler) {

      }
    }
  };


  // ---helper
  var _isType = function (arg, type) {
    return Object.prototype.toString.call(arg) === '[object ' + type + ']';
  }
  var _forEach = function (obj, callback) {
    var value, i = 0, length = obj.length;
    for ( ; i < length; i++) {
      value = callback.call(obj[i], obj[i], i);

      if (value === false) {
        break;
      }
    }
  }
  
  return function (subject, type, f) {
    if (arguments.length < 2) {
      throw 'arguments length is not right';
    }

    if (!_isType(subject, 'Array')) {
      throw 'first argument must be an array';
    }

    if (_isType(type, 'Function')) {
      f = type;
      type = 'generic';
    }

    // TODO fix Array.indexof
    var index = _subjects.indexOf(subject);
    if (index === -1) {
      index = _subjects.length;
      _subjects.push(subject);
      var observable = new ObservableArray(subject);
      _observables.push(observable);
    }
    
    _observables[index].bind(type, f);
    return subject;
  };
}, this);