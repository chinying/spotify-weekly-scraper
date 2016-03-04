var express = require('express');
var router = express.Router();
var request = require('request');
var querystring = require('querystring');
var credentials = require('../credentials');

var client_id = credentials.id;
var client_secret = credentials.secret;
var spotify_username = credentials.user;
var redirect_uri = 'http://localhost:3000/callback';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express'});
});

var findPlaylist = function(playlists, cb) {
  playlists = JSON.parse(playlists);
  var found = false;
  var discover_url;
  for (i in playlists.items) {
    var item = playlists.items[i];
    if (item.name == "Discover Weekly") {
      found = true;
      discover_url = item.external_urls.spotify
      break;
    }
  }
  if (found) return cb(discover_url);
  else console.log("not found");
  // TODO : needs to fetch more using the offset param if not found
};

var parseTracks = function(discover_tracks, cb) {
  var tracks = [];
  discover_tracks = JSON.parse(discover_tracks);
  for (i in discover_tracks.items) {
    var track = discover_tracks.items[i].track;
    var _track = {};
    _track.name = track.name;
    _track.url = track.external_urls.spotify;
    _track.album = track.album.name;
    _track.artists = track.artists[0].name; // TODO : foreach required here
    //console.log("t: " + _track);
    tracks.push(_track);
  }
  //console.log("does this call: ", tracks);
  return cb(tracks);
}

var fetchTracks = function(playlist_url, auth_token, cb) {
  var url_parts = playlist_url.split("/");
  request({
    url: "https://api.spotify.com/v1/users/spotifydiscover/playlists/" + url_parts[6] + "/tracks",
    method : 'GET',
    headers : {
      "Accept": "application/json",
      "Authorization" :" Bearer " + auth_token
    }
  }, function(err,response,body) {
    if (!err && response.statusCode == 200) {
      //console.log("body: " + body);
      parseTracks(body, function(discover_tracks) {
        //console.log("Tracks: "+ discover_tracks);
        return(cb(discover_tracks));
      });
    } else {
      console.log("error fetch tracks: " + err);
    }
  });
}

router.get('/playlists', function(req, res, next) {
  //probably should have exception checking here but ¯\_(ツ)_/¯
  request({
    url : "https://api.spotify.com/v1/users/" + spotify_username + "/playlists",
    method : 'GET',
    headers : {
      "Accept": "application/json",
      "Authorization" :" Bearer " + req.query.access_token
    }
  }, function(err, response, body) {
    if (!err && response.statusCode == 200) {
      var playlists = body;
      findPlaylist(playlists, function(playlist_url) {
        console.log(playlist_url);
        fetchTracks(playlist_url, req.query.access_token, function(r) {
          console.log(r);
          res.render('index', {tokens: true, auth_token: req.query.access_token, tracks: r});
        });
      });


    } else {
      console.log("cb1 error" + err);
    }
  });

});


var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

router.get('/login', function(req, res) {
  var state = generateRandomString(16);
  res.cookie('spotify_auth_state', state);
  var scope = 'playlist-read-private playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

router.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        // we can also pass the token to the browser to make requests from there
        res.redirect('/playlists?' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

module.exports = router;
