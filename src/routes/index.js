/*
 * GET home page.
 */

exports.index = function(req, res) {
  res.render('index', {
    title : 'Kalabox',
  })
};

exports.start = function(req, res) {
  res.render('start', {
    title : 'Boot this Box!',
  })
};