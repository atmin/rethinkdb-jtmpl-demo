function debounce(func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}



module.exports = {

  __init__: function() {
    var socket = io.connect(); //io('http://10.0.1.13:3000');
    var model = this;

    socket.on('titles', function(titles) {
      model('titles', titles);
    });

    socket.on('prefix', function(prefix) {
      model('prefix', prefix);
    });

    model.on('change', 'input',
      debounce(
        function() {
          socket.emit('prefix', this('input'));
        },
        1000
      )
    );
  },

  input: '',
  titles: []
};
