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
    var changing = false;

    socket.on('titles', function(titles) {
      model('titles', titles);
    });

    model.on('change', 'input',
      debounce(
        function() {
          changing = true;
          socket.emit('prefix', this('input'));
        },
        1000
      )
    );
  },

  input: '',
  titles: []
};
