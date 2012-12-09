var express = require('express'),
	cons    = require('consolidate'),
	swig    = require('swig');

var	passport = require('passport'),
	util = require('util'),
	PocketStrategy = require('passport-pocket');

// Pocket App token
POCKET_CONSUMER_KEY = "Pocket consumer key";

if(POCKET_CONSUMER_KEY === "Pocket consumer key"){
	console.log('WARNING!!! Need a pocket costumer key');
}

// Passport Set serializers
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Passport Set up
var pocketStrategy = new PocketStrategy({
		consumerKey    : POCKET_CONSUMER_KEY,
		callbackURL    : "http://127.0.0.1:3000/auth/pocket/callback"
	},function(username, accessToken, done) {
		process.nextTick(function () {
			return done(null, {
				username    : username,
				accessToken : accessToken
			});
		});
	}
);

passport.use(pocketStrategy);

// Express set up
var server = express();

server.configure(function() {
  server.use(express.logger());
  server.use(express.cookieParser());
  server.use(express.bodyParser());
  server.use(express.methodOverride());
  server.use(express.session({ secret: 'keyboard cat' }));
  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  server.use(passport.initialize());
  server.use(passport.session());
  server.use(server.router);
});

swig.init({
  	root  : './views',
  	cache : false 
});

server.use(express.static('./public'));

server.engine('.html', cons.swig);
server.set('view engine', 'html');
server.set('views', './views');

server.get('/', function(req, res){
	if(req.user){
		pocketStrategy.getUnreadItems(req.user.accessToken, function (err, items) {
			if(err){
				res.send('Something went wrong');
				return;
			}

			res.render('index', { 
				user  : req.user,
				items : items
			});
		})
	}else{
		res.render('index', { user: req.user });
	}
});

// Passport routes for express
server.get('/auth/pocket',passport.authenticate('pocket'),
function(req, res){
    // The request will be redirected to Twitter for authentication, so this
    // function will not be called.
});

server.get('/auth/pocket/callback', passport.authenticate('pocket', { failureRedirect: '/login' }),
function(req, res) {
    res.redirect('/');
});

server.listen(3000);
console.log('server running at : http://127.0.0.1:3000')
