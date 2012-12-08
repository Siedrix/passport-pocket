var request = require('request'),
    passport = require('passport'),
    util = require('util');

function OAuth(options){
    this.options = options; 
    this.authUrl = "https://getpocket.com/auth/authorize?request_token={:requestToken}&redirect_uri={:redirectUri}"

    return this;
}

OAuth.prototype._formDataToJson = function (formData) {
    var json = {};

    formData.split('&').forEach(function (item) {
        var itemKey   = item.split('=')[0],
            itemValue = item.split('=')[1];

        json[itemKey] = itemValue;
    });

    return json;
}

OAuth.prototype._formatAuthUrl = function(token, redirectUri) {
    return this.authUrl.replace('{:requestToken}', token)
     .replace('{:redirectUri}', redirectUri);
};

OAuth.prototype.getOAuthAccessToken = function (code, callback) {
    var oauth = this;

    request.post({
        "headers" : {'content-type' : 'application/x-www-form-urlencoded'}, 
        "url"     : oauth.options.authorizationURL,
        "form"    : {
            "consumer_key" : oauth.options.consumerKey,
            "code"         : code
        }
    }, function (error, response, body) {
        if(error) { return callback(error, null)}
        if(response.statusCode === 403) { return callback(403, null)}

        var data = oauth._formDataToJson(body);
        
        callback(null, data.username, data.access_token);
    });    
}

OAuth.prototype.getOAuthRequestToken = function (callback) {
    var oauth = this;

    request.post({
        "headers" : {'content-type' : 'application/x-www-form-urlencoded'}, 
        "url"     : oauth.options.requestTokenURL,
        "form"    : {
            "consumer_key" : oauth.options.consumerKey,
            "redirect_uri" : oauth.options.callbackURL
        }
    }, function (error, response, body) {
        if(error) { return callback(error, null)}

        var data = oauth._formDataToJson(body);
        var url  = oauth._formatAuthUrl(data.code, oauth.options.callbackURL);
        
        callback(null, data.code, url);
    });
}

function Strategy(options, verify) {
    options = options || {};
    options.requestTokenURL  = options.requestTokenURL || 'https://getpocket.com/v3/oauth/request';
    options.authorizationURL = options.userAuthorizationURL || 'https://getpocket.com/v3/oauth/authorize';
    options.sessionKey       = options.sessionKey || 'oauth:pocket';

    // Api urls
    options.retrive = 'https://getpocket.com/v3/get';

    this._options = options;
    this._verity          = verify;
    this._oauth = new OAuth(options);

    this.name = 'pocket';
}

util.inherits(Strategy, passport.Strategy);

Strategy.prototype.authenticate = function(req, options) {
    if (req.query && req.query.denied) {
        return this.fail();
    }

    options = options || {};
    if (!req.session) { return this.error(new Error('OAuth authentication requires session support')); }

    var self = this;

    if (req.session && req.session.pocketCode) {
        console.log('implement oauth token to app token');
        this._oauth.getOAuthAccessToken(req.session.pocketCode, function (err, username, accessToken) {
            if(err || !username) { self.error(err); return}

            function verified(err, user, info) {
                if (err) { return self.error(err); }
                if (!user) { return self.fail(info); }
                self.success(user, info);
            }        

            self._verity(username, accessToken, verified);
        });
    }else{  
        console.log('implement get out tocken');
        this._oauth.getOAuthRequestToken(function (err, code, authUrl) {
            if(err) { self.error(err)}

            req.session.pocketCode = code;

            self.redirect(authUrl);
        });
    } 
}

Strategy.prototype.getUnreadItems = function(accessToken, callback) {
    var strategy = this;
    request.post({ 
        "headers" : {'content-type' : 'application/x-www-form-urlencoded'},     
        "url"     : strategy._options.retrive,
        "form"    : {
            "consumer_key" : strategy._options.consumerKey,
            "access_token" : accessToken,
            "state"        : 'unread'
        }
    }, function (error, response, body) {
        if(body){
            var data = JSON.parse(body);            
        }

        callback(error, data)
    }); 
};

module.exports = Strategy;