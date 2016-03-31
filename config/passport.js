var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var TwitterStrategy = require('passport-twitter').Strategy;
var configAuth = require('./auth');
var User = require('../app/models/user');

var async = require("async");
var uuid = require('node-uuid');

module.exports = function (passport) {
    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy({
        clientID: configAuth.facebookAuth.clientID,
        clientSecret: configAuth.facebookAuth.clientSecret,
        callbackURL: configAuth.facebookAuth.callbackURL,
        passReqToCallback: true
    }, function (req, token, refreshToken, profile, done) {
        handleFacebookLogin(req, token, refreshToken, profile, done);
    }));

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    passport.use('local-signup', new LocalStrategy({
        usernameField: 'name',
        passwordField: 'password',
        passReqToCallback: true
    }, function (req, name, password, done) {
        handleLocalSignUp(req, name, password, done)
    }));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    passport.use('local-login', new LocalStrategy({
        usernameField: 'name',
        passwordField: 'password',
        passReqToCallback: true
    }, function (req, name, password, done) {
        handleLocalLogin(req, name, password, done);
    }));
    // =========================================================================
    // TWITTER =================================================================
    // =========================================================================
    passport.use(new TwitterStrategy({
        consumerKey: configAuth.twitterAuth.consumerKey,
        consumerSecret: configAuth.twitterAuth.consumerSecret,
        callbackURL: configAuth.twitterAuth.callbackURL
    }, function (req, token, tokenSecret, profile, done) {
        handleTwitterLogin(req, token, tokenSecret, profile, done);
    }));

    function handleFacebookLogin(req, token, refreshToken, profile, done) {
        try {
            process.nextTick(function () {
                if (!req.user) {
                    User.findOne({'facebook.id': profile.id}, function (err, user) {
                        if (err) return done(err);
                        if (user) return done(null, user);

                        var newUser = new User();
                        newUser.profileId = uuid.v4();
                        newUser.facebook.id = profile.id;
                        newUser.facebook.token = token;
                        newUser.facebook.name = profile.displayName;
                        newUser.save(function (err) {
                            if (err) throw err;
                            return done(null, newUser);
                        });
                    });
                } else {
                    var user = req.user;
                    user.facebook.id = profile.id;
                    user.facebook.token = token;
                    user.facebook.name = profile.displayName;
                    user.save(function (err) {
                        if (err) throw err;
                        return done(null, user);
                    });
                }
            });
        } catch (e) {
            console.log(e);
            done(e);
        }
    }

    function handleLocalSignUp(req, name, password, done) {
        try {
            process.nextTick(function () {
                User.findOne({'local.name': name}, function (err, user) {
                    if (err) {
                        return done(err);
                    }
                    if (user) {
                        return done(null, false, req.flash('signupMessage', 'That name is already taken.'));
                    }
                    else {
                        var newUser = new User();
                        newUser.profileId = uuid.v4();
                        newUser.local.name = name;
                        newUser.local.password = newUser.generateHash(password);
                        newUser.save(function (err) {
                            if (err) throw err;
                            return done(null, newUser);
                        });
                    }
                });
            });
        } catch (e) {
            console.log(e);
            done(e);
        }
    }

    function handleLocalLogin(req, name, password, done) {
        if (!req.user) {
            User.findOne({'local.name': name}, function (err, user) {
                if (err) {
                    return done(err);
                }
                if (!user) {
                    var callbackDone;
                    async.series([function (callback) {
                        "use strict";
                        callbackDone = handleLocalSignUp(req, name, password, done);
                        callback();
                    }]);
                    console.log(name);
                    console.log(callbackDone);
                    return callbackDone;
                }
                if (!user.validPassword(password)) {
                    return done(null, false, req.flash('loginMessage', 'It looks like you provided an invalid password.'));
                }
                return done(null, user);
            });
        } else {
            var user = req.user;
            user.local.name = name;
            user.local.password = user.generateHash(password);
            user.save(function (err) {
                if (err) throw err;
                return done(null, user);
            });
        }
    }

    function handleTwitterLogin(req, token, tokenSecret, profile, done) {
        if (!req.user) {
            User.findOne({'twitter.id': profile.id}, function (err, user) {
                if (err) return done(err);

                if (user) {
                    if (!user.twitter.token) {
                        user.twitter.token = token;
                        user.twitter.username = profile.username;
                        user.twitter.displayName = profile.displayName;

                        user.save(function (err) {
                            if (err) throw err;
                            return done(null, user);
                        });
                    }
                    return done(null, user);
                } else {
                    var newUser = new User();
                    newUser.profileId = uuid.v4();
                    newUser.twitter.id = profile.id;
                    newUser.twitter.token = token;
                    newUser.twitter.username = profile.username;
                    newUser.twitter.displayName = profile.displayName;
                    newUser.save(function (err) {
                        if (err) throw err;
                        return done(null, newUser);
                    });
                }
            });
        } else {
            var user = req.user;
            user.twitter.id = profile.id;
            user.twitter.token = token;
            user.twitter.username = profile.username;
            user.twitter.displayName = profile.displayName;
            user.save(function (err) {
                if (err) throw err;
                return done(null, user);
            });
        }
    }
};
